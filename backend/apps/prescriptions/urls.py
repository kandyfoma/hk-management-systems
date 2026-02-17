from django.urls import path
from . import views

app_name = 'prescriptions'

urlpatterns = [
    # Prescriptions
    path('', views.PrescriptionListCreateAPIView.as_view(), name='prescription_list_create'),
    path('<uuid:pk>/', views.PrescriptionDetailAPIView.as_view(), name='prescription_detail'),
    
    # Prescription Items
    path('<uuid:prescription_id>/items/', views.PrescriptionItemListCreateAPIView.as_view(), name='prescription_item_list_create'),
    path('items/<uuid:pk>/', views.PrescriptionItemDetailAPIView.as_view(), name='prescription_item_detail'),
    
    # Dispensing
    path('<uuid:prescription_id>/dispense/', views.dispense_prescription_view, name='dispense_prescription'),
    path('items/<uuid:item_id>/dispense/', views.dispense_item_view, name='dispense_item'),
    
    # Notes and Images
    path('<uuid:prescription_id>/notes/', views.PrescriptionNoteListCreateAPIView.as_view(), name='prescription_note_list_create'),
    path('<uuid:prescription_id>/images/', views.PrescriptionImageListCreateAPIView.as_view(), name='prescription_image_list_create'),
    
    # Reports
    path('reports/pending/', views.pending_prescriptions_view, name='pending_prescriptions'),
    path('reports/expired/', views.expired_prescriptions_view, name='expired_prescriptions'),
    path('reports/stats/', views.prescription_stats_view, name='prescription_stats'),
    
    # Status Management
    path('<uuid:prescription_id>/cancel/', views.cancel_prescription_view, name='cancel_prescription'),
    path('<uuid:prescription_id>/complete/', views.complete_prescription_view, name='complete_prescription'),
]