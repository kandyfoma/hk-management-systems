"""
ISO 27001 Information Security Management Serializers

DRF serializers for ISO 27001 compliance models.
"""
from rest_framework import serializers
from .models_iso27001 import (
    AuditLog,
    AccessControl,
    SecurityIncident,
    VulnerabilityRecord,
    AccessRequest,
    DataRetentionPolicy,
    EncryptionKeyRecord,
    ComplianceDashboard,
)


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for audit logs"""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    timestamp_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_name', 'action', 'action_display', 'resource_type',
            'resource_id', 'resource_name', 'description', 'ip_address', 'timestamp',
            'timestamp_formatted', 'status', 'error_message'
        ]
        read_only_fields = ['timestamp']
    
    def get_timestamp_formatted(self, obj):
        return obj.timestamp.strftime('%Y-%m-%d %H:%M:%S')


class AccessControlSerializer(serializers.ModelSerializer):
    """Serializer for access control entries"""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    granted_by_name = serializers.CharField(source='granted_by.get_full_name', read_only=True, allow_null=True)
    permission_display = serializers.CharField(source='get_permission_type_display', read_only=True)
    is_expired = serializers.SerializerMethodField()
    
    class Meta:
        model = AccessControl
        fields = [
            'id', 'user', 'user_name', 'resource_type', 'permission_type', 'permission_display',
            'enterprise', 'work_site', 'field_restrictions', 'granted_by', 'granted_by_name',
            'granted_date', 'expires_date', 'is_expired', 'active', 'reason'
        ]
        read_only_fields = ['granted_date']
    
    def get_is_expired(self, obj):
        return obj.is_expired()


class SecurityIncidentSerializer(serializers.ModelSerializer):
    """Serializer for security incidents"""
    reported_by_name = serializers.CharField(source='reported_by.get_full_name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True, allow_null=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    days_open = serializers.SerializerMethodField()
    
    class Meta:
        model = SecurityIncident
        fields = [
            'id', 'incident_id', 'title', 'description', 'reported_by', 'reported_by_name',
            'discovery_date', 'report_date', 'severity', 'severity_display', 'status', 'status_display',
            'affected_systems', 'affected_users_count', 'affected_data_types', 'root_cause',
            'contained_date', 'resolution_date', 'corrective_actions', 'preventive_actions',
            'external_reporting', 'external_report_date', 'external_report_details',
            'assigned_to', 'assigned_to_name', 'days_open'
        ]
    
    def get_days_open(self, obj):
        from django.utils import timezone
        return (timezone.now() - obj.report_date).days


class VulnerabilityRecordSerializer(serializers.ModelSerializer):
    """Serializer for vulnerability records"""
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = VulnerabilityRecord
        fields = [
            'id', 'vulnerability_id', 'title', 'description', 'affected_component',
            'current_version', 'vulnerable_versions', 'patched_version', 'severity',
            'severity_display', 'published_date', 'discovered_date', 'status', 'status_display',
            'remediation_plan', 'patch_date', 'verification_date', 'risk_acceptance_date',
            'risk_acceptance_reason', 'assigned_to', 'assigned_to_name', 'external_reference'
        ]


class AccessRequestSerializer(serializers.ModelSerializer):
    """Serializer for access requests"""
    requester_name = serializers.CharField(source='requester.get_full_name', read_only=True)
    approver_name = serializers.CharField(source='approver.get_full_name', read_only=True, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = AccessRequest
        fields = [
            'id', 'request_id', 'requester', 'requester_name', 'request_date',
            'requested_resource_type', 'requested_permission', 'requested_enterprise',
            'business_justification', 'required_until', 'status', 'status_display',
            'approver', 'approver_name', 'approval_date', 'approval_notes'
        ]
        read_only_fields = ['request_date']


class DataRetentionPolicySerializer(serializers.ModelSerializer):
    """Serializer for data retention policies"""
    
    class Meta:
        model = DataRetentionPolicy
        fields = [
            'id', 'data_category', 'retention_days', 'description', 'archive_before_delete',
            'archive_location', 'notify_before_delete_days', 'enabled', 'created_date',
            'last_executed', 'records_purged'
        ]


class EncryptionKeyRecordSerializer(serializers.ModelSerializer):
    """Serializer for encryption key records"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True, allow_null=True)
    needs_rotation = serializers.SerializerMethodField()
    
    class Meta:
        model = EncryptionKeyRecord
        fields = [
            'id', 'key_id', 'purpose', 'algorithm', 'status', 'status_display',
            'created_date', 'rotation_date', 'next_rotation_date', 'created_by',
            'created_by_name', 'rotation_count', 'needs_rotation'
        ]
    
    def get_needs_rotation(self, obj):
        from django.utils import timezone
        return obj.next_rotation_date <= timezone.now()


class ComplianceDashboardSerializer(serializers.ModelSerializer):
    """Serializer for ISO 27001 compliance dashboard"""
    compliance_status_display = serializers.CharField(source='get_compliance_status_display', read_only=True)
    
    class Meta:
        model = ComplianceDashboard
        fields = [
            'id', 'last_updated', 'audit_logs_created_last_30_days', 'audit_log_completeness_percentage',
            'active_users', 'users_with_expired_access', 'access_reviews_due', 'access_reviews_completed',
            'open_security_incidents', 'security_incidents_last_30_days', 'avg_incident_resolution_days',
            'known_vulnerabilities', 'critical_vulnerabilities', 'vulnerabilities_without_patch',
            'encrypted_fields_count', 'unencrypted_sensitive_fields', 'security_policies_up_to_date',
            'staff_security_training_completion', 'incident_response_tests_completed',
            'overall_compliance_percentage', 'compliance_status', 'compliance_status_display'
        ]
        read_only_fields = fields
