"""
Surveillance Programs URLs - API Routing

URL patterns for surveillance program management endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_surveillance import (
    SurveillanceProgramViewSet,
    SurveillanceEnrollmentViewSet,
    ThresholdViolationViewSet,
    ComplianceMetricsViewSet,
    CheckExamThresholdsView,
    SurveillanceComplianceDashboardView,
    ComplianceReportView,
    SurveillanceTrendsView,
)

# Create router for ViewSets
router = DefaultRouter()

# Register ViewSets
router.register(r'programs', SurveillanceProgramViewSet, basename='surveillance-program')
router.register(r'enrollments', SurveillanceEnrollmentViewSet, basename='surveillance-enrollment')
router.register(r'violations', ThresholdViolationViewSet, basename='threshold-violation')
router.register(r'metrics', ComplianceMetricsViewSet, basename='compliance-metrics')

app_name = 'surveillance'

urlpatterns = [
    # Router URLs
    path('', include(router.urls)),
    
    # Specialized endpoints
    path('check-thresholds/', CheckExamThresholdsView.as_view(), name='check-thresholds'),
    path('compliance-dashboard/', SurveillanceComplianceDashboardView.as_view(), name='compliance-dashboard'),
    path('compliance-report/', ComplianceReportView.as_view(), name='compliance-report'),
    path('trends/', SurveillanceTrendsView.as_view(), name='surveillance-trends'),
]
