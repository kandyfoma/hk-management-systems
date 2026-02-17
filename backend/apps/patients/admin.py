from django.contrib import admin
from .models import Patient


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = (
        'patient_number', 'first_name', 'last_name', 'gender',
        'age_display', 'phone', 'status', 'last_visit'
    )
    list_filter = ('gender', 'blood_type', 'status', 'registration_date')
    search_fields = (
        'first_name', 'last_name', 'patient_number', 'phone', 'email', 'national_id'
    )
    ordering = ('-created_at',)
    readonly_fields = ('patient_number', 'registration_date', 'age', 'created_at', 'updated_at')
    
    fieldsets = (
        ('Basic Information', {
            'fields': (
                'patient_number', 'first_name', 'middle_name', 'last_name',
                'date_of_birth', 'gender'
            )
        }),
        ('Identification', {
            'fields': ('national_id', 'passport_number')
        }),
        ('Contact Information', {
            'fields': ('phone', 'email', 'address', 'city', 'country')
        }),
        ('Emergency Contact', {
            'fields': ('emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation'),
            'classes': ('collapse',)
        }),
        ('Medical Information', {
            'fields': ('blood_type', 'allergies', 'chronic_conditions', 'current_medications'),
            'classes': ('collapse',)
        }),
        ('Insurance', {
            'fields': ('insurance_provider', 'insurance_number'),
            'classes': ('collapse',)
        }),
        ('System Information', {
            'fields': ('status', 'notes', 'registration_date', 'last_visit')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        })
    )
    
    def age_display(self, obj):
        return f"{obj.age} years"
    age_display.short_description = 'Age'