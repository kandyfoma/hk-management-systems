from django.contrib import admin
from django.utils.html import format_html
from datetime import datetime
from .models import Patient


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = (
        'patient_number_display', 'name_display', 'gender_badge',
        'age_display', 'phone_display', 'status_badge', 'last_visit_display'
    )
    list_filter = ('gender', 'blood_type', 'status', 'registration_date', 'created_at')
    search_fields = (
        'first_name', 'last_name', 'patient_number', 'phone', 'email', 'national_id'
    )
    ordering = ('-registration_date',)
    date_hierarchy = 'registration_date'
    readonly_fields = ('patient_number', 'registration_date', 'age', 'created_at', 'updated_at', 'age_display_detail')
    
    fieldsets = (
        ('📋 Patient Identification', {
            'fields': (
                'patient_number', 'first_name', 'middle_name', 'last_name',
                'date_of_birth', 'gender', 'age_display_detail'
            ),
            'description': 'Basic patient information and demographics'
        }),
        ('🆔 Identification Documents', {
            'fields': ('national_id', 'passport_number')
        }),
        ('📞 Contact Information', {
            'fields': ('phone', 'email', 'address', 'city', 'country')
        }),
        ('🚨 Emergency Contact', {
            'fields': ('emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation'),
        }),
        ('🏥 Medical Information', {
            'fields': ('blood_type', 'allergies', 'chronic_conditions', 'current_medications'),
        }),
        ('💳 Insurance', {
            'fields': ('insurance_provider', 'insurance_number'),
            'classes': ('collapse',)
        }),
        ('📊 Status & Notes', {
            'fields': ('status', 'notes', 'last_visit')
        }),
        ('⏰ System Information', {
            'fields': ('registration_date', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
        ('⚙️ Metadata', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        })
    )
    
    filter_horizontal = ()
    
    def patient_number_display(self, obj):
        return format_html(
            '<strong style="font-family: monospace; color: #2980b9; font-size: 1.05em;">#{}</strong>',
            obj.patient_number
        )
    patient_number_display.short_description = '📋 Patient #'
    patient_number_display.admin_order_field = 'patient_number'
    
    def name_display(self, obj):
        full_name = f"{obj.first_name} {obj.last_name}".strip()
        return format_html(
            '<strong style="font-size: 1.05em;">{}</strong>',
            full_name or '(No name)'
        )
    name_display.short_description = '👤 Name'
    name_display.admin_order_field = 'first_name'
    
    def gender_badge(self, obj):
        gender_icons = {
            'male': ('🔵', '#3498db', 'Male'),
            'female': ('🔴', '#e74c3c', 'Female'),
            'other': ('⚫', '#95a5a6', 'Other'),
        }
        if obj.gender:
            icon, color, label = gender_icons.get(obj.gender, ('⚫', '#95a5a6', obj.get_gender_display()))
            return format_html(
                '<span style="background: {}20; color: {}; padding: 4px 10px; border-radius: 4px; font-weight: bold;">{} {}</span>',
                color, color, icon, label
            )
        return '-'
    gender_badge.short_description = '⚪ Gender'
    gender_badge.admin_order_field = 'gender'
    
    def age_display(self, obj):
        if obj.date_of_birth:
            age = obj.age
            age_color = '#27ae60' if 18 <= age < 65 else '#f39c12' if age >= 65 else '#3498db'
            return format_html(
                '<span style="color: {}; font-weight: bold;">🎂 {} yrs</span>',
                age_color, age
            )
        return '-'
    age_display.short_description = '🎂 Age'
    age_display.admin_order_field = 'date_of_birth'
    
    def phone_display(self, obj):
        return format_html(
            '<span style="font-family: monospace; color: #2980b9;">📱 {}</span>',
            obj.phone or '(No phone)'
        )
    phone_display.short_description = '📱 Phone'
    phone_display.admin_order_field = 'phone'
    
    def status_badge(self, obj):
        status_colors = {
            'registered': ('#3498db', '✅'),
            'active': ('#27ae60', '🟢'),
            'inactive': ('#95a5a6', '⚫'),
            'transferred': ('#f39c12', '→'),
            'discharged': ('#9b59b6', '👋'),
            'deceased': ('#e74c3c', '⚠️'),
        }
        color, icon = status_colors.get(obj.status, ('#95a5a6', '⚫'))
        status_text = obj.get_status_display() if obj.status else 'Unknown'
        return format_html(
            '<span style="background: {}20; color: {}; padding: 4px 10px; border-radius: 4px; font-weight: bold; border-left: 3px solid {};">{} {}</span>',
            color, color, color, icon, status_text
        )
    status_badge.short_description = '⚡ Status'
    status_badge.admin_order_field = 'status'
    
    def last_visit_display(self, obj):
        if obj.last_visit:
            return format_html(
                '<span style="color: #7f8c8d;">📅 {}</span>',
                obj.last_visit.strftime('%Y-%m-%d')
            )
        return format_html('<em style="color: #95a5a6;">No visits</em>')
    last_visit_display.short_description = '📅 Last Visit'
    last_visit_display.admin_order_field = 'last_visit'
    
    def age_display_detail(self, obj):
        if obj.date_of_birth:
            age = obj.age
            return format_html(
                '<strong>{} years old</strong> (DOB: {})',
                age, obj.date_of_birth.strftime('%Y-%m-%d')
            )
        return '(Date of birth not set)'
    age_display_detail.short_description = 'Current Age'
    
    def get_queryset(self, request):
        return super().get_queryset(request)