from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum
from django.utils import timezone
from datetime import timedelta
from .models import (
    Product, InventoryItem, InventoryBatch, StockMovement, InventoryAlert,
    ProductCategory, DosageForm, UnitOfMeasure
)
from .serializers import (
    ProductSerializer, InventoryItemSerializer, InventoryBatchSerializer,
    StockMovementSerializer, InventoryAlertSerializer
)
from apps.audit.decorators import audit_inventory_change, audit_critical_action


class ProductListCreateAPIView(generics.ListCreateAPIView):
    queryset = Product.objects.select_related('organization', 'primary_supplier')
    serializer_class = ProductSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['category', 'is_active', 'requires_prescription']
    search_fields = ['name', 'sku', 'barcode']
    ordering = ['name']

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class ProductDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Product.objects.select_related('organization', 'primary_supplier')
    serializer_class = ProductSerializer


class InventoryItemListAPIView(generics.ListAPIView):
    queryset = InventoryItem.objects.select_related('product', 'organization')
    serializer_class = InventoryItemSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['stock_status']
    ordering = ['-last_movement']


class InventoryItemDetailAPIView(generics.RetrieveUpdateAPIView):
    queryset = InventoryItem.objects.select_related('product', 'organization')
    serializer_class = InventoryItemSerializer


class InventoryBatchListAPIView(generics.ListCreateAPIView):
    queryset = InventoryBatch.objects.select_related('inventory_item__product')
    serializer_class = InventoryBatchSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status']
    ordering = ['expiry_date']


class InventoryBatchDetailAPIView(generics.RetrieveUpdateAPIView):
    queryset = InventoryBatch.objects.select_related('inventory_item__product')
    serializer_class = InventoryBatchSerializer


class StockMovementListAPIView(generics.ListAPIView):
    queryset = StockMovement.objects.select_related('inventory_item__product', 'performed_by')
    serializer_class = StockMovementSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['movement_type', 'direction']
    ordering = ['-movement_date']


class InventoryAlertListAPIView(generics.ListAPIView):
    queryset = InventoryAlert.objects.select_related('product')
    serializer_class = InventoryAlertSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['alert_type', 'severity', 'is_active']
    ordering = ['-created_at']


class InventoryAlertDetailAPIView(generics.RetrieveUpdateAPIView):
    queryset = InventoryAlert.objects.select_related('product')
    serializer_class = InventoryAlertSerializer


@api_view(['GET'])
@audit_inventory_change(description="Consultation produits expirant")
def expiring_products_view(request):
    days = request.GET.get('days', 30)
    try:
        days = int(days)
    except ValueError:
        days = 30
    
    cutoff_date = timezone.now().date() + timedelta(days=days)
    batches = InventoryBatch.objects.filter(
        status='AVAILABLE',
        expiry_date__lte=cutoff_date,
        current_quantity__gt=0
    ).select_related('inventory_item__product')
    
    return Response({'count': batches.count(), 'days': days})


@api_view(['GET'])
def low_stock_products_view(request):
    low_stock_items = InventoryItem.objects.filter(
        stock_status='LOW_STOCK'
    ).select_related('product')
    
    return Response({'count': low_stock_items.count()})


@api_view(['GET'])
def inventory_stats_view(request):
    total_products = Product.objects.filter(is_active=True).count()
    total_value = InventoryItem.objects.aggregate(Sum('total_value'))['total_value__sum'] or 0
    
    stats = {
        'total_products': total_products,
        'total_value': total_value,
        'low_stock_count': InventoryItem.objects.filter(stock_status='LOW_STOCK').count(),
        'out_of_stock_count': InventoryItem.objects.filter(stock_status='OUT_OF_STOCK').count(),
        'active_alerts': InventoryAlert.objects.filter(is_active=True).count(),
    }
    return Response(stats)