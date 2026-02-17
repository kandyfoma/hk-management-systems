from django.urls import path
from . import views

app_name = 'licenses'

urlpatterns = [
    # License Validation (for app/device activation)
    path('validate/', views.validate_license, name='validate_license'),
    
    # Licenses
    path('', views.LicenseListCreateAPIView.as_view(), name='license_list_create'),
    path('<uuid:pk>/', views.LicenseDetailAPIView.as_view(), name='license_detail'),
    
    # License management
    path('<uuid:license_id>/renew/', views.renew_license_view, name='renew_license'),
    path('<uuid:license_id>/suspend/', views.suspend_license_view, name='suspend_license'),
    path('<uuid:license_id>/reactivate/', views.reactivate_license_view, name='reactivate_license'),
    
    # License Documents
    path('documents/', views.LicenseDocumentListCreateAPIView.as_view(), name='license_document_list_create'),
    path('documents/<uuid:pk>/', views.LicenseDocumentDetailAPIView.as_view(), name='license_document_detail'),
    
    # License Renewals
    path('renewals/', views.LicenseRenewalListCreateAPIView.as_view(), name='license_renewal_list_create'),
    path('renewals/<uuid:pk>/', views.LicenseRenewalDetailAPIView.as_view(), name='license_renewal_detail'),
    
    # Reports and Stats
    path('expiring/', views.expiring_licenses_view, name='expiring_licenses'),
    path('expired/', views.expired_licenses_view, name='expired_licenses'),
    path('stats/', views.license_stats_view, name='license_stats'),
    
    # Choices
    path('choices/types/', views.license_type_choices_view, name='license_type_choices'),
    path('choices/statuses/', views.license_status_choices_view, name='license_status_choices'),
]