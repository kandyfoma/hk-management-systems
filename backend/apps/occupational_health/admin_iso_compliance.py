"""
ISO 27001 & ISO 45001 Compliance Admin Interfaces

Django admin configuration for ISO compliance models.
"""
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.db.models import Q
from datetime import timedelta
from django.utils import timezone

# ISO 27001 Imports
from .models_iso27001 import (
    AuditLog, AccessControl, SecurityIncident, VulnerabilityRecord,
    AccessRequest, DataRetentionPolicy, EncryptionKeyRecord, ComplianceDashboard,
)

# ISO 45001 Imports
from .models_iso45001 import (
    OHSPolicy, HazardRegister, IncidentInvestigation, SafetyTraining,
    TrainingCertification, EmergencyProcedure, EmergencyDrill,
    HealthSurveillance, PerformanceIndicator, ComplianceAudit,
    ContractorQualification, ManagementReview, WorkerFeedback,
)


# ==================== ISO 27001 ADMIN CLASSES ====================

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'user_display', 'action', 'resource_type', 'status_badge')
    list_filter = ('action', 'status', 'timestamp', 'resource_type')
    search_fields = ('user__username', 'resource_name', 'resource_id', 'ip_address')
    readonly_fields = ('timestamp', 'user', 'ip_address', 'user_agent')
    date_hierarchy = 'timestamp'
    
    def user_display(self, obj):
        return obj.user.username if obj.user else 'System'
    user_display.short_description = 'User'
    
    def status_badge(self, obj):
        colors = {
            'successful': '#28a745',
            'failed': '#dc3545',
            'pending': '#ffc107',
            'denied': '#fd7e14',
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def has_add_permission(self, request):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AccessControl)
class AccessControlAdmin(admin.ModelAdmin):
    list_display = ('user', 'resource_type', 'permission_type', 'expires_badge', 'active')
    list_filter = ('active', 'resource_type', 'permission_type', 'granted_date')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'resource_type')
    filter_horizontal = ('field_level_restrictions',)
    readonly_fields = ('granted_date', 'granted_by')
    fieldsets = (
        ('Basic Info', {'fields': ('user', 'resource_type', 'permission_type', 'active')}),
        ('Access Scope', {'fields': ('field_level_restrictions',)}),
        ('Duration', {'fields': ('granted_date', 'expires_date', 'granted_by')}),
        ('Approval', {'fields': ('requires_approval', 'approved_by', 'approval_date')}),
    )
    
    def expires_badge(self, obj):
        if not obj.active:
            return '❌ Inactive'
        if obj.expires_date:
            days_left = (obj.expires_date - timezone.now().date()).days
            if days_left < 0:
                color = '#dc3545'
                text = f'❌ Expired {-days_left}d ago'
            elif days_left < 7:
                color = '#fd7e14'
                text = f'⚠️ {days_left} days'
            else:
                color = '#28a745'
                text = f'✓ {days_left} days'
            return format_html(
                '<span style="color: {}; font-weight: bold;">{}</span>',
                color, text
            )
        return '∞ No expiry'
    expires_badge.short_description = 'Expiration'
    
    actions = ['revoke_selected_access']
    
    def revoke_selected_access(self, request, queryset):
        updated = queryset.update(active=False)
        self.message_user(request, f'Revoked {updated} access controls.')
    revoke_selected_access.short_description = 'Revoke selected access controls'


@admin.register(SecurityIncident)
class SecurityIncidentAdmin(admin.ModelAdmin):
    list_display = ('incident_id', 'title', 'severity_badge', 'status_badge', 'report_date')
    list_filter = ('severity', 'status', 'report_date', 'external_reporting')
    search_fields = ('incident_id', 'title', 'affected_systems')
    readonly_fields = ('report_date', 'created_at')
    date_hierarchy = 'report_date'
    fieldsets = (
        ('Incident Details', {'fields': ('incident_id', 'title', 'affected_systems', 'report_date')}),
        ('Severity & Status', {'fields': ('severity', 'status')}),
        ('Investigation', {'fields': ('description', 'root_cause', 'assigned_to', 'resolved_by')}),
        ('Dates', {'fields': ('report_date', 'resolution_date', 'created_at')}),
        ('External', {'fields': ('external_reporting', 'authorities_notified')}),
    )
    
    def severity_badge(self, obj):
        colors = {'low': '#28a745', 'medium': '#ffc107', 'high': '#fd7e14', 'critical': '#dc3545'}
        color = colors.get(obj.severity, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            color, obj.get_severity_display()
        )
    severity_badge.short_description = 'Severity'
    
    def status_badge(self, obj):
        colors = {'reported': '#0066cc', 'investigating': '#ffc107', 'contained': '#ff9800', 'resolved': '#28a745'}
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'


