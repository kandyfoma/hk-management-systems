from django.urls import path
from . import views

app_name = 'sales'

urlpatterns = [
    # Sales
    path('', views.SaleListCreateAPIView.as_view(), name='sale_list_create'),
    path('<uuid:pk>/', views.SaleDetailAPIView.as_view(), name='sale_detail'),
    
    # Sale Items
    path('items/', views.SaleItemListAPIView.as_view(), name='sale_item_list'),
    
    # Payments
    path('payments/', views.SalePaymentListAPIView.as_view(), name='sale_payment_list'),
    
    # Cart Management
    path('cart/', views.CartDetailAPIView.as_view(), name='cart_detail'),
    path('cart/items/', views.CartItemListCreateAPIView.as_view(), name='cart_item_list_create'),
    path('cart/items/<uuid:pk>/', views.CartItemDetailAPIView.as_view(), name='cart_item_detail'),
    path('cart/checkout/', views.checkout_cart_view, name='checkout_cart'),
    
    # Reports
    path('reports/daily/', views.daily_sales_report_view, name='daily_sales_report'),
    path('reports/stats/', views.sales_stats_view, name='sales_stats'),
    
    # Void/Refund
    path('<uuid:sale_id>/void/', views.void_sale_view, name='void_sale'),
    path('<uuid:sale_id>/refund/', views.refund_sale_view, name='refund_sale'),
]