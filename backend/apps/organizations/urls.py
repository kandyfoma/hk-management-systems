from django.urls import path
from . import views

app_name = 'organizations'

urlpatterns = [
    # Organizations
    path('', views.OrganizationListCreateAPIView.as_view(), name='organization_list_create'),
    path('<uuid:pk>/', views.OrganizationDetailAPIView.as_view(), name='organization_detail'),
    
    # Current organization endpoints (no ID required)
    path('current/licenses/', views.current_organization_licenses, name='current_organization_licenses'),
    
    # Organization relationships
    path('<uuid:organization_id>/users/', views.organization_users_view, name='organization_users'),
    path('<uuid:organization_id>/licenses/', views.organization_licenses_view, name='organization_licenses'),
    path('<uuid:organization_id>/stats/', views.organization_stats_view, name='organization_stats'),
    
    # Choices
    path('choices/types/', views.organization_type_choices_view, name='organization_type_choices'),
]