from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from django.db.models import Count, Q
from django.urls import path
from django.http import HttpResponse
from django.shortcuts import render
import csv
import json
from .models import AuditLog, PharmacyAuditLog, AuditLogSummary


class PharmacyAuditLogInline(admin.StackedInline):
    model = PharmacyAuditLog
    extra = 0
    readonly_fields = ['verified_by', 'verification_timestamp']
    fieldsets = (
        ('Informations pharmacie', {
            'fields': ('prescription_number', 'product_sku', 'product_name', 'batch_number')
        }),
        ('Quantités et montants', {
            'fields': ('quantity', 'amount')
        }),
        ('Acteurs', {
            'fields': ('patient_id', 'doctor_name', 'supplier_name')
        }),
        ('Références', {
            'fields': ('sale_number',)
        }),
        ('Vérification', {
            'fields': ('requires_verification', 'verified_by', 'verification_timestamp')
        })
    )


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = [
        'timestamp', 'user_display', 'action_display', 'severity_display',
        'description_short', 'success_icon', 'ip_address', 'organization'
    ]
    list_filter = [
        'action', 'severity', 'success', 'timestamp', 'module',
        ('user', admin.RelatedOnlyFieldListFilter),
        ('organization', admin.RelatedOnlyFieldListFilter)
    ]
    search_fields = [
        'username', 'user_email', 'description', 'ip_address',
        'object_repr', 'error_message'
    ]
    readonly_fields = [
        'user', 'username', 'user_email', 'session_key', 'ip_address',
        'user_agent', 'action', 'severity', 'description', 'content_type',
        'object_id', 'object_repr', 'old_values_display', 'new_values_display',
        'module', 'view_name', 'request_method', 'request_path',
        'additional_data_display', 'success', 'error_message', 'timestamp',
        'duration_ms', 'organization'
    ]
    date_hierarchy = 'timestamp'
    ordering = ['-timestamp']
    inlines = [PharmacyAuditLogInline]
    
    fieldsets = (
        ('Utilisateur', {
            'fields': ('user', 'username', 'user_email', 'organization')
        }),
        ('Session', {
            'fields': ('session_key', 'ip_address', 'user_agent')
        }),
        ('Action', {
            'fields': ('action', 'severity', 'description', 'success', 'error_message')
        }),
        ('Objet cible', {
            'fields': ('content_type', 'object_id', 'object_repr')
        }),
        ('Changements', {
            'fields': ('old_values_display', 'new_values_display'),
            'classes': ('collapse',)
        }),
        ('Contexte technique', {
            'fields': ('module', 'view_name', 'request_method', 'request_path'),
            'classes': ('collapse',)
        }),
        ('Données supplémentaires', {
            'fields': ('additional_data_display',),
            'classes': ('collapse',)
        }),
        ('Métriques', {
            'fields': ('timestamp', 'duration_ms')
        })
    )
    
    actions = ['export_to_csv', 'mark_as_verified']
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('analytics/', self.admin_site.admin_view(self.analytics_view), name='audit_analytics'),
            path('export/', self.admin_site.admin_view(self.export_view), name='audit_export'),
        ]
        return custom_urls + urls
    
    def user_display(self, obj):
        if obj.user:
            return f"{obj.user.get_full_name()} ({obj.username})"
        return obj.username or "Anonyme"
    user_display.short_description = "Utilisateur"
    
    def action_display(self, obj):
        color_map = {
            'CREATE': '#28a745',
            'UPDATE': '#ffc107',
            'DELETE': '#dc3545',
            'LOGIN': '#17a2b8',
            'LOGOUT': '#6c757d',
            'LOGIN_FAILED': '#dc3545',
        }
        color = color_map.get(obj.action, '#6c757d')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, obj.get_action_display()
        )
    action_display.short_description = "Action"
    
    def severity_display(self, obj):
        color_map = {
            'LOW': '#28a745',
            'MEDIUM': '#ffc107',
            'HIGH': '#fd7e14',
            'CRITICAL': '#dc3545',
        }
        color = color_map.get(obj.severity, '#6c757d')
        return format_html(
            '<span style="color: {}; font-weight: bold;">● {}</span>',
            color, obj.get_severity_display()
        )
    severity_display.short_description = "Sévérité"
    
    def success_icon(self, obj):
        if obj.success:
            return format_html('<span style="color: green;">✓</span>')
        else:
            return format_html('<span style="color: red;">✗</span>')
    success_icon.short_description = "Succès"
    
    def description_short(self, obj):
        return obj.description[:100] + '...' if len(obj.description) > 100 else obj.description
    description_short.short_description = "Description"
    
    def old_values_display(self, obj):
        if obj.old_values:
            return format_html('<pre>{}</pre>', json.dumps(obj.old_values, indent=2, ensure_ascii=False))
        return "-"
    old_values_display.short_description = "Anciennes valeurs"
    
    def new_values_display(self, obj):
        if obj.new_values:
            return format_html('<pre>{}</pre>', json.dumps(obj.new_values, indent=2, ensure_ascii=False))
        return "-"
    new_values_display.short_description = "Nouvelles valeurs"
    
    def additional_data_display(self, obj):
        if obj.additional_data:
            return format_html('<pre>{}</pre>', json.dumps(obj.additional_data, indent=2, ensure_ascii=False))
        return "-"
    additional_data_display.short_description = "Données supplémentaires"
    
    def export_to_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="audit_log_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Horodatage', 'Utilisateur', 'Action', 'Sévérité', 'Description',
            'Succès', 'Adresse IP', 'Module', 'Organisation'
        ])
        
        for audit in queryset:
            writer.writerow([
                audit.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                audit.username,
                audit.get_action_display(),
                audit.get_severity_display(),
                audit.description,
                'Oui' if audit.success else 'Non',
                audit.ip_address,
                audit.module,
                audit.organization.name if audit.organization else ''
            ])
        
        return response
    export_to_csv.short_description = "Exporter en CSV"
    
    def analytics_view(self, request):
        # Analytics data for dashboard
        today = timezone.now().date()
        
        # Daily activity counts
        daily_stats = AuditLog.objects.filter(
            timestamp__date=today
        ).aggregate(
            total_actions=Count('id'),
            failed_actions=Count('id', filter=Q(success=False)),
            critical_actions=Count('id', filter=Q(severity='CRITICAL')),
            unique_users=Count('user', distinct=True)
        )
        
        # Action type breakdown
        action_breakdown = AuditLog.objects.filter(
            timestamp__date=today
        ).values('action').annotate(
            count=Count('id')
        ).order_by('-count')
        
        context = {
            'title': 'Analytiques d\'audit',
            'daily_stats': daily_stats,
            'action_breakdown': action_breakdown,
            'today': today
        }
        
        return render(request, 'admin/audit/analytics.html', context)
    
    def export_view(self, request):
        # Export functionality
        return render(request, 'admin/audit/export.html')


