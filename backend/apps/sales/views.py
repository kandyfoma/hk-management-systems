from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.db.models import Sum, Count
from django.utils import timezone
from decimal import Decimal
from .models import Sale, SaleItem, SalePayment, Cart, CartItem
from .serializers import (
    SaleListSerializer, SaleDetailSerializer, SaleCreateSerializer,
    SaleItemSerializer, SalePaymentSerializer, CartSerializer,
    CartItemSerializer, QuickSaleSerializer, VoidSaleSerializer,
    RefundSaleSerializer
)
from apps.inventory.models import InventoryItem, StockMovement
from apps.audit.decorators import audit_sale, audit_critical_action
from apps.audit.models import AuditActionType


class SaleListCreateAPIView(generics.ListCreateAPIView):
    queryset = Sale.objects.select_related('customer', 'cashier', 'organization')
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'type', 'payment_status']
    search_fields = ['sale_number', 'receipt_number', 'customer_name']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = getattr(self.request, 'user', None)
        organization = getattr(user, 'organization', None)
        if organization is not None:
            queryset = queryset.filter(organization=organization)
        return queryset

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return SaleCreateSerializer
        return SaleListSerializer

    def perform_create(self, serializer):
        facility_id = (
            self.request.data.get('facility_id')
            or self.request.query_params.get('facility_id')
            or 'pharmacy-main'
        )
        serializer.save(
            organization=self.request.user.organization,
            facility_id=facility_id,
            cashier=self.request.user,
            cashier_name=self.request.user.full_name,
            created_by=self.request.user
        )


class SaleDetailAPIView(generics.RetrieveUpdateAPIView):
    queryset = Sale.objects.select_related('customer', 'cashier', 'organization').prefetch_related('items', 'payments')
    serializer_class = SaleDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = getattr(self.request, 'user', None)
        organization = getattr(user, 'organization', None)
        if organization is not None:
            queryset = queryset.filter(organization=organization)
        return queryset

    def perform_update(self, serializer):
        # Track who voided if status is being set to VOIDED
        if serializer.validated_data.get('status') == 'VOIDED':
            serializer.save(voided_by=self.request.user, voided_at=timezone.now())
        else:
            serializer.save()


class SaleItemListAPIView(generics.ListAPIView):
    queryset = SaleItem.objects.select_related('sale', 'product')
    serializer_class = SaleItemSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['sale']
    ordering = ['id']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = getattr(self.request, 'user', None)
        organization = getattr(user, 'organization', None)
        if organization is not None:
            queryset = queryset.filter(sale__organization=organization)
        return queryset


