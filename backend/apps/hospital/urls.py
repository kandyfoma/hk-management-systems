from django.urls import path
from . import views

app_name = 'hospital'

urlpatterns = [
    # ═══════════════════════════════════════════════════════════════
    #  VITAL SIGNS ENDPOINTS
    # ═══════════════════════════════════════════════════════════════
    
    # Main CRUD endpoints
    path('vital-signs/', views.VitalSignsListCreateAPIView.as_view(), name='vital_signs_list_create'),
    path('vital-signs/<uuid:pk>/', views.VitalSignsDetailAPIView.as_view(), name='vital_signs_detail'),
    
    # Specialized endpoints
    path('vital-signs/patient/<uuid:patient_id>/history/', 
         views.vital_signs_patient_history_view, 
         name='vital_signs_patient_history'),
    path('vital-signs/abnormal/', 
         views.vital_signs_abnormal_view, 
         name='vital_signs_abnormal'),
    
    # ═══════════════════════════════════════════════════════════════
    #  HOSPITAL ENCOUNTER ENDPOINTS
    # ═══════════════════════════════════════════════════════════════
    
    # Main CRUD endpoints
    path('encounters/', views.HospitalEncounterListCreateAPIView.as_view(), name='encounters_list_create'),
    path('encounters/<uuid:pk>/', views.HospitalEncounterDetailAPIView.as_view(), name='encounters_detail'),
    
    # Related data endpoints
    path('encounters/<uuid:encounter_id>/prescriptions/', 
         views.encounter_prescriptions_view, 
         name='encounter_prescriptions'),
    path('patients/<uuid:patient_id>/medical-summary/', 
         views.patient_medical_summary_view, 
         name='patient_medical_summary'),
    
    # Statistics
    path('encounters/stats/', views.encounter_stats_view, name='encounter_stats'),
    
    # ═══════════════════════════════════════════════════════════════
    #  HOSPITAL DEPARTMENT ENDPOINTS
    # ═══════════════════════════════════════════════════════════════
    
    # Main CRUD endpoints
    path('departments/', views.HospitalDepartmentListCreateAPIView.as_view(), name='departments_list_create'),
    path('departments/<uuid:pk>/', views.HospitalDepartmentDetailAPIView.as_view(), name='departments_detail'),
    
    # ═══════════════════════════════════════════════════════════════
    #  HOSPITAL BED ENDPOINTS
    # ═══════════════════════════════════════════════════════════════
    
    # Main CRUD endpoints
    path('beds/', views.HospitalBedListCreateAPIView.as_view(), name='beds_list_create'),
    path('beds/<uuid:pk>/', views.HospitalBedDetailAPIView.as_view(), name='beds_detail'),
    
    # Bed management
    path('beds/<uuid:bed_id>/assign/', views.assign_bed_view, name='assign_bed'),
    path('beds/<uuid:bed_id>/release/', views.release_bed_view, name='release_bed'),
    
    # Bed statistics
    path('beds/occupancy/', views.bed_occupancy_view, name='bed_occupancy'),
    
    # ═══════════════════════════════════════════════════════════════
    #  CHOICE FIELDS ENDPOINTS
    # ═══════════════════════════════════════════════════════════════
    
    path('choices/encounter-types/', views.encounter_type_choices_view, name='encounter_type_choices'),
    path('choices/encounter-status/', views.encounter_status_choices_view, name='encounter_status_choices'),
    path('choices/bed-status/', views.bed_status_choices_view, name='bed_status_choices'),
    
    # ═══════════════════════════════════════════════════════════════
    #  DASHBOARD AND REPORTS
    # ═══════════════════════════════════════════════════════════════
    
    path('dashboard/', views.hospital_dashboard_view, name='hospital_dashboard'),
]