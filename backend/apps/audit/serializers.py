from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import AuditLog, PharmacyAuditLog, AuditLogSummary

User = get_user_model()


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    content_type_name = serializers.CharField(source='content_type.name', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_name', 'username', 'user_email', 'session_key',
            'ip_address', 'user_agent', 'action', 'action_display', 'severity',
            'severity_display', 'description', 'content_type', 'content_type_name',
            'object_id', 'object_repr', 'old_values', 'new_values', 'module',
            'view_name', 'request_method', 'request_path', 'additional_data',
            'success', 'error_message', 'timestamp', 'duration_ms',
            'organization', 'organization_name'
        ]
        read_only_fields = ['id', 'timestamp']


class AuditLogListSerializer(serializers.ModelSerializer):
    """Simplified serializer for list views"""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user_name', 'username', 'action', 'action_display',
            'severity', 'severity_display', 'description', 'success',
            'timestamp', 'ip_address', 'organization_name'
        ]


class PharmacyAuditLogSerializer(serializers.ModelSerializer):
    audit_log = AuditLogSerializer(read_only=True)
    verified_by_name = serializers.CharField(source='verified_by.get_full_name', read_only=True)
    
    class Meta:
        model = PharmacyAuditLog
        fields = [
            'id', 'audit_log', 'prescription_number', 'product_sku',
            'product_name', 'batch_number', 'quantity', 'amount',
            'patient_id', 'doctor_name', 'sale_number', 'supplier_name',
            'requires_verification', 'verified_by', 'verified_by_name',
            'verification_timestamp'
        ]
        read_only_fields = ['id', 'verification_timestamp']


class AuditLogSummarySerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    
    class Meta:
        model = AuditLogSummary
        fields = [
            'id', 'date', 'organization', 'organization_name', 'total_actions',
            'login_count', 'failed_login_count', 'sales_count',
            'prescriptions_dispensed', 'inventory_changes', 'critical_actions',
            'high_severity_actions', 'failed_actions', 'active_users_count',
            'unique_ips_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AuditSearchSerializer(serializers.Serializer):
    """Serializer for audit log search/filtering"""
    user = serializers.IntegerField(required=False)
    username = serializers.CharField(required=False, allow_blank=True)
    action = serializers.CharField(required=False, allow_blank=True)
    severity = serializers.CharField(required=False, allow_blank=True)
    module = serializers.CharField(required=False, allow_blank=True)
    success = serializers.BooleanField(required=False)
    start_date = serializers.DateTimeField(required=False)
    end_date = serializers.DateTimeField(required=False)
    ip_address = serializers.IPAddressField(required=False)
    description_contains = serializers.CharField(required=False, allow_blank=True)
    organization = serializers.IntegerField(required=False)
    
    def validate(self, data):
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError({
                'end_date': 'La date de fin doit être postérieure à la date de début'
            })
        
        return data


class AuditAnalyticsSerializer(serializers.Serializer):
    """Serializer for audit analytics data"""
    period = serializers.CharField(required=False, default='day')  # day, week, month
    organization = serializers.IntegerField(required=False)
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    
    def validate_period(self, value):
        if value not in ['day', 'week', 'month', 'year']:
            raise serializers.ValidationError('Période invalide. Utilisez: day, week, month, year')
        return value


class PharmacyAuditAnalyticsSerializer(serializers.Serializer):
    """Serializer for pharmacy-specific audit analytics"""
    period = serializers.CharField(required=False, default='day')
    organization = serializers.IntegerField(required=False)
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    product_sku = serializers.CharField(required=False, allow_blank=True)
    prescription_number = serializers.CharField(required=False, allow_blank=True)
    
    def validate_period(self, value):
        if value not in ['day', 'week', 'month']:
            raise serializers.ValidationError('Période invalide pour l\'analytique pharmacie')
        return value


class VerificationSerializer(serializers.Serializer):
    """Serializer for marking pharmacy audit logs as verified"""
    pharmacy_audit_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1
    )
    verification_notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate_pharmacy_audit_ids(self, value):
        # Ensure all IDs exist and require verification
        existing_ids = PharmacyAuditLog.objects.filter(
            id__in=value,
            requires_verification=True,
            verified_by__isnull=True
        ).values_list('id', flat=True)
        
        if len(existing_ids) != len(value):
            invalid_ids = set(value) - set(existing_ids)
            raise serializers.ValidationError(
                f'IDs invalides ou déjà vérifiés: {list(invalid_ids)}'
            )
        
        return value