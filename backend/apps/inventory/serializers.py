from rest_framework import serializers
from django.db import transaction
from .models import (
    Product, InventoryItem, InventoryBatch, StockMovement, InventoryAlert,
    ProductCategory, DosageForm, UnitOfMeasure
)


class ProductSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    primary_supplier_name = serializers.CharField(source='primary_supplier.name', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    dosage_form_display = serializers.CharField(source='get_dosage_form_display', read_only=True)
    unit_of_measure_display = serializers.CharField(source='get_unit_of_measure_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.get_full_name', read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'organization', 'organization_name', 'name', 'generic_name', 'brand_name',
            'sku', 'barcode', 'internal_code', 'category', 'category_display',
            'sub_category', 'therapeutic_class', 'dosage_form', 'dosage_form_display',
            'strength', 'unit_of_measure', 'unit_of_measure_display', 'pack_size', 'pack_type',
            'manufacturer', 'manufacturer_country', 'requires_prescription',
            'controlled_substance', 'scheduled_drug', 'primary_supplier', 'primary_supplier_name',
            'cost_price', 'selling_price', 'markup_percentage', 'currency',
            'reorder_level', 'reorder_quantity', 'min_stock_level', 'max_stock_level',
            'storage_condition', 'track_expiry', 'track_batches', 'is_serialized',
            'allow_negative_stock', 'indication', 'contraindications', 'side_effects',
            'drug_interactions', 'dosage_instructions', 'registration_number', 'approval_date',
            'is_active', 'is_discontinued', 'notes',
            'created_at', 'updated_at', 'created_by', 'created_by_name',
            'updated_by', 'updated_by_name'
        ]
        read_only_fields = ['id', 'organization', 'created_at', 'updated_at',
                            'created_by', 'updated_by']


class InventoryItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    stock_status_display = serializers.CharField(source='get_stock_status_display', read_only=True)
    product_details = ProductSerializer(source='product', read_only=True)
    
    class Meta:
        model = InventoryItem
        fields = [
            'id', 'organization', 'product', 'product_name', 'product_sku',
            'product_details', 'facility_id', 'location',
            'quantity_on_hand', 'quantity_reserved', 'quantity_available', 'quantity_on_order',
            'stock_status', 'stock_status_display', 'average_cost', 'total_value',
            'last_counted', 'last_movement', 'last_received', 'last_sold',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'organization', 'quantity_available', 'stock_status',
            'total_value', 'last_movement', 'created_at', 'updated_at'
        ]


class InventoryBatchSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='inventory_item.product.name', read_only=True)
    product_sku = serializers.CharField(source='inventory_item.product.sku', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    days_to_expiry = serializers.IntegerField(read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.get_full_name', read_only=True)
    
    class Meta:
        model = InventoryBatch
        fields = [
            'id', 'inventory_item', 'product_name', 'product_sku', 'batch_number',
            'serial_number', 'manufacture_date', 'expiry_date', 'received_date', 'supplier',
            'initial_quantity', 'current_quantity', 'reserved_quantity', 'unit_cost', 'status',
            'status_display', 'is_expired', 'days_to_expiry', 'purchase_order_id',
            'quality_checked', 'quality_notes',
            'created_at', 'updated_at', 'created_by', 'created_by_name',
            'updated_by', 'updated_by_name'
        ]
        read_only_fields = ['id', 'is_expired', 'days_to_expiry', 'created_at', 'updated_at',
                            'created_by', 'updated_by']


class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='inventory_item.product.name', read_only=True)
    product_sku = serializers.CharField(source='inventory_item.product.sku', read_only=True)
    performed_by_name = serializers.CharField(source='performed_by.full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    movement_type_display = serializers.CharField(source='get_movement_type_display', read_only=True)
    direction_display = serializers.CharField(source='get_direction_display', read_only=True)
    
    class Meta:
        model = StockMovement
        fields = [
            'id', 'inventory_item', 'product_name', 'product_sku', 'batch',
            'movement_type', 'movement_type_display', 'direction', 'direction_display',
            'quantity', 'unit_cost', 'total_cost', 'reference_number',
            'sale_id', 'purchase_order_id', 'transfer_id',
            'movement_date', 'balance_before', 'balance_after',
            'performed_by', 'performed_by_name', 'created_by',
            'created_by_name', 'reason', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'total_cost', 'created_at', 'created_by']


class InventoryAlertSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    alert_type_display = serializers.CharField(source='get_alert_type_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    acknowledged_by_name = serializers.CharField(source='acknowledged_by.get_full_name', read_only=True)
    resolved_by_name = serializers.CharField(source='resolved_by.get_full_name', read_only=True)
    
    class Meta:
        model = InventoryAlert
        fields = [
            'id', 'product', 'product_name', 'product_sku', 'inventory_item', 'batch',
            'alert_type', 'alert_type_display', 'severity', 'severity_display',
            'title', 'message', 'is_active',
            'acknowledged_by', 'acknowledged_by_name', 'acknowledged_at',
            'resolved_by', 'resolved_by_name', 'resolved_at',
            'created_by', 'created_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'created_by']