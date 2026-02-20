from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.conf import settings
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum, Exists, OuterRef
from django.utils import timezone
from datetime import timedelta
from decouple import config
import requests
import json
import re
from datetime import datetime
from .models import (
    Product, InventoryItem, InventoryBatch, StockMovement, InventoryAlert,
    ProductCategory, DosageForm, UnitOfMeasure
)
from .serializers import (
    ProductSerializer, InventoryItemSerializer, InventoryBatchSerializer,
    StockMovementSerializer, InventoryAlertSerializer
)
from apps.audit.decorators import audit_inventory_change, audit_critical_action


AUTO_ALERT_PREFIX = 'AUTO:'


def _sync_auto_inventory_alerts_for_organization(organization):
    if organization is None:
        return

    today = timezone.now().date()
    expiring_cutoff = today + timedelta(days=90)
    active_keys = set()

    low_or_out_items = InventoryItem.objects.select_related('product').filter(
        organization=organization,
        stock_status__in=['LOW_STOCK', 'OUT_OF_STOCK']
    )

    for item in low_or_out_items:
        if item.stock_status == 'OUT_OF_STOCK':
            alert_type = 'OUT_OF_STOCK'
            severity = 'CRITICAL'
            title = f'{AUTO_ALERT_PREFIX} Rupture de stock'
            message = f"{item.product.name} est en rupture de stock."
        else:
            alert_type = 'LOW_STOCK'
            severity = 'HIGH'
            title = f'{AUTO_ALERT_PREFIX} Stock bas'
            message = (
                f"{item.product.name} est en stock bas "
                f"({item.quantity_on_hand} en stock, seuil min {item.product.min_stock_level})."
            )

        InventoryAlert.objects.update_or_create(
            product=item.product,
            inventory_item=item,
            batch=None,
            alert_type=alert_type,
            title=title,
            defaults={
                'severity': severity,
                'message': message,
                'is_active': True,
                'resolved_at': None,
                'resolved_by': None,
            }
        )
        active_keys.add((item.id, None, alert_type, title))

    expiring_or_expired_batches = InventoryBatch.objects.select_related(
        'inventory_item__product'
    ).filter(
        inventory_item__organization=organization,
        status='AVAILABLE',
        current_quantity__gt=0,
        expiry_date__isnull=False,
        expiry_date__lte=expiring_cutoff,
    )

    for batch in expiring_or_expired_batches:
        inventory_item = batch.inventory_item
        product = inventory_item.product
        if batch.expiry_date < today:
            alert_type = 'EXPIRED'
            severity = 'CRITICAL'
            title = f'{AUTO_ALERT_PREFIX} Produit expiré'
            message = f"Le lot {batch.batch_number} de {product.name} est expiré (date {batch.expiry_date})."
        else:
            days_remaining = (batch.expiry_date - today).days
            alert_type = 'EXPIRING_SOON'
            severity = 'HIGH' if days_remaining <= 7 else 'MEDIUM'
            title = f'{AUTO_ALERT_PREFIX} Expiration proche'
            message = (
                f"Le lot {batch.batch_number} de {product.name} expire dans "
                f"{days_remaining} jour(s) (date {batch.expiry_date})."
            )

        InventoryAlert.objects.update_or_create(
            product=product,
            inventory_item=inventory_item,
            batch=batch,
            alert_type=alert_type,
            title=title,
            defaults={
                'severity': severity,
                'message': message,
                'is_active': True,
                'resolved_at': None,
                'resolved_by': None,
            }
        )
        active_keys.add((inventory_item.id, batch.id, alert_type, title))

    active_auto_alerts = InventoryAlert.objects.filter(
        inventory_item__organization=organization,
        is_active=True,
        title__startswith=AUTO_ALERT_PREFIX,
        alert_type__in=['LOW_STOCK', 'OUT_OF_STOCK', 'EXPIRING_SOON', 'EXPIRED'],
    )

    for alert in active_auto_alerts:
        key = (alert.inventory_item_id, alert.batch_id, alert.alert_type, alert.title)
        if key not in active_keys:
            alert.is_active = False
            alert.resolved_at = timezone.now()
            alert.save(update_fields=['is_active', 'resolved_at'])


