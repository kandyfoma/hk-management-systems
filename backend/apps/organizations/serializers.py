from rest_framework import serializers
from .models import Organization, OrganizationType


class OrganizationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = [
            'name', 'type', 'registration_number', 'license_number',
            'address', 'city', 'postal_code', 'country', 'phone', 'email',
            'website', 'director_name', 'director_license', 'established_date',
            'metadata'
        ]


class OrganizationUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = [
            'name', 'type', 'license_number', 'address', 'city', 'postal_code',
            'country', 'phone', 'email', 'website', 'director_name',
            'director_license', 'established_date', 'is_active', 'metadata'
        ]
        read_only_fields = ['registration_number']


class OrganizationSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    active_users_count = serializers.ReadOnlyField()
    total_users_count = serializers.ReadOnlyField()
    licenses_count = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'type', 'type_display', 'registration_number',
            'license_number', 'address', 'city', 'postal_code', 'country',
            'phone', 'email', 'website', 'director_name', 'director_license',
            'is_active', 'established_date', 'created_at', 'updated_at',
            'metadata', 'active_users_count', 'total_users_count', 'licenses_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_licenses_count(self, obj):
        return obj.licenses.filter(status='active').count()


class OrganizationListSerializer(serializers.ModelSerializer):
    """Simplified serializer for organization lists"""
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    active_users_count = serializers.ReadOnlyField()

    class Meta:
        model = Organization
        fields = [
            'id', 'name', 'type', 'type_display', 'registration_number',
            'city', 'country', 'phone', 'email', 'is_active', 'active_users_count'
        ]


class OrganizationTypeChoicesSerializer(serializers.Serializer):
    """Serializer for organization type choices"""
    value = serializers.CharField()
    label = serializers.CharField()