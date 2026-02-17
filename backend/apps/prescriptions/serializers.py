from rest_framework import serializers
from django.db import transaction
from django.utils import timezone
from .models import (
    Prescription, PrescriptionItem, PrescriptionNote, PrescriptionImage,
    PrescriptionStatus, PrescriptionItemStatus
)
from apps.patients.models import Patient
from apps.accounts.models import User
from apps.inventory.models import Product


class PrescriptionItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_strength = serializers.CharField(source='product.strength', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    dispensed_by_name = serializers.CharField(source='dispensed_by.full_name', read_only=True)
    remaining_quantity = serializers.SerializerMethodField()
    
    class Meta:
        model = PrescriptionItem
        fields = [
            'id', 'prescription', 'product', 'product_name', 'product_sku',
            'product_strength', 'medication_name', 'dosage', 'frequency',
            'duration', 'quantity_prescribed', 'quantity_dispensed',
            'remaining_quantity', 'unit', 'instructions', 'status',
            'status_display', 'dispensed_by', 'dispensed_by_name',
            'dispensed_at', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'remaining_quantity', 'dispensed_by', 'dispensed_at',
            'created_at', 'updated_at'
        ]
    
    def get_remaining_quantity(self, obj):
        return obj.quantity_prescribed - obj.quantity_dispensed


class PrescriptionNoteSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    
    class Meta:
        model = PrescriptionNote
        fields = [
            'id', 'prescription', 'note_type', 'content', 'is_internal',
            'created_by', 'created_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at']


class PrescriptionImageSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.full_name', read_only=True)
    
    class Meta:
        model = PrescriptionImage
        fields = [
            'id', 'prescription', 'image', 'description', 'uploaded_by',
            'uploaded_by_name', 'uploaded_at'
        ]
        read_only_fields = ['id', 'uploaded_by', 'uploaded_at']


class PrescriptionListSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    doctor_name = serializers.CharField(source='doctor.full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    urgency_display = serializers.CharField(source='get_urgency_display', read_only=True)
    items_count = serializers.SerializerMethodField()
    dispensed_items_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Prescription
        fields = [
            'id', 'prescription_number', 'patient', 'patient_name', 'doctor',
            'doctor_name', 'status', 'status_display', 'urgency', 'urgency_display',
            'prescription_date', 'valid_until', 'items_count', 'dispensed_items_count',
            'is_complete', 'created_at'
        ]
    
    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}" if obj.patient else ""
    
    def get_items_count(self, obj):
        return obj.items.count()
    
    def get_dispensed_items_count(self, obj):
        return obj.items.filter(status=PrescriptionItemStatus.DISPENSED).count()


class PrescriptionDetailSerializer(serializers.ModelSerializer):
    patient_name = serializers.SerializerMethodField()
    patient_details = serializers.SerializerMethodField()
    doctor_name = serializers.CharField(source='doctor.full_name', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    urgency_display = serializers.CharField(source='get_urgency_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    items = PrescriptionItemSerializer(many=True, read_only=True)
    notes = PrescriptionNoteSerializer(many=True, read_only=True)
    images = PrescriptionImageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Prescription
        fields = [
            'id', 'organization', 'organization_name', 'prescription_number',
            'patient', 'patient_name', 'patient_details', 'doctor', 'doctor_name',
            'status', 'status_display', 'urgency', 'urgency_display',
            'prescription_date', 'valid_until', 'diagnosis', 'instructions',
            'dispenser_notes', 'is_complete', 'created_by', 'created_by_name',
            'created_at', 'updated_at', 'items', 'notes', 'images'
        ]
    
    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}" if obj.patient else ""
    
    def get_patient_details(self, obj):
        if not obj.patient:
            return None
        return {
            'id': obj.patient.id,
            'first_name': obj.patient.first_name,
            'last_name': obj.patient.last_name,
            'date_of_birth': obj.patient.date_of_birth,
            'phone_number': obj.patient.phone_number,
            'gender': obj.patient.gender
        }


class PrescriptionCreateSerializer(serializers.ModelSerializer):
    items = PrescriptionItemSerializer(many=True)
    
    class Meta:
        model = Prescription
        fields = [
            'patient', 'doctor', 'prescription_date', 'valid_until',
            'diagnosis', 'instructions', 'urgency', 'items'
        ]
    
    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one prescription item is required")
        return value
    
    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        
        prescription = Prescription.objects.create(**validated_data)
        
        # Create prescription items
        for item_data in items_data:
            PrescriptionItem.objects.create(prescription=prescription, **item_data)
        
        return prescription


class PrescriptionUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prescription
        fields = [
            'status', 'diagnosis', 'instructions', 'dispenser_notes', 'urgency'
        ]
    
    def validate_status(self, value):
        instance = self.instance
        if instance and instance.status == PrescriptionStatus.CANCELLED:
            raise serializers.ValidationError("Cannot update cancelled prescription")
        return value


class DispensingSerializer(serializers.Serializer):
    """Serializer for dispensing prescription items"""
    items = serializers.ListField(
        child=serializers.DictField(),
        min_length=1
    )
    dispenser_notes = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    
    def validate_items(self, value):
        for item in value:
            if 'item_id' not in item or 'quantity_to_dispense' not in item:
                raise serializers.ValidationError(
                    "Each item must have item_id and quantity_to_dispense"
                )
            
            # Validate that prescription item exists and can be dispensed
            try:
                prescription_item = PrescriptionItem.objects.get(id=item['item_id'])
                if prescription_item.status == PrescriptionItemStatus.CANCELLED:
                    raise serializers.ValidationError(
                        f"Item {item['item_id']} is cancelled and cannot be dispensed"
                    )
                
                remaining = prescription_item.quantity_prescribed - prescription_item.quantity_dispensed
                if item['quantity_to_dispense'] > remaining:
                    raise serializers.ValidationError(
                        f"Cannot dispense {item['quantity_to_dispense']} units. Only {remaining} remaining for item {item['item_id']}"
                    )
                
            except PrescriptionItem.DoesNotExist:
                raise serializers.ValidationError(f"Prescription item {item['item_id']} not found")
        
        return value
    
    @transaction.atomic
    def dispense(self, prescription_id, dispensed_by):
        """Process the dispensing"""
        try:
            prescription = Prescription.objects.get(id=prescription_id)
        except Prescription.DoesNotExist:
            raise serializers.ValidationError("Prescription not found")
        
        items_data = self.validated_data['items']
        dispenser_notes = self.validated_data.get('dispenser_notes', '')
        
        for item_data in items_data:
            prescription_item = PrescriptionItem.objects.get(id=item_data['item_id'])
            quantity_to_dispense = item_data['quantity_to_dispense']
            
            prescription_item.quantity_dispensed += quantity_to_dispense
            
            # Update status based on dispensed quantity
            if prescription_item.quantity_dispensed >= prescription_item.quantity_prescribed:
                prescription_item.status = PrescriptionItemStatus.DISPENSED
            else:
                prescription_item.status = PrescriptionItemStatus.PARTIALLY_DISPENSED
            
            prescription_item.dispensed_by = dispensed_by
            prescription_item.dispensed_at = timezone.now()
            prescription_item.save()
        
        # Update prescription status
        all_items = prescription.items.all()
        if all(item.status == PrescriptionItemStatus.DISPENSED for item in all_items):
            prescription.status = PrescriptionStatus.FULLY_DISPENSED
            prescription.is_complete = True
        elif any(item.status in [PrescriptionItemStatus.DISPENSED, PrescriptionItemStatus.PARTIALLY_DISPENSED] for item in all_items):
            prescription.status = PrescriptionStatus.PARTIALLY_DISPENSED
        
        if dispenser_notes:
            prescription.dispenser_notes = dispenser_notes
        
        prescription.save()
        
        return prescription


class PrescriptionSearchSerializer(serializers.Serializer):
    """Serializer for prescription search"""
    patient_name = serializers.CharField(required=False, allow_blank=True)
    prescription_number = serializers.CharField(required=False, allow_blank=True)
    doctor_name = serializers.CharField(required=False, allow_blank=True)
    status = serializers.CharField(required=False, allow_blank=True)
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    
    def validate(self, data):
        if not any(data.values()):
            raise serializers.ValidationError("At least one search criteria is required")
        return data