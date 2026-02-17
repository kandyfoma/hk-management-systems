from django.urls import path
from . import views

app_name = 'inventory'

urlpatterns = [
    # Products
    path('products/', views.ProductListCreateAPIView.as_view(), name='product_list_create'),
    path('products/<uuid:pk>/', views.ProductDetailAPIView.as_view(), name='product_detail'),
    
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
    
    # Choices
    path('choices/categories/', views.product_category_choices_view, name='product_categories'),
    path('choices/dosage-forms/', views.dosage_form_choices_view, name='dosage_forms'),
    path('choices/units/', views.unit_of_measure_choices_view, name='units'),
]