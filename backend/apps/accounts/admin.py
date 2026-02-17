from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import User, UserPermission


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = (
        'phone', 'first_name', 'last_name', 'primary_role', 
        'organization', 'is_active', 'created_at'
    )
    list_filter = ('primary_role', 'is_active', 'organization', 'created_at')
    search_fields = ('phone', 'first_name', 'last_name', 'employee_id', 'professional_license')
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {
            'fields': ('phone', 'password')
        }),
        ('Personal Info', {
            'fields': ('first_name', 'last_name', 'email')
        }),
        ('Professional Info', {
            'fields': (
                'primary_role', 'organization', 'department', 
                'employee_id', 'professional_license'
            )
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Important dates', {
            'fields': ('last_login', 'date_joined')
        }),
        ('Metadata', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        })
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'phone', 'password1', 'password2', 'first_name', 'last_name',
                'primary_role', 'organization', 'is_active'
            )
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')
    filter_horizontal = ('groups', 'user_permissions')
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('organization')


@admin.register(UserPermission)
class UserPermissionAdmin(admin.ModelAdmin):
    list_display = ('user', 'permission', 'granted_by', 'granted_at')
    list_filter = ('permission', 'granted_at')
    search_fields = ('user__first_name', 'user__last_name', 'user__phone')
    raw_id_fields = ('user', 'granted_by')
    readonly_fields = ('granted_at',)
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'granted_by')