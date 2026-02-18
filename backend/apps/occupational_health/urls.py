"""
Médecine du Travail URLs - API Routing

Comprehensive URL routing for multi-sector occupational medicine
management system API endpoints.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

# Create router for ViewSets
router = DefaultRouter()

# ==================== PROTOCOL HIERARCHY ENDPOINTS ====================
router.register(r'protocols/exam-catalog', views.MedicalExamCatalogViewSet, basename='exam-catalog')
router.register(r'protocols/sectors', views.OccSectorViewSet, basename='occ-sector')
router.register(r'protocols/departments', views.OccDepartmentViewSet, basename='occ-department')
router.register(r'protocols/positions', views.OccPositionViewSet, basename='occ-position')
router.register(r'protocols/visit-protocols', views.ExamVisitProtocolViewSet, basename='exam-visit-protocol')

# Core API endpoints
router.register(r'enterprises', views.EnterpriseViewSet, basename='enterprise')
router.register(r'work-sites', views.WorkSiteViewSet, basename='worksite')  
router.register(r'workers', views.WorkerViewSet, basename='worker')

# Medical examination endpoints
router.register(r'examinations', views.MedicalExaminationViewSet, basename='examination')
router.register(r'vital-signs', views.VitalSignsViewSet, basename='vitalsigns')
router.register(r'fitness-certificates', views.FitnessCertificateViewSet, basename='fitnesscertificate')

# Disease and incident endpoints
router.register(r'occupational-diseases', views.OccupationalDiseaseViewSet, basename='occupationaldisease')
router.register(r'workplace-incidents', views.WorkplaceIncidentViewSet, basename='workplaceincident')

app_name = 'occupational_health'

urlpatterns = [
    # ViewSet URLs (REST API)
    path('api/', include(router.urls)),
    
    # ==================== DASHBOARD & ANALYTICS ====================
    path('api/dashboard/stats/', views.dashboard_stats, name='dashboard-stats'),
    path('api/choices/', views.choices_data, name='choices-data'),
    path('api/sector-analysis/', views.sector_analysis, name='sector-analysis'),
    path('api/generate-metrics/', views.generate_site_metrics, name='generate-metrics'),
    
    # ==================== ENTERPRISE-SPECIFIC ENDPOINTS ====================
    # These are handled by the ViewSet actions:
    # GET /api/enterprises/{id}/workers/ - Get all workers for enterprise
    # GET /api/enterprises/{id}/health-metrics/ - Get health metrics for enterprise  
    # GET /api/enterprises/{id}/sector-compliance/ - Get sector compliance info
    
    # ==================== WORKER-SPECIFIC ENDPOINTS ====================
    # These are handled by the ViewSet actions:
    # GET /api/workers/{id}/risk-profile/ - Get worker risk profile
    # GET /api/workers/{id}/medical-history/ - Get medical history 
    # GET /api/workers/{id}/incidents/ - Get incident history
    
    # ==================== EXAMINATION-SPECIFIC ENDPOINTS ====================
    # These are handled by the ViewSet actions:
    # POST /api/examinations/{id}/complete-examination/ - Complete examination
    
    # ==================== CERTIFICATE-SPECIFIC ENDPOINTS ====================
    # These are handled by the ViewSet actions:
    # GET /api/fitness-certificates/expiring-soon/ - Get expiring certificates
    
    # ==================== INCIDENT-SPECIFIC ENDPOINTS ====================
    # These are handled by the ViewSet actions:  
    # GET /api/workplace-incidents/statistics/ - Get incident statistics
]

"""
API Endpoint Documentation:

CORE RESOURCES:
===============

1. ENTERPRISES
   GET    /api/enterprises/                     - List all enterprises
   POST   /api/enterprises/                     - Create new enterprise
   GET    /api/enterprises/{id}/                - Get enterprise details
   PUT    /api/enterprises/{id}/                - Update enterprise
   DELETE /api/enterprises/{id}/                - Delete enterprise
   GET    /api/enterprises/{id}/workers/        - Get enterprise workers
   GET    /api/enterprises/{id}/health-metrics/ - Get enterprise health metrics  
   GET    /api/enterprises/{id}/sector-compliance/ - Get sector compliance info

2. WORK SITES
   GET    /api/work-sites/                      - List all work sites
   POST   /api/work-sites/                      - Create new work site  
   GET    /api/work-sites/{id}/                 - Get work site details
   PUT    /api/work-sites/{id}/                 - Update work site
   DELETE /api/work-sites/{id}/                 - Delete work site

3. WORKERS
   GET    /api/workers/                         - List all workers
   POST   /api/workers/                         - Create new worker
   GET    /api/workers/{id}/                    - Get worker details  
   PUT    /api/workers/{id}/                    - Update worker
   DELETE /api/workers/{id}/                    - Delete worker
   GET    /api/workers/{id}/risk-profile/       - Get worker risk profile
   GET    /api/workers/{id}/medical-history/    - Get medical examination history
   GET    /api/workers/{id}/incidents/          - Get incident history