class ProductListCreateAPIView(generics.ListCreateAPIView):
    queryset = Product.objects.select_related('organization', 'primary_supplier', 'created_by', 'updated_by')
    serializer_class = ProductSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['category', 'is_active', 'requires_prescription']
    search_fields = ['name', 'sku', 'barcode']
    ordering = ['name']

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            created_by=self.request.user
        )
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class ProductDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Product.objects.select_related('organization', 'primary_supplier', 'created_by', 'updated_by')
    serializer_class = ProductSerializer
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class InventoryItemListAPIView(generics.ListCreateAPIView):
    queryset = InventoryItem.objects.select_related('product', 'organization').order_by('-last_movement', 'id')
    serializer_class = InventoryItemSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['stock_status', 'product', 'facility_id']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = getattr(self.request, 'user', None)
        organization = getattr(user, 'organization', None)
        if organization is not None:
            queryset = queryset.filter(organization=organization)
        return queryset

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class InventoryItemDetailAPIView(generics.RetrieveUpdateAPIView):
    queryset = InventoryItem.objects.select_related('product', 'organization').order_by('id')
    serializer_class = InventoryItemSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = getattr(self.request, 'user', None)
        organization = getattr(user, 'organization', None)
        if organization is not None:
            queryset = queryset.filter(organization=organization)
        return queryset


class InventoryBatchListAPIView(generics.ListCreateAPIView):
    queryset = InventoryBatch.objects.select_related('inventory_item__product', 'created_by', 'updated_by')
    serializer_class = InventoryBatchSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status']
    ordering = ['expiry_date']
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class InventoryBatchDetailAPIView(generics.RetrieveUpdateAPIView):
    queryset = InventoryBatch.objects.select_related('inventory_item__product', 'created_by', 'updated_by')
    serializer_class = InventoryBatchSerializer
    
    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class StockMovementListAPIView(generics.ListCreateAPIView):
    queryset = StockMovement.objects.select_related(
        'inventory_item__product',
        'batch',
        'performed_by',
        'created_by',
    )
    serializer_class = StockMovementSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['movement_type', 'direction', 'inventory_item']
    ordering = ['-movement_date']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class StockMovementDetailAPIView(generics.RetrieveUpdateAPIView):
    queryset = StockMovement.objects.select_related(
        'inventory_item__product',
        'batch',
        'performed_by',
        'created_by',
    )
    serializer_class = StockMovementSerializer


class InventoryAlertListAPIView(generics.ListCreateAPIView):
    queryset = InventoryAlert.objects.select_related(
        'product',
        'inventory_item',
        'batch',
        'created_by',
        'acknowledged_by',
        'resolved_by',
    )
    serializer_class = InventoryAlertSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['alert_type', 'is_active']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = getattr(self.request, 'user', None)
        organization = getattr(user, 'organization', None)
        if organization is not None:
            _sync_auto_inventory_alerts_for_organization(organization)
            queryset = queryset.filter(
                Q(inventory_item__organization=organization) |
                Q(product__organization=organization)
            ).distinct()
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class InventoryAlertDetailAPIView(generics.RetrieveUpdateAPIView):
    queryset = InventoryAlert.objects.select_related(
        'product',
        'inventory_item',
        'batch',
        'created_by',
        'acknowledged_by',
        'resolved_by',
    )
    serializer_class = InventoryAlertSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = getattr(self.request, 'user', None)
        organization = getattr(user, 'organization', None)
        if organization is not None:
            queryset = queryset.filter(
                Q(inventory_item__organization=organization) |
                Q(product__organization=organization)
            ).distinct()
        return queryset


