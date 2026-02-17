"""
Occupational Health Admin - Django Admin Configuration

Rich Django admin interface for multi-sector occupational health
management system with sector-specific customizations.
"""
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.db.models import Count
from django.utils import timezone

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
)

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
    """Worker admin with occupational health profile"""
    
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

# ==================== ADMIN CUSTOMIZATIONS ====================

# Customize admin site
admin.site.site_header = "HK Management Systems - Santé au Travail"
admin.site.site_title = "Santé Travail Admin"
admin.site.index_title = "Administration Médecine du Travail"