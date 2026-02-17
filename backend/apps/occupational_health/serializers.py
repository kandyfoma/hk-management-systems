"""
Occupational Health Serializers - DRF API

Comprehensive Django REST Framework serializers for multi-sector
occupational health management system.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    # Core models
    Enterprise, WorkSite, Worker,
    # Medical examination models
    MedicalExamination, VitalSigns, PhysicalExamination,
    AudiometryResult, SpirometryResult, VisionTestResult,
    MentalHealthScreening, ErgonomicAssessment,
    FitnessCertificate,
    # Disease and incident models
    OccupationalDiseaseType, OccupationalDisease,
    WorkplaceIncident,
    # PPE and risk models
    PPEItem, HazardIdentification,
    SiteHealthMetrics,
    # Choice constants
    INDUSTRY_SECTORS, JOB_CATEGORIES, EXPOSURE_RISKS, PPE_TYPES,
    SECTOR_RISK_LEVELS
)

User = get_user_model()

# ==================== CORE SERIALIZERS ====================

class EnterpriseListSerializer(serializers.ModelSerializer):
    """List view serializer for enterprises"""
    
    risk_level = serializers.ReadOnlyField()
    exam_frequency_months = serializers.ReadOnlyField()
    worker_count = serializers.IntegerField(source='workers.count', read_only=True)
    sector_display = serializers.CharField(source='get_sector_display', read_only=True)
    
    class Meta:
        model = Enterprise
        fields = [
            'id', 'name', 'sector', 'sector_display', 'rccm', 'nif', 'address',
            'contact_person', 'phone', 'email', 'contract_start_date', 
            'contract_end_date', 'is_active', 'risk_level', 'exam_frequency_months',
            'worker_count', 'created_at', 'updated_at'
        ]

class EnterpriseDetailSerializer(serializers.ModelSerializer):
    """Detail view serializer for enterprises with full information"""
    
    risk_level = serializers.ReadOnlyField()
    exam_frequency_months = serializers.ReadOnlyField()
    worker_count = serializers.IntegerField(source='workers.count', read_only=True)
    active_workers = serializers.IntegerField(source='workers.filter(employment_status="active").count', read_only=True)
    sector_display = serializers.CharField(source='get_sector_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = Enterprise
        fields = '__all__'

class WorkSiteSerializer(serializers.ModelSerializer):
    """Work site serializer with enterprise information"""
    
    enterprise_name = serializers.CharField(source='enterprise.name', read_only=True)
    enterprise_sector = serializers.CharField(source='enterprise.sector', read_only=True)
    
    class Meta:
        model = WorkSite
        fields = [
            'id', 'enterprise', 'enterprise_name', 'enterprise_sector',
            'name', 'address', 'site_manager', 'phone', 'worker_count',
            'is_remote_site', 'has_medical_facility', 'created_at', 'updated_at'
        ]

class WorkerListSerializer(serializers.ModelSerializer):
    """List view serializer for workers"""
    
    full_name = serializers.ReadOnlyField()
    age = serializers.ReadOnlyField()
    enterprise_name = serializers.CharField(source='enterprise.name', read_only=True)
    sector_risk_level = serializers.ReadOnlyField()
    job_category_display = serializers.CharField(source='get_job_category_display', read_only=True)
    employment_status_display = serializers.CharField(source='get_employment_status_display', read_only=True)
    fitness_status_display = serializers.CharField(source='get_current_fitness_status_display', read_only=True)
    
    class Meta:
        model = Worker
        fields = [
            'id', 'employee_id', 'first_name', 'last_name', 'full_name', 'age',
            'gender', 'enterprise', 'enterprise_name', 'job_category', 
            'job_category_display', 'job_title', 'hire_date', 'employment_status',
            'employment_status_display', 'phone', 'current_fitness_status',
            'fitness_status_display', 'sector_risk_level', 'next_exam_due'
        ]

class WorkerDetailSerializer(serializers.ModelSerializer):
    """Detail view serializer for workers with complete health profile"""
    
    full_name = serializers.ReadOnlyField()
    age = serializers.ReadOnlyField()
    sector_risk_level = serializers.ReadOnlyField()
    enterprise_name = serializers.CharField(source='enterprise.name', read_only=True)
    work_site_name = serializers.CharField(source='work_site.name', read_only=True)
    job_category_display = serializers.CharField(source='get_job_category_display', read_only=True)
    employment_status_display = serializers.CharField(source='get_employment_status_display', read_only=True)
    fitness_status_display = serializers.CharField(source='get_current_fitness_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    # Health stats
    exam_count = serializers.IntegerField(source='medical_examinations.count', read_only=True)
    last_exam_date = serializers.DateField(source='medical_examinations.first.exam_date', read_only=True)
    incident_count = serializers.IntegerField(source='incidents_involved.count', read_only=True)
    disease_count = serializers.IntegerField(source='occupational_diseases.count', read_only=True)
    
    class Meta:
        model = Worker
        fields = '__all__'

# ==================== MEDICAL EXAMINATION SERIALIZERS ====================

class VitalSignsSerializer(serializers.ModelSerializer):
    """Vital signs serializer with calculated fields"""
    
    bmi = serializers.ReadOnlyField()
    bmi_category = serializers.ReadOnlyField()
    bp_category = serializers.ReadOnlyField()
    has_abnormal_vitals = serializers.ReadOnlyField()
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)
    
    class Meta:
        model = VitalSigns
        fields = '__all__'

class PhysicalExaminationSerializer(serializers.ModelSerializer):
    """Physical examination serializer"""
    
    performed_by_name = serializers.CharField(source='performed_by.get_full_name', read_only=True)
    
    class Meta:
        model = PhysicalExamination
        fields = '__all__'

class AudiometryResultSerializer(serializers.ModelSerializer):
    """Audiometry test result serializer"""
    
    tested_by_name = serializers.CharField(source='tested_by.get_full_name', read_only=True)
    classification_display = serializers.CharField(source='get_hearing_loss_classification_display', read_only=True)
    
    class Meta:
        model = AudiometryResult
        fields = '__all__'

class SpirometryResultSerializer(serializers.ModelSerializer):
    """Spirometry test result serializer"""
    
    tested_by_name = serializers.CharField(source='tested_by.get_full_name', read_only=True)
    interpretation_display = serializers.CharField(source='get_spirometry_interpretation_display', read_only=True)
    
    class Meta:
        model = SpirometryResult
        fields = '__all__'

class VisionTestResultSerializer(serializers.ModelSerializer):
    """Vision test result serializer"""
    
    tested_by_name = serializers.CharField(source='tested_by.get_full_name', read_only=True)
    color_vision_display = serializers.CharField(source='get_color_vision_test_display', read_only=True)
    
    class Meta:
        model = VisionTestResult
        fields = '__all__'

class MentalHealthScreeningSerializer(serializers.ModelSerializer):
    """Mental health screening serializer"""
    
    assessed_by_name = serializers.CharField(source='assessed_by.get_full_name', read_only=True)
    burnout_risk_display = serializers.CharField(source='get_burnout_risk_display', read_only=True)
    sleep_quality_display = serializers.CharField(source='get_sleep_quality_display', read_only=True)
    alcohol_risk_display = serializers.CharField(source='get_alcohol_risk_display', read_only=True)
    
    class Meta:
        model = MentalHealthScreening
        fields = '__all__'

class ErgonomicAssessmentSerializer(serializers.ModelSerializer):
    """Ergonomic assessment serializer"""
    
    assessed_by_name = serializers.CharField(source='assessed_by.get_full_name', read_only=True)
    workstation_type_display = serializers.CharField(source='get_workstation_type_display', read_only=True)
    keyboard_position_display = serializers.CharField(source='get_keyboard_position_display', read_only=True)
    risk_level_display = serializers.CharField(source='get_ergonomic_risk_level_display', read_only=True)
    
    class Meta:
        model = ErgonomicAssessment
        fields = '__all__'

class FitnessCertificateSerializer(serializers.ModelSerializer):
    """Fitness certificate serializer"""
    
    is_expired = serializers.ReadOnlyField()
    days_until_expiry = serializers.ReadOnlyField()
    issued_by_name = serializers.CharField(source='issued_by.get_full_name', read_only=True)
    worker_name = serializers.CharField(source='examination.worker.full_name', read_only=True)
    fitness_decision_display = serializers.CharField(source='get_fitness_decision_display', read_only=True)
    
    class Meta:
        model = FitnessCertificate
        fields = '__all__'

class MedicalExaminationListSerializer(serializers.ModelSerializer):
    """List view serializer for medical examinations"""
    
    worker_name = serializers.CharField(source='worker.full_name', read_only=True)
    worker_employee_id = serializers.CharField(source='worker.employee_id', read_only=True)
    enterprise_name = serializers.CharField(source='worker.enterprise.name', read_only=True)
    examining_doctor_name = serializers.CharField(source='examining_doctor.get_full_name', read_only=True)
    exam_type_display = serializers.CharField(source='get_exam_type_display', read_only=True)
    
    class Meta:
        model = MedicalExamination
        fields = [
            'id', 'exam_number', 'worker', 'worker_name', 'worker_employee_id',
            'enterprise_name', 'exam_type', 'exam_type_display', 'exam_date',
            'examining_doctor', 'examining_doctor_name', 'examination_completed',
            'follow_up_required', 'next_periodic_exam', 'created_at'
        ]

class MedicalExaminationDetailSerializer(serializers.ModelSerializer):
    """Detail view serializer for medical examinations with all related data"""
    
    worker_name = serializers.CharField(source='worker.full_name', read_only=True)
    worker_details = WorkerDetailSerializer(source='worker', read_only=True)
    examining_doctor_name = serializers.CharField(source='examining_doctor.get_full_name', read_only=True)
    exam_type_display = serializers.CharField(source='get_exam_type_display', read_only=True)
    
    # Related examination components
    vital_signs = VitalSignsSerializer(read_only=True)
    physical_exam = PhysicalExaminationSerializer(read_only=True)
    audiometry = AudiometryResultSerializer(read_only=True)
    spirometry = SpirometryResultSerializer(read_only=True)
    vision_test = VisionTestResultSerializer(read_only=True)
    mental_health_screening = MentalHealthScreeningSerializer(read_only=True)
    ergonomic_assessment = ErgonomicAssessmentSerializer(read_only=True)
    fitness_certificate = FitnessCertificateSerializer(read_only=True)
    
    class Meta:
        model = MedicalExamination
        fields = '__all__'

# ==================== DISEASE AND INCIDENT SERIALIZERS ====================

class OccupationalDiseaseTypeSerializer(serializers.ModelSerializer):
    """Occupational disease type serializer"""
    
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    class Meta:
        model = OccupationalDiseaseType
        fields = '__all__'

class OccupationalDiseaseSerializer(serializers.ModelSerializer):
    """Occupational disease case serializer"""
    
    worker_name = serializers.CharField(source='worker.full_name', read_only=True)
    worker_enterprise = serializers.CharField(source='worker.enterprise.name', read_only=True)
    disease_name = serializers.CharField(source='disease_type.name', read_only=True)
    disease_category = serializers.CharField(source='disease_type.get_category_display', read_only=True)
    diagnosing_physician_name = serializers.CharField(source='diagnosing_physician.get_full_name', read_only=True)
    reported_by_name = serializers.CharField(source='reported_by.get_full_name', read_only=True)
    causal_determination_display = serializers.CharField(source='get_causal_determination_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_level_display', read_only=True)
    case_status_display = serializers.CharField(source='get_case_status_display', read_only=True)
    
    class Meta:
        model = OccupationalDisease
        fields = '__all__'

class WorkplaceIncidentListSerializer(serializers.ModelSerializer):
    """List view serializer for workplace incidents"""
    
    enterprise_name = serializers.CharField(source='enterprise.name', read_only=True)
    work_site_name = serializers.CharField(source='work_site.name', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reported_by_name = serializers.CharField(source='reported_by.get_full_name', read_only=True)
    injured_count = serializers.IntegerField(source='injured_workers.count', read_only=True)
    
    class Meta:
        model = WorkplaceIncident
        fields = [
            'id', 'incident_number', 'enterprise', 'enterprise_name', 'work_site',
            'work_site_name', 'category', 'category_display', 'severity',
            'severity_display', 'incident_date', 'incident_time', 'description',
            'injured_count', 'work_days_lost', 'status', 'status_display',
            'reported_by', 'reported_by_name', 'created_at'
        ]

class WorkplaceIncidentDetailSerializer(serializers.ModelSerializer):
    """Detail view serializer for workplace incidents with full information"""
    
    enterprise_name = serializers.CharField(source='enterprise.name', read_only=True)
    work_site_name = serializers.CharField(source='work_site.name', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reported_by_name = serializers.CharField(source='reported_by.get_full_name', read_only=True)
    
    # Related workers
    injured_workers_details = WorkerListSerializer(source='injured_workers', many=True, read_only=True)
    witnesses_details = WorkerListSerializer(source='witnesses', many=True, read_only=True)
    
    class Meta:
        model = WorkplaceIncident
        fields = '__all__'

# ==================== PPE AND RISK SERIALIZERS ====================

class PPEItemSerializer(serializers.ModelSerializer):
    """PPE item serializer"""
    
    worker_name = serializers.CharField(source='worker.full_name', read_only=True)
    ppe_type_display = serializers.CharField(source='get_ppe_type_display', read_only=True)
    condition_display = serializers.CharField(source='get_condition_display', read_only=True)
    assigned_by_name = serializers.CharField(source='assigned_by.get_full_name', read_only=True)
    is_expired = serializers.ReadOnlyField()
    needs_inspection = serializers.ReadOnlyField()
    
    class Meta:
        model = PPEItem
        fields = '__all__'

class HazardIdentificationSerializer(serializers.ModelSerializer):
    """Hazard identification and risk assessment serializer"""
    
    enterprise_name = serializers.CharField(source='enterprise.name', read_only=True)
    work_site_name = serializers.CharField(source='work_site.name', read_only=True)
    hazard_type_display = serializers.CharField(source='get_hazard_type_display', read_only=True)
    probability_display = serializers.CharField(source='get_probability_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    risk_level_display = serializers.CharField(source='get_risk_level_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    assessed_by_name = serializers.CharField(source='assessed_by.get_full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    
    risk_score = serializers.ReadOnlyField()
    residual_risk_score = serializers.ReadOnlyField()
    
    # Workers exposed details
    workers_exposed_details = WorkerListSerializer(source='workers_exposed', many=True, read_only=True)
    
    class Meta:
        model = HazardIdentification
        fields = '__all__'

class SiteHealthMetricsSerializer(serializers.ModelSerializer):
    """Site health metrics serializer with calculated KPIs"""
    
    enterprise_name = serializers.CharField(source='enterprise.name', read_only=True)
    work_site_name = serializers.CharField(source='work_site.name', read_only=True)
    compiled_by_name = serializers.CharField(source='compiled_by.get_full_name', read_only=True)
    
    # Calculated KPIs
    ltifr = serializers.ReadOnlyField()
    trifr = serializers.ReadOnlyField()
    severity_rate = serializers.ReadOnlyField()
    absenteeism_rate = serializers.ReadOnlyField()
    exam_compliance_rate = serializers.ReadOnlyField()
    fitness_rate = serializers.ReadOnlyField()
    
    class Meta:
        model = SiteHealthMetrics
        fields = '__all__'

# ==================== CHOICE FIELD SERIALIZERS ====================

class ChoicesSerializer(serializers.Serializer):
    """Serializer for providing choice field options to frontend"""
    
    industry_sectors = serializers.SerializerMethodField()
    job_categories = serializers.SerializerMethodField()
    exposure_risks = serializers.SerializerMethodField()
    ppe_types = serializers.SerializerMethodField()
    sector_risk_levels = serializers.SerializerMethodField()
    
    def get_industry_sectors(self, obj):
        return [{'value': choice[0], 'label': choice[1]} for choice in INDUSTRY_SECTORS]
    
    def get_job_categories(self, obj):
        return [{'value': choice[0], 'label': choice[1]} for choice in JOB_CATEGORIES]
    
    def get_exposure_risks(self, obj):
        return [{'value': choice[0], 'label': choice[1]} for choice in EXPOSURE_RISKS]
    
    def get_ppe_types(self, obj):
        return [{'value': choice[0], 'label': choice[1]} for choice in PPE_TYPES]
    
    def get_sector_risk_levels(self, obj):
        return SECTOR_RISK_LEVELS

# ==================== DASHBOARD SERIALIZERS ====================

class DashboardStatsSerializer(serializers.Serializer):
    """Serializer for dashboard statistics"""
    
    total_enterprises = serializers.IntegerField()
    total_workers = serializers.IntegerField()
    active_workers = serializers.IntegerField()
    total_examinations_this_month = serializers.IntegerField()
    overdue_examinations = serializers.IntegerField()
    total_incidents_this_month = serializers.IntegerField()
    total_diseases_this_year = serializers.IntegerField()
    
    # Compliance rates
    overall_fitness_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    exam_compliance_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    ppe_compliance_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    
    # Safety metrics (YTD)
    ytd_ltifr = serializers.DecimalField(max_digits=8, decimal_places=2)
    ytd_trifr = serializers.DecimalField(max_digits=8, decimal_places=2)
    ytd_severity_rate = serializers.DecimalField(max_digits=8, decimal_places=2)
    
    # Sector breakdown
    sector_breakdown = serializers.DictField()
    risk_level_breakdown = serializers.DictField()

class WorkerRiskProfileSerializer(serializers.Serializer):
    """Serializer for worker risk profile analysis"""
    
    worker_id = serializers.IntegerField()
    full_name = serializers.CharField()
    sector = serializers.CharField()
    job_category = serializers.CharField()
    
    # Risk factors
    exposure_risks = serializers.ListField()
    ppe_required = serializers.ListField()
    ppe_compliance = serializers.BooleanField()
    
    # Health status
    current_fitness = serializers.CharField()
    last_exam_date = serializers.DateField()
    next_exam_due = serializers.DateField()
    overdue_exam = serializers.BooleanField()
    
    # Risk scoring
    overall_risk_score = serializers.IntegerField()  # 1-25 scale
    risk_level = serializers.CharField()  # low, medium, high, critical
    
    # Recommendations
    immediate_actions = serializers.ListField()
    preventive_measures = serializers.ListField()