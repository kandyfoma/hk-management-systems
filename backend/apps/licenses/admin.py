from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import License, LicenseDocument, LicenseRenewal


class LicenseDocumentInline(admin.TabularInline):
    model = LicenseDocument
    extra = 0
    readonly_fields = ('uploaded_at',)
    raw_id_fields = ('uploaded_by',)


class LicenseRenewalInline(admin.TabularInline):
    model = LicenseRenewal
    extra = 0
    readonly_fields = ('processed_at',)
    raw_id_fields = ('processed_by',)


@admin.register(License)
class LicenseAdmin(admin.ModelAdmin):
    list_display = (
        'license_number', 'type', 'status', 'holder_display', 
        'expiry_date', 'status_indicator', 'created_at'
    )
    list_filter = ('type', 'status', 'issuing_authority', 'expiry_date', 'created_at')
    search_fields = (
        'license_number', 'title', 'holder_user__first_name', 
        'holder_user__last_name', 'holder_organization__name'
    )
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('license_number', 'type', 'status', 'issuing_authority')
        }),
        ('Holder Information', {
            'fields': ('holder_user', 'holder_organization'),
            'description': 'Select either a user OR an organization, not both.'
        }),
        ('License Details', {
            'fields': ('title', 'description', 'scope_of_practice', 'conditions')
        }),
        ('Dates', {
            'fields': ('issued_date', 'expiry_date', 'renewal_date')
        }),
        ('Renewal Settings', {
            'fields': (
                'renewal_required', 'renewal_period_months', 
                'ceu_required', 'ceu_hours_required'
            ),
            'classes': ('collapse',)
        }),
        ('Audit Trail', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        })
    )
    
    readonly_fields = ('created_at', 'updated_at')
    raw_id_fields = ('holder_user', 'holder_organization', 'created_by')
    inlines = [LicenseDocumentInline, LicenseRenewalInline]
    
    def holder_display(self, obj):
        if obj.holder_user:
            return f"User: {obj.holder_user.full_name}"
        elif obj.holder_organization:
            return f"Org: {obj.holder_organization.name}"
        return "No holder"
    holder_display.short_description = 'Holder'
    
    def status_indicator(self, obj):
        if obj.is_expired:
            return format_html('<span style="color: red;">🔴 Expired</span>')
        elif obj.is_expiring_soon:
            return format_html('<span style="color: orange;">🟠 Expiring Soon</span>')
        elif obj.status == 'active':
            return format_html('<span style="color: green;">🟢 Active</span>')
        elif obj.status == 'suspended':
            return format_html('<span style="color: orange;">⏸️ Suspended</span>')
        else:
            return format_html('<span style="color: gray;">⚫ {}</span>', obj.get_status_display())
    status_indicator.short_description = 'Status Indicator'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'holder_user', 'holder_organization', 'created_by'
        ).prefetch_related('documents', 'renewals')


@admin.register(LicenseDocument)
class LicenseDocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'license', 'document_type', 'uploaded_by', 'uploaded_at')
    list_filter = ('document_type', 'uploaded_at')
    search_fields = ('title', 'license__license_number')
    raw_id_fields = ('license', 'uploaded_by')
    readonly_fields = ('uploaded_at',)
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('license', 'uploaded_by')


@admin.register(LicenseRenewal)
class LicenseRenewalAdmin(admin.ModelAdmin):
    list_display = (
        'license', 'renewal_date', 'new_expiry_date', 
        'renewal_fee', 'processed_by', 'processed_at'
    )
    list_filter = ('renewal_date', 'processed_at')
    search_fields = ('license__license_number',)
    raw_id_fields = ('license', 'processed_by')
    readonly_fields = ('processed_at',)
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('license', 'processed_by')