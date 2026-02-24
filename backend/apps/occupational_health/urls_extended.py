"""
URL routing for partially-completed backend features
- Worker risk profiles
- Overexposure alerts
- Exit examinations
- Regulatory reporting (CNSS/DRC)
- PPE compliance tracking
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_extended import (
    WorkerRiskProfileViewSet,
    OverexposureAlertViewSet,
    ExitExaminationViewSet,
    RegulatoryCNSSReportViewSet,
    DRCRegulatoryReportViewSet,
    PPEComplianceRecordViewSet,
)

router = DefaultRouter()
router.register(r'worker-risk-profiles', WorkerRiskProfileViewSet, basename='worker-risk-profile')
router.register(r'overexposure-alerts', OverexposureAlertViewSet, basename='overexposure-alert')
router.register(r'exit-exams', ExitExaminationViewSet, basename='exit-examination')
router.register(r'cnss-reports', RegulatoryCNSSReportViewSet, basename='cnss-report')
router.register(r'drc-reports', DRCRegulatoryReportViewSet, basename='drc-report')
router.register(r'ppe-compliance', PPEComplianceRecordViewSet, basename='ppe-compliance')

urlpatterns = [
    path('', include(router.urls)),
]
