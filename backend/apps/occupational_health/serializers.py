"""
Médecine du Travail Serializers - DRF API

Comprehensive Django REST Framework serializers for multi-sector
occupational medicine management system.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    # Protocol hierarchy models
    MedicalExamCatalog, OccSector, OccDepartment, OccPosition,
    ExamVisitProtocol, ProtocolRequiredExam,
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
    # Extended occupational health models
    WorkerRiskProfile, OverexposureAlert, ExitExamination,
    RegulatoryCNSSReport, DRCRegulatoryReport, PPEComplianceRecord,
    # Medical examination extended models
    XrayImagingResult, HeavyMetalsTest, DrugAlcoholScreening,
    FitnessCertificationDecision, HealthScreening,
    # Risk assessment models
    HierarchyOfControls, RiskHeatmapData, RiskHeatmapReport,
    # Choice constants
    INDUSTRY_SECTORS, JOB_CATEGORIES, EXPOSURE_RISKS, PPE_TYPES,
    SECTOR_RISK_LEVELS
)

User = get_user_model()

# ==================== PROTOCOL HIERARCHY SERIALIZERS ====================

class MedicalExamCatalogSerializer(serializers.ModelSerializer):
    """Medical exam catalog entry — full CRUD for doctor."""
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = MedicalExamCatalog
        fields = [
            'id', 'code', 'label', 'category', 'category_display',
            'description', 'requires_specialist', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class OccSectorSerializer(serializers.ModelSerializer):
    """Sector — list / detail / create / update."""
    department_count = serializers.IntegerField(source='departments.count', read_only=True)

    class Meta:
        model = OccSector
        fields = [
            'id', 'code', 'name', 'industry_sector_key',
            'is_active', 'department_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class OccDepartmentSerializer(serializers.ModelSerializer):
    """Department — full CRUD."""
    sector_name = serializers.CharField(source='sector.name', read_only=True)
    sector_code = serializers.CharField(source='sector.code', read_only=True)
    position_count = serializers.IntegerField(source='positions.count', read_only=True)

    class Meta:
        model = OccDepartment
        fields = [
            'id', 'sector', 'sector_code', 'sector_name', 'code', 'name',
            'is_active', 'position_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'sector_name', 'sector_code', 'created_at', 'updated_at']


class OccPositionSerializer(serializers.ModelSerializer):
    """Position with its department/sector context."""
    department_name = serializers.CharField(source='department.name', read_only=True)
    department_code = serializers.CharField(source='department.code', read_only=True)
    sector_name = serializers.CharField(source='department.sector.name', read_only=True)
    sector_code = serializers.CharField(source='department.sector.code', read_only=True)
    breadcrumb = serializers.ReadOnlyField()
    protocol_count = serializers.IntegerField(source='protocols.count', read_only=True)

    class Meta:
        model = OccPosition
        fields = [
            'id', 'department', 'department_code', 'department_name',
            'sector_code', 'sector_name',
            'code', 'name', 'typical_exposures', 'recommended_ppe',
            'is_active', 'breadcrumb', 'protocol_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'department_code', 'department_name',
            'sector_code', 'sector_name', 'breadcrumb', 'created_at', 'updated_at',
        ]


class ProtocolRequiredExamSerializer(serializers.ModelSerializer):
    """Through-model for ordered required exams in a protocol."""
    exam_code = serializers.CharField(source='exam.code', read_only=True)
    exam_label = serializers.CharField(source='exam.label', read_only=True)
    exam_category = serializers.CharField(source='exam.category', read_only=True)

    class Meta:
        model = ProtocolRequiredExam
        fields = ['id', 'exam', 'exam_code', 'exam_label', 'exam_category', 'order', 'is_blocking']


class ExamVisitProtocolSerializer(serializers.ModelSerializer):
    """
    Full protocol serializer — used for detail/create/update.
    Exposes both required and recommended exams with catalog details.
    """
    position_name = serializers.CharField(source='position.name', read_only=True)
    position_code = serializers.CharField(source='position.code', read_only=True)
    department_name = serializers.CharField(source='position.department.name', read_only=True)
    sector_name = serializers.CharField(source='position.department.sector.name', read_only=True)
    visit_type_display = serializers.ReadOnlyField()

    # Ordered required exams (via through model)
    required_exam_entries = ProtocolRequiredExamSerializer(
        source='protocolrequiredexam_set', many=True, read_only=True
    )
    # Flat list of codes for quick frontend lookup
    required_exam_codes = serializers.SerializerMethodField()
    recommended_exam_details = MedicalExamCatalogSerializer(
        source='recommended_exams', many=True, read_only=True
    )
    recommended_exam_codes = serializers.SerializerMethodField()

    class Meta:
        model = ExamVisitProtocol
        fields = [
            'id',
            'position', 'position_code', 'position_name',
            'department_name', 'sector_name',
            'visit_type', 'visit_type_display', 'visit_type_label_override',
            'required_exam_entries', 'required_exam_codes',
            'recommended_exams', 'recommended_exam_details', 'recommended_exam_codes',
            'validity_months', 'regulatory_note', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'position_code', 'position_name', 'department_name', 'sector_name',
            'visit_type_display', 'required_exam_entries', 'required_exam_codes',
            'recommended_exam_details', 'recommended_exam_codes',
            'created_at', 'updated_at',
        ]

    def get_required_exam_codes(self, obj):
        return obj.get_required_exam_codes()

    def get_recommended_exam_codes(self, obj):
        return obj.get_recommended_exam_codes()


class ExamVisitProtocolListSerializer(serializers.ModelSerializer):
    """Compact serializer for lists."""
    position_name = serializers.CharField(source='position.name', read_only=True)
    position_code = serializers.CharField(source='position.code', read_only=True)
    sector_name = serializers.CharField(source='position.department.sector.name', read_only=True)
    visit_type_display = serializers.ReadOnlyField()
    required_exam_count = serializers.SerializerMethodField()

    class Meta:
        model = ExamVisitProtocol
        fields = [
            'id', 'position', 'position_code', 'position_name', 'sector_name',
            'visit_type', 'visit_type_display', 'validity_months',
            'required_exam_count', 'is_active',
        ]

    def get_required_exam_count(self, obj):
        return obj.protocolrequiredexam_set.count()


# ── Nested Sector tree (for the "load all" endpoint used by the frontend) ──

class OccPositionNestedSerializer(serializers.ModelSerializer):
    protocols = ExamVisitProtocolListSerializer(many=True, read_only=True)
    protocol_count = serializers.IntegerField(source='protocols.count', read_only=True)

    class Meta:
        model = OccPosition
        fields = ['id', 'code', 'name', 'typical_exposures', 'recommended_ppe', 'is_active', 'protocol_count', 'protocols']


class OccDepartmentNestedSerializer(serializers.ModelSerializer):
    positions = OccPositionNestedSerializer(many=True, read_only=True)

    class Meta:
        model = OccDepartment
        fields = ['id', 'code', 'name', 'is_active', 'positions']


class OccSectorNestedSerializer(serializers.ModelSerializer):
    departments = OccDepartmentNestedSerializer(many=True, read_only=True)

    class Meta:
        model = OccSector
        fields = ['id', 'code', 'name', 'industry_sector_key', 'is_active', 'departments']


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
    worker_count = serializers.IntegerField(source='workers.count', read_only=True)
    
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
    work_site_name = serializers.CharField(source='work_site.name', read_only=True, allow_null=True)
    sector_risk_level = serializers.ReadOnlyField()
    job_category_display = serializers.CharField(source='get_job_category_display', read_only=True)
    employment_status_display = serializers.CharField(source='get_employment_status_display', read_only=True)
    fitness_status_display = serializers.CharField(source='get_current_fitness_status_display', read_only=True)
    
    class Meta:
        model = Worker
        fields = [
            'id', 'employee_id', 'first_name', 'last_name', 'full_name', 'age',
            'gender', 'enterprise', 'enterprise_name', 'work_site', 'work_site_name',
            'job_category', 'job_category_display', 'job_title', 'hire_date', 
            'employment_status', 'employment_status_display', 'phone', 
            'current_fitness_status', 'fitness_status_display', 'sector_risk_level', 
            'next_exam_due'
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
    worker_employee_id = serializers.CharField(source='examination.worker.employee_id', read_only=True)
    worker_job_title = serializers.CharField(source='examination.worker.job_title', read_only=True)
    worker_company = serializers.CharField(source='examination.worker.enterprise.name', read_only=True)
    worker_sector = serializers.CharField(source='examination.worker.sector', read_only=True)
    exam_type = serializers.CharField(source='examination.exam_type', read_only=True)
    exam_date = serializers.DateField(source='examination.exam_date', read_only=True)
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
    worker_employee_id = serializers.CharField(source='worker.employee_id', read_only=True)
    enterprise_name = serializers.CharField(source='worker.enterprise.name', read_only=True)
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
    """Médecine du Travail disease type serializer"""
    
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    class Meta:
        model = OccupationalDiseaseType
        fields = '__all__'

class OccupationalDiseaseSerializer(serializers.ModelSerializer):
    """Médecine du Travail disease case serializer"""
    
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

# ==================== NESTED WRITE SERIALIZERS ====================

class MedicalExaminationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating medical examinations with nested data"""
    
    class Meta:
        model = MedicalExamination
        fields = [
            'worker', 'exam_type', 'exam_date', 'examining_doctor',
            'chief_complaint', 'medical_history_review',
            'results_summary', 'recommendations',
            'examination_completed',
            'follow_up_required', 'follow_up_date', 'next_periodic_exam'
        ]

    def validate(self, attrs):
        follow_up_required = attrs.get('follow_up_required', False)
        follow_up_date = attrs.get('follow_up_date')
        if follow_up_required and not follow_up_date:
            raise serializers.ValidationError({'follow_up_date': 'Date de suivi requise lorsque le suivi est activé.'})
        return attrs
    
    def create(self, validated_data):
        # Generate exam number
        validated_data['examination_completed'] = validated_data.get('examination_completed', False)
        return super().create(validated_data)

class WorkerCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating workers with validation"""
    
    class Meta:
        model = Worker
        fields = [
            'employee_id', 'first_name', 'last_name', 'date_of_birth', 'gender',
            'enterprise', 'work_site', 'job_category', 'job_title', 'hire_date',
            'phone', 'email', 'address', 'emergency_contact_name', 'emergency_contact_phone',
            'exposure_risks', 'ppe_required', 'allergies', 'chronic_conditions', 'medications'
        ]
    
    def validate_employee_id(self, value):
        """Ensure employee ID is unique"""
        if Worker.objects.filter(employee_id=value).exists():
            raise serializers.ValidationError("Employee ID must be unique")
        return value
    
    def create(self, validated_data):
        # Set initial fitness status
        validated_data['current_fitness_status'] = 'pending_evaluation'
        # Calculate next exam due date based on sector requirements
        enterprise = validated_data['enterprise']
        hire_date = validated_data['hire_date']
        
        # Initial exam should be within 30 days
        from datetime import timedelta
        validated_data['next_exam_due'] = hire_date + timedelta(days=30)
        
        return super().create(validated_data)

class EnterpriseCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating enterprises with validation"""
    
    class Meta:
        model = Enterprise
        fields = [
            'name', 'sector', 'rccm', 'nif', 'address', 'contact_person',
            'phone', 'email', 'contract_start_date', 'contract_end_date'
        ]
    
    def validate_rccm(self, value):
        """Ensure RCCM is unique"""
        if Enterprise.objects.filter(rccm=value).exists():
            raise serializers.ValidationError("RCCM must be unique")
        return value
    
    def validate_nif(self, value):
        """Ensure NIF is unique"""
        if Enterprise.objects.filter(nif=value).exists():
            raise serializers.ValidationError("NIF must be unique")
        return value
    
    # Recommendations
    immediate_actions = serializers.ListField()
    preventive_measures = serializers.ListField()