@api_view(['GET'])
@audit_inventory_change(description="Consultation produits expirant")
def expiring_products_view(request):
    days = request.GET.get('days', 30)
    try:
        days = int(days)
    except ValueError:
        days = 30

    scope = str(request.GET.get('scope', 'window')).strip().lower()
    today = timezone.now().date()
    cutoff_date = today + timedelta(days=days)

    batches = InventoryBatch.objects.filter(
        status='AVAILABLE',
        expiry_date__isnull=False,
        current_quantity__gt=0,
    ).select_related('inventory_item__product')

    user = getattr(request, 'user', None)
    organization = getattr(user, 'organization', None)
    if organization is not None:
        batches = batches.filter(inventory_item__organization=organization)

    batch_results = []
    for batch in batches:
        product_expiry = getattr(batch.inventory_item.product, 'expiration_date', None)
        batch_expiry = batch.expiry_date
        effective_expiry = min([d for d in [batch_expiry, product_expiry] if d], default=None)
        if not effective_expiry:
            continue

        if scope == 'expired' and not (effective_expiry < today):
            continue
        if scope not in ['all', 'expired'] and not (effective_expiry <= cutoff_date):
            continue

        batch_results.append({
            'id': str(batch.id),
            'inventory_item': str(batch.inventory_item_id),
            'product_name': batch.inventory_item.product.name,
            'product_sku': batch.inventory_item.product.sku,
            'batch_number': batch.batch_number,
            'serial_number': batch.serial_number,
            'manufacture_date': batch.manufacture_date,
            'expiry_date': effective_expiry,
            'product_expiration_date': product_expiry,
            'batch_expiry_date': batch_expiry,
            'received_date': batch.received_date,
            'supplier': str(batch.supplier_id) if batch.supplier_id else None,
            'supplier_name': getattr(batch.supplier, 'name', None) if batch.supplier_id else None,
            'purchase_order_id': batch.purchase_order_id,
            'initial_quantity': int(batch.initial_quantity or 0),
            'current_quantity': int(batch.current_quantity or 0),
            'reserved_quantity': int(batch.reserved_quantity or 0),
            'unit_cost': str(batch.unit_cost or 0),
            'status': batch.status,
            'quality_checked': bool(batch.quality_checked),
            'quality_notes': batch.quality_notes,
            'is_expired': bool(effective_expiry < today),
            'days_to_expiry': (effective_expiry - today).days,
            'created_at': batch.created_at,
            'updated_at': batch.updated_at,
        })

    fallback_items = InventoryItem.objects.select_related('product').filter(
        quantity_on_hand__gt=0,
        product__is_active=True,
        product__expiration_date__isnull=False,
    )

    if organization is not None:
        fallback_items = fallback_items.filter(organization=organization)

    fallback_items = fallback_items.annotate(
        has_expiry_batches=Exists(
            InventoryBatch.objects.filter(
                inventory_item=OuterRef('pk'),
                expiry_date__isnull=False,
                current_quantity__gt=0,
            )
        )
    ).filter(has_expiry_batches=False)

    if scope == 'expired':
        fallback_items = fallback_items.filter(product__expiration_date__lt=today)
    elif scope != 'all':
        fallback_items = fallback_items.filter(product__expiration_date__lte=cutoff_date)

    fallback_results = [
        {
            'id': f'product-{item.product_id}',
            'inventory_item': str(item.id),
            'product_name': item.product.name,
            'product_sku': item.product.sku,
            'batch_number': 'GENERAL',
            'serial_number': '',
            'manufacture_date': None,
            'expiry_date': item.product.expiration_date,
            'received_date': None,
            'supplier': None,
            'supplier_name': None,
            'purchase_order_id': '',
            'initial_quantity': int(item.quantity_on_hand or 0),
            'current_quantity': int(item.quantity_on_hand or 0),
            'reserved_quantity': int(item.quantity_reserved or 0),
            'unit_cost': str(item.average_cost or 0),
            'status': 'AVAILABLE',
            'quality_checked': False,
            'quality_notes': '',
            'is_expired': bool(item.product.expiration_date and item.product.expiration_date < today),
            'days_to_expiry': (item.product.expiration_date - today).days if item.product.expiration_date else None,
            'created_at': None,
            'updated_at': None,
        }
        for item in fallback_items
    ]

    results = batch_results + fallback_results
    results.sort(key=lambda row: row.get('expiry_date') or '9999-12-31')

    return Response({
        'count': len(results),
        'days': days,
        'scope': scope,
        'results': results,
    })


