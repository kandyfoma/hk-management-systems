from rest_framework import serializers
from .models import License, LicenseDocument, LicenseRenewal, LicenseType, LicenseStatus
from django.utils import timezone


class LicenseCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = License
        fields = [
            'license_number', 'type', 'organization',
            'issuing_authority', 'issued_date', 'expiry_date', 'renewal_date',
            'title', 'description', 'scope_of_practice', 'conditions',
            'renewal_required', 'renewal_period_months', 'ceu_required',
            'ceu_hours_required', 'metadata'
        ]

    def validate(self, attrs):
        # Ensure organization is specified
        if not attrs.get('organization'):
            raise serializers.ValidationError("License must be assigned to an organization")
        return attrs


class LicenseUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = License
        fields = [
            'status', 'expiry_date', 'renewal_date', 'title', 'description',
            'scope_of_practice', 'conditions', 'renewal_required',
            'renewal_period_months', 'ceu_required', 'ceu_hours_required', 'metadata'
        ]
        read_only_fields = ['license_number', 'type', 'organization']


class LicenseSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    holder_name = serializers.SerializerMethodField()
    holder_type = serializers.SerializerMethodField()
    is_expired = serializers.ReadOnlyField()
    is_expiring_soon = serializers.ReadOnlyField()
    days_until_expiry = serializers.ReadOnlyField()
    documents_count = serializers.SerializerMethodField()
    renewals_count = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = License
        fields = [
            'id', 'license_number', 'type', 'type_display', 'status', 'status_display',
            'organization', 'holder_name', 'holder_type',
            'issuing_authority', 'issued_date', 'expiry_date', 'renewal_date',
            'title', 'description', 'scope_of_practice', 'conditions',
            'renewal_required', 'renewal_period_months', 'ceu_required',
            'ceu_hours_required', 'is_expired', 'is_expiring_soon', 'days_until_expiry',
            'created_at', 'updated_at', 'created_by', 'created_by_name',
            'metadata', 'documents_count', 'renewals_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_holder_name(self, obj):
        if obj.organization:
            return obj.organization.name
        return None

    def get_holder_type(self, obj):
        return 'organization'

    def get_documents_count(self, obj):
        return obj.documents.count()

    def get_renewals_count(self, obj):
        return obj.renewals.count()


class LicenseListSerializer(serializers.ModelSerializer):
    """Simplified serializer for license lists"""
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    holder_name = serializers.SerializerMethodField()
    holder_type = serializers.SerializerMethodField()
    days_until_expiry = serializers.ReadOnlyField()

    class Meta:
        model = License
        fields = [
            'id', 'license_number', 'type', 'type_display', 'status', 'status_display',
            'organization', 'holder_name', 'holder_type', 'title', 'issued_date', 'expiry_date',
            'days_until_expiry'
        ]

    def get_holder_name(self, obj):
        if obj.organization:
            return obj.organization.name
        return None

    def get_holder_type(self, obj):
        return 'organization'


class LicenseDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)

    class Meta:
        model = LicenseDocument
        fields = [
            'id', 'license', 'document_type', 'document_type_display', 'title',
            'file', 'uploaded_at', 'uploaded_by', 'uploaded_by_name'
        ]
        read_only_fields = ['uploaded_at']


class LicenseRenewalSerializer(serializers.ModelSerializer):
    processed_by_name = serializers.CharField(source='processed_by.full_name', read_only=True)

    class Meta:
        model = LicenseRenewal
        fields = [
            'id', 'license', 'renewal_date', 'new_expiry_date', 'renewal_fee',
            'ceu_hours_completed', 'notes', 'processed_by', 'processed_by_name',
            'processed_at'
        ]
        read_only_fields = ['processed_at']


class LicenseTypeChoicesSerializer(serializers.Serializer):
    """Serializer for license type choices"""
    value = serializers.CharField()
    label = serializers.CharField()


class LicenseStatusChoicesSerializer(serializers.Serializer):
    """Serializer for license status choices"""
    value = serializers.CharField()
    label = serializers.CharField()


class ExpiringLicensesSerializer(serializers.Serializer):
    """Serializer for expiring licenses dashboard"""
    license_id = serializers.UUIDField()
    license_number = serializers.CharField()
    type_display = serializers.CharField()
    holder_name = serializers.CharField()
    holder_type = serializers.CharField()
    expiry_date = serializers.DateField()
    days_until_expiry = serializers.IntegerField()