@admin.register(PharmacyAuditLog)
class PharmacyAuditLogAdmin(admin.ModelAdmin):
    list_display = [
        'audit_log', 'prescription_number', 'product_name', 'quantity',
        'amount', 'requires_verification', 'verification_status'
    ]
    list_filter = [
        'requires_verification', 'verification_timestamp', 
        ('verified_by', admin.RelatedOnlyFieldListFilter)
    ]
    search_fields = [
        'prescription_number', 'product_name', 'product_sku', 
        'batch_number', 'sale_number', 'patient_id'
    ]
    readonly_fields = ['audit_log', 'verification_timestamp']
    
    actions = ['mark_as_verified']
    
    def verification_status(self, obj):
        if obj.requires_verification:
            if obj.verified_by:
                return format_html(
                    '<span style="color: green;">✓ Vérifié par {}</span>',
                    obj.verified_by.get_full_name()
                )
            else:
                return format_html('<span style="color: orange;">⚠ En attente</span>')
        return format_html('<span style="color: gray;">− Non requis</span>')
    verification_status.short_description = "Statut vérification"
    
    def mark_as_verified(self, request, queryset):
        queryset.update(
            verified_by=request.user,
            verification_timestamp=timezone.now()
        )
        self.message_user(request, f"{queryset.count()} entrées marquées comme vérifiées.")
    mark_as_verified.short_description = "Marquer comme vérifié"


@admin.register(AuditLogSummary)
class AuditLogSummaryAdmin(admin.ModelAdmin):
    list_display = [
        'date', 'organization', 'total_actions', 'critical_actions',
        'failed_actions', 'active_users_count'
    ]
    list_filter = [
        'date', 
        ('organization', admin.RelatedOnlyFieldListFilter)
    ]
    readonly_fields = [
        'date', 'organization', 'total_actions', 'login_count',
        'failed_login_count', 'sales_count', 'prescriptions_dispensed',
        'inventory_changes', 'critical_actions', 'high_severity_actions',
        'failed_actions', 'active_users_count', 'unique_ips_count',
        'created_at', 'updated_at'
    ]
    date_hierarchy = 'date'
    ordering = ['-date']