"""
Reports API URLs
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SalesReportViewSet, InventoryReportViewSet,
    OccupationalHealthReportViewSet, HospitalOperationsReportViewSet,
    ComplianceReportViewSet
)

router = DefaultRouter()

# Register report viewsets
router.register(r'sales', SalesReportViewSet, basename='sales-reports')
router.register(r'inventory', InventoryReportViewSet, basename='inventory-reports')
router.register(r'occupational-health', OccupationalHealthReportViewSet, basename='occ-health-reports')
router.register(r'hospital', HospitalOperationsReportViewSet, basename='hospital-reports')
router.register(r'compliance', ComplianceReportViewSet, basename='compliance-reports')

app_name = 'reports'

urlpatterns = [
    path('', include(router.urls)),
]
