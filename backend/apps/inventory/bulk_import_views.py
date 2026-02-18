"""
Bulk import views for inventory products.
Handles JSON-based product imports from the frontend.
Edge cases handled:
  - Duplicate SKUs within same organization
  - Missing / blank required fields
  - Invalid enum values (category, dosage_form, unit_of_measure, storage_condition)
  - Negative or non-numeric prices / stock levels
  - Atomic transaction: if any row fails, that row is skipped (others still import)
  - Auto-generates SKU if missing
  - Creates InventoryItem + initial StockMovement for each imported product
"""
import uuid
import re
from decimal import Decimal, InvalidOperation
from django.db import transaction
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import (
    Product, InventoryItem, StockMovement,
    ProductCategory, DosageForm, UnitOfMeasure, StorageCondition,
)


# ─── Valid choice maps (lower-cased label → value) for flexible matching ───

def _build_choice_map(choices_class):
    """Build a lookup dict:  value→value  +  lower(label)→value  +  lower(value)→value"""
    m = {}
    for val, label in choices_class.choices:
        m[val] = val
        m[val.lower()] = val
        m[label.lower()] = val
        # Also handle without underscores / dashes
        m[val.replace('_', '').lower()] = val
        m[val.replace('_', ' ').lower()] = val
    return m

CATEGORY_MAP = _build_choice_map(ProductCategory)
DOSAGE_FORM_MAP = _build_choice_map(DosageForm)
UNIT_MAP = _build_choice_map(UnitOfMeasure)
STORAGE_MAP = _build_choice_map(StorageCondition)


def _safe_decimal(value, default=None):
    """Convert to Decimal safely, return default on failure."""
    if value is None or str(value).strip() == '':
        return default
    try:
        d = Decimal(str(value).strip().replace(',', '.').replace(' ', ''))
        if d < 0:
            return default
        return d
    except (InvalidOperation, ValueError):
        return default


def _safe_int(value, default=0, allow_negative=False):
    """Convert to int safely."""
    if value is None or str(value).strip() == '':
        return default
    try:
        i = int(float(str(value).strip().replace(',', '.').replace(' ', '')))
        if not allow_negative and i < 0:
            return default
        return i
    except (ValueError, TypeError):
        return default


def _safe_bool(value, default=False):
    """Convert to bool safely."""
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    s = str(value).strip().lower()
    if s in ('1', 'true', 'oui', 'yes', 'vrai', 'x'):
        return True
    if s in ('0', 'false', 'non', 'no', 'faux', ''):
        return False
    return default


def _resolve_enum(value, choice_map, default):
    """Resolve a string to a valid enum value using the choice map."""
    if value is None or str(value).strip() == '':
        return default
    key = str(value).strip().lower()
    return choice_map.get(key, default)