@api_view(['GET'])
def low_stock_products_view(request):
    low_stock_items = InventoryItem.objects.filter(
        stock_status='LOW_STOCK'
    ).select_related('product')
    
    return Response({'count': low_stock_items.count()})


@api_view(['GET'])
def inventory_stats_view(request):
    user = getattr(request, 'user', None)
    organization = getattr(user, 'organization', None)

    products_qs = Product.objects.filter(is_active=True)
    items_qs = InventoryItem.objects.all()
    alerts_qs = InventoryAlert.objects.filter(is_active=True)
    batches_qs = InventoryBatch.objects.all()

    if organization is not None:
        products_qs = products_qs.filter(organization=organization)
        items_qs = items_qs.filter(organization=organization)
        alerts_qs = alerts_qs.filter(inventory_item__organization=organization)
        batches_qs = batches_qs.filter(inventory_item__organization=organization)

    total_products = products_qs.count()
    total_value = items_qs.aggregate(Sum('total_value'))['total_value__sum'] or 0

    cutoff_90 = timezone.now().date() + timedelta(days=90)
    expiring_soon_count = batches_qs.filter(
        status='AVAILABLE',
        expiry_date__isnull=False,
        expiry_date__lte=cutoff_90,
        expiry_date__gte=timezone.now().date(),
        current_quantity__gt=0
    ).count()

    stats = {
        'total_products': total_products,
        'total_value': float(total_value),
        'low_stock_count': items_qs.filter(stock_status='LOW_STOCK').count(),
        'out_of_stock_count': items_qs.filter(stock_status='OUT_OF_STOCK').count(),
        'active_alerts': alerts_qs.count(),
        'expiring_soon_count': expiring_soon_count,
    }
    return Response(stats)


def _normalize_choice(value, choices, default=None):
    if not value:
        return default

    value_str = str(value).strip()
    if not value_str:
        return default

    valid_values = {choice[0] for choice in choices}
    if value_str in valid_values:
        return value_str

    normalized = value_str.upper().replace(' ', '_').replace('-', '_')
    if normalized in valid_values:
        return normalized

    for raw, label in choices:
        if str(label).strip().lower() == value_str.lower():
            return raw

    return default


def _extract_json_from_gemini_text(raw_text):
    if not raw_text:
        return {}

    stripped = raw_text.strip()
    try:
        parsed = json.loads(stripped)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        pass

    fenced = re.search(r"```(?:json)?\s*(\{[\s\S]*\})\s*```", stripped, re.IGNORECASE)
    if fenced:
        try:
            parsed = json.loads(fenced.group(1))
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            pass

    brace = re.search(r"\{[\s\S]*\}", stripped)
    if brace:
        try:
            parsed = json.loads(brace.group(0))
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            pass

    return {}


