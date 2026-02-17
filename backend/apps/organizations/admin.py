from django.contrib import admin
from django.utils.html import format_html
from .models import Organization


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'type', 'registration_number', 'city', 
        'country', 'is_active', 'users_count', 'created_at'
    )
    list_filter = ('type', 'is_active', 'country', 'created_at')
    search_fields = ('name', 'registration_number', 'license_number', 'director_name')
    ordering = ('name',)
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'type', 'registration_number', 'license_number')
        }),
        ('Contact Information', {
            'fields': ('address', 'city', 'postal_code', 'country', 'phone', 'email', 'website')
        }),
        ('Administrative Details', {
            'fields': ('director_name', 'director_license')
        }),
        ('Status and Dates', {
            'fields': ('is_active', 'established_date')
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
    
    readonly_fields = ('created_at', 'updated_at')
    
    def users_count(self, obj):
        count = obj.users.count()
        active_count = obj.users.filter(is_active=True).count()
        return format_html(
            '<span title="{} active out of {} total">{}/{}</span>',
            active_count, count, active_count, count
        )
    users_count.short_description = 'Users (Active/Total)'
    
    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('users')