def _generate_sku(name, idx):
    """Auto-generate a SKU from the product name."""
    # Take first 3 chars of each word, uppercase, max 10 chars + numeric suffix
    words = re.sub(r'[^a-zA-Z0-9\s]', '', name).split()
    base = ''.join(w[:3].upper() for w in words[:3])
    if not base:
        base = 'PROD'
    return f"{base}-{idx:04d}"


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_import_products_view(request):
    """
    Bulk import products from JSON data (parsed from Excel on frontend).
    
    Expected payload:
    {
        "products": [
            {
                "name": "Paracétamol 500mg",
                "generic_name": "Paracétamol",
                "sku": "PARA-500",           // optional, auto-generated if missing
                "category": "MEDICATION",
                "dosage_form": "TABLET",
                "unit_of_measure": "TABLET",
                "strength": "500mg",
                "manufacturer": "Denk Pharma",
                "cost_price": 500,
                "selling_price": 1000,
                "quantity": 200,              // initial stock quantity
                "reorder_level": 50,
                "min_stock_level": 20,
                "max_stock_level": 500,
                "requires_prescription": false,
                "storage_condition": "ROOM_TEMPERATURE",
                "barcode": "",
                "notes": ""
            },
            ...
        ]
    }
    """
    user = request.user
    
    # Verify user has an organization
    if not hasattr(user, 'organization') or user.organization is None:
        return Response(
            {'error': 'Votre compte n\'est pas associé à une organisation.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    org = user.organization
    products_data = request.data.get('products', [])
    
    if not products_data:
        return Response(
            {'error': 'Aucune donnée de produit fournie.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not isinstance(products_data, list):
        return Response(
            {'error': 'Le format des données est invalide. Attendu: liste de produits.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Pre-fetch existing SKUs for this org to check duplicates
    existing_skus = set(
        Product.objects.filter(organization=org)
        .values_list('sku', flat=True)
    )
    
    created_products = []
    updated_products = []
    errors = []
    sku_counter = Product.objects.filter(organization=org).count() + 1
    
    # Track SKUs being created in this batch to avoid intra-batch duplicates
    batch_skus = set()
    
    for idx, row in enumerate(products_data):
        row_num = idx + 1
        
        try:
            # ── Validate required field: name ──
            name = str(row.get('name', '')).strip()
            if not name:
                errors.append({
                    'row': row_num,
                    'field': 'name',
                    'message': f'Ligne {row_num}: Le nom du produit est requis.'
                })
                continue
            
            # ── SKU handling ──
            sku = str(row.get('sku', '')).strip()
            if not sku:
                # Auto-generate SKU
                sku = _generate_sku(name, sku_counter)
                sku_counter += 1
                # Make sure auto-generated SKU is unique
                while sku in existing_skus or sku in batch_skus:
                    sku_counter += 1
                    sku = _generate_sku(name, sku_counter)
            
            # ── Check for duplicate SKU ──
            is_update = False
            existing_product = None
            if sku in existing_skus:
                # Try to update existing product
                try:
                    existing_product = Product.objects.get(organization=org, sku=sku)
                    is_update = True
                except Product.DoesNotExist:
                    pass
            elif sku in batch_skus:
                errors.append({
                    'row': row_num,
                    'field': 'sku',
                    'message': f'Ligne {row_num}: SKU "{sku}" est en double dans le fichier d\'import.'
                })
                continue
            
            # ── Resolve enum fields ──
            category = _resolve_enum(row.get('category'), CATEGORY_MAP, 'MEDICATION')
            dosage_form = _resolve_enum(row.get('dosage_form'), DOSAGE_FORM_MAP, 'TABLET')
            unit_of_measure = _resolve_enum(row.get('unit_of_measure'), UNIT_MAP, 'UNIT')
            storage_condition = _resolve_enum(row.get('storage_condition'), STORAGE_MAP, 'ROOM_TEMPERATURE')
            
            # ── Parse numeric fields safely ──
            cost_price = _safe_decimal(row.get('cost_price'))
            selling_price = _safe_decimal(row.get('selling_price'))
            quantity = _safe_int(row.get('quantity'), default=0)
            reorder_level = _safe_int(row.get('reorder_level'), default=10)
            min_stock_level = _safe_int(row.get('min_stock_level'), default=5)
            max_stock_level = _safe_int(row.get('max_stock_level'), default=None)
            reorder_quantity = _safe_int(row.get('reorder_quantity'), default=0)
            pack_size = _safe_int(row.get('pack_size'), default=1)
            if pack_size < 1:
                pack_size = 1
            
            # ── Calculate markup if both prices exist ──
            markup_percentage = None
            if cost_price and selling_price and cost_price > 0:
                markup_percentage = ((selling_price - cost_price) / cost_price * 100).quantize(Decimal('0.01'))
            
            # ── Parse boolean fields ──
            requires_prescription = _safe_bool(row.get('requires_prescription'))
            controlled_substance = _safe_bool(row.get('controlled_substance'))
            track_expiry = _safe_bool(row.get('track_expiry'), default=True)
            track_batches = _safe_bool(row.get('track_batches'), default=True)
            
            # ── Perform create or update in a transaction ──
            with transaction.atomic():
                if is_update and existing_product:
                    # Update existing product
                    existing_product.name = name
                    existing_product.generic_name = str(row.get('generic_name', '')).strip()
                    existing_product.category = category
                    existing_product.dosage_form = dosage_form
                    existing_product.unit_of_measure = unit_of_measure
                    existing_product.strength = str(row.get('strength', '')).strip()
                    existing_product.manufacturer = str(row.get('manufacturer', '')).strip()
                    existing_product.cost_price = cost_price
                    existing_product.selling_price = selling_price
                    existing_product.markup_percentage = markup_percentage
                    existing_product.reorder_level = reorder_level
                    existing_product.min_stock_level = min_stock_level
                    existing_product.max_stock_level = max_stock_level if max_stock_level else None
                    existing_product.requires_prescription = requires_prescription
                    existing_product.controlled_substance = controlled_substance
                    existing_product.storage_condition = storage_condition
                    existing_product.barcode = str(row.get('barcode', '')).strip()
                    existing_product.notes = str(row.get('notes', '')).strip()
                    existing_product.updated_by = user
                    existing_product.save()
                    
                    # Update inventory item quantity if provided
                    if quantity > 0:
                        inv_item, inv_created = InventoryItem.objects.get_or_create(
                            product=existing_product,
                            organization=org,
                            defaults={
                                'facility_id': str(org.id)[:8],
                                'quantity_on_hand': quantity,
                                'quantity_available': quantity,
                                'average_cost': cost_price or Decimal('0'),
                                'total_value': (cost_price or Decimal('0')) * quantity,
                                'stock_status': 'IN_STOCK',
                                'last_received': timezone.now(),
                                'last_movement': timezone.now(),
                            }
                        )
                        if not inv_created:
                            balance_before = inv_item.quantity_on_hand
                            inv_item.quantity_on_hand = quantity
                            inv_item.quantity_available = quantity - inv_item.quantity_reserved
                            inv_item.average_cost = cost_price or inv_item.average_cost
                            inv_item.total_value = (inv_item.average_cost or Decimal('0')) * quantity
                            inv_item.last_movement = timezone.now()
                            inv_item.last_received = timezone.now()
                            
                            # Determine stock status
                            if quantity <= 0:
                                inv_item.stock_status = 'OUT_OF_STOCK'
                            elif min_stock_level and quantity <= min_stock_level:
                                inv_item.stock_status = 'LOW_STOCK'
                            elif max_stock_level and quantity > max_stock_level:
                                inv_item.stock_status = 'OVER_STOCK'
                            else:
                                inv_item.stock_status = 'IN_STOCK'
                            inv_item.save()
                            
                            # Create stock movement record
                            if quantity != balance_before:
                                StockMovement.objects.create(
                                    inventory_item=inv_item,
                                    movement_type='ADJUSTMENT_IN' if quantity > balance_before else 'ADJUSTMENT_OUT',
                                    direction='IN' if quantity > balance_before else 'OUT',
                                    quantity=abs(quantity - balance_before),
                                    unit_cost=cost_price or Decimal('0'),
                                    total_cost=(cost_price or Decimal('0')) * abs(quantity - balance_before),
                                    reason='Import inventaire (mise à jour)',
                                    notes=f'Import en masse - Ligne {row_num}',
                                    movement_date=timezone.now(),
                                    balance_before=balance_before,
                                    balance_after=quantity,
                                    performed_by=user,
                                    created_by=user,
                                )
                    
                    updated_products.append({
                        'row': row_num,
                        'id': str(existing_product.id),
                        'name': existing_product.name,
                        'sku': existing_product.sku,
                        'action': 'updated'
                    })
                else:
                    # Create new product
                    product = Product.objects.create(
                        organization=org,
                        name=name,
                        generic_name=str(row.get('generic_name', '')).strip(),
                        brand_name=str(row.get('brand_name', '')).strip(),
                        sku=sku,
                        barcode=str(row.get('barcode', '')).strip(),
                        category=category,
                        dosage_form=dosage_form,
                        strength=str(row.get('strength', '')).strip(),
                        unit_of_measure=unit_of_measure,
                        pack_size=pack_size,
                        manufacturer=str(row.get('manufacturer', '')).strip(),
                        manufacturer_country=str(row.get('manufacturer_country', '')).strip(),
                        storage_condition=storage_condition,
                        track_expiry=track_expiry,
                        track_batches=track_batches,
                        cost_price=cost_price,
                        selling_price=selling_price,
                        markup_percentage=markup_percentage,
                        currency='CDF',
                        reorder_level=reorder_level,
                        reorder_quantity=reorder_quantity,
                        max_stock_level=max_stock_level if max_stock_level else None,
                        min_stock_level=min_stock_level,
                        requires_prescription=requires_prescription,
                        controlled_substance=controlled_substance,
                        indication=str(row.get('indication', '')).strip(),
                        notes=str(row.get('notes', '')).strip(),
                        is_active=True,
                        created_by=user,
                    )
                    
                    # Create InventoryItem for this product
                    inv_item = InventoryItem.objects.create(
                        product=product,
                        organization=org,
                        facility_id=str(org.id)[:8],
                        quantity_on_hand=quantity,
                        quantity_available=quantity,
                        quantity_reserved=0,
                        quantity_on_order=0,
                        average_cost=cost_price or Decimal('0'),
                        total_value=(cost_price or Decimal('0')) * quantity,
                        stock_status='IN_STOCK' if quantity > 0 else 'OUT_OF_STOCK',
                        last_received=timezone.now() if quantity > 0 else None,
                        last_movement=timezone.now() if quantity > 0 else None,
                    )
                    
                    # Create initial stock movement if there is stock
                    if quantity > 0:
                        StockMovement.objects.create(
                            inventory_item=inv_item,
                            movement_type='INITIAL_STOCK',
                            direction='IN',
                            quantity=quantity,
                            unit_cost=cost_price or Decimal('0'),
                            total_cost=(cost_price or Decimal('0')) * quantity,
                            reason='Import inventaire initial',
                            notes=f'Import en masse - Ligne {row_num}',
                            movement_date=timezone.now(),
                            balance_before=0,
                            balance_after=quantity,
                            performed_by=user,
                            created_by=user,
                        )
                    
                    batch_skus.add(sku)
                    existing_skus.add(sku)
                    
                    created_products.append({
                        'row': row_num,
                        'id': str(product.id),
                        'name': product.name,
                        'sku': product.sku,
                        'quantity': quantity,
                        'action': 'created'
                    })
                    
        except Exception as e:
            errors.append({
                'row': row_num,
                'field': 'general',
                'message': f'Ligne {row_num}: {str(e)}'
            })
    
    total_processed = len(created_products) + len(updated_products)
    
    return Response({
        'success': True,
        'summary': {
            'total_rows': len(products_data),
            'created': len(created_products),
            'updated': len(updated_products),
            'errors': len(errors),
            'total_processed': total_processed,
        },
        'created_products': created_products,
        'updated_products': updated_products,
        'errors': errors,
    }, status=status.HTTP_200_OK if total_processed > 0 else status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def inventory_template_fields_view(request):
    """Return the template structure for Excel import so frontend can generate it."""
    return Response({
        'fields': [
            {'key': 'name', 'label': 'Nom du produit', 'required': True, 'type': 'text'},
            {'key': 'generic_name', 'label': 'Nom générique (DCI)', 'required': False, 'type': 'text'},
            {'key': 'sku', 'label': 'Code article (SKU)', 'required': False, 'type': 'text', 'note': 'Auto-généré si vide'},
            {'key': 'barcode', 'label': 'Code-barres', 'required': False, 'type': 'text'},
            {'key': 'category', 'label': 'Catégorie', 'required': True, 'type': 'enum',
             'options': [{'value': v, 'label': l} for v, l in ProductCategory.choices]},
            {'key': 'dosage_form', 'label': 'Forme galénique', 'required': True, 'type': 'enum',
             'options': [{'value': v, 'label': l} for v, l in DosageForm.choices]},
            {'key': 'strength', 'label': 'Dosage', 'required': False, 'type': 'text'},
            {'key': 'unit_of_measure', 'label': 'Unité de mesure', 'required': False, 'type': 'enum',
             'options': [{'value': v, 'label': l} for v, l in UnitOfMeasure.choices]},
            {'key': 'manufacturer', 'label': 'Fabricant', 'required': False, 'type': 'text'},
            {'key': 'cost_price', 'label': 'Prix d\'achat (CDF)', 'required': False, 'type': 'number'},
            {'key': 'selling_price', 'label': 'Prix de vente (CDF)', 'required': False, 'type': 'number'},
            {'key': 'quantity', 'label': 'Quantité en stock', 'required': False, 'type': 'number'},
            {'key': 'reorder_level', 'label': 'Seuil réappro.', 'required': False, 'type': 'number'},
            {'key': 'min_stock_level', 'label': 'Stock minimum', 'required': False, 'type': 'number'},
            {'key': 'max_stock_level', 'label': 'Stock maximum', 'required': False, 'type': 'number'},
            {'key': 'requires_prescription', 'label': 'Ordonnance requise', 'required': False, 'type': 'boolean'},
            {'key': 'storage_condition', 'label': 'Condition stockage', 'required': False, 'type': 'enum',
             'options': [{'value': v, 'label': l} for v, l in StorageCondition.choices]},
            {'key': 'notes', 'label': 'Notes', 'required': False, 'type': 'text'},
        ]
    })
