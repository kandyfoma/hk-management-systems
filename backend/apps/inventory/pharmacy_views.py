"""
Pharmacy-specific views that aggregate data from multiple apps
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Count, Avg, F, Q
from django.utils import timezone
from datetime import timedelta, datetime
from decimal import Decimal

from .models import Product, InventoryItem, InventoryAlert, StockMovement
from apps.sales.models import Sale, SaleItem, SaleStatus
from apps.prescriptions.models import Prescription, PrescriptionStatus
from apps.suppliers.models import Supplier


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pharmacy_dashboard_metrics(request):
    """Get pharmacy dashboard metrics"""
    organization = request.user.organization
    today = timezone.now().date()
    
    # Daily sales
    daily_sales = Sale.objects.filter(
        organization=organization,
        sale_date=today,
        status=SaleStatus.COMPLETED
    ).aggregate(
        total_sales=Sum('total_amount'),
        count=Count('id')
    )
    
    # Prescriptions today
    prescriptions_today = Prescription.objects.filter(
        organization=organization,
        created_at__date=today
    ).count()
    
    # Products in stock
    products_in_stock = InventoryItem.objects.filter(
        organization=organization,
        quantity_on_hand__gt=0
    ).count()
    
    # Active alerts
    active_alerts = InventoryAlert.objects.filter(
        inventory_item__organization=organization,
        is_active=True
    ).count()
    
    # Calculate changes from yesterday
    yesterday = today - timedelta(days=1)
    yesterday_sales = Sale.objects.filter(
        organization=organization,
        sale_date=yesterday,
        status=SaleStatus.COMPLETED
    ).aggregate(total_sales=Sum('total_amount'))['total_sales'] or 0
    
    yesterday_prescriptions = Prescription.objects.filter(
        organization=organization,
        created_at__date=yesterday
    ).count()
    
    # Calculate percentage changes
    sales_change = 0
    if yesterday_sales > 0:
        sales_change = ((daily_sales['total_sales'] or 0) - yesterday_sales) / yesterday_sales * 100
    
    prescriptions_change = 0
    if yesterday_prescriptions > 0:
        prescriptions_change = (prescriptions_today - yesterday_prescriptions) / yesterday_prescriptions * 100
    
    return Response({
        'daily_sales': {
            'value': daily_sales['total_sales'] or 0,
            'count': daily_sales['count'] or 0,
            'change': round(sales_change, 1)
        },
        'prescriptions': {
            'value': prescriptions_today,
            'change': round(prescriptions_change, 1)
        },
        'products_in_stock': products_in_stock,
        'active_alerts': active_alerts
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pharmacy_top_products(request):
    """Get top selling products"""
    organization = request.user.organization
    days = int(request.GET.get('days', 30))
    limit = int(request.GET.get('limit', 5))
    
    start_date = timezone.now().date() - timedelta(days=days)
    
    top_products = SaleItem.objects.filter(
        sale__organization=organization,
        sale__sale_date__gte=start_date,
        sale__status=SaleStatus.COMPLETED
    ).values(
        'product__name',
        'product__id'
    ).annotate(
        total_sold=Sum('quantity'),
        total_revenue=Sum(F('quantity') * F('unit_price')),
        avg_price=Avg('unit_price')
    ).order_by('-total_sold')[:limit]
    
    # Get current stock for each product
    result = []
    for item in top_products:
        try:
            inventory_item = InventoryItem.objects.get(
                product_id=item['product__id'],
                organization=organization
            )
            stock = inventory_item.quantity_on_hand
        except InventoryItem.DoesNotExist:
            stock = 0
        
        result.append({
            'name': item['product__name'],
            'sold': item['total_sold'],
            'revenue': item['total_revenue'],
            'avg_price': item['avg_price'],
            'stock': stock
        })
    
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pharmacy_recent_sales(request):
    """Get recent sales transactions"""
    organization = request.user.organization
    limit = int(request.GET.get('limit', 10))
    
    recent_sales = Sale.objects.filter(
        organization=organization,
        status=SaleStatus.COMPLETED
    ).select_related('customer').order_by('-created_at')[:limit]
    
    result = []
    for sale in recent_sales:
        result.append({
            'id': str(sale.id),
            'sale_number': sale.sale_number,
            'customer_name': sale.customer_name or 'Client anonyme',
            'total_amount': sale.total_amount,
            'item_count': sale.items.count(),
            'created_at': sale.created_at,
            'payment_status': sale.payment_status
        })
    
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pharmacy_analytics_overview(request):
    """Get comprehensive pharmacy analytics"""
    organization = request.user.organization
    days = int(request.GET.get('days', 30))
    
    end_date = timezone.now().date()
    start_date = end_date - timedelta(days=days)
    
    # Sales analytics
    sales_data = Sale.objects.filter(
        organization=organization,
        sale_date__range=[start_date, end_date],
        status=SaleStatus.COMPLETED
    ).aggregate(
        total_revenue=Sum('total_amount'),
        total_cost=Sum('cost_amount'),
        total_sales=Count('id'),
        avg_sale_value=Avg('total_amount')
    )
    
    # Calculate profit
    profit = (sales_data['total_revenue'] or 0) - (sales_data['total_cost'] or 0)
    profit_margin = 0
    if sales_data['total_revenue']:
        profit_margin = (profit / sales_data['total_revenue']) * 100
    
    # Customer metrics
    unique_customers = Sale.objects.filter(
        organization=organization,
        sale_date__range=[start_date, end_date],
        status=SaleStatus.COMPLETED,
        customer__isnull=False
    ).values('customer').distinct().count()
    
    # Prescription metrics
    prescription_stats = Prescription.objects.filter(
        organization=organization,
        created_at__date__range=[start_date, end_date]
    ).aggregate(
        total_prescriptions=Count('id'),
        completed_prescriptions=Count('id', filter=Q(status=PrescriptionStatus.DISPENSED)),
        pending_prescriptions=Count('id', filter=Q(status=PrescriptionStatus.PENDING))
    )
    
    # Inventory value
    inventory_value = InventoryItem.objects.filter(
        organization=organization
    ).aggregate(
        total_value=Sum(F('quantity_on_hand') * F('unit_cost'))
    )['total_value'] or 0
    
    return Response({
        'financial': {
            'total_revenue': sales_data['total_revenue'] or 0,
            'total_cost': sales_data['total_cost'] or 0,
            'profit': profit,
            'profit_margin': round(profit_margin, 2)
        },
        'sales': {
            'total_sales': sales_data['total_sales'] or 0,
            'avg_sale_value': sales_data['avg_sale_value'] or 0,
            'unique_customers': unique_customers
        },
        'prescriptions': prescription_stats,
        'inventory': {
            'total_value': inventory_value,
            'total_products': Product.objects.filter(organization=organization, is_active=True).count()
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pharmacy_stock_alerts(request):
    """Get active stock alerts with details"""
    organization = request.user.organization
    
    alerts = InventoryAlert.objects.filter(
        inventory_item__organization=organization,
        is_active=True
    ).select_related(
        'inventory_item__product'
    ).order_by('-created_at')
    
    result = []
    for alert in alerts:
        result.append({
            'id': str(alert.id),
            'type': alert.alert_type,
            'severity': alert.severity,
            'product_name': alert.inventory_item.product.name,
            'current_stock': alert.inventory_item.quantity_on_hand,
            'minimum_stock': alert.inventory_item.minimum_stock,
            'message': alert.message,
            'created_at': alert.created_at,
            'acknowledged': alert.acknowledged,
            'acknowledged_at': alert.acknowledged_at
        })
    
    return Response(result)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def acknowledge_alert(request, alert_id):
    """Acknowledge a stock alert"""
    try:
        alert = InventoryAlert.objects.get(
            id=alert_id,
            inventory_item__organization=request.user.organization
        )
        alert.acknowledged = True
        alert.acknowledged_by = request.user
        alert.acknowledged_at = timezone.now()
        alert.save()
        
        return Response({'message': 'Alert acknowledged successfully'})
    except InventoryAlert.DoesNotExist:
        return Response({'error': 'Alert not found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pharmacy_sales_reports(request):
    """Get sales reports with various breakdowns"""
    organization = request.user.organization
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    
    if not start_date or not end_date:
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=30)
    else:
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
    
    # Sales by payment method
    payment_methods = Sale.objects.filter(
        organization=organization,
        sale_date__range=[start_date, end_date],
        status=SaleStatus.COMPLETED
    ).values('payments__payment_method').annotate(
        total_amount=Sum('total_amount'),
        count=Count('id')
    )
    
    # Daily sales trend
    daily_sales = Sale.objects.filter(
        organization=organization,
        sale_date__range=[start_date, end_date],
        status=SaleStatus.COMPLETED
    ).values('sale_date').annotate(
        daily_total=Sum('total_amount'),
        daily_count=Count('id')
    ).order_by('sale_date')
    
    # Top products by revenue
    top_products_revenue = SaleItem.objects.filter(
        sale__organization=organization,
        sale__sale_date__range=[start_date, end_date],
        sale__status=SaleStatus.COMPLETED
    ).values('product__name').annotate(
        revenue=Sum(F('quantity') * F('unit_price')),
        quantity_sold=Sum('quantity')
    ).order_by('-revenue')[:10]
    
    return Response({
        'period': {
            'start_date': start_date,
            'end_date': end_date
        },
        'payment_methods': payment_methods,
        'daily_trends': daily_sales,
        'top_products_by_revenue': top_products_revenue
    })