@admin.register(VulnerabilityRecord)
class VulnerabilityRecordAdmin(admin.ModelAdmin):
    list_display = ('vulnerability_id', 'affected_component', 'severity_badge', 'status', 'published_date')
    list_filter = ('severity', 'status', 'published_date')
    search_fields = ('vulnerability_id', 'affected_component', 'title')
    readonly_fields = ('published_date',)
    filter_horizontal = ('affected_systems',)
    
    def severity_badge(self, obj):
        colors = {'critical': '#dc3545', 'high': '#fd7e14', 'medium': '#ffc107', 'low': '#28a745'}
        color = colors.get(obj.severity, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            color, obj.get_severity_display()
        )
    severity_badge.short_description = 'Severity'


@admin.register(AccessRequest)
class AccessRequestAdmin(admin.ModelAdmin):
    list_display = ('request_id', 'requester', 'status_badge', 'request_date', 'approval_date')
    list_filter = ('status', 'request_date', 'approval_date')
    search_fields = ('request_id', 'requester__username', 'business_justification')
    readonly_fields = ('request_date', 'approval_date', 'request_id')
    fieldsets = (
        ('Request Info', {'fields': ('request_id', 'requester', 'request_date')}),
        ('Request Details', {'fields': ('access_type', 'resource_requested', 'business_justification', 'duration_days')}),
        ('Approval', {'fields': ('status', 'approver', 'approval_date', 'approval_notes')}),
    )
    
    def status_badge(self, obj):
        colors = {'pending': '#ffc107', 'approved': '#28a745', 'denied': '#dc3545'}
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    actions = ['approve_requests']
    
    def approve_requests(self, request, queryset):
        updated = queryset.filter(status='pending').update(
            status='approved',
            approver=request.user,
            approval_date=timezone.now()
        )
        self.message_user(request, f'Approved {updated} access requests.')
    approve_requests.short_description = 'Approve selected requests'


@admin.register(DataRetentionPolicy)
class DataRetentionPolicyAdmin(admin.ModelAdmin):
    list_display = ('policy_name', 'data_category', 'retention_years', 'auto_purge_enabled')
    list_filter = ('auto_purge_enabled', 'data_category', 'effective_date')
    search_fields = ('policy_name', 'data_category')
    readonly_fields = ('effective_date', 'last_updated')


@admin.register(EncryptionKeyRecord)
class EncryptionKeyRecordAdmin(admin.ModelAdmin):
    list_display = ('key_id', 'algorithm_display', 'status_badge', 'next_rotation_badge')
    list_filter = ('status', 'algorithm', 'created_date')
    search_fields = ('key_id', 'application_name')
    readonly_fields = ('key_id', 'created_date', 'last_rotated')
    
    def algorithm_display(self, obj):
        return f"{obj.get_key_length_display()}-bit {obj.algorithm}"
    algorithm_display.short_description = 'Algorithm'
    
    def status_badge(self, obj):
        colors = {'active': '#28a745', 'pending_rotation': '#ffc107', 'rotated': '#0066cc', 'deprecated': '#6c757d'}
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def next_rotation_badge(self, obj):
        if obj.next_rotation_date:
            days_left = (obj.next_rotation_date - timezone.now().date()).days
            if days_left < 0:
                return '❌ Overdue'
            elif days_left < 7:
                return format_html('<span style="color: #fd7e14; font-weight: bold;">⚠️ {}</span>', f'{days_left} days')
            return f'✓ {days_left} days'
        return 'N/A'
    next_rotation_badge.short_description = 'Next Rotation'


@admin.register(ComplianceDashboard)
class ComplianceDashboardAdmin(admin.ModelAdmin):
    list_display = ('last_updated', 'compliance_percentage_badge', 'status_display')
    readonly_fields = (
        'last_updated', 'audit_logs_created_last_30_days', 'open_security_incidents',
        'critical_vulnerabilities', 'active_users', 'compliance_percentage_badge'
    )
    
    def has_add_permission(self, request):
        return not ComplianceDashboard.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        return False
    
    def compliance_percentage_badge(self, obj):
        percentage = obj.compliance_percentage
        if percentage >= 90:
            color = '#28a745'
        elif percentage >= 70:
            color = '#ffc107'
        else:
            color = '#dc3545'
        return format_html(
            '<span style="background-color: {}; color: white; padding: 5px 10px; border-radius: 3px; font-weight: bold;">{:.1f}%</span>',
            color, percentage
        )
    compliance_percentage_badge.short_description = 'Compliance Level'


