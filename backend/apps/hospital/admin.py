from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import (
    HospitalEncounter, VitalSigns, HospitalDepartment, HospitalBed
)


# ═══════════════════════════════════════════════════════════════
#  VITAL SIGNS ADMIN
# ═══════════════════════════════════════════════════════════════

@admin.register(VitalSigns)
class VitalSignsAdmin(admin.ModelAdmin):
    list_display = [
        'patient_link', 'measured_at', 'temperature', 'blood_pressure_display',
        'heart_rate', 'respiratory_rate', 'oxygen_saturation', 'weight',
        'height', 'bmi_display', 'pain_level', 'abnormal_status', 'measured_by'
    ]
    list_filter = [
        'measured_at', 'measured_by', 'verified_by', 'patient__gender',
        'encounter__encounter_type', 'encounter__status'
    ]
    search_fields = [
        'patient__first_name', 'patient__last_name', 'patient__patient_number',
        'encounter__encounter_number', 'clinical_notes'
    ]
    readonly_fields = [
        'id', 'body_mass_index', 'bmi_category', 'blood_pressure_reading',
        'is_abnormal', 'created_at', 'updated_at', 'measured_at'
    ]
    autocomplete_fields = ['patient', 'encounter', 'measured_by', 'verified_by', 'created_by', 'updated_by']
    fieldsets = (
        ('Information Patient', {
            'fields': ('patient', 'encounter', 'measurement_location', 'measurement_method')
        }),
        ('Signes Vitaux Primaires', {
            'fields': ('temperature', 'blood_pressure_systolic', 'blood_pressure_diastolic', 
                      'blood_pressure_reading', 'heart_rate', 'respiratory_rate', 'oxygen_saturation')
        }),
        ('Mesures Corporelles', {
            'fields': ('weight', 'height', 'body_mass_index', 'bmi_category')
        }),
        ('Autres Mesures', {
            'fields': ('pain_level', 'blood_glucose')
        }),
        ('Notes Cliniques', {
            'fields': ('clinical_notes',)
        }),
        ('Personnel', {
            'fields': ('measured_by', 'verified_by')
        }),
        ('Audit', {
            'fields': ('created_by', 'updated_by', 'measured_at', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def patient_link(self, obj):
        if obj.patient:
            url = reverse('admin:patients_patient_change', args=[obj.patient.pk])
            return format_html('<a href="{}">{}</a>', url, obj.patient.full_name)
        return '-'
    patient_link.short_description = 'Patient'
    
    def blood_pressure_display(self, obj):
        if obj.blood_pressure_systolic and obj.blood_pressure_diastolic:
            return f"{obj.blood_pressure_systolic}/{obj.blood_pressure_diastolic}"
        return '-'
    blood_pressure_display.short_description = 'Tension'
    
    def bmi_display(self, obj):
        if obj.body_mass_index:
            color = 'green' if 18.5 <= float(obj.body_mass_index) <= 24.9 else 'orange'
            return format_html(
                '<span style="color: {};">{} ({})</span>',
                color, obj.body_mass_index, obj.bmi_category
            )
        return '-'
    bmi_display.short_description = 'IMC'
    
    def abnormal_status(self, obj):
        if obj.is_abnormal:
            return format_html('<span style="color: red;">⚠️ Anormal</span>')
        return format_html('<span style="color: green;">✓ Normal</span>')
    abnormal_status.short_description = 'Statut'


# ═══════════════════════════════════════════════════════════════
#  HOSPITAL ENCOUNTER ADMIN
# ═══════════════════════════════════════════════════════════════

@admin.register(HospitalEncounter)
class HospitalEncounterAdmin(admin.ModelAdmin):
    list_display = [
        'encounter_number', 'patient_link', 'encounter_type_display', 
        'status_display', 'attending_physician', 'department',
        'admission_date', 'created_at'
    ]
    list_filter = [
        'encounter_type', 'status', 'department', 'attending_physician',
        'admission_date', 'created_at', 'organization'
    ]
    search_fields = [
        'encounter_number', 'patient__first_name', 'patient__last_name',
        'patient__patient_number', 'chief_complaint', 'department'
    ]
    readonly_fields = [
        'id', 'encounter_number', 'created_at', 'updated_at'
    ]
    autocomplete_fields = ['patient', 'organization', 'attending_physician', 'created_by', 'updated_by']
    fieldsets = (
        ('Information Consultation', {
            'fields': ('encounter_number', 'patient', 'organization', 'encounter_type', 'status')
        }),
        ('Détails Cliniques', {
            'fields': ('chief_complaint', 'history_of_present_illness')
        }),
        ('Personnel Médical', {
            'fields': ('attending_physician', 'nursing_staff')
        }),
        ('Localisation', {
            'fields': ('department', 'room_number', 'bed_number')
        }),
        ('Référencement', {
            'fields': ('referred_by', 'referred_to')
        }),
        ('Dates', {
            'fields': ('admission_date', 'discharge_date')
        }),
        ('Facturation', {
            'fields': ('estimated_cost', 'final_cost')
        }),
        ('Audit', {
            'fields': ('created_by', 'updated_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    filter_horizontal = ('nursing_staff',)
    
    def patient_link(self, obj):
        if obj.patient:
            url = reverse('admin:patients_patient_change', args=[obj.patient.pk])
            return format_html('<a href="{}">{}</a>', url, obj.patient.full_name)
        return '-'
    patient_link.short_description = 'Patient'
    
    def encounter_type_display(self, obj):
        colors = {
            'outpatient': 'blue',
            'inpatient': 'green',
            'emergency': 'red',
            'icu': 'darkred',
            'surgery': 'purple'
        }
        color = colors.get(obj.encounter_type, 'black')
        return format_html(
            '<span style="color: {};">{}</span>',
            color, obj.get_encounter_type_display()
        )
    encounter_type_display.short_description = 'Type'
    
    def status_display(self, obj):
        colors = {
            'scheduled': 'blue',
            'checked_in': 'orange',
            'in_progress': 'green',
            'completed': 'gray',
            'cancelled': 'red',
            'no_show': 'red'
        }
        color = colors.get(obj.status, 'black')
        return format_html(
            '<span style="color: {};">{}</span>',
            color, obj.get_status_display()
        )
    status_display.short_description = 'Statut'


# ═══════════════════════════════════════════════════════════════
#  HOSPITAL DEPARTMENT ADMIN
# ═══════════════════════════════════════════════════════════════

@admin.register(HospitalDepartment)
class HospitalDepartmentAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'code', 'organization', 'department_head', 
        'bed_capacity', 'phone', 'location', 'is_active'
    ]
    list_filter = ['organization', 'is_active', 'department_head']
    search_fields = ['name', 'code', 'description', 'location']
    readonly_fields = ['id', 'created_at', 'updated_at']
    autocomplete_fields = ['organization', 'department_head']
    fieldsets = (
        ('Information Générale', {
            'fields': ('organization', 'name', 'code', 'description', 'department_head')
        }),
        ('Contact', {
            'fields': ('phone', 'extension', 'location', 'floor')
        }),
        ('Capacité', {
            'fields': ('bed_capacity',)
        }),
        ('Statut', {
            'fields': ('is_active',)
        }),
        ('Audit', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


# ═══════════════════════════════════════════════════════════════
#  HOSPITAL BED ADMIN
# ═══════════════════════════════════════════════════════════════

@admin.register(HospitalBed)
class HospitalBedAdmin(admin.ModelAdmin):
    list_display = [
        'bed_identifier', 'department', 'status_display', 'current_patient_link',
        'bed_type', 'features_display', 'last_cleaned', 'is_active'
    ]
    list_filter = [
        'department', 'status', 'bed_type', 'has_cardiac_monitor',
        'has_oxygen_supply', 'has_suction', 'is_active'
    ]
    search_fields = [
        'bed_number', 'room_number', 'department__name',
        'current_patient__first_name', 'current_patient__last_name'
    ]
    readonly_fields = ['id', 'created_at', 'updated_at']
    autocomplete_fields = ['department', 'current_patient', 'current_encounter']
    fieldsets = (
        ('Identification', {
            'fields': ('department', 'bed_number', 'room_number', 'bed_type')
        }),
        ('Statut', {
            'fields': ('status', 'current_patient', 'current_encounter')
        }),
        ('Équipements', {
            'fields': ('has_cardiac_monitor', 'has_oxygen_supply', 'has_suction')
        }),
        ('Maintenance', {
            'fields': ('last_cleaned', 'last_maintenance', 'notes')
        }),
        ('Statut', {
            'fields': ('is_active',)
        }),
        ('Audit', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def bed_identifier(self, obj):
        return f"Ch. {obj.room_number} - Lit {obj.bed_number}"
    bed_identifier.short_description = 'Lit'
    
    def current_patient_link(self, obj):
        if obj.current_patient:
            url = reverse('admin:patients_patient_change', args=[obj.current_patient.pk])
            return format_html('<a href="{}">{}</a>', url, obj.current_patient.full_name)
        return '-'
    current_patient_link.short_description = 'Patient Actuel'
    
    def status_display(self, obj):
        colors = {
            'available': 'green',
            'occupied': 'blue',
            'reserved': 'orange',
            'out_of_order': 'red',
            'cleaning': 'yellow'
        }
        color = colors.get(obj.status, 'black')
        return format_html(
            '<span style="color: {};">{}</span>',
            color, obj.get_status_display()
        )
    status_display.short_description = 'Statut'
    
    def features_display(self, obj):
        features = []
        if obj.has_cardiac_monitor:
            features.append('🫀')
        if obj.has_oxygen_supply:
            features.append('💨')
        if obj.has_suction:
            features.append('🔄')
        return ' '.join(features) if features else '-'
    features_display.short_description = 'Équipements'


# Admin site customizations are handled by Jazzmin in settings.py