# ==================== EXTENDED OCCUPATIONAL HEALTH SERIALIZERS ====================

class OverexposureAlertSerializer(serializers.ModelSerializer):
    """Serializer for overexposure alerts"""
    
    worker_name = serializers.CharField(source='worker.full_name', read_only=True)
    worker_employee_id = serializers.CharField(source='worker.employee_id', read_only=True)
    enterprise_name = serializers.CharField(source='worker.enterprise.name', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    acknowledged_by_name = serializers.CharField(source='acknowledged_by.get_full_name', read_only=True)
    
    class Meta:
        model = OverexposureAlert
        fields = '__all__'


class ExitExaminationSerializer(serializers.ModelSerializer):
    """Serializer for exit examinations"""
    
    worker_name = serializers.CharField(source='worker.full_name', read_only=True)
    worker_employee_id = serializers.CharField(source='worker.employee_id', read_only=True)
    enterprise_name = serializers.CharField(source='worker.enterprise.name', read_only=True)
    reason_display = serializers.CharField(source='get_reason_for_exit_display', read_only=True)
    examiner_name = serializers.CharField(source='examiner.get_full_name', read_only=True)
    days_until_exit = serializers.ReadOnlyField()
    
    class Meta:
        model = ExitExamination
        fields = '__all__'


class RegulatoryCNSSReportSerializer(serializers.ModelSerializer):
    """Serializer for CNSS regulatory reports"""
    
    enterprise_name = serializers.CharField(source='enterprise.name', read_only=True)
    report_type_display = serializers.CharField(source='get_report_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    prepared_by_name = serializers.CharField(source='prepared_by.get_full_name', read_only=True)
    incident_details = serializers.SerializerMethodField(read_only=True)
    disease_details = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = RegulatoryCNSSReport
        fields = '__all__'
    
    def get_incident_details(self, obj):
        """Include related incident details if present"""
        if obj.related_incident:
            return {
                'incident_number': obj.related_incident.incident_number,
                'category': obj.related_incident.category,
                'date': obj.related_incident.incident_date,
                'severity': obj.related_incident.severity,
            }
        return None
    
    def get_disease_details(self, obj):
        """Include related disease details if present"""
        if obj.related_disease:
            return {
                'case_number': obj.related_disease.case_number,
                'disease_name': obj.related_disease.disease_type.name,
                'diagnosis_date': obj.related_disease.diagnosis_date,
                'severity': obj.related_disease.severity_level,
            }
        return None


class DRCRegulatoryReportSerializer(serializers.ModelSerializer):
    """Serializer for DRC regulatory reports"""
    
    enterprise_name = serializers.CharField(source='enterprise.name', read_only=True)
    report_type_display = serializers.CharField(source='get_report_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    submitted_by_name = serializers.CharField(source='submitted_by.get_full_name', read_only=True)
    related_incidents_summary = serializers.SerializerMethodField(read_only=True)
    related_diseases_summary = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = DRCRegulatoryReport
        fields = '__all__'
    
    def get_related_incidents_summary(self, obj):
        """Include count and summary of related incidents"""
        incidents = obj.related_incidents.all()
        return {
            'count': incidents.count(),
            'items': [
                {'incident_number': inc.incident_number, 'category': inc.category}
                for inc in incidents[:5]
            ]
        }
    
    def get_related_diseases_summary(self, obj):
        """Include count and summary of related diseases"""
        diseases = obj.related_diseases.all()
        return {
            'count': diseases.count(),
            'items': [
                {'case_number': dis.case_number, 'disease_name': dis.disease_type.name}
                for dis in diseases[:5]
            ]
        }


class PPEComplianceRecordSerializer(serializers.ModelSerializer):
    """Serializer for PPE compliance records"""
    
    worker_name = serializers.CharField(source='ppe_item.worker.full_name', read_only=True)
    worker_employee_id = serializers.CharField(source='ppe_item.worker.employee_id', read_only=True)
    ppe_type_display = serializers.CharField(source='ppe_item.get_ppe_type_display', read_only=True)
    check_type_display = serializers.CharField(source='get_check_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    checked_by_name = serializers.CharField(source='checked_by.get_full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    
    class Meta:
        model = PPEComplianceRecord
        fields = '__all__'


class WorkerRiskProfileSerializer(serializers.ModelSerializer):
    """Serializer for worker risk profiles"""
    
    worker_name = serializers.CharField(source='worker.full_name', read_only=True)
    worker_employee_id = serializers.CharField(source='worker.employee_id', read_only=True)
    job_category_display = serializers.CharField(source='worker.get_job_category_display', read_only=True)
    enterprise_name = serializers.CharField(source='worker.enterprise.name', read_only=True)
    risk_level_display = serializers.CharField(source='get_risk_level_display', read_only=True)
    
    class Meta:
        model = WorkerRiskProfile
        fields = '__all__'


# ==================== MEDICAL EXAMINATION EXTENDED SERIALIZERS ====================

class XrayImagingResultSerializer(serializers.ModelSerializer):
    """Serializer for X-ray imaging results"""
    
    worker_name = serializers.CharField(
        source='examination.worker.full_name',
        read_only=True
    )
    worker_id = serializers.CharField(
        source='examination.worker.employee_id',
        read_only=True
    )
    exam_type = serializers.CharField(
        source='examination.exam_type',
        read_only=True
    )
    imaging_type_display = serializers.CharField(
        source='get_imaging_type_display',
        read_only=True
    )
    ilo_classification_display = serializers.CharField(
        source='get_ilo_classification_display',
        read_only=True
    )
    profusion_display = serializers.CharField(
        source='get_profusion_display',
        read_only=True
    )
    
    class Meta:
        model = XrayImagingResult
        fields = [
            'id', 'examination', 'worker_name', 'worker_id', 'exam_type',
            'imaging_type', 'imaging_type_display', 'imaging_date',
            'imaging_facility', 'radiologist',
            'ilo_classification', 'ilo_classification_display',
            'profusion', 'profusion_display',
            'small_opacities', 'large_opacities', 'pleural_thickening',
            'pleural_effusion', 'costophrenic_angle_obliteration',
            'cardiac_enlargement', 'other_findings',
            'pneumoconiosis_detected', 'pneumoconiosis_type', 'severity',
            'follow_up_required', 'follow_up_interval_months',
            'clinical_notes', 'created', 'updated'
        ]
        read_only_fields = [
            'id', 'worker_name', 'worker_id', 'exam_type',
            'imaging_type_display', 'ilo_classification_display',
            'profusion_display', 'created', 'updated'
        ]


class HeavyMetalsTestSerializer(serializers.ModelSerializer):
    """Serializer for heavy metals test results"""
    
    worker_name = serializers.CharField(
        source='examination.worker.full_name',
        read_only=True
    )
    worker_id = serializers.CharField(
        source='examination.worker.employee_id',
        read_only=True
    )
    heavy_metal_display = serializers.CharField(
        source='get_heavy_metal_display',
        read_only=True
    )
    specimen_type_display = serializers.CharField(
        source='get_specimen_type_display',
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    is_abnormal = serializers.SerializerMethodField()
    
    def get_is_abnormal(self, obj):
        return obj.status in ['elevated', 'high', 'critical']
    
    class Meta:
        model = HeavyMetalsTest
        fields = [
            'id', 'examination', 'worker_name', 'worker_id',
            'heavy_metal', 'heavy_metal_display',
            'specimen_type', 'specimen_type_display',
            'test_date', 'level_value', 'unit',
            'reference_lower', 'reference_upper', 'status', 'status_display',
            'osha_action_level', 'exceeds_osha_limit',
            'clinical_significance', 'occupational_exposure',
            'follow_up_required', 'follow_up_recommendation',
            'is_abnormal', 'created', 'updated'
        ]
        read_only_fields = [
            'id', 'worker_name', 'worker_id',
            'heavy_metal_display', 'specimen_type_display',
            'status_display', 'exceeds_osha_limit', 'created', 'updated'
        ]


class DrugAlcoholScreeningSerializer(serializers.ModelSerializer):
    """Serializer for drug and alcohol screening"""
    
    worker_name = serializers.CharField(
        source='examination.worker.full_name',
        read_only=True
    )
    worker_id = serializers.CharField(
        source='examination.worker.employee_id',
        read_only=True
    )
    test_type_display = serializers.CharField(
        source='get_test_type_display',
        read_only=True
    )
    alcohol_result_display = serializers.CharField(
        source='get_alcohol_result_display',
        read_only=True
    )
    drug_result_display = serializers.CharField(
        source='get_drug_result_display',
        read_only=True
    )
    confirmation_result_display = serializers.CharField(
        source='get_confirmation_result_display',
        read_only=True
    )
    overall_result = serializers.SerializerMethodField()
    
    def get_overall_result(self, obj):
        if obj.alcohol_result == 'positive' or obj.drug_result == 'positive':
            return 'positive'
        elif obj.alcohol_result == 'presumptive' or obj.drug_result == 'presumptive':
            return 'presumptive'
        return 'negative'
    
    class Meta:
        model = DrugAlcoholScreening
        fields = [
            'id', 'examination', 'worker_name', 'worker_id',
            'test_type', 'test_type_display', 'test_date',
            'testing_facility', 'collector',
            'alcohol_tested', 'alcohol_result', 'alcohol_result_display',
            'alcohol_level',
            'drug_tested', 'drug_result', 'drug_result_display',
            'substances_tested', 'specific_substances_detected',
            'confirmation_required', 'confirmation_date',
            'confirmation_result', 'confirmation_result_display',
            'mro_reviewed', 'mro_name', 'mro_comments',
            'fit_for_duty', 'restrictions',
            'chain_of_custody_verified', 'specimen_id', 'notes',
            'overall_result', 'created', 'updated'
        ]
        read_only_fields = [
            'id', 'worker_name', 'worker_id',
            'test_type_display', 'alcohol_result_display',
            'drug_result_display', 'confirmation_result_display',
            'overall_result', 'created', 'updated'
        ]


class HealthScreeningSerializer(serializers.ModelSerializer):
    """Serializer for flexible health screenings (ergonomic, mental, cardio, musculoskeletal)"""
    
    worker_name = serializers.CharField(
        source='worker.get_full_name',
        read_only=True
    )
    worker_id = serializers.CharField(
        source='worker.employee_id',
        read_only=True
    )
    screening_type_display = serializers.CharField(
        source='get_screening_type_display',
        read_only=True
    )
    conducted_by_name = serializers.CharField(
        source='conducted_by.get_full_name',
        read_only=True,
        allow_null=True
    )
    reviewed_by_name = serializers.CharField(
        source='reviewed_by.get_full_name',
        read_only=True,
        allow_null=True
    )
    
    class Meta:
        model = HealthScreening
        fields = [
            'id', 'worker', 'worker_name', 'worker_id',
            'screening_type', 'screening_type_display',
            'responses', 'status', 'notes',
            'conducted_by', 'conducted_by_name',
            'reviewed_by', 'reviewed_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'worker_name', 'worker_id',
            'screening_type_display', 'conducted_by_name', 'reviewed_by_name',
            'created_at', 'updated_at'
        ]


class FitnessCertificationDecisionSerializer(serializers.ModelSerializer):
    """Serializer for fitness certification decisions"""
    
    worker_name = serializers.CharField(
        source='examinations.worker.full_name',
        read_only=True
    )
    worker_id = serializers.CharField(
        source='examinations.worker.employee_id',
        read_only=True
    )
    enterprise_name = serializers.CharField(
        source='examinations.worker.enterprise.name',
        read_only=True
    )
    reviewed_by_name = serializers.CharField(
        source='reviewed_by.get_full_name',
        read_only=True
    )
    fitness_status_display = serializers.CharField(
        source='get_fitness_status_display',
        read_only=True
    )
    decision_basis_display = serializers.CharField(
        source='get_decision_basis_display',
        read_only=True
    )
    is_valid = serializers.BooleanField(read_only=True)
    days_until_expiry = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = FitnessCertificationDecision
        fields = [
            'id', 'examinations', 'worker_name', 'worker_id',
            'enterprise_name',
            'decision_date', 'reviewed_by', 'reviewed_by_name',
            'fitness_status', 'fitness_status_display',
            'decision_basis', 'decision_basis_display',
            'key_findings', 'risk_factors',
            'work_restrictions', 'required_accommodations',
            'recommended_interventions',
            'follow_up_required', 'follow_up_interval_months',
            'follow_up_justification',
            'certification_date', 'certification_valid_until',
            'medical_fit', 'psychological_fit', 'safety_sensitive',
            'subject_to_appeal', 'appeal_deadline',
            'is_valid', 'days_until_expiry',
            'created', 'updated'
        ]
        read_only_fields = [
            'id', 'worker_name', 'worker_id', 'enterprise_name',
            'reviewed_by_name', 'fitness_status_display',
            'decision_basis_display', 'is_valid', 'days_until_expiry',
            'created', 'updated'
        ]


# ==================== RISK ASSESSMENT EXTENDED SERIALIZERS ====================

class HierarchyOfControlsSerializer(serializers.ModelSerializer):
    """Serializer for Hierarchy of Controls recommendations"""
    
    hazard_name = serializers.CharField(source='hazard.hazard_type', read_only=True)
    enterprise_name = serializers.CharField(source='enterprise.name', read_only=True)
    responsible_person_name = serializers.CharField(
        source='responsible_person.get_full_name',
        read_only=True
    )
    control_level_display = serializers.CharField(
        source='get_control_level_display',
        read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    effectiveness_display = serializers.CharField(
        source='get_effectiveness_rating_display',
        read_only=True
    )
    dependant_controls_data = serializers.SerializerMethodField()
    is_effective = serializers.SerializerMethodField()
    
    class Meta:
        model = HierarchyOfControls
        fields = [
            'id',
            'hazard',
            'hazard_name',
            'enterprise',
            'enterprise_name',
            'control_level',
            'control_level_display',
            'control_name',
            'description',
            'implementation_requirements',
            'estimated_cost',
            'estimated_timeline',
            'responsible_person',
            'responsible_person_name',
            'status',
            'status_display',
            'implementation_date',
            'effectiveness_rating',
            'effectiveness_display',
            'effectiveness_notes',
            'risk_reduction_percentage',
            'residual_risk_score',
            'dependant_controls',
            'dependant_controls_data',
            'is_effective',
            'created',
            'updated',
        ]
        read_only_fields = ['created', 'updated']
    
    def get_dependant_controls_data(self, obj):
        """Get details of dependent controls"""
        dependants = obj.dependant_controls.values('id', 'control_name', 'control_level')
        return list(dependants)
    
    def get_is_effective(self, obj):
        """Check if control is effective"""
        return obj.is_effective()


class RiskHeatmapDataSerializer(serializers.ModelSerializer):
    """Serializer for Risk Heatmap Data points"""
    
    enterprise_name = serializers.CharField(source='enterprise.name', read_only=True)
    probability_display = serializers.CharField(
        source='get_probability_level_display',
        read_only=True
    )
    severity_display = serializers.CharField(
        source='get_severity_level_display',
        read_only=True
    )
    risk_zone_display = serializers.CharField(
        source='get_risk_zone_display',
        read_only=True
    )
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    trend_display = serializers.CharField(source='get_trend_display', read_only=True)
    hazards_list = serializers.SerializerMethodField()
    workers_list = serializers.SerializerMethodField()
    trend_indicator = serializers.SerializerMethodField()
    
    class Meta:
        model = RiskHeatmapData
        fields = [
            'id',
            'enterprise',
            'enterprise_name',
            'heatmap_date',
            'period',
            'probability_level',
            'probability_display',
            'severity_level',
            'severity_display',
            'risk_score',
            'risk_zone',
            'risk_zone_display',
            'hazards_count',
            'hazards_list',
            'incidents_count',
            'near_misses_count',
            'workers_exposed',
            'workers_list',
            'workers_affected_count',
            'controls_implemented',
            'controls_effective_percentage',
            'previous_period_score',
            'trend',
            'trend_display',
            'trend_indicator',
            'priority',
            'priority_display',
            'notes',
            'action_recommendations',
            'created',
            'updated',
        ]
        read_only_fields = ['created', 'updated', 'risk_score', 'risk_zone']
    
    def get_hazards_list(self, obj):
        """Get list of related hazards"""
        return list(obj.related_hazards.values('id', 'hazard_type', 'severity'))
    
    def get_workers_list(self, obj):
        """Get list of exposed workers"""
        return list(obj.workers_exposed.values('id', 'first_name', 'last_name', 'employee_id'))
    
    def get_trend_indicator(self, obj):
        """Get visual trend indicator"""
        return obj.get_trend_indicator()


class RiskHeatmapReportSerializer(serializers.ModelSerializer):
    """Serializer for Risk Heatmap Reports"""
    
    enterprise_name = serializers.CharField(source='enterprise.name', read_only=True)
    incident_trend_display = serializers.CharField(
        source='get_incident_trend_display',
        read_only=True
    )
    heatmap_matrix = serializers.SerializerMethodField()
    risk_distribution = serializers.SerializerMethodField()
    
    class Meta:
        model = RiskHeatmapReport
        fields = [
            'id',
            'enterprise',
            'enterprise_name',
            'report_date',
            'period',
            'total_heatmap_cells',
            'critical_cells',
            'high_risk_cells',
            'medium_risk_cells',
            'low_risk_cells',
            'average_risk_score',
            'highest_risk_score',
            'lowest_risk_score',
            'total_workers_exposed',
            'workers_in_critical_zones',
            'incidents_this_period',
            'incidents_last_period',
            'incident_trend',
            'incident_trend_display',
            'total_controls',
            'effective_controls',
            'ineffective_controls',
            'control_effectiveness_percentage',
            'critical_actions_required',
            'action_items',
            'heatmap_matrix',
            'risk_distribution',
            'created',
        ]
        read_only_fields = ['created', 'report_date']
    
    def get_heatmap_matrix(self, obj):
        """Get 5x5 heatmap matrix structure"""
        return obj.heatmap_html_matrix
    
    def get_risk_distribution(self, obj):
        """Get risk distribution breakdown"""
        return {
            'critical': obj.critical_cells,
            'high': obj.high_risk_cells,
            'medium': obj.medium_risk_cells,
            'low': obj.low_risk_cells,
            'critical_percentage': round((obj.critical_cells / obj.total_heatmap_cells) * 100, 1) if obj.total_heatmap_cells > 0 else 0,
            'high_percentage': round((obj.high_risk_cells / obj.total_heatmap_cells) * 100, 1) if obj.total_heatmap_cells > 0 else 0,
            'medium_percentage': round((obj.medium_risk_cells / obj.total_heatmap_cells) * 100, 1) if obj.total_heatmap_cells > 0 else 0,
            'low_percentage': round((obj.low_risk_cells / obj.total_heatmap_cells) * 100, 1) if obj.total_heatmap_cells > 0 else 0,
        }


# ==================== ISO 27001 SERIALIZERS ====================
# Import ISO 27001 Information Security serializers
from .serializers_iso27001 import (
    AuditLogSerializer,
    AccessControlSerializer,
    SecurityIncidentSerializer,
    VulnerabilityRecordSerializer,
    AccessRequestSerializer,
    DataRetentionPolicySerializer,
    EncryptionKeyRecordSerializer,
    ComplianceDashboardSerializer,
)

# ==================== ISO 45001 SERIALIZERS ====================
# Import ISO 45001 Occupational Health & Safety serializers
from .serializers_iso45001 import (
    OHSPolicySerializer,
    HazardRegisterSerializer,
    IncidentInvestigationSerializer,
    SafetyTrainingSerializer,
    TrainingCertificationSerializer,
    EmergencyProcedureSerializer,
    EmergencyDrillSerializer,
    HealthSurveillanceSerializer,
    PerformanceIndicatorSerializer,
    ComplianceAuditSerializer,
    ContractorQualificationSerializer,
    ManagementReviewSerializer,
    WorkerFeedbackSerializer,
)