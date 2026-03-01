from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from rest_framework.routers import DefaultRouter
from apps.occupational_health.views_iso_compliance import IncidentInvestigationViewSet, OHSPolicyViewSet, HazardRegisterViewSet, SafetyTrainingViewSet


def healthcheck_view(request):
    return JsonResponse({'status': 'ok'})

# OHS standalone router for direct /api/v1/ohs/* access
ohs_router = DefaultRouter()
ohs_router.register(r'incident-investigations', IncidentInvestigationViewSet, basename='ohs-incident-investigation')
ohs_router.register(r'policies', OHSPolicyViewSet, basename='ohs-policies')
ohs_router.register(r'hazard-register', HazardRegisterViewSet, basename='ohs-hazard-register')
ohs_router.register(r'safety-training', SafetyTrainingViewSet, basename='ohs-safety-training')

urlpatterns = [
    path('health', healthcheck_view),
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('apps.accounts.urls')),
    path('api/v1/organizations/', include('apps.organizations.urls')),
    path('api/v1/licenses/', include('apps.licenses.urls')),
    path('api/v1/patients/', include('apps.patients.urls')),
    path('api/v1/suppliers/', include('apps.suppliers.urls')),
    path('api/v1/inventory/', include('apps.inventory.urls')),
    path('api/v1/sales/', include('apps.sales.urls')),
    path('api/v1/prescriptions/', include('apps.prescriptions.urls')),
    path('api/v1/hospital/', include('apps.hospital.urls')),
    path('api/v1/occupational-health/', include('apps.occupational_health.urls')),
    path('api/v1/ohs/', include(ohs_router.urls)),
    path('api/v1/reports/', include('apps.reports.urls')),  # Reports & Analytics
    
    # Audit logging APIs
    path('api/v1/audit/', include('apps.audit.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)