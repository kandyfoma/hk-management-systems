from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.utils import timezone
from .models import User, UserPermission


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (
        'phone_display', 'name_display', 'role_badge', 
        'organization_link', 'status_indicator', 'created_at'
    )
    list_filter = ('primary_role', 'is_active', 'organization', 'created_at')
    search_fields = ('phone', 'first_name', 'last_name', 'email', 'employee_id', 'professional_license')
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('🔐 Authentication', {
            'fields': ('phone', 'password'),
            'description': 'Use phone as the primary login method'
        }),
        ('👤 Personal Information', {
            'fields': ('first_name', 'last_name', 'email')
        }),
        ('💼 Professional Information', {
            'fields': (
                'primary_role', 'organization', 'department', 
                'employee_id', 'professional_license'
            ),
            'description': 'Professional role and organization assignment'
        }),
        ('🔑 Permissions & Access', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('📅 Important Dates', {
            'fields': ('last_login', 'date_joined'),
            'classes': ('collapse',)
        }),
        ('⚙️ System Info', {
            'fields': ('created_at', 'updated_at', 'metadata'),
            'classes': ('collapse',)
        })
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'phone', 'password1', 'password2', 'first_name', 'last_name',
                'email', 'primary_role', 'organization', 'is_active'
            )
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at', 'last_login', 'date_joined')
    filter_horizontal = ('groups', 'user_permissions')
    autocomplete_fields = ['organization']
    
    def phone_display(self, obj):
        return format_html(
            '<strong style="font-family: monospace; color: #2980b9;">{}</strong>',
            obj.phone
        )
    phone_display.short_description = '📱 Phone'
    phone_display.admin_order_field = 'phone'
    
    def name_display(self, obj):
        full_name = obj.get_full_name() or '(No name set)'
        return format_html(
            '<strong>{}</strong>',
            full_name
        )
    name_display.short_description = '👤 Name'
    name_display.admin_order_field = 'first_name'
    
    def role_badge(self, obj):
        role_colors = {
            'admin': ('#e74c3c', '👨‍💼'),
            'doctor': ('#3498db', '👨‍⚕️'),
            'nurse': ('#27ae60', '👩‍⚕️'),
            'pharmacist': ('#f39c12', '💊'),
            'technician': ('#9b59b6', '🔧'),
            'occupational_health': ('#1abc9c', '🎯'),
            'manager': ('#34495e', '💼'),
            'staff': ('#95a5a6', '👥'),
        }
        color, icon = role_colors.get(obj.primary_role, ('#95a5a6', '⚙️'))
        return format_html(
            '<span style="background: {}20; color: {}; padding: 4px 10px; border-radius: 4px; font-weight: bold; border-left: 3px solid {};">{} {}</span>',
            color, color, color, icon, obj.get_primary_role_display() if obj.primary_role else 'No Role'
        )
    role_badge.short_description = '🏷️ Role'
    role_badge.admin_order_field = 'primary_role'
    
    def organization_link(self, obj):
        if obj.organization:
            return format_html(
                '<strong>{}</strong><br/><small style="color: #7f8c8d;">🏢 Organization</small>',
                obj.organization.name
            )
        return format_html('<em style="color: #95a5a6;">No organization</em>')
    organization_link.short_description = '🏢 Organization'
    organization_link.admin_order_field = 'organization__name'
    
    def status_indicator(self, obj):
        if obj.is_active:
            return format_html(
                '<span style="color: #27ae60; font-weight: bold;">🟢 Active</span>'
            )
        else:
            return format_html(
                '<span style="color: #e74c3c; font-weight: bold;">🔴 Inactive</span>'
            )
    status_indicator.short_description = '⚡ Status'
    status_indicator.admin_order_field = 'is_active'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('organization').prefetch_related('groups', 'user_permissions')
    
    def save_model(self, request, obj, form, change):
        if change and 'password' in form.changed_data:
            obj.set_password(form.cleaned_data['password'])
        super().save_model(request, obj, form, change)


@admin.register(UserPermission)
class UserPermissionAdmin(admin.ModelAdmin):
    list_display = ('user_display', 'permission', 'granted_by_display', 'granted_at_display')
    list_filter = ('permission', 'granted_at')
    search_fields = ('user__first_name', 'user__last_name', 'user__phone', 'permission')
    readonly_fields = ('granted_at',)
    date_hierarchy = 'granted_at'
    autocomplete_fields = ['user', 'granted_by']
    
    fieldsets = (
        ('🔑 Permission Assignment', {
            'fields': ('user', 'permission')
        }),
        ('🔓 Grant Details', {
            'fields': ('granted_by', 'granted_at'),
            'classes': ('collapse',)
        })
    )
    
    def user_display(self, obj):
        return format_html(
            '<strong>{}</strong><br/><small style="color: #7f8c8d;">📱 {}</small>',
            obj.user.get_full_name() or obj.user.phone,
            obj.user.phone
        )
    user_display.short_description = '👤 User'
    user_display.admin_order_field = 'user__first_name'
    
    def granted_by_display(self, obj):
        if obj.granted_by:
            return format_html(
                '<strong>{}</strong><br/><small style="color: #7f8c8d;">👤 {}</small>',
                obj.granted_by.get_full_name() or obj.granted_by.phone,
                obj.granted_by.phone
            )
        return '-'
    granted_by_display.short_description = '🔐 Granted By'
    granted_by_display.admin_order_field = 'granted_by__first_name'
    
    def granted_at_display(self, obj):
        return format_html(
            '<span style="color: #3498db;">📅 {}</span>',
            obj.granted_at.strftime('%Y-%m-%d %H:%M')
        )
    granted_at_display.short_description = '⏰ Granted At'
    granted_at_display.admin_order_field = 'granted_at'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'granted_by')