# ==================== ISO 45001 ADMIN CLASSES ====================

@admin.register(OHSPolicy)
class OHSPolicyAdmin(admin.ModelAdmin):
    list_display = ('policy_code', 'title', 'version', 'is_active', 'effective_date')
    list_filter = ('is_active', 'effective_date', 'review_date')
    search_fields = ('policy_code', 'title', 'policy_scope')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Policy Info', {'fields': ('policy_code', 'title', 'version', 'is_active')}),
        ('Details', {'fields': ('policy_scope', 'objectives', 'policy_document')}),
        ('Dates', {'fields': ('effective_date', 'review_date', 'approved_by')}),
        ('Metadata', {'fields': ('created_at', 'updated_at')}),
    )


@admin.register(HazardRegister)
class HazardRegisterAdmin(admin.ModelAdmin):
    list_display = ('hazard_id', 'hazard_type', 'control_effectiveness_badge', 'risk_score_display', 'active')
    list_filter = ('hazard_type', 'control_effectiveness', 'active', 'identified_date')
    search_fields = ('hazard_id', 'description', 'location')
    date_hierarchy = 'identified_date'
    filter_horizontal = ('related_incidents',)
    fieldsets = (
        ('Hazard Info', {'fields': ('hazard_id', 'hazard_type', 'description', 'location', 'active')}),
        ('Risk Assessment', {
            'fields': ('probability_before', 'severity_before', 'risk_score_before',
                      'probability_after', 'severity_after', 'risk_score_after', 'residual_risk_acceptable')
        }),
        ('Controls', {'fields': ('control_type', 'control_description', 'control_effectiveness')}),
        ('Management', {'fields': ('identified_by', 'next_review_date', 'related_incidents')}),
    )
    
    def control_effectiveness_badge(self, obj):
        colors = {'highly_effective': '#28a745', 'effective': '#17a2b8', 'moderately_effective': '#ffc107', 'ineffective': '#dc3545'}
        color = colors.get(obj.control_effectiveness, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            color, obj.get_control_effectiveness_display()
        )
    control_effectiveness_badge.short_description = 'Effectiveness'
    
    def risk_score_display(self, obj):
        return f"Before: {obj.risk_score_before} → After: {obj.risk_score_after}"
    risk_score_display.short_description = 'Risk Progression'