class SalePaymentListAPIView(generics.ListAPIView):
    queryset = SalePayment.objects.select_related('sale', 'processed_by')
    serializer_class = SalePaymentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['payment_method', 'status']
    ordering = ['-processed_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = getattr(self.request, 'user', None)
        organization = getattr(user, 'organization', None)
        if organization is not None:
            queryset = queryset.filter(sale__organization=organization)
        return queryset


class CartDetailAPIView(generics.RetrieveAPIView):
    queryset = Cart.objects.prefetch_related('items')
    serializer_class = CartSerializer

    def get_object(self):
        cart, created = Cart.objects.get_or_create(
            user=self.request.user,
            organization=self.request.user.organization,
            is_active=True,
            defaults={'cart_name': 'Panier actuel'}
        )
        return cart


class CartItemListCreateAPIView(generics.ListCreateAPIView):
    queryset = CartItem.objects.select_related('cart', 'product')
    serializer_class = CartItemSerializer
    
    def get_queryset(self):
        cart, created = Cart.objects.get_or_create(
            user=self.request.user,
            organization=self.request.user.organization,
            is_active=True
        )
        return CartItem.objects.filter(cart=cart)


class CartItemDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = CartItem.objects.select_related('cart', 'product')
    serializer_class = CartItemSerializer


@api_view(['POST'])
def checkout_cart_view(request):
    try:
        cart = Cart.objects.get(
            user=request.user,
            organization=request.user.organization,
            is_active=True
        )
        # Implementation would create Sale from Cart
        return Response({'message': 'Checkout réussi', 'sale_id': 'placeholder'})
    except Cart.DoesNotExist:
        return Response({'error': 'Aucun panier actif trouvé'}, status=400)


@api_view(['GET'])
def daily_sales_report_view(request):
    date = request.GET.get('date', timezone.now().date())
    user = getattr(request, 'user', None)
    organization = getattr(user, 'organization', None)

    sales = Sale.objects.filter(
        created_at__date=date,
        status='COMPLETED'
    )
    if organization is not None:
        sales = sales.filter(organization=organization)
    
    stats = {
        'date': date,
        'total_sales': sales.count(),
        'total_amount': sales.aggregate(Sum('total_amount'))['total_amount__sum'] or 0,
        'total_items': sales.aggregate(Sum('item_count'))['item_count__sum'] or 0,
    }
    return Response(stats)


@api_view(['GET'])
def sales_stats_view(request):
    today = timezone.now().date()
    user = getattr(request, 'user', None)
    organization = getattr(user, 'organization', None)

    base_qs = Sale.objects.all()
    if organization is not None:
        base_qs = base_qs.filter(organization=organization)

    today_sales = base_qs.filter(created_at__date=today, status='COMPLETED')
    
    stats = {
        'today_sales_count': today_sales.count(),
        'today_sales_amount': today_sales.aggregate(Sum('total_amount'))['total_amount__sum'] or 0,
        'pending_sales': base_qs.filter(status='ON_HOLD').count(),
    }
    return Response(stats)


@api_view(['POST'])
@transaction.atomic
def void_sale_view(request, sale_id):
    """Void a completed sale and restore inventory."""
    serializer = VoidSaleSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    organization = getattr(user, 'organization', None)

    try:
        sale = Sale.objects.select_for_update().get(id=sale_id)
    except Sale.DoesNotExist:
        return Response({'error': 'Vente introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    if organization and sale.organization_id != organization.id:
        return Response({'error': 'Acc\u00e8s non autoris\u00e9.'}, status=status.HTTP_403_FORBIDDEN)

    if sale.status != 'COMPLETED':
        return Response(
            {'error': f"Impossible d'annuler une vente avec le statut '{sale.get_status_display()}'."},
            status=status.HTTP_400_BAD_REQUEST
        )

    void_reason = serializer.validated_data['void_reason']

    # Restore inventory for each sale item
    for item in sale.items.select_related('product'):
        inv_qs = InventoryItem.objects.filter(
            product=item.product,
            organization=sale.organization
        )
        if sale.facility_id:
            inv_qs = inv_qs.filter(facility_id=sale.facility_id)

        inv_item = inv_qs.select_for_update().first()
        if inv_item:
            prev_qty = int(inv_item.quantity_on_hand or 0)
            new_qty = prev_qty + item.quantity
            inv_item.quantity_on_hand = new_qty
            inv_item.last_movement = timezone.now()
            inv_item.save()

            StockMovement.objects.create(
                inventory_item=inv_item,
                movement_type='CUSTOMER_RETURN',
                direction='IN',
                quantity=item.quantity,
                unit_cost=item.unit_cost,
                total_cost=Decimal(str(item.unit_cost or 0)) * item.quantity,
                reference_number=sale.sale_number,
                sale_id=str(sale.id),
                movement_date=timezone.now(),
                balance_before=prev_qty,
                balance_after=new_qty,
                performed_by=user,
                created_by=user,
                reason=f'Annulation vente: {void_reason}',
            )

    sale.status = 'VOIDED'
    sale.void_reason = void_reason
    sale.voided_by = user
    sale.voided_at = timezone.now()
    sale.save()

    return Response({
        'message': 'Vente annul\u00e9e avec succ\u00e8s. Stock restaur\u00e9.',
        'sale_id': str(sale.id),
        'status': sale.status
    })


@api_view(['POST'])
@transaction.atomic
def refund_sale_view(request, sale_id):
    """Refund a completed sale (full or partial) and restore inventory."""
    serializer = RefundSaleSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    organization = getattr(user, 'organization', None)

    try:
        sale = Sale.objects.select_for_update().get(id=sale_id)
    except Sale.DoesNotExist:
        return Response({'error': 'Vente introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    if organization and sale.organization_id != organization.id:
        return Response({'error': 'Acc\u00e8s non autoris\u00e9.'}, status=status.HTTP_403_FORBIDDEN)

    if sale.status not in ('COMPLETED', 'PARTIAL_REFUND'):
        return Response(
            {'error': f"Impossible de rembourser une vente avec le statut '{sale.get_status_display()}'."},
            status=status.HTTP_400_BAD_REQUEST
        )

    items_to_refund = serializer.validated_data.get('items_to_refund', [])
    refund_reason = serializer.validated_data['refund_reason']
    is_full_refund = not items_to_refund

    if is_full_refund:
        # Refund all items
        sale_items = sale.items.select_related('product')
    else:
        item_ids = [i.get('item_id') for i in items_to_refund]
        sale_items = sale.items.filter(id__in=item_ids).select_related('product')

    refund_total = Decimal('0.00')

    for item in sale_items:
        refund_qty = item.quantity
        if not is_full_refund:
            # Find the matching refund request to get partial quantity
            match = next((i for i in items_to_refund if str(i.get('item_id')) == str(item.id)), None)
            if match and match.get('quantity'):
                refund_qty = min(int(match['quantity']), item.quantity)

        refund_total += item.unit_price * refund_qty

        # Restore inventory
        inv_qs = InventoryItem.objects.filter(
            product=item.product,
            organization=sale.organization
        )
        if sale.facility_id:
            inv_qs = inv_qs.filter(facility_id=sale.facility_id)

        inv_item = inv_qs.select_for_update().first()
        if inv_item:
            prev_qty = int(inv_item.quantity_on_hand or 0)
            new_qty = prev_qty + refund_qty
            inv_item.quantity_on_hand = new_qty
            inv_item.last_movement = timezone.now()
            inv_item.save()

            StockMovement.objects.create(
                inventory_item=inv_item,
                movement_type='CUSTOMER_RETURN',
                direction='IN',
                quantity=refund_qty,
                unit_cost=item.unit_cost,
                total_cost=Decimal(str(item.unit_cost or 0)) * refund_qty,
                reference_number=sale.sale_number,
                sale_id=str(sale.id),
                movement_date=timezone.now(),
                balance_before=prev_qty,
                balance_after=new_qty,
                performed_by=user,
                created_by=user,
                reason=f'Remboursement: {refund_reason}',
            )

    sale.status = 'REFUNDED' if is_full_refund else 'PARTIAL_REFUND'
    sale.save()

    return Response({
        'message': 'Remboursement effectu\u00e9 avec succ\u00e8s.',
        'sale_id': str(sale.id),
        'refund_total': float(refund_total),
        'status': sale.status
    })