def _normalize_date_string(date_value):
    if not date_value:
        return ''

    value = str(date_value).strip()
    if not value:
        return ''

    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%Y/%m/%d'):
        try:
            return datetime.strptime(value, fmt).date().isoformat()
        except Exception:
            pass

    return ''


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def ai_extract_product_from_image_view(request):
    image_base64 = request.data.get('image_base64')
    mime_type = request.data.get('mime_type') or 'image/jpeg'

    if not image_base64 or not isinstance(image_base64, str):
        return Response({'detail': 'image_base64 is required'}, status=status.HTTP_400_BAD_REQUEST)

    gemini_api_key = getattr(settings, 'GEMINI_API_KEY', None) or config('GEMINI_API_KEY', default='')
    if not gemini_api_key:
        return Response({'detail': 'GEMINI_API_KEY is not configured on server'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    prompt = (
        "Analyze this product package image and extract product details for a pharmacy inventory form. "
        "Return ONLY valid JSON object with these keys: "
        "name, generic_name, brand_name, barcode, category, dosage_form, strength, "
        "manufacturer, unit_of_measure, pack_size, indication, storage_condition, "
        "requires_prescription, controlled_substance, expiration_date, notes. "
        "Use uppercase enum values when possible for category/dosage_form/unit_of_measure/storage_condition. "
        "For expiration_date, use YYYY-MM-DD format if visible. "
        "If unknown, return null for that field."
    )

    try:
        gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_api_key}"
        gemini_payload = {
            'contents': [
                {
                    'parts': [
                        {'text': prompt},
                        {'inline_data': {'mime_type': mime_type, 'data': image_base64}},
                    ]
                }
            ],
            'generationConfig': {
                'temperature': 0.1,
                'maxOutputTokens': 512,
                'responseMimeType': 'application/json',
            }
        }

        response = requests.post(gemini_url, json=gemini_payload, timeout=30)
        if response.status_code >= 400:
            return Response(
                {
                    'detail': 'Gemini request failed',
                    'provider_status': response.status_code,
                    'provider_body': response.text[:500],
                },
                status=status.HTTP_502_BAD_GATEWAY
            )

        body = response.json()
        generated_text = ''
        candidates = body.get('candidates') or []
        if candidates:
            parts = ((candidates[0].get('content') or {}).get('parts') or [])
            if parts:
                generated_text = parts[0].get('text') or ''

        extracted = _extract_json_from_gemini_text(generated_text)

        normalized = {
            'name': extracted.get('name') or '',
            'generic_name': extracted.get('generic_name') or '',
            'brand_name': extracted.get('brand_name') or '',
            'barcode': extracted.get('barcode') or '',
            'category': _normalize_choice(extracted.get('category'), ProductCategory.choices, default='MEDICATION'),
            'dosage_form': _normalize_choice(extracted.get('dosage_form'), DosageForm.choices, default='TABLET'),
            'strength': extracted.get('strength') or '',
            'manufacturer': extracted.get('manufacturer') or '',
            'unit_of_measure': _normalize_choice(extracted.get('unit_of_measure'), UnitOfMeasure.choices, default='UNIT'),
            'pack_size': extracted.get('pack_size') if extracted.get('pack_size') is not None else 1,
            'indication': extracted.get('indication') or '',
            'storage_condition': _normalize_choice(
                extracted.get('storage_condition'),
                Product._meta.get_field('storage_condition').choices,
                default='ROOM_TEMPERATURE'
            ),
            'requires_prescription': bool(extracted.get('requires_prescription')),
            'controlled_substance': bool(extracted.get('controlled_substance')),
            'expiration_date': _normalize_date_string(extracted.get('expiration_date')),
            'notes': extracted.get('notes') or '',
        }

        try:
            normalized['pack_size'] = max(1, int(normalized['pack_size']))
        except Exception:
            normalized['pack_size'] = 1

        return Response({'extracted': normalized, 'raw': extracted})
    except requests.RequestException as exc:
        return Response({'detail': f'Gemini network error: {exc}'}, status=status.HTTP_502_BAD_GATEWAY)
    except Exception as exc:
        return Response({'detail': f'Unexpected scan error: {exc}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def product_category_choices_view(request):
    """Get product category choices"""
    from .models import ProductCategory
    choices = [
        {'value': choice[0], 'label': choice[1]}
        for choice in ProductCategory.choices
    ]
    return Response(choices)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def dosage_form_choices_view(request):
    """Get dosage form choices"""
    from .models import DosageForm
    choices = [
        {'value': choice[0], 'label': choice[1]}
        for choice in DosageForm.choices
    ]
    return Response(choices)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def unit_of_measure_choices_view(request):
    """Get unit of measure choices"""
    from .models import UnitOfMeasure
    choices = [
        {'value': choice[0], 'label': choice[1]}
        for choice in UnitOfMeasure.choices
    ]
    return Response(choices)