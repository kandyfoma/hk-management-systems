"""
Médecine du Travail Admin - Django Admin Configuration

Rich Django admin interface for multi-sector occupational medicine
management system with sector-specific customizations.
"""
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.db.models import Count
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

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
    HealthScreening, FitnessCertificationDecision,
    # Risk assessment models
    HierarchyOfControls, RiskHeatmapData, RiskHeatmapReport,
)

# ==================== PROTOCOL HIERARCHY ADMINS ====================

class ProtocolRequiredExamInline(admin.TabularInline):
    model = ProtocolRequiredExam
    extra = 1
    fields = ('exam', 'order', 'is_blocking')
    autocomplete_fields = ['exam']
    ordering = ('order',)


@admin.register(MedicalExamCatalog)
class MedicalExamCatalogAdmin(admin.ModelAdmin):
    list_display = ('code', 'label', 'category', 'requires_specialist', 'is_active', 'created_at')
    list_filter = ('category', 'requires_specialist', 'is_active')
    search_fields = ('code', 'label', 'description')
    ordering = ('category', 'label')
    list_editable = ('is_active',)
    readonly_fields = ('created_at',)
    fieldsets = (
        ('Identification', {'fields': ('code', 'label', 'category')}),
        ('Details', {'fields': ('description', 'requires_specialist', 'is_active')}),
        ('Metadata', {'fields': ('created_at',), 'classes': ('collapse',)}),
    )


@admin.register(OccSector)
class OccSectorAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'industry_sector_key', 'department_count', 'is_active', 'created_by')
    list_filter = ('industry_sector_key', 'is_active')
    search_fields = ('code', 'name')
    readonly_fields = ('created_at', 'department_count')

    def department_count(self, obj):
        return obj.departments.count()
    department_count.short_description = 'Departments'

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(OccDepartment)
class OccDepartmentAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'sector', 'position_count', 'is_active')
    list_filter = ('sector', 'is_active')
    search_fields = ('code', 'name', 'sector__name')
    raw_id_fields = ('sector',)

    def position_count(self, obj):
        return obj.positions.count()
    position_count.short_description = 'Positions'


@admin.register(OccPosition)
class OccPositionAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'department', 'sector_name', 'protocol_count', 'is_active')
    list_filter = ('department__sector', 'department', 'is_active')
    search_fields = ('code', 'name', 'department__name', 'department__sector__name')
    raw_id_fields = ('department',)
    readonly_fields = ('created_at', 'protocol_count')

    def sector_name(self, obj):
        return obj.department.sector.name if obj.department else '-'
    sector_name.short_description = 'Sector'

    def protocol_count(self, obj):
        return obj.protocols.count()
    protocol_count.short_description = 'Protocols'

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(ExamVisitProtocol)
class ExamVisitProtocolAdmin(admin.ModelAdmin):
    list_display = (
        'position', 'visit_type', 'required_exam_count',
        'validity_months', 'is_active', 'created_by'
    )
    list_filter = ('visit_type', 'is_active', 'position__department__sector')
    search_fields = (
        'position__code', 'position__name',
        'position__department__name', 'position__department__sector__name'
    )
    raw_id_fields = ('position',)
    filter_horizontal = ('recommended_exams',)
    inlines = [ProtocolRequiredExamInline]
    readonly_fields = ('created_at', 'created_by_display')

    def required_exam_count(self, obj):
        return obj.protocolrequiredexam_set.count()
    required_exam_count.short_description = 'Required Exams'

    def created_by_display(self, obj):
        return str(obj.created_by) if obj.created_by else '-'
    created_by_display.short_description = 'Created by'

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


# ==================== CORE MODEL ADMINS ====================