MEDICAL EXAMINATIONS:
====================

4. EXAMINATIONS
   GET    /api/examinations/                    - List all examinations
   POST   /api/examinations/                    - Create new examination
   GET    /api/examinations/{id}/               - Get examination details
   PUT    /api/examinations/{id}/               - Update examination  
   DELETE /api/examinations/{id}/               - Delete examination
   POST   /api/examinations/{id}/complete-examination/ - Mark as completed

5. VITAL SIGNS
   GET    /api/vital-signs/                     - List all vital signs  
   POST   /api/vital-signs/                     - Create vital signs record
   GET    /api/vital-signs/{id}/                - Get vital signs details
   PUT    /api/vital-signs/{id}/                - Update vital signs
   DELETE /api/vital-signs/{id}/                - Delete vital signs

6. FITNESS CERTIFICATES  
   GET    /api/fitness-certificates/            - List all certificates
   POST   /api/fitness-certificates/            - Create certificate
   GET    /api/fitness-certificates/{id}/       - Get certificate details
   PUT    /api/fitness-certificates/{id}/       - Update certificate
   DELETE /api/fitness-certificates/{id}/       - Delete certificate  
   GET    /api/fitness-certificates/expiring-soon/ - Get expiring certificates

INCIDENTS & DISEASES:
====================

7. OCCUPATIONAL DISEASES
   GET    /api/occupational-diseases/           - List all diseases
   POST   /api/occupational-diseases/           - Create disease record  
   GET    /api/occupational-diseases/{id}/      - Get disease details
   PUT    /api/occupational-diseases/{id}/      - Update disease
   DELETE /api/occupational-diseases/{id}/      - Delete disease

8. WORKPLACE INCIDENTS
   GET    /api/workplace-incidents/             - List all incidents
   POST   /api/workplace-incidents/             - Create incident report
   GET    /api/workplace-incidents/{id}/        - Get incident details
   PUT    /api/workplace-incidents/{id}/        - Update incident
   DELETE /api/workplace-incidents/{id}/        - Delete incident
   GET    /api/workplace-incidents/statistics/  - Get incident statistics

ANALYTICS & UTILITIES:
=====================

9. DASHBOARD
   GET    /api/dashboard/stats/                 - Get dashboard statistics
   
10. CHOICES & METADATA  
   GET    /api/choices/                         - Get all choice field options
   
11. SECTOR ANALYSIS
   GET    /api/sector-analysis/?sector={sector} - Get sector-specific analysis
   
12. METRICS GENERATION
   POST   /api/generate-metrics/               - Generate site health metrics

QUERY PARAMETERS:
================

Most list endpoints support these query parameters:

FILTERING:
- enterprise={id}                             - Filter by enterprise
- work_site={id}                             - Filter by work site 
- sector={sector}                            - Filter by industry sector
- employment_status={status}                  - Filter worker by status
- exam_type={type}                           - Filter examinations by type
- fitness_decision={decision}                 - Filter certificates by decision
- category={category}                        - Filter incidents by category
- severity={level}                           - Filter by severity level
- start_date={date}                          - Filter from date (YYYY-MM-DD)
- end_date={date}                            - Filter to date (YYYY-MM-DD)

SEARCHING:
- search={query}                             - Text search in relevant fields

ORDERING:
- ordering={field}                           - Order by field (prefix with - for desc)
- ordering=-created_at                       - Order by creation date (newest first)

PAGINATION:
- page={number}                              - Page number  
- page_size={size}                           - Items per page (max 100)

EXAMPLES:
=========

# Get all workers for a specific enterprise
GET /api/workers/?enterprise=123

# Get all overdue medical examinations  
GET /api/examinations/?examination_completed=false&ordering=exam_date

# Get high-severity incidents from last 6 months  
GET /api/workplace-incidents/?severity=4&start_date=2026-08-01

# Search for workers by name
GET /api/workers/?search=John

# Get construction sector enterprises with health metrics
GET /api/enterprises/?sector=construction
GET /api/sector-analysis/?sector=construction

# Get dashboard statistics
GET /api/dashboard/stats/

# Get all choice options for forms
GET /api/choices/

RESPONSE FORMATS:
================

All responses return JSON with consistent structure:

SUCCESS (200/201):
{
  "id": 123,
  "field1": "value1",
  "field2": "value2",
  ...
}

LIST SUCCESS (200):
{
  "count": 50,
  "next": "http://api/endpoint/?page=3",
  "previous": "http://api/endpoint/?page=1", 
  "results": [
    {"id": 1, ...},
    {"id": 2, ...}
  ]
}

ERROR (400/404/500):
{
  "error": "Error message",
  "detail": "Detailed error description"
}

VALIDATION ERROR (400):
{
  "field1": ["This field is required."],
  "field2": ["Ensure this value is greater than 0."]
}
"""