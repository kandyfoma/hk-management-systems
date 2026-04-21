from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from .models import Organization


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = (
        'name_display', 'type_badge', 'registration_display', 
        'location_display', 'users_count_display', 'status_indicator', 'created_at'
    )
    list_filter = ('type', 'is_active', 'country', 'created_at')
    search_fields = ('name', 'registration_number', 'license_number', 'director_name', 'email')
    ordering = ('name',)
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('🏢 Basic Information', {
            'fields': ('name', 'type', 'registration_number', 'license_number'),
            'description': 'Core organization details'
        }),
        ('📍 Contact Information', {
            'fields': ('address', 'city', 'postal_code', 'country', 'phone', 'email', 'website')
        }),
        ('👤 Administrative Details', {
            'fields': ('director_name', 'director_license')
        }),
        ('🔐 Status & Activation', {
            'fields': ('is_active', 'established_date')
        }),
        ('📊 Metadata', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        }),
        ('⏰ System Information', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    readonly_fields = ('created_at', 'updated_at')
    
    def name_display(self, obj):
        return format_html(
            '<strong style="font-size: 1.1em; color: #2c3e50;">{}</strong>',
            obj.name
        )
    name_display.short_description = '🏢 Organization'
    name_display.admin_order_field = 'name'
    
    def type_badge(self, obj):
        type_colors = {
            'hospital': ('#e74c3c', '🏥'),
            'pharmacy': ('#27ae60', '💊'),
            'clinic': ('#3498db', '👨‍⚕️'),
            'laboratory': ('#f39c12', '🔬'),
            'occupational_health': ('#1abc9c', '🎯'),
            'dental': ('#9b59b6', '🦷'),
            'mental_health': ('#e67e22', '🧠'),
            'other': ('#95a5a6', '⚙️'),
        }
        color, icon = type_colors.get(obj.type, ('#95a5a6', '⚙️'))
        return format_html(
            '<span style="background: {}20; color: {}; padding: 4px 10px; border-radius: 4px; font-weight: bold; border-left: 3px solid {};">{} {}</span>',
            color, color, color, icon, obj.get_type_display() if obj.type else 'Unknown'
        )
    type_badge.short_description = '🏷️ Type'
    type_badge.admin_order_field = 'type'
    
    def registration_display(self, obj):
        return format_html(
            '<strong style="font-family: monospace; color: #3498db;">{}</strong><br/><small style="color: #7f8c8d;">Reg #</small>',
            obj.registration_number or 'N/A'
        )
    registration_display.short_description = '📋 Registration'
    registration_display.admin_order_field = 'registration_number'
    
    def location_display(self, obj):
        location_parts = []
        if obj.city:
            location_parts.append(obj.city)
        if obj.country:
            location_parts.append(obj.country)
        location_text = ', '.join(location_parts) if location_parts else 'No location'
        return format_html(
            '<span style="color: #7f8c8d;">📍 {}</span>',
            location_text
        )
    location_display.short_description = '📍 Location'
    location_display.admin_order_field = 'city'
    
    def users_count_display(self, obj):
        total = obj.users.count()
        active = obj.users.filter(is_active=True).count()
        return format_html(
            '<span title="{} active out of {} total" style="color: #2980b9; font-weight: bold;">👥 {}/{}</span>',
            active, total, active, total
        )
    users_count_display.short_description = '👥 Users'
    
    def status_indicator(self, obj):
        if obj.is_active:
            return mark_safe(
                '<span style="color: #27ae60; font-weight: bold;">🟢 Active</span>'
            )
        else:
            return mark_safe(
                '<span style="color: #e74c3c; font-weight: bold;">🔴 Inactive</span>'
            )
    status_indicator.short_description = '⚡ Status'
    status_indicator.admin_order_field = 'is_active'
    
    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('users')