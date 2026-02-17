from rest_framework import serializers
from .models import Supplier, SupplierContact, PaymentTerms


class SupplierContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierContact
        fields = [
            'id', 'name', 'title', 'department', 'phone', 'email',
            'is_primary', 'notes', 'created_at'
        ]
        read_only_fields = ['created_at']


class SupplierCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = [
            'name', 'code', 'contact_person', 'phone', 'alt_phone',
            'email', 'website', 'address', 'city', 'country',
            'tax_id', 'license_number', 'payment_terms', 'credit_limit',
            'currency', 'bank_name', 'bank_account_number', 'rating',
            'lead_time_days', 'notes'
        ]


class SupplierUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = [
            'name', 'code', 'contact_person', 'phone', 'alt_phone',
            'email', 'website', 'address', 'city', 'country',
            'tax_id', 'license_number', 'payment_terms', 'credit_limit',
            'current_balance', 'currency', 'bank_name', 'bank_account_number',
            'rating', 'lead_time_days', 'is_active', 'notes'
        ]
        read_only_fields = ['organization']


class SupplierSerializer(serializers.ModelSerializer):
    payment_terms_display = serializers.CharField(source='get_payment_terms_display', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    total_orders = serializers.ReadOnlyField()
    pending_orders_count = serializers.ReadOnlyField()
    products_supplied_count = serializers.ReadOnlyField()
    contacts = SupplierContactSerializer(many=True, read_only=True)

    class Meta:
        model = Supplier
        fields = [
            'id', 'organization', 'organization_name', 'name', 'code',
            'contact_person', 'phone', 'alt_phone', 'email', 'website',
            'address', 'city', 'country', 'tax_id', 'license_number',
            'payment_terms', 'payment_terms_display', 'credit_limit',
            'current_balance', 'currency', 'bank_name', 'bank_account_number',
            'rating', 'lead_time_days', 'is_active', 'notes',
            'total_orders', 'pending_orders_count', 'products_supplied_count',
            'contacts', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SupplierListSerializer(serializers.ModelSerializer):
    """Simplified serializer for supplier lists"""
    payment_terms_display = serializers.CharField(source='get_payment_terms_display', read_only=True)
    total_orders = serializers.ReadOnlyField()

    class Meta:
        model = Supplier
        fields = [
            'id', 'name', 'code', 'contact_person', 'phone', 'email',
            'city', 'country', 'payment_terms_display', 'credit_limit',
            'current_balance', 'currency', 'rating', 'lead_time_days',
            'is_active', 'total_orders'
        ]


class PaymentTermsChoicesSerializer(serializers.Serializer):
    """Serializer for payment terms choices"""
    value = serializers.CharField()
    label = serializers.CharField()