@admin.register(IncidentInvestigation)
class IncidentInvestigationAdmin(admin.ModelAdmin):
    list_display = ('investigation_id', 'status_badge', 'rca_method', 'corrective_action_status', 'investigation_date')
    list_filter = ('status', 'rca_method', 'investigation_date')
    search_fields = ('investigation_id', 'incident_description')
    date_hierarchy = 'investigation_date'
    filter_horizontal = ('investigation_team',)
    readonly_fields = ('investigation_date', 'created_at')
    fieldsets = (
        ('Investigation', {'fields': ('investigation_id', 'investigation_date', 'status', 'incident_description')}),
        ('Root Cause Analysis', {'fields': ('rca_method', 'root_cause_analysis', 'rca_findings')}),
        ('Team', {'fields': ('investigation_team', 'investigation_lead')}),
        ('CAPA', {
            'fields': ('corrective_action_description', 'corrective_action_deadline',
                      'corrective_action_implemented_date', 'effectiveness_verified', 'effectiveness_verification_date')
        }),
    )
    
    def status_badge(self, obj):
        colors = {
            'reported': '#0066cc',
            'under_investigation': '#ffc107',
            'root_cause_identified': '#17a2b8',
            'corrective_action_planned': '#ff9800',
            'corrective_action_implemented': '#673ab7',
            'effectiveness_verified': '#28a745'
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def corrective_action_status(self, obj):
        if obj.corrective_action_implemented_date:
            if obj.effectiveness_verified:
                return '✓ Verified'
            return '⏳ Pending verification'
        if obj.corrective_action_deadline:
            days_left = (obj.corrective_action_deadline - timezone.now().date()).days
            if days_left < 0:
                return f'❌ Overdue {-days_left}d'
            return f'⏳ {days_left} days'
        return 'Not scheduled'
    corrective_action_status.short_description = 'CAPA Status'


@admin.register(SafetyTraining)
class SafetyTrainingAdmin(admin.ModelAdmin):
    list_display = ('training_code', 'title', 'training_type', 'mandatory', 'trainer_required')
    list_filter = ('training_type', 'mandatory', 'delivery_method', 'frequency')
    search_fields = ('training_code', 'title', 'description')
    filter_horizontal = ('applicable_job_categories', 'covered_hazards')


@admin.register(TrainingCertification)
class TrainingCertificationAdmin(admin.ModelAdmin):
    list_display = ('employee', 'training', 'status_badge', 'expiry_badge', 'completion_date')
    list_filter = ('status', 'completion_date', 'expiry_date')
    search_fields = ('employee__first_name', 'employee__last_name', 'training__training_code')
    readonly_fields = ('completion_date',)
    date_hierarchy = 'completion_date'
    
    def status_badge(self, obj):
        colors = {'enrolled': '#0066cc', 'completed': '#28a745', 'renewal_due': '#ffc107', 'expired': '#dc3545'}
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def expiry_badge(self, obj):
        if obj.expiry_date:
            days_left = (obj.expiry_date - timezone.now().date()).days
            if days_left < 0:
                return '❌ Expired'
            elif days_left < 30:
                return format_html('<span style="color: #fd7e14; font-weight: bold;">⚠️ {} days</span>', days_left)
            return f'✓ {days_left} days'
        return 'N/A'
    expiry_badge.short_description = 'Expiry'


@admin.register(EmergencyProcedure)
class EmergencyProcedureAdmin(admin.ModelAdmin):
    list_display = ('procedure_code', 'title', 'emergency_type', 'work_site')
    list_filter = ('emergency_type', 'work_site')
    search_fields = ('procedure_code', 'title', 'evacuation_routes')


@admin.register(EmergencyDrill)
class EmergencyDrillAdmin(admin.ModelAdmin):
    list_display = ('drill_id', 'procedure', 'scheduled_date', 'effectiveness_badge', 'status')
    list_filter = ('effectiveness_rating', 'scheduled_date', 'procedure__work_site')
    search_fields = ('drill_id', 'procedure__title')
    readonly_fields = ('drill_id', 'scheduled_date')
    
    def effectiveness_badge(self, obj):
        colors = {'excellent': '#28a745', 'good': '#17a2b8', 'satisfactory': '#ffc107', 'needs_improvement': '#dc3545'}
        color = colors.get(obj.effectiveness_rating, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            color, obj.get_effectiveness_rating_display()
        )
    effectiveness_badge.short_description = 'Effectiveness'
    
    def status(self, obj):
        if obj.actual_date:
            return '✓ Completed'
        if obj.scheduled_date < timezone.now().date():
            return '❌ Overdue'
        return '⏳ Scheduled'
    status.short_description = 'Status'


@admin.register(HealthSurveillance)
class HealthSurveillanceAdmin(admin.ModelAdmin):
    list_display = ('program_id', 'title', 'program_type', 'enterprise', 'participation_rate_display')
    list_filter = ('program_type', 'measurement_frequency', 'enterprise')
    search_fields = ('program_id', 'title', 'description')
    
    def participation_rate_display(self, obj):
        if obj.employees_scheduled > 0:
            rate = (obj.employees_examined / obj.employees_scheduled) * 100
            if rate >= 90:
                color = '#28a745'
            elif rate >= 70:
                color = '#ffc107'
            else:
                color = '#dc3545'
            return format_html(
                '<span style="color: {}; font-weight: bold;">{:.1f}%</span>',
                color, rate
            )
        return 'N/A'
    participation_rate_display.short_description = 'Participation Rate'


@admin.register(PerformanceIndicator)
class PerformanceIndicatorAdmin(admin.ModelAdmin):
    list_display = ('indicator_code', 'indicator_name', 'indicator_type', 'current_value', 'status_badge', 'trend_badge')
    list_filter = ('indicator_type', 'measurement_frequency', 'trend')
    search_fields = ('indicator_code', 'indicator_name')
    readonly_fields = ('indicator_code', 'last_measured')
    
    def status_badge(self, obj):
        if obj.current_value is None:
            status = 'No data'
            color = '#6c757d'
        elif obj.current_value < obj.acceptable_lower_bound:
            status = 'Below acceptable'
            color = '#dc3545'
        elif obj.current_value > obj.acceptable_upper_bound:
            status = 'Above acceptable'
            color = '#fd7e14'
        else:
            status = 'Within acceptable'
            color = '#28a745'
        
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            color, status
        )
    status_badge.short_description = 'Status'
    
    def trend_badge(self, obj):
        colors = {'improving': '#28a745', 'stable': '#17a2b8', 'worsening': '#dc3545', 'unknown': '#6c757d'}
        color = colors.get(obj.trend, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            color, obj.get_trend_display()
        )
    trend_badge.short_description = 'Trend'


