from django.urls import path
from . import views
from . import pharmacy_views
from . import bulk_import_views

app_name = 'inventory'

urlpatterns = [
    # Products
    path('products/', views.ProductListCreateAPIView.as_view(), name='product_list_create'),
    path('products/<uuid:pk>/', views.ProductDetailAPIView.as_view(), name='product_detail'),
    
    # Bulk Import
    path('products/bulk-import/', bulk_import_views.bulk_import_products_view, name='bulk_import_products'),
    path('products/import-template/', bulk_import_views.inventory_template_fields_view, name='import_template'),
    
    # Inventory Items
    path('items/', views.InventoryItemListAPIView.as_view(), name='inventory_item_list'),
    path('items/<uuid:pk>/', views.InventoryItemDetailAPIView.as_view(), name='inventory_item_detail'),
    
    # Batches
    path('batches/', views.InventoryBatchListAPIView.as_view(), name='inventory_batch_list'),
    path('batches/<uuid:pk>/', views.InventoryBatchDetailAPIView.as_view(), name='inventory_batch_detail'),
    
    # Stock Movements
    path('movements/', views.StockMovementListAPIView.as_view(), name='stock_movement_list'),
    path('movements/<uuid:pk>/', views.StockMovementDetailAPIView.as_view(), name='stock_movement_detail'),
    
    # Alerts
    path('alerts/', views.InventoryAlertListAPIView.as_view(), name='inventory_alert_list'),
    path('alerts/<uuid:pk>/', views.InventoryAlertDetailAPIView.as_view(), name='inventory_alert_detail'),
    
    # Reports
    path('reports/expiring/', views.expiring_products_view, name='expiring_products'),
    path('reports/low-stock/', views.low_stock_products_view, name='low_stock_products'),
    path('reports/stats/', views.inventory_stats_view, name='inventory_stats'),
    
    # Pharmacy-specific endpoints
    path('pharmacy/dashboard/metrics/', pharmacy_views.pharmacy_dashboard_metrics, name='pharmacy_dashboard_metrics'),
    path('pharmacy/dashboard/top-products/', pharmacy_views.pharmacy_top_products, name='pharmacy_top_products'),
    path('pharmacy/dashboard/recent-sales/', pharmacy_views.pharmacy_recent_sales, name='pharmacy_recent_sales'),
    path('pharmacy/analytics/overview/', pharmacy_views.pharmacy_analytics_overview, name='pharmacy_analytics_overview'),
    path('pharmacy/alerts/active/', pharmacy_views.pharmacy_stock_alerts, name='pharmacy_stock_alerts'),
    path('pharmacy/alerts/<uuid:alert_id>/acknowledge/', pharmacy_views.acknowledge_alert, name='acknowledge_alert'),
    path('pharmacy/reports/sales/', pharmacy_views.pharmacy_sales_reports, name='pharmacy_sales_reports'),
    path('pharmacy/reports/overview/', pharmacy_views.pharmacy_reports_overview, name='pharmacy_reports_overview'),
    
    # Choices
    path('choices/categories/', views.product_category_choices_view, name='product_categories'),
    path('choices/dosage-forms/', views.dosage_form_choices_view, name='dosage_forms'),
    path('choices/units/', views.unit_of_measure_choices_view, name='units'),
]