@admin.register(Enterprise)
class EnterpriseAdmin(admin.ModelAdmin):
    """Enterprise admin with sector-specific features"""
    
    list_display = [
        'name', 'sector_badge', 'risk_level_badge', 'rccm', 'nif', 
        'worker_count', 'active_status', 'contract_period', 'created_at'
    ]
    list_filter = ['sector', 'is_active', 'created_at']
    search_fields = ['name', 'rccm', 'nif', 'contact_person']
    readonly_fields = ['created_at', 'updated_at', 'risk_level', 'exam_frequency_months']
    autocomplete_fields = ['created_by']
    
    fieldsets = (
        ('Informations Entreprise', {
            'fields': ('name', 'sector', 'rccm', 'nif', 'address')
        }),
        ('Contact', {
            'fields': ('contact_person', 'phone', 'email')
        }),
        ('Contrat Service Santé', {
            'fields': ('contract_start_date', 'contract_end_date', 'is_active')
        }),
        ('Profil Risque (Auto-calculé)', {
            'fields': ('risk_level', 'exam_frequency_months'),
            'classes': ('collapse',)
        }),
        ('Audit', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def sector_badge(self, obj):
        """Display sector with icon"""
        sector_icons = {
            'construction': '🏗️',
            'mining': '⛏️',
            'oil_gas': '🛢️',
            'manufacturing': '🏭',
            'agriculture': '🌾',
            'healthcare': '🏥',
            'banking_finance': '🏦',
            'telecom_it': '📡',
        }
        icon = sector_icons.get(obj.sector, '📦')
        return f"{icon} {obj.get_sector_display()}"
    sector_badge.short_description = "Secteur"
    
    def risk_level_badge(self, obj):
        """Display risk level with color coding"""
        risk_colors = {
            'very_high': '#dc2626',  # red-600
            'high': '#ea580c',       # orange-600  
            'moderate': '#ca8a04',   # yellow-600
            'low_moderate': '#16a34a', # green-600
            'low': '#059669'         # emerald-600
        }
        color = risk_colors.get(obj.risk_level, '#6b7280')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.risk_level.replace('_', ' ').title()
        )
    risk_level_badge.short_description = "Niveau Risque"
    
    def worker_count(self, obj):
        """Display worker count with link"""
        count = obj.workers.count()
        url = reverse('admin:occupational_health_worker_changelist') + f'?enterprise={obj.id}'
        return format_html('<a href="{}">{} travailleurs</a>', url, count)
    worker_count.short_description = "Effectif"
    
    def active_status(self, obj):
        """Display active status with icon"""
        if obj.is_active:
            return format_html('<span style="color: green;">✓ Actif</span>')
        return format_html('<span style="color: red;">✗ Inactif</span>')
    active_status.short_description = "Statut"
    
    def contract_period(self, obj):
        """Display contract period"""
        if obj.contract_end_date:
            return f"{obj.contract_start_date} - {obj.contract_end_date}"
        return f"Depuis {obj.contract_start_date}"
    contract_period.short_description = "Période Contrat"

@admin.register(WorkSite)
class WorkSiteAdmin(admin.ModelAdmin):
    """Work site admin"""
    
    list_display = [
        'name', 'enterprise', 'worker_count', 'site_manager', 
        'remote_site_badge', 'medical_facility_badge'
    ]
    list_filter = ['enterprise__sector', 'is_remote_site', 'has_medical_facility']
    search_fields = ['name', 'enterprise__name', 'site_manager']
    
    def remote_site_badge(self, obj):
        if obj.is_remote_site:
            return format_html('<span style="color: orange;">🏞️ Éloigné</span>')
        return format_html('<span style="color: green;">🏢 Urbain</span>')
    remote_site_badge.short_description = "Localisation"
    
    def medical_facility_badge(self, obj):
        if obj.has_medical_facility:
            return format_html('<span style="color: green;">🏥 Dispensaire</span>')
        return format_html('<span style="color: gray;">— Aucun</span>')
    medical_facility_badge.short_description = "Installation Médicale"

@admin.register(Worker)
class WorkerAdmin(admin.ModelAdmin):
    """Worker admin with Médecine du Travail profile"""
    
    list_display = [
        'full_name', 'employee_id', 'enterprise', 'job_category_display',
        'employment_status_badge', 'fitness_status_badge', 'age', 'next_exam_due'
    ]
    list_filter = [
        'enterprise__sector', 'job_category', 'employment_status',
        'current_fitness_status', 'gender', 'hire_date'
    ]
    search_fields = ['first_name', 'last_name', 'employee_id', 'job_title']
    readonly_fields = ['age', 'sector_risk_level', 'created_at', 'updated_at']
    autocomplete_fields = ['enterprise', 'work_site', 'created_by']
    
    fieldsets = (
        ('Informations Personnelles', {
            'fields': ('first_name', 'last_name', 'date_of_birth', 'age', 'gender')
        }),
        ('Emploi', {
            'fields': ('enterprise', 'work_site', 'employee_id', 'job_category', 
                      'job_title', 'hire_date', 'employment_status')
        }),
        ('Contact', {
            'fields': ('phone', 'email', 'address', 'emergency_contact_name', 'emergency_contact_phone')
        }),
        ('Profil Santé Travail', {
            'fields': ('exposure_risks', 'ppe_required', 'ppe_provided', 'sector_risk_level')
        }),
        ('Antécédents Médicaux', {
            'fields': ('allergies', 'chronic_conditions', 'medications', 'prior_occupational_exposure'),
            'classes': ('collapse',)
        }),
        ('Statut Aptitude Actuel', {
            'fields': ('current_fitness_status', 'fitness_restrictions', 'next_exam_due')
        }),
        ('Audit', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def employment_status_badge(self, obj):
        """Display employment status with color"""
        colors = {
            'active': 'green',
            'on_leave': 'orange', 
            'suspended': 'red',
            'terminated': 'gray'
        }
        color = colors.get(obj.employment_status, 'gray')
        return format_html(
            '<span style="color: {};">{}</span>',
            color,
            obj.get_employment_status_display()
        )
    employment_status_badge.short_description = "Statut Emploi"
    
    def fitness_status_badge(self, obj):
        """Display fitness status with color and icon"""
        status_config = {
            'fit': ('green', '✓', 'Apte'),
            'fit_with_restrictions': ('orange', '⚠', 'Apte avec Restrictions'),
            'temporarily_unfit': ('red', '⏸', 'Inapte Temporaire'),
            'permanently_unfit': ('crimson', '✗', 'Inapte Définitif'),
            'pending_evaluation': ('gray', '⏳', 'En Attente')
        }
        
        color, icon, label = status_config.get(obj.current_fitness_status, ('gray', '?', 'Inconnu'))
        return format_html(
            '<span style="color: {}; font-weight: bold;">{} {}</span>',
            color, icon, label
        )
    fitness_status_badge.short_description = "Aptitude"
    
    def job_category_display(self, obj):
        """Display job category with formatting"""
        return obj.get_job_category_display()
    job_category_display.short_description = "Catégorie Emploi"

# ==================== MEDICAL EXAMINATION ADMINS ====================

class VitalSignsInline(admin.TabularInline):
    model = VitalSigns
    extra = 0
    readonly_fields = ['bmi', 'bmi_category', 'bp_category', 'has_abnormal_vitals']

class PhysicalExaminationInline(admin.TabularInline):
    model = PhysicalExamination
    extra = 0

class FitnessCertificateInline(admin.TabularInline):
    model = FitnessCertificate
    extra = 0
    readonly_fields = ['is_expired', 'days_until_expiry']

@admin.register(MedicalExamination)
class MedicalExaminationAdmin(admin.ModelAdmin):
    """Medical examination admin with inline components"""
    
    list_display = [
        'exam_number', 'worker_link', 'enterprise', 'exam_type_badge',
        'exam_date', 'examining_doctor', 'completion_status', 'fitness_status'
    ]
    list_filter = [
        'exam_type', 'examination_completed', 'exam_date',
        'worker__enterprise__sector', 'follow_up_required'
    ]
    search_fields = ['exam_number', 'worker__first_name', 'worker__last_name', 'worker__employee_id']
    readonly_fields = ['created_at', 'updated_at']
    
    inlines = [VitalSignsInline, PhysicalExaminationInline, FitnessCertificateInline]
    
    fieldsets = (
        ('Informations Examen', {
            'fields': ('exam_number', 'worker', 'exam_type', 'exam_date', 'examining_doctor')
        }),
        ('Détails Examen', {
            'fields': ('chief_complaint', 'medical_history_review', 'examination_completed')
        }),
        ('Résultats', {
            'fields': ('results_summary', 'recommendations')
        }),
        ('Suivi', {
            'fields': ('follow_up_required', 'follow_up_date', 'next_periodic_exam')
        }),
        ('Audit', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def worker_link(self, obj):
        """Link to worker detail"""
        url = reverse('admin:occupational_health_worker_change', args=[obj.worker.id])
        return format_html('<a href="{}">{}</a>', url, obj.worker.full_name)
    worker_link.short_description = "Travailleur"
    
    def enterprise(self, obj):
        """Display worker's enterprise"""
        return obj.worker.enterprise.name
    enterprise.short_description = "Entreprise"
    
    def exam_type_badge(self, obj):
        """Display exam type with icon"""
        type_icons = {
            'pre_employment': '🆕',
            'periodic': '🔄',
            'return_to_work': '↩️',
            'special': '⭐',
            'exit': '👋',
            'night_work': '🌙',
            'pregnancy_related': '🤱',
            'post_incident': '🚨'
        }
        icon = type_icons.get(obj.exam_type, '📋')
        return f"{icon} {obj.get_exam_type_display()}"
    exam_type_badge.short_description = "Type Examen"
    
    def completion_status(self, obj):
        """Display completion status"""
        if obj.examination_completed:
            return format_html('<span style="color: green;">✓ Terminé</span>')
        return format_html('<span style="color: orange;">⏳ En cours</span>')
    completion_status.short_description = "Statut"
    
    def fitness_status(self, obj):
        """Display fitness certificate status"""
        if hasattr(obj, 'fitness_certificate'):
            cert = obj.fitness_certificate
            if cert.is_expired:
                return format_html('<span style="color: red;">Expiré</span>')
            return format_html('<span style="color: green;">{}</span>', cert.get_fitness_decision_display())
        return format_html('<span style="color: gray;">Pas de certificat</span>')
    fitness_status.short_description = "Certificat Aptitude"

@admin.register(VitalSigns)
class VitalSignsAdmin(admin.ModelAdmin):
    """Vital signs admin with health indicators"""
    
    list_display = [
        'worker_name', 'examination_date', 'bp_display', 'bmi_display',
        'abnormal_vitals_badge', 'recorded_by', 'recorded_at'
    ]
    list_filter = ['recorded_at']
    search_fields = ['examination__worker__first_name', 'examination__worker__last_name']
    readonly_fields = ['bmi', 'bmi_category', 'bp_category', 'has_abnormal_vitals']
    
    def worker_name(self, obj):
        return obj.examination.worker.full_name
    worker_name.short_description = "Travailleur"
    
    def examination_date(self, obj):
        return obj.examination.exam_date
    examination_date.short_description = "Date Examen"
    
    def bp_display(self, obj):
        color = 'red' if obj.systolic_bp >= 140 or obj.diastolic_bp >= 90 else 'green'
        return format_html(
            '<span style="color: {};">{}/{} mmHg</span>',
            color, obj.systolic_bp, obj.diastolic_bp
        )
    bp_display.short_description = "Tension"
    
    def bmi_display(self, obj):
        bmi = obj.bmi
        if bmi:
            color = 'red' if bmi < 18.5 or bmi >= 30 else 'orange' if bmi >= 25 else 'green'
            return format_html('<span style="color: {};">{}</span>', color, bmi)
        return "—"
    bmi_display.short_description = "IMC"
    
    def abnormal_vitals_badge(self, obj):
        if obj.has_abnormal_vitals:
            return format_html('<span style="color: red;">⚠️ Anormal</span>')
        return format_html('<span style="color: green;">✓ Normal</span>')
    abnormal_vitals_badge.short_description = "Statut"

@admin.register(FitnessCertificate)
class FitnessCertificateAdmin(admin.ModelAdmin):
    """Fitness certificate admin with expiry tracking"""
    
    list_display = [
        'certificate_number', 'worker_name', 'fitness_decision_badge',
        'issue_date', 'expiry_status', 'days_until_expiry', 'active_status'
    ]
    list_filter = ['fitness_decision', 'is_active', 'issue_date', 'valid_until']
    search_fields = ['certificate_number', 'examination__worker__first_name', 'examination__worker__last_name']
    readonly_fields = ['is_expired', 'days_until_expiry']
    
    def worker_name(self, obj):
        return obj.examination.worker.full_name
    worker_name.short_description = "Travailleur"
    
    def fitness_decision_badge(self, obj):
        """Display fitness decision with color"""
        colors = {
            'fit': 'green',
            'fit_with_restrictions': 'orange',
            'temporarily_unfit': 'red',
            'permanently_unfit': 'crimson'
        }
        color = colors.get(obj.fitness_decision, 'gray')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_fitness_decision_display()
        )
    fitness_decision_badge.short_description = "Décision"
    
    def expiry_status(self, obj):
        """Display expiry status with color"""
        if obj.is_expired:
            return format_html('<span style="color: red;">🔴 Expiré</span>')
        elif obj.days_until_expiry <= 30:
            return format_html('<span style="color: orange;">🟡 Expire bientôt</span>')
        return format_html('<span style="color: green;">🟢 Valide</span>')
    expiry_status.short_description = "Statut Expiration"
    
    def active_status(self, obj):
        if obj.is_active:
            return format_html('<span style="color: green;">✓ Actif</span>')
        return format_html('<span style="color: red;">✗ Inactif</span>')
    active_status.short_description = "Actif"

# ==================== DISEASE AND INCIDENT ADMINS ====================

@admin.register(OccupationalDiseaseType)
class OccupationalDiseaseTypeAdmin(admin.ModelAdmin):
    """Occupational disease type admin"""
    
    list_display = ['name', 'category_badge', 'ilo_code', 'primary_sectors']
    list_filter = ['category']
    search_fields = ['name', 'ilo_code', 'description']
    
    def category_badge(self, obj):
        """Display category with icon"""
        category_icons = {
            'respiratory': '🫁',
            'musculoskeletal': '🦴',
            'skin': '🧴',
            'hearing': '👂',
            'mental': '🧠',
            'cancer': '🎗️',
            'cardiovascular': '❤️',
            'neurological': '🧠',
            'infectious': '🦠',
            'vision': '👁️',
            'voice': '🎤',
            'reproductive': '👶'
        }
        icon = category_icons.get(obj.category, '📋')
        return f"{icon} {obj.get_category_display()}"
    category_badge.short_description = "Catégorie"

@admin.register(OccupationalDisease)
class OccupationalDiseaseAdmin(admin.ModelAdmin):
    """Occupational disease case admin"""
    
    list_display = [
        'case_number', 'worker_link', 'disease_name', 'causal_determination_badge',
        'severity_badge', 'diagnosis_date', 'cnss_status'
    ]
    list_filter = [
        'disease_type__category', 'causal_determination', 'severity_level',
        'case_status', 'reported_to_cnss', 'diagnosis_date'
    ]
    search_fields = ['case_number', 'worker__first_name', 'worker__last_name']
    
    def worker_link(self, obj):
        url = reverse('admin:occupational_health_worker_change', args=[obj.worker.id])
        return format_html('<a href="{}">{}</a>', url, obj.worker.full_name)
    worker_link.short_description = "Travailleur"
    
    def disease_name(self, obj):
        return obj.disease_type.name
    disease_name.short_description = "Maladie"
    
    def causal_determination_badge(self, obj):
        colors = {
            'definite': 'green',
            'probable': 'orange',
            'possible': 'yellow',
            'unlikely': 'red',
            'not_related': 'gray'
        }
        color = colors.get(obj.causal_determination, 'gray')
        return format_html(
            '<span style="color: {};">{}</span>',
            color, obj.get_causal_determination_display()
        )
    causal_determination_badge.short_description = "Causalité"
    
    def severity_badge(self, obj):
        colors = {
            'mild': 'green',
            'moderate': 'orange',
            'severe': 'red',
            'critical': 'crimson'
        }
        color = colors.get(obj.severity_level, 'gray')
        return format_html(
            '<span style="color: {};">{}</span>',
            color, obj.get_severity_level_display()
        )
    severity_badge.short_description = "Sévérité"
    
    def cnss_status(self, obj):
        if obj.reported_to_cnss:
            return format_html('<span style="color: green;">✓ Déclaré</span>')
        return format_html('<span style="color: red;">✗ Non déclaré</span>')
    cnss_status.short_description = "CNSS"

@admin.register(WorkplaceIncident)
class WorkplaceIncidentAdmin(admin.ModelAdmin):
    """Workplace incident admin with statistics"""
    
    list_display = [
        'incident_number', 'enterprise', 'category_badge', 'severity_badge',
        'incident_date', 'injured_count', 'work_days_lost', 'status_badge'
    ]
    list_filter = [
        'enterprise__sector', 'category', 'severity', 'status',
        'incident_date', 'reportable_to_authorities'
    ]
    search_fields = ['incident_number', 'description', 'location_description']
    
    def category_badge(self, obj):
        """Display category with icon"""
        category_icons = {
            'fatality': '💀',
            'lost_time_injury': '🤕',
            'medical_treatment': '🏥',
            'first_aid': '🩹',
            'near_miss': '⚠️',
            'needle_stick': '💉',
            'road_accident': '🚗',
            'fire': '🔥',
            'explosion': '💥'
        }
        icon = category_icons.get(obj.category, '📋')
        return f"{icon} {obj.get_category_display()}"
    category_badge.short_description = "Catégorie"
    
    def severity_badge(self, obj):
        """Display severity with color"""
        colors = ['green', 'yellow', 'orange', 'red', 'crimson']
        color = colors[min(obj.severity - 1, 4)]
        return format_html(
            '<span style="color: {}; font-weight: bold;">Niveau {}</span>',
            color, obj.severity
        )
    severity_badge.short_description = "Sévérité"
    
    def injured_count(self, obj):
        """Display number of injured workers"""
        count = obj.injured_workers.count()
        return f"{count} blessé(s)" if count > 0 else "—"
    injured_count.short_description = "Blessés"
    
    def status_badge(self, obj):
        """Display status with color"""
        colors = {
            'reported': 'blue',
            'investigating': 'orange',
            'closed': 'green',
            'follow_up': 'purple'
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="color: {};">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = "Statut"

# ==================== HEALTH METRICS ADMIN ====================

@admin.register(SiteHealthMetrics)
class SiteHealthMetricsAdmin(admin.ModelAdmin):
    """Site health metrics admin with KPI display"""
    
    list_display = [
        'enterprise', 'work_site', 'period', 'total_workers',
        'ltifr_display', 'trifr_display', 'fitness_rate_display'
    ]
    list_filter = ['year', 'month', 'enterprise__sector']
    search_fields = ['enterprise__name', 'work_site__name']
    readonly_fields = ['ltifr', 'trifr', 'severity_rate', 'absenteeism_rate', 'exam_compliance_rate', 'fitness_rate']
    
    def period(self, obj):
        return f"{obj.year}-{obj.month:02d}"
    period.short_description = "Période"
    
    def ltifr_display(self, obj):
        """Display LTIFR with color coding"""
        ltifr = obj.ltifr
        color = 'green' if ltifr < 2.0 else 'orange' if ltifr < 5.0 else 'red'
        return format_html('<span style="color: {};">{}</span>', color, ltifr)
    ltifr_display.short_description = "LTIFR"
    
    def trifr_display(self, obj):
        """Display TRIFR with color coding"""
        trifr = obj.trifr
        color = 'green' if trifr < 5.0 else 'orange' if trifr < 10.0 else 'red'
        return format_html('<span style="color: {};">{}</span>', color, trifr)
    trifr_display.short_description = "TRIFR"
    
    def fitness_rate_display(self, obj):
        """Display fitness rate with color coding"""
        fitness_rate = obj.fitness_rate
        color = 'green' if fitness_rate >= 95 else 'orange' if fitness_rate >= 90 else 'red'
        return format_html('<span style="color: {};">{}%</span>', color, fitness_rate)
    fitness_rate_display.short_description = "Taux Aptitude"

# ==================== EXTENDED FEATURES ADMIN ====================

@admin.register(WorkerRiskProfile)
class WorkerRiskProfileAdmin(admin.ModelAdmin):
    """Admin interface for worker risk profiles"""
    list_display = [
        'worker_name', 'overall_risk_score', 'risk_level', 
        'health_risk_score', 'exposure_risk_score', 'compliance_risk_score',
        'intervention_recommended', 'last_calculated'
    ]
    list_filter = [
        'risk_level', 'intervention_recommended', 'last_calculated',
        'worker__enterprise'
    ]
    search_fields = [
        'worker__first_name', 'worker__last_name', 
        'worker__employee_id'
    ]
    readonly_fields = [
        'overall_risk_score', 'risk_level', 'last_calculated'
    ]
    fieldsets = (
        (_('Worker'), {
            'fields': ('worker',)
        }),
        (_('Risk Scores'), {
            'fields': (
                'health_risk_score', 'exposure_risk_score', 
                'compliance_risk_score', 'overall_risk_score', 'risk_level'
            ),
            'description': _('Composite risk scoring (0-100 scale)')
        }),
        (_('Risk Factors'), {
            'fields': (
                'age_risk_factor', 'exposure_years_factor', 
                'medical_history_factor', 'fitness_status_factor',
                'ppe_compliance_factor'
            )
        }),
        (_('Medical Compliance'), {
            'fields': ('exams_overdue', 'days_overdue', 'abnormal_findings_count')
        }),
        (_('Incident History'), {
            'fields': ('incidents_last_12months', 'near_misses_last_12months')
        }),
        (_('Interventions'), {
            'fields': (
                'intervention_type', 
                'priority_actions', 'intervention_recommended'
            )
        }),
        (_('Timestamps'), {
            'fields': ('last_calculated',),
            'classes': ('collapse',)
        }),
    )
    actions = ['recalculate_risk_scores']
    
    def worker_name(self, obj):
        return f"{obj.worker.first_name} {obj.worker.last_name}"
    worker_name.short_description = _('Worker')
    
    def recalculate_risk_scores(self, request, queryset):
        """Action to recalculate risk scores"""
        for profile in queryset:
            profile.calculate_overall_risk()
            profile.save()
        self.message_user(request, f"Recalculated {queryset.count()} risk profiles")
    recalculate_risk_scores.short_description = _("Recalculate risk scores")


@admin.register(OverexposureAlert)
class OverexposureAlertAdmin(admin.ModelAdmin):
    """Admin interface for overexposure alerts"""
    list_display = [
        'worker_name', 'exposure_type', 'exposure_level', 'exposure_threshold',
        'severity', 'status', 'detected_date'
    ]
    list_filter = ['severity', 'status', 'exposure_type', 'detected_date']
    search_fields = [
        'worker__first_name', 'worker__last_name', 
        'worker__employee_id', 'exposure_type'
    ]
    readonly_fields = [
        'detected_date', 'acknowledged_date', 'resolved_date'
    ]
    fieldsets = (
        (_('Alert Information'), {
            'fields': ('worker', 'exposure_type', 'detected_date')
        }),
        (_('Exposure Measurements'), {
            'fields': (
                'exposure_level', 'unit_measurement', 'exposure_threshold'
            )
        }),
        (_('Alert Details'), {
            'fields': (
                'severity', 'status', 'recommended_action'
            )
        }),
        (_('Status Tracking'), {
            'fields': (
                'acknowledged_by', 'acknowledged_date',
                'resolved_date'
            )
        }),
    )
    actions = ['mark_acknowledged', 'mark_critical']
    
    def worker_name(self, obj):
        return f"{obj.worker.first_name} {obj.worker.last_name} ({obj.worker.employee_id})"
    worker_name.short_description = _('Worker')
    
    def mark_acknowledged(self, request, queryset):
        updated = queryset.update(status='acknowledged')
        self.message_user(request, f"Marked {updated} alerts as acknowledged")
    mark_acknowledged.short_description = _("Mark as acknowledged")
    
    def mark_critical(self, request, queryset):
        critical = queryset.filter(severity__in=['critical', 'emergency'])
        self.message_user(request, f"Found {critical.count()} critical alerts")
    mark_critical.short_description = _("Show critical alerts")


@admin.register(ExitExamination)
class ExitExaminationAdmin(admin.ModelAdmin):
    """Admin interface for exit examinations"""
    list_display = [
        'worker_name', 'exit_date', 'reason_for_exit', 
        'exam_completed', 'exit_certificate_issued', 'reported_to_cnss'
    ]
    list_filter = [
        'reason_for_exit', 'exam_completed', 'exit_certificate_issued',
        'reported_to_cnss', 'exit_date'
    ]
    search_fields = [
        'worker__first_name', 'worker__last_name',
        'worker__employee_id'
    ]
    readonly_fields = [
        'exam_date', 'exit_certificate_date', 'cnss_report_date'
    ]
    fieldsets = (
        (_('Worker Information'), {
            'fields': ('worker', 'exit_date', 'reason_for_exit')
        }),
        (_('Exit Examination'), {
            'fields': (
                'exam_completed', 'exam_date', 'examiner',
                'health_status_summary'
            )
        }),
        (_('Occupational Health'), {
            'fields': (
                'occupational_disease_present', 'disease_notes',
                'post_employment_medical_followup', 'followup_recommendations'
            )
        }),
        (_('Exit Certificate'), {
            'fields': (
                'exit_certificate_issued', 'exit_certificate_date'
            )
        }),
        (_('CNSS Reporting'), {
            'fields': (
                'reported_to_cnss', 'cnss_report_date'
            )
        }),
    )
    actions = ['mark_exam_complete', 'issue_certificate']
    
    def worker_name(self, obj):
        return f"{obj.worker.first_name} {obj.worker.last_name}"
    worker_name.short_description = _('Worker')
    
    def mark_exam_complete(self, request, queryset):
        updated = 0
        for exam in queryset.filter(exam_completed=False):
            from django.utils import timezone
            exam.exam_completed = True
            exam.exam_date = timezone.now().date()
            exam.save()
            updated += 1
        self.message_user(request, f"Marked {updated} exams as complete")
    mark_exam_complete.short_description = _("Mark examinations as complete")


@admin.register(RegulatoryCNSSReport)
class RegulatoryCNSSReportAdmin(admin.ModelAdmin):
    """Admin interface for CNSS regulatory reports"""
    list_display = [
        'reference_number', 'enterprise_name', 'report_type',
        'status', 'prepared_date', 'submitted_date'
    ]
    list_filter = [
        'report_type', 'status', 'prepared_date', 'submitted_date'
    ]
    search_fields = [
        'reference_number', 'enterprise__name'
    ]
    readonly_fields = [
        'prepared_date', 'submitted_date', 'cnss_acknowledgment_date'
    ]
    fieldsets = (
        (_('Report Information'), {
            'fields': (
                'enterprise', 'reference_number', 'report_type',
                'report_period_start', 'report_period_end'
            )
        }),
        (_('Content'), {
            'fields': ('content_json',)
        }),
        (_('Preparation'), {
            'fields': ('prepared_by', 'prepared_date')
        }),
        (_('Submission'), {
            'fields': (
                'status', 'submission_method', 'submitted_date',
                'cnss_acknowledgment_number', 'cnss_acknowledgment_date'
            )
        }),
        (_('Relations'), {
            'fields': ('related_incident', 'related_disease')
        }),
    )
    actions = ['mark_submitted']
    
    def enterprise_name(self, obj):
        return obj.enterprise.name
    enterprise_name.short_description = _('Enterprise')
    
    def mark_submitted(self, request, queryset):
        from django.utils import timezone
        updated = queryset.filter(status='ready_for_submission').update(
            status='submitted',
            submitted_date=timezone.now()
        )
        self.message_user(request, f"Marked {updated} reports as submitted")
    mark_submitted.short_description = _("Mark as submitted to CNSS")


@admin.register(DRCRegulatoryReport)
class DRCRegulatoryReportAdmin(admin.ModelAdmin):
    """Admin interface for DRC labour ministry reports"""
    list_display = [
        'reference_number', 'enterprise_name', 'report_type',
        'status', 'submitted_date', 'submission_recipient'
    ]
    list_filter = [
        'report_type', 'status', 'submitted_date',
        'submission_recipient'
    ]
    search_fields = [
        'reference_number', 'enterprise__name'
    ]
    readonly_fields = ['submitted_date']
    fieldsets = (
        (_('Report Information'), {
            'fields': (
                'enterprise', 'reference_number', 'report_type',
                'report_period_start', 'report_period_end'
            )
        }),
        (_('Related Data'), {
            'fields': ('related_incidents', 'related_diseases')
        }),
        (_('Submission'), {
            'fields': (
                'status', 'submitted_date', 'submission_method',
                'submission_recipient', 'submitted_by'
            )
        }),
        (_('Follow-up'), {
            'fields': (
                'authority_response', 'required_actions'
            )
        }),
    )
    filter_horizontal = ['related_incidents', 'related_diseases']
    actions = ['mark_submitted_to_ministry']
    
    def enterprise_name(self, obj):
        return obj.enterprise.name
    enterprise_name.short_description = _('Enterprise')
    
    def mark_submitted_to_ministry(self, request, queryset):
        from django.utils import timezone
        updated = queryset.exclude(status='submitted').update(
            status='submitted',
            submitted_date=timezone.now()
        )
        self.message_user(request, f"Marked {updated} reports as submitted to DRC")
    mark_submitted_to_ministry.short_description = _("Mark as submitted to DRC")


@admin.register(PPEComplianceRecord)
class PPEComplianceRecordAdmin(admin.ModelAdmin):
    """Admin interface for PPE compliance tracking"""
    list_display = [
        'worker_name', 'ppe_description', 'check_date',
        'check_type', 'status', 'is_compliant'
    ]
    list_filter = [
        'status', 'is_compliant', 'check_type', 'check_date'
    ]
    search_fields = [
        'ppe_item__worker__first_name',
        'ppe_item__worker__last_name',
        'ppe_item__worker__employee_id'
    ]
    readonly_fields = ['check_date', 'approval_date']
    fieldsets = (
        (_('PPE Item'), {
            'fields': ('ppe_item',)
        }),
        (_('Compliance Check'), {
            'fields': (
                'check_date', 'check_type', 'status'
            )
        }),
        (_('Findings'), {
            'fields': (
                'is_compliant', 'non_compliance_reason',
                'corrective_action', 'condition_notes'
            )
        }),
        (_('Approval'), {
            'fields': (
                'checked_by', 'approved_by', 'approval_date'
            )
        }),
    )
    actions = ['mark_compliant', 'mark_non_compliant']
    
    def worker_name(self, obj):
        return f"{obj.ppe_item.worker.first_name} {obj.ppe_item.worker.last_name}"
    worker_name.short_description = _('Worker')
    
    def ppe_description(self, obj):
        return obj.ppe_item.ppe_type
    ppe_description.short_description = _('PPE Item')
    
    def mark_compliant(self, request, queryset):
        updated = queryset.update(is_compliant=True, status='compliant')
        self.message_user(request, f"Marked {updated} records as compliant")
    mark_compliant.short_description = _("Mark as compliant")
    
    def mark_non_compliant(self, request, queryset):
        updated = queryset.filter(is_compliant=True).update(
            is_compliant=False,
            status='non_compliant'
        )
        self.message_user(request, f"Marked {updated} records as non-compliant")
    mark_non_compliant.short_description = _("Mark as non-compliant")


# ==================== MEDICAL EXAMINATION EXTENDED ADMIN ====================

@admin.register(XrayImagingResult)
class XrayImagingResultAdmin(admin.ModelAdmin):
    """Admin interface for X-ray imaging results"""
    list_display = [
        'worker_name', 'imaging_type', 'ilo_classification',
        'pneumoconiosis_detected', 'imaging_date'
    ]
    list_filter = [
        'ilo_classification', 'pneumoconiosis_detected', 'imaging_type',
        'imaging_date', 'examination__worker__enterprise'
    ]
    search_fields = [
        'examination__worker__first_name',
        'examination__worker__last_name',
        'examination__worker__employee_id'
    ]
    readonly_fields = ['imaging_date']
    fieldsets = (
        (_('Worker & Examination'), {
            'fields': ('examination',)
        }),
        (_('Imaging Details'), {
            'fields': (
                'imaging_type', 'imaging_date', 'imaging_facility',
                'radiologist'
            )
        }),
        (_('ILO Classification'), {
            'fields': (
                'ilo_classification', 'profusion',
                'small_opacities', 'large_opacities'
            ),
            'description': _('ILO 2000 pneumoconiosis classification')
        }),
        (_('Abnormal Findings'), {
            'fields': (
                'pleural_thickening', 'pleural_effusion',
                'costophrenic_angle_obliteration', 'cardiac_enlargement',
                'other_findings'
            )
        }),
        (_('Clinical Impression'), {
            'fields': (
                'pneumoconiosis_detected', 'pneumoconiosis_type',
                'severity', 'clinical_notes'
            )
        }),
        (_('Follow-up'), {
            'fields': (
                'follow_up_required', 'follow_up_interval_months'
            )
        }),
    )
    actions = ['flag_abnormal_findings', 'flag_for_pneumoconiosis_review']
    
    def worker_name(self, obj):
        return f"{obj.examination.worker.full_name} ({obj.examination.worker.employee_id})"
    worker_name.short_description = _('Worker')
    
    def flag_abnormal_findings(self, request, queryset):
        updated = 0
        for result in queryset:
            if (result.small_opacities or result.large_opacities or
                result.pleural_thickening or result.pleural_effusion):
                result.follow_up_required = True
                result.save()
                updated += 1
        self.message_user(request, f"Flagged {updated} X-rays with abnormal findings")
    flag_abnormal_findings.short_description = _("Flag abnormal findings for review")
    
    def flag_for_pneumoconiosis_review(self, request, queryset):
        updated = queryset.filter(pneumoconiosis_detected=True).count()
        queryset.filter(pneumoconiosis_detected=True).update(follow_up_required=True)
        self.message_user(request, f"Flagged {updated} pneumoconiosis cases for review")
    flag_for_pneumoconiosis_review.short_description = _("Flag pneumoconiosis cases")


@admin.register(HeavyMetalsTest)
class HeavyMetalsTestAdmin(admin.ModelAdmin):
    """Admin interface for heavy metals tests"""
    list_display = [
        'worker_name', 'heavy_metal', 'specimen_type',
        'level_value', 'status', 'exceeds_osha_limit', 'test_date'
    ]
    list_filter = [
        'heavy_metal', 'specimen_type', 'status', 'exceeds_osha_limit',
        'test_date', 'examination__worker__enterprise'
    ]
    search_fields = [
        'examination__worker__first_name',
        'examination__worker__last_name',
        'examination__worker__employee_id'
    ]
    readonly_fields = ['status', 'exceeds_osha_limit', 'test_date']
    fieldsets = (
        (_('Worker & Examination'), {
            'fields': ('examination',)
        }),
        (_('Test Details'), {
            'fields': (
                'heavy_metal', 'specimen_type', 'test_date'
            )
        }),
        (_('Test Results'), {
            'fields': (
                'level_value', 'unit', 'reference_lower', 'reference_upper',
                'status'
            )
        }),
        (_('OSHA Compliance'), {
            'fields': (
                'osha_action_level', 'exceeds_osha_limit'
            )
        }),
        (_('Clinical Significance'), {
            'fields': (
                'clinical_significance', 'occupational_exposure'
            )
        }),
        (_('Follow-up'), {
            'fields': (
                'follow_up_required', 'follow_up_recommendation'
            )
        }),
    )
    actions = ['flag_elevated_results', 'confirm_occupational_exposure']
    
    def worker_name(self, obj):
        return f"{obj.examination.worker.full_name}"
    worker_name.short_description = _('Worker')
    
    def flag_elevated_results(self, request, queryset):
        updated = queryset.exclude(status='normal').update(follow_up_required=True)
        self.message_user(request, f"Flagged {updated} elevated results for follow-up")
    flag_elevated_results.short_description = _("Flag elevated results")
    
    def confirm_occupational_exposure(self, request, queryset):
        updated = queryset.update(occupational_exposure=True, follow_up_required=True)
        self.message_user(request, f"Confirmed {updated} results as occupational exposure")
    confirm_occupational_exposure.short_description = _("Confirm as occupational exposure")


@admin.register(DrugAlcoholScreening)
class DrugAlcoholScreeningAdmin(admin.ModelAdmin):
    """Admin interface for drug & alcohol screenings"""
    list_display = [
        'worker_name', 'test_type', 'overall_result', 'fit_for_duty',
        'mro_reviewed', 'test_date'
    ]
    list_filter = [
        'test_type', 'alcohol_result', 'drug_result', 'fit_for_duty', 'mro_reviewed',
        'confirmation_required', 'test_date', 'examination__worker__enterprise'
    ]
    search_fields = [
        'examination__worker__first_name',
        'examination__worker__last_name',
        'examination__worker__employee_id'
    ]
    readonly_fields = ['test_date', 'chain_of_custody_verified']
    fieldsets = (
        (_('Worker & Examination'), {
            'fields': ('examination',)
        }),
        (_('Test Details'), {
            'fields': (
                'test_type', 'test_date', 'testing_facility', 'collector',
                'specimen_id', 'chain_of_custody_verified'
            )
        }),
        (_('Alcohol Testing'), {
            'fields': (
                'alcohol_tested', 'alcohol_result', 'alcohol_level'
            )
        }),
        (_('Drug Testing'), {
            'fields': (
                'drug_tested', 'drug_result',
                'substances_tested', 'specific_substances_detected'
            )
        }),
        (_('Confirmation'), {
            'fields': (
                'confirmation_required', 'confirmation_date',
                'confirmation_result'
            )
        }),
        (_('Medical Review Officer'), {
            'fields': (
                'mro_reviewed', 'mro_name', 'mro_comments'
            )
        }),
        (_('Fitness Determination'), {
            'fields': (
                'fit_for_duty', 'restrictions'
            )
        }),
    )
    actions = ['schedule_confirmation', 'mark_fit_for_duty', 'mark_unfit']
    
    def worker_name(self, obj):
        return f"{obj.examination.worker.full_name}"
    worker_name.short_description = _('Worker')
    
    def schedule_confirmation(self, request, queryset):
        updated = queryset.filter(
            confirmation_required=False
        ).update(confirmation_required=True)
        self.message_user(request, f"Scheduled {updated} confirmations")
    schedule_confirmation.short_description = _("Schedule confirmations")
    
    def mark_fit_for_duty(self, request, queryset):
        updated = queryset.update(fit_for_duty=True, restrictions='')
        self.message_user(request, f"Marked {updated} as fit for duty")
    mark_fit_for_duty.short_description = _("Mark as fit for duty")
    
    def mark_unfit(self, request, queryset):
        updated = queryset.update(fit_for_duty=False)
        self.message_user(request, f"Marked {updated} as unfit")
    mark_unfit.short_description = _("Mark as unfit")


@admin.register(HealthScreening)
class HealthScreeningAdmin(admin.ModelAdmin):
    """Admin interface for health screenings"""
    list_display = [
        'worker_name', 'screening_type', 'status', 'conducted_by_name', 
        'created_at'
    ]
    list_filter = [
        'screening_type', 'status', 'created_at'
    ]
    search_fields = [
        'worker__first_name',
        'worker__last_name',
        'worker__employee_id'
    ]
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        (_('Worker & Screening Type'), {
            'fields': ('worker', 'screening_type')
        }),
        (_('Screening Data'), {
            'fields': ('responses', 'notes', 'status')
        }),
        (_('Audit Trail'), {
            'fields': (
                'conducted_by', 'reviewed_by', 'created_at', 'updated_at'
            )
        }),
    )
    
    def worker_name(self, obj):
        return obj.worker.get_full_name() if obj.worker else '---'
    worker_name.short_description = _('Worker')
    
    def conducted_by_name(self, obj):
        return obj.conducted_by.get_full_name() if obj.conducted_by else '---'
    conducted_by_name.short_description = _('Conducted By')


@admin.register(FitnessCertificationDecision)
class FitnessCertificationDecisionAdmin(admin.ModelAdmin):
    """Admin interface for fitness certification decisions"""
    list_display = [
        'worker_name', 'fitness_status', 'decision_basis',
        'certification_date', 'is_valid', 'days_until_expiry'
    ]
    list_filter = [
        'fitness_status', 'decision_basis', 'safety_sensitive',
        'certification_date', 'medical_fit', 'psychological_fit',
        'examinations__worker__enterprise'
    ]
    search_fields = [
        'examinations__worker__first_name',
        'examinations__worker__last_name',
        'examinations__worker__employee_id'
    ]
    readonly_fields = [
        'decision_date', 'is_valid', 'days_until_expiry'
    ]
    fieldsets = (
        (_('Worker & Examination'), {
            'fields': ('examinations', 'reviewed_by')
        }),
        (_('Decision'), {
            'fields': (
                'fitness_status', 'decision_basis', 'decision_date'
            )
        }),
        (_('Medical Assessment'), {
            'fields': (
                'key_findings', 'risk_factors',
                'medical_fit', 'psychological_fit'
            )
        }),
        (_('Recommendations'), {
            'fields': (
                'work_restrictions', 'required_accommodations',
                'recommended_interventions'
            )
        }),
        (_('Follow-up'), {
            'fields': (
                'follow_up_required', 'follow_up_interval_months',
                'follow_up_justification'
            )
        }),
        (_('Certification Validity'), {
            'fields': (
                'certification_date', 'certification_valid_until',
                'is_valid', 'days_until_expiry'
            )
        }),
        (_('Special Conditions'), {
            'fields': (
                'safety_sensitive', 'subject_to_appeal', 'appeal_deadline'
            )
        }),
    )
    actions = ['mark_renewable', 'generate_renewal_notices', 'flag_expiring_soon']
    
    def worker_name(self, obj):
        return f"{obj.examinations.worker.full_name}"
    worker_name.short_description = _('Worker')
    
    def mark_renewable(self, request, queryset):
        from datetime import date, timedelta
        thirty_days = date.today() + timedelta(days=30)
        updated = queryset.filter(
            certification_valid_until__lte=thirty_days,
            certification_valid_until__gte=date.today()
        ).count()
        self.message_user(request, f"Found {updated} certifications renewable within 30 days")
    mark_renewable.short_description = _("Show renewables in 30 days")
    
    def generate_renewal_notices(self, request, queryset):
        from datetime import date, timedelta
        fourteen_days = date.today() + timedelta(days=14)
        count = queryset.filter(
            certification_valid_until__lte=fourteen_days,
            certification_valid_until__gte=date.today()
        ).count()
        self.message_user(request, f"Generated renewal notices for {count} certifications")
    generate_renewal_notices.short_description = _("Generate renewal notices")
    
    def flag_expiring_soon(self, request, queryset):
        from datetime import date, timedelta
        thirty_days = date.today() + timedelta(days=30)
        expiring = queryset.filter(
            certification_valid_until__lte=thirty_days,
            certification_valid_until__gte=date.today()
        ).count()
        self.message_user(request, f"Found {expiring} certifications expiring in 30 days")
    flag_expiring_soon.short_description = _("Show expiring in 30 days")


# ==================== RISK ASSESSMENT EXTENDED ADMIN ====================

@admin.register(HierarchyOfControls)
class HierarchyOfControlsAdmin(admin.ModelAdmin):
    """Admin interface for Hierarchy of Controls"""
    
    list_display = [
        'control_name',
        'get_control_level_display_short',
        'hazard',
        'enterprise',
        'status_badge',
        'implementation_date',
        'effectiveness_rating',
        'risk_reduction_percentage',
    ]
    list_filter = [
        'control_level',
        'status',
        'effectiveness_rating',
        'enterprise',
        'created',
    ]
    search_fields = [
        'control_name',
        'description',
        'hazard__hazard_type',
        'enterprise__name',
    ]
    readonly_fields = ['created', 'updated', 'created_by']
    
    fieldsets = (
        ('Control Information', {
            'fields': ('hazard', 'enterprise', 'control_level', 'control_name', 'description')
        }),
        ('Implementation Details', {
            'fields': (
                'implementation_requirements',
                'estimated_cost',
                'estimated_timeline',
                'responsible_person',
                'implementation_date',
            )
        }),
        ('Status & Effectiveness', {
            'fields': (
                'status',
                'effectiveness_rating',
                'effectiveness_notes',
                'risk_reduction_percentage',
                'residual_risk_score',
            )
        }),
        ('Dependencies', {
            'fields': ('dependant_controls',),
            'classes': ('collapse',)
        }),
        ('Audit Trail', {
            'fields': ('created', 'updated', 'created_by'),
            'classes': ('collapse',)
        }),
    )
    
    filter_horizontal = ['dependant_controls']
    date_hierarchy = 'created'
    
    def get_control_level_display_short(self, obj):
        """Display control level short"""
        levels = {1: 'Elimination', 2: 'Substitution', 3: 'Engineering', 4: 'Admin', 5: 'PPE'}
        return levels.get(obj.control_level, '')
    get_control_level_display_short.short_description = 'Level'
    
    def status_badge(self, obj):
        """Display status as colored badge"""
        colors = {
            'draft': '#E0E0E0',
            'recommended': '#FFF9C4',
            'approved': '#C8E6C9',
            'implemented': '#81C784',
            'effective': '#4CAF50',
            'ineffective': '#EF9A9A',
            'archived': '#9E9E9E',
        }
        color = colors.get(obj.status, '#999999')
        return f'<span style="background-color: {color}; padding: 3px 8px; border-radius: 3px;">{obj.get_status_display()}</span>'
    status_badge.short_description = 'Status'
    status_badge.allow_tags = True
    
    actions = [
        'mark_as_recommended',
        'mark_as_approved',
        'mark_as_implemented',
        'mark_as_effective',
        'mark_as_ineffective',
    ]
    
    def mark_as_recommended(self, request, queryset):
        queryset.update(status='recommended')
    mark_as_recommended.short_description = 'Mark selected as Recommended'
    
    def mark_as_approved(self, request, queryset):
        queryset.update(status='approved')
    mark_as_approved.short_description = 'Mark selected as Approved'
    
    def mark_as_implemented(self, request, queryset):
        queryset.update(status='implemented')
    mark_as_implemented.short_description = 'Mark selected as Implemented'
    
    def mark_as_effective(self, request, queryset):
        queryset.update(status='effective', effectiveness_rating='good')
    mark_as_effective.short_description = 'Mark selected as Effective'
    
    def mark_as_ineffective(self, request, queryset):
        queryset.update(status='ineffective', effectiveness_rating='poor')
    mark_as_ineffective.short_description = 'Mark selected as Ineffective'


@admin.register(RiskHeatmapData)
class RiskHeatmapDataAdmin(admin.ModelAdmin):
    """Admin interface for Risk Heatmap Data"""
    
    list_display = [
        'enterprise',
        'period',
        'risk_score_display',
        'risk_zone_badge',
        'hazards_count',
        'workers_affected_count',
        'incidents_count',
        'priority_badge',
        'heatmap_date',
    ]
    list_filter = [
        'risk_zone',
        'priority',
        'probability_level',
        'severity_level',
        'trend',
        'enterprise',
        'heatmap_date',
    ]
    search_fields = [
        'enterprise__name',
        'period',
        'related_hazards__hazard_type',
    ]
    readonly_fields = ['created', 'updated', 'risk_score']
    
    fieldsets = (
        ('Heatmap Identification', {
            'fields': ('enterprise', 'heatmap_date', 'period')
        }),
        ('Risk Matrix Coordinates', {
            'fields': (
                'probability_level',
                'severity_level',
                'risk_score',
                'risk_zone',
            )
        }),
        ('Hazard & Exposure Data', {
            'fields': (
                'hazards_count',
                'related_hazards',
                'workers_affected_count',
                'workers_exposed',
            )
        }),
        ('Incidents & Trends', {
            'fields': (
                'incidents_count',
                'near_misses_count',
                'previous_period_score',
                'trend',
            )
        }),
        ('Controls & Mitigation', {
            'fields': (
                'controls_implemented',
                'controls_effective_percentage',
                'priority',
            )
        }),
        ('Notes & Recommendations', {
            'fields': (
                'notes',
                'action_recommendations',
            )
        }),
        ('Audit Trail', {
            'fields': ('created', 'updated', 'created_by'),
            'classes': ('collapse',)
        }),
    )
    
    filter_horizontal = ['related_hazards', 'workers_exposed']
    date_hierarchy = 'heatmap_date'
    
    def risk_score_display(self, obj):
        """Display risk score"""
        return f"{obj.risk_score} ({obj.probability_level} × {obj.severity_level})"
    risk_score_display.short_description = 'Risk Score (P × S)'
    
    def risk_zone_badge(self, obj):
        """Display risk zone as colored badge"""
        colors = {
            'green': '#4CAF50',
            'yellow': '#FBC02D',
            'orange': '#FF9800',
            'red': '#F44336',
        }
        color = colors.get(obj.risk_zone, '#999999')
        return f'<span style="background-color: {color}; color: white; padding: 3px 8px; border-radius: 3px;">{obj.risk_zone.upper()}</span>'
    risk_zone_badge.short_description = 'Risk Zone'
    risk_zone_badge.allow_tags = True
    
    def priority_badge(self, obj):
        """Display priority as colored badge"""
        colors = {
            'critical': '#F44336',
            'high': '#FF9800',
            'medium': '#FBC02D',
            'low': '#4CAF50',
        }
        color = colors.get(obj.priority, '#999999')
        label = obj.get_priority_display()
        return f'<span style="background-color: {color}; color: white; padding: 3px 8px; border-radius: 3px;">{label}</span>'
    priority_badge.short_description = 'Priority'
    priority_badge.allow_tags = True
    
    actions = [
        'mark_trend_improving',
        'mark_trend_stable',
        'mark_trend_worsening',
        'set_priority_critical',
        'set_priority_high',
    ]
    
    def mark_trend_improving(self, request, queryset):
        queryset.update(trend='improving')
    mark_trend_improving.short_description = 'Mark as Improving trend'
    
    def mark_trend_stable(self, request, queryset):
        queryset.update(trend='stable')
    mark_trend_stable.short_description = 'Mark as Stable trend'
    
    def mark_trend_worsening(self, request, queryset):
        queryset.update(trend='worsening')
    mark_trend_worsening.short_description = 'Mark as Worsening trend'
    
    def set_priority_critical(self, request, queryset):
        queryset.update(priority='critical')
    set_priority_critical.short_description = 'Set Priority: Critical'
    
    def set_priority_high(self, request, queryset):
        queryset.update(priority='high')
    set_priority_high.short_description = 'Set Priority: High'


@admin.register(RiskHeatmapReport)
class RiskHeatmapReportAdmin(admin.ModelAdmin):
    """Admin interface for Risk Heatmap Reports"""
    
    list_display = [
        'enterprise',
        'period',
        'report_date',
        'critical_cells_display',
        'high_risk_cells_display',
        'average_risk_score_display',
        'control_effectiveness_percentage_display',
        'incident_trend_display',
    ]
    list_filter = [
        'enterprise',
        'period',
        'report_date',
        'incident_trend',
    ]
    search_fields = [
        'enterprise__name',
        'period',
    ]
    readonly_fields = ['created', 'report_date']
    date_hierarchy = 'report_date'
    
    fieldsets = (
        ('Report Information', {
            'fields': ('enterprise', 'report_date', 'period')
        }),
        ('Risk Distribution', {
            'fields': (
                'total_heatmap_cells',
                'critical_cells',
                'high_risk_cells',
                'medium_risk_cells',
                'low_risk_cells',
            ),
            'description': 'Distribution of risk zones'
        }),
        ('Risk Statistics', {
            'fields': (
                'average_risk_score',
                'highest_risk_score',
                'lowest_risk_score',
            )
        }),
        ('Exposure Data', {
            'fields': (
                'total_workers_exposed',
                'workers_in_critical_zones',
            )
        }),
        ('Incident Analysis', {
            'fields': (
                'incidents_this_period',
                'incidents_last_period',
                'incident_trend',
            )
        }),
        ('Control Effectiveness', {
            'fields': (
                'total_controls',
                'effective_controls',
                'ineffective_controls',
                'control_effectiveness_percentage',
            )
        }),
        ('Action Items', {
            'fields': (
                'critical_actions_required',
                'action_items',
            )
        }),
        ('Audit Trail', {
            'fields': ('created', 'created_by'),
            'classes': ('collapse',)
        }),
    )
    
    def critical_cells_display(self, obj):
        """Display critical cells count"""
        return f'{obj.critical_cells} 🔴'
    critical_cells_display.short_description = 'Critical'
    
    def high_risk_cells_display(self, obj):
        """Display high risk cells count"""
        return f'{obj.high_risk_cells} 🟠'
    high_risk_cells_display.short_description = 'High Risk'
    
    def average_risk_score_display(self, obj):
        """Display average risk score"""
        return f'{obj.average_risk_score:.1f}'
    average_risk_score_display.short_description = 'Avg Risk'
    
    def control_effectiveness_percentage_display(self, obj):
        """Display control effectiveness percentage"""
        percentage = obj.control_effectiveness_percentage
        color = 'green' if percentage >= 80 else 'orange' if percentage >= 60 else 'red'
        return f'<span style="color: {color};">{percentage}%</span>'
    control_effectiveness_percentage_display.short_description = 'Control Effectiveness'
    control_effectiveness_percentage_display.allow_tags = True
    
    def incident_trend_display(self, obj):
        """Display incident trend with arrow"""
        icons = {
            'up': '📈 Worsening',
            'down': '📉 Improving',
            'stable': '→ Stable',
        }
        return icons.get(obj.incident_trend, obj.get_incident_trend_display())
    incident_trend_display.short_description = 'Incident Trend'
    
    actions = ['export_as_csv']
    
    def export_as_csv(self, request, queryset):
        """Export selected reports to CSV"""
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="risk_heatmap_reports.csv"'
        writer = csv.writer(response)
        writer.writerow([
            'Enterprise',
            'Period',
            'Report Date',
            'Critical',
            'High Risk',
            'Medium Risk',
            'Low Risk',
            'Avg Risk Score',
            'Workers Exposed',
            'Control Effectiveness',
        ])
        
        for report in queryset:
            writer.writerow([
                report.enterprise.name,
                report.period,
                report.report_date,
                report.critical_cells,
                report.high_risk_cells,
                report.medium_risk_cells,
                report.low_risk_cells,
                report.average_risk_score,
                report.total_workers_exposed,
                f'{report.control_effectiveness_percentage}%',
            ])
        
        return response
    export_as_csv.short_description = 'Export selected reports to CSV'


# ==================== ISO 27001 & ISO 45001 ADMIN INTERFACES ====================
# NOTE: Admin interfaces for ISO models are temporarily disabled to fix admin configuration errors
# Import ISO compliance admin classes for Django admin panel
# from .admin_iso_compliance import (
#     # ISO 27001 Admin Classes
#     AuditLogAdmin, AccessControlAdmin, SecurityIncidentAdmin,
#     VulnerabilityRecordAdmin, AccessRequestAdmin, DataRetentionPolicyAdmin,
#     EncryptionKeyRecordAdmin, ComplianceDashboardAdmin,
#     # ISO 45001 Admin Classes
#     OHSPolicyAdmin, HazardRegisterAdmin, IncidentInvestigationAdmin,
#     SafetyTrainingAdmin, TrainingCertificationAdmin,
#     EmergencyProcedureAdmin, EmergencyDrillAdmin,
#     HealthSurveillanceAdmin, PerformanceIndicatorAdmin,
#     ComplianceAuditAdmin, ContractorQualificationAdmin,
#     ManagementReviewAdmin, WorkerFeedbackAdmin,
# )

# To be re-enabled after migrations are complete

# Admin site customizations are handled by Jazzmin in settings.py