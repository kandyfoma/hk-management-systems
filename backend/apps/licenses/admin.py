from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import License, LicenseDocument, LicenseRenewal


class LicenseDocumentInline(admin.TabularInline):
    model = LicenseDocument
    extra = 1
    readonly_fields = ('uploaded_at', 'uploaded_by')
    fields = ('title', 'document_type', 'file', 'uploaded_by', 'uploaded_at')
    autocomplete_fields = ['uploaded_by']
    
    def get_formset(self, request, obj=None, **kwargs):
        formset = super().get_formset(request, obj, **kwargs)
        if obj:  # Only show in change form, not add
            return formset
        return formset


class LicenseRenewalInline(admin.TabularInline):
    model = LicenseRenewal
    extra = 0
    readonly_fields = ('processed_at', 'processed_by')
    fields = ('renewal_date', 'new_expiry_date', 'renewal_fee', 'processed_by', 'processed_at')
    autocomplete_fields = ['processed_by']


@admin.register(License)
class LicenseAdmin(admin.ModelAdmin):
    list_display = (
        'license_number_display', 'type_display', 'status_badge', 
        'holder_display', 'expiry_date_display', 'days_until_expiry', 'created_at'
    )
    list_filter = (
        'type', 'status', 'issuing_authority', 'expiry_date', 'created_at'
    )
    search_fields = (
        'license_number', 'title', 'organization__name'
    )
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('📋 License Information', {
            'fields': ('license_number', 'type', 'title', 'status', 'issuing_authority'),
            'description': 'Core license details and type. License number is auto-generated.'
        }),
        ('🏢 Organization', {
            'fields': ('organization',),
            'description': 'Organization holding this license'
        }),
        ('📝 License Details', {
            'fields': ('description', 'scope_of_practice', 'conditions')
        }),
        ('📅 Important Dates', {
            'fields': ('issued_date', 'expiry_date', 'renewal_date'),
        }),
        ('🔄 Renewal Settings', {
            'fields': (
                'renewal_required', 'renewal_period_months', 
                'ceu_required', 'ceu_hours_required'
            ),
            'classes': ('collapse',)
        }),
        ('🔐 Audit Trail', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
        ('⚙️ Metadata', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        })
    )
    
    readonly_fields = ('created_at', 'updated_at', 'created_by', 'license_number')
    autocomplete_fields = ['organization', 'created_by']
    inlines = [LicenseDocumentInline, LicenseRenewalInline]
    
    def license_number_display(self, obj):
        return format_html(
            '<strong style="font-family: monospace; color: #2980b9;">{}</strong>',
            obj.license_number
        )
    license_number_display.short_description = '📋 License #'
    license_number_display.admin_order_field = 'license_number'
    
    def type_display(self, obj):
        type_colors = {
            'PHARMACY': '#27ae60',
            'HOSPITAL': '#e74c3c', 
            'OCCUPATIONAL_HEALTH': '#f39c12',
            'PHARMACY_HOSPITAL': '#8e44ad',
            'HOSPITAL_OCCUPATIONAL_HEALTH': '#2980b9',
            'COMBINED': '#9b59b6',
        }
        color = type_colors.get(obj.type, '#95a5a6')
        return format_html(
            '<span style="background: {}; color: white; padding: 3px 8px; border-radius: 3px; font-weight: bold;">{}</span>',
            color, obj.get_type_display()
        )
    type_display.short_description = '🏷️ Type'
    type_display.admin_order_field = 'type'
    
    def status_badge(self, obj):
        status_icons = {
            'ACTIVE': ('🟢', '#27ae60', 'Active'),
            'SUSPENDED': ('⏸️', '#f39c12', 'Suspended'),
            'EXPIRED': ('🔴', '#e74c3c', 'Expired'),
            'PENDING': ('🔵', '#3498db', 'Pending'),
            'RENEWAL': ('🔄', '#9b59b6', 'Renewal'),
        }
        icon, color, label = status_icons.get(obj.status, ('⚫', '#95a5a6', obj.status))
        return format_html(
            '<span style="background: {}20; color: {}; padding: 4px 10px; border-radius: 4px; font-weight: bold; border-left: 3px solid {};">{} {}</span>',
            color, color, color, icon, label
        )
    status_badge.short_description = '⚡ Status'
    status_badge.admin_order_field = 'status'
    
    def holder_display(self, obj):
        if obj.organization:
            modules = obj.license_modules
            modules_text = ' • '.join(modules) if modules else 'General'
            return format_html(
                '<strong>{}</strong><br/><small style="color: #7f8c8d;">📦 {}</small>',
                obj.organization.name, modules_text
            )
        return format_html('<em style="color: #95a5a6;">No organization assigned</em>')
    holder_display.short_description = '🏢 Organization'
    
    def expiry_date_display(self, obj):
        if obj.expiry_date:
            if obj.is_expired:
                return format_html(
                    '<span style="color: #e74c3c; font-weight: bold;">🔴 {}</span>',
                    obj.expiry_date.strftime('%Y-%m-%d')
                )
            elif obj.is_expiring_soon:
                return format_html(
                    '<span style="color: #f39c12; font-weight: bold;">🟠 {}</span>',
                    obj.expiry_date.strftime('%Y-%m-%d')
                )
            else:
                return format_html(
                    '<span style="color: #27ae60;">✓ {}</span>',
                    obj.expiry_date.strftime('%Y-%m-%d')
                )
        return '-'
    expiry_date_display.short_description = '📅 Expiry Date'
    expiry_date_display.admin_order_field = 'expiry_date'
    
    def days_until_expiry(self, obj):
        if obj.expiry_date:
            days = (obj.expiry_date - timezone.now().date()).days
            if days < 0:
                return format_html('<span style="color: #e74c3c;"><strong>{} days ago</strong></span>', abs(days))
            elif days <= 30:
                return format_html('<span style="color: #f39c12;"><strong>{} days left</strong></span>', days)
            else:
                return format_html('<span style="color: #27ae60;">{} days left</span>', days)
        return '-'
    days_until_expiry.short_description = '⏳ Expiry Status'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'organization', 'created_by'
        ).prefetch_related('documents', 'renewals')
    
    def save_model(self, request, obj, form, change):
        if not change:  # Only on creation
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(LicenseDocument)
class LicenseDocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'license', 'document_type', 'uploaded_by', 'uploaded_at')
    list_filter = ('document_type', 'uploaded_at')
    search_fields = ('title', 'license__license_number')
    readonly_fields = ('uploaded_at', 'uploaded_by')
    date_hierarchy = 'uploaded_at'
    autocomplete_fields = ['license', 'uploaded_by']
    
    fieldsets = (
        ('📄 Document Information', {
            'fields': ('title', 'license', 'document_type', 'file')
        }),
        ('📤 Upload Details', {
            'fields': ('uploaded_by', 'uploaded_at'),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('license', 'uploaded_by')
    
    def save_model(self, request, obj, form, change):
        if not change:  # Only on creation
            obj.uploaded_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(LicenseRenewal)
class LicenseRenewalAdmin(admin.ModelAdmin):
    list_display = (
        'license_number', 'renewal_date_display', 'new_expiry_date', 
        'renewal_fee_display', 'processed_by', 'processed_at'
    )
    list_filter = ('renewal_date', 'processed_at')
    search_fields = ('license__license_number',)
    readonly_fields = ('processed_at', 'processed_by')
    date_hierarchy = 'renewal_date'
    autocomplete_fields = ['license', 'processed_by']
    
    fieldsets = (
        ('🔄 Renewal Information', {
            'fields': ('license', 'renewal_date', 'new_expiry_date', 'renewal_fee')
        }),
        ('📋 Processing Details', {
            'fields': ('processed_by', 'processed_at', 'notes'),
            'classes': ('collapse',)
        })
    )
    
    def license_number(self, obj):
        return format_html(
            '<strong style="font-family: monospace;">{}</strong>',
            obj.license.license_number
        )
    license_number.short_description = '📋 License'
    license_number.admin_order_field = 'license__license_number'
    
    def renewal_date_display(self, obj):
        return format_html(
            '<span style="color: #3498db; font-weight: bold;">📅 {}</span>',
            obj.renewal_date.strftime('%Y-%m-%d')
        )
    renewal_date_display.short_description = '🔔 Renewal Date'
    renewal_date_display.admin_order_field = 'renewal_date'
    
    def renewal_fee_display(self, obj):
        return format_html(
            '<span style="color: #27ae60; font-weight: bold;">💰 ${:.2f}</span>',
            obj.renewal_fee or 0
        )
    renewal_fee_display.short_description = '💵 Fee'
    renewal_fee_display.admin_order_field = 'renewal_fee'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('license', 'processed_by')
    
    def save_model(self, request, obj, form, change):
        if not change:  # Only on creation
            obj.processed_by = request.user
        super().save_model(request, obj, form, change)