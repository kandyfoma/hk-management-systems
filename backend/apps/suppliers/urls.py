from django.urls import path
from . import views

app_name = 'suppliers'

urlpatterns = [
    path('', views.SupplierListCreateAPIView.as_view(), name='supplier_list_create'),
    path('<uuid:pk>/', views.SupplierDetailAPIView.as_view(), name='supplier_detail'),
    path('choices/payment-terms/', views.payment_terms_choices_view, name='payment_terms_choices'),
]