@admin.register(ComplianceAudit)
class ComplianceAuditAdmin(admin.ModelAdmin):
    list_display = ('audit_id', 'audit_type', 'enterprise', 'audit_date', 'findings_summary')
    list_filter = ('audit_type', 'audit_date', 'internal_or_external')
    search_fields = ('audit_id', 'audit_title', 'enterprise__name')
    readonly_fields = ('audit_id', 'audit_date')
    date_hierarchy = 'audit_date'
    
    def findings_summary(self, obj):
        return f"Findings: {obj.total_findings} | CAPA Deadline: {obj.capa_deadline}"
    findings_summary.short_description = 'Findings Summary'
    
    def get_readonly_fields(self, request, obj=None):
        if obj and obj.audit_date < timezone.now().date() - timezone.timedelta(days=30):
            return self.readonly_fields + ['internal_or_external', 'auditor']
        return self.readonly_fields


@admin.register(ContractorQualification)
class ContractorQualificationAdmin(admin.ModelAdmin):
    list_display = ('contractor_id', 'company_name', 'status_badge', 'safety_score_badge', 'approved_by')
    list_filter = ('status', 'work_site', 'approved_by')
    search_fields = ('contractor_id', 'company_name', 'contact_person')
    readonly_fields = ('contractor_id', 'assessment_date')
    
    def status_badge(self, obj):
        colors = {
            'pending_review': '#ffc107',
            'approved': '#28a745',
            'conditional_approval': '#17a2b8',
            'rejected': '#dc3545',
            'suspended': '#fd7e14'
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def safety_score_badge(self, obj):
        if obj.safety_score >= 80:
            color = '#28a745'
        elif obj.safety_score >= 60:
            color = '#ffc107'
        else:
            color = '#dc3545'
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px; font-weight: bold;">{}/100</span>',
            color, obj.safety_score
        )
    safety_score_badge.short_description = 'Safety Score'


@admin.register(ManagementReview)
class ManagementReviewAdmin(admin.ModelAdmin):
    list_display = ('review_id', 'enterprise', 'review_date', 'ohs_system_effectiveness_badge', 'action_items_count')
    list_filter = ('ohs_system_effectiveness', 'review_date', 'enterprise')
    search_fields = ('review_id', 'enterprise__name', 'key_topics_discussed')
    readonly_fields = ('review_date', 'created_at')
    filter_horizontal = ('attendees',)
    
    def ohs_system_effectiveness_badge(self, obj):
        colors = {'excellent': '#28a745', 'good': '#17a2b8', 'adequate': '#ffc107', 'needs_improvement': '#dc3545'}
        color = colors.get(obj.ohs_system_effectiveness, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            color, obj.get_ohs_system_effectiveness_display()
        )
    ohs_system_effectiveness_badge.short_description = 'System Effectiveness'
    
    def action_items_count(self, obj):
        # Assuming action_items is stored as JSON
        if hasattr(obj, 'action_items') and obj.action_items:
            return len(obj.action_items)
        return 0
    action_items_count.short_description = 'Action Items'


@admin.register(WorkerFeedback)
class WorkerFeedbackAdmin(admin.ModelAdmin):
    list_display = ('feedback_id', 'feedback_type', 'status_badge', 'submitted_date', 'acknowledged_status')
    list_filter = ('feedback_type', 'status', 'submitted_date')
    search_fields = ('feedback_id', 'title', 'description')
    readonly_fields = ('feedback_id', 'submitted_date', 'acknowledged_date')
    
    def status_badge(self, obj):
        colors = {
            'submitted': '#0066cc',
            'acknowledged': '#17a2b8',
            'under_review': '#ffc107',
            'addressed': '#28a745',
            'cannot_address': '#6c757d'
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def acknowledged_status(self, obj):
        if obj.acknowledged_by:
            return f'✓ By {obj.acknowledged_by.first_name} {obj.acknowledged_by.last_name}'
        return '❌ Not acknowledged'
    acknowledged_status.short_description = 'Acknowledgement'
    
    actions = ['acknowledge_feedback']
    
    def acknowledge_feedback(self, request, queryset):
        updated = queryset.filter(status='submitted').update(
            status='acknowledged',
            acknowledged_by=request.user,
            acknowledged_date=timezone.now()
        )
        self.message_user(request, f'Acknowledged {updated} feedback items.')
    acknowledge_feedback.short_description = 'Acknowledge selected feedback'
