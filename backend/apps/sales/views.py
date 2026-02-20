from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Count
from django.utils import timezone
from .models import Sale, SaleItem, SalePayment, Cart, CartItem
from .serializers import (
    SaleListSerializer, SaleDetailSerializer, SaleCreateSerializer,
    SaleItemSerializer, SalePaymentSerializer, CartSerializer,
    CartItemSerializer, QuickSaleSerializer
)
from apps.audit.decorators import audit_sale, audit_critical_action
from apps.audit.models import AuditActionType


class SaleListCreateAPIView(generics.ListCreateAPIView):
    queryset = Sale.objects.select_related('customer', 'cashier', 'organization')
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'type', 'payment_status']
    search_fields = ['sale_number', 'receipt_number', 'customer_name']
    ordering = ['-created_at']

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


class SalePaymentListAPIView(generics.ListAPIView):
    queryset = SalePayment.objects.select_related('sale', 'processed_by')
    serializer_class = SalePaymentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['payment_method', 'status']
    ordering = ['-processed_at']


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
    sales = Sale.objects.filter(
        created_at__date=date,
        status='COMPLETED'
    )
    
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
    today_sales = Sale.objects.filter(created_at__date=today, status='COMPLETED')
    
    stats = {
        'today_sales_count': today_sales.count(),
        'today_sales_amount': today_sales.aggregate(Sum('total_amount'))['total_amount__sum'] or 0,
        'pending_sales': Sale.objects.filter(status='ON_HOLD').count(),
    }
    return Response(stats)