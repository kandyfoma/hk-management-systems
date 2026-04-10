from rest_framework import serializers
from django.db import transaction
from django.utils import timezone
from .models import (
    Prescription, PrescriptionItem, PrescriptionNote, PrescriptionImage,
    PrescriptionStatus, PrescriptionItemStatus
)
from apps.patients.models import Patient
from apps.accounts.models import User
from apps.inventory.models import Product, InventoryItem


class PrescriptionItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_strength = serializers.CharField(source='product.strength', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    dispensed_by_name = serializers.CharField(source='dispensed_by.full_name', read_only=True)
    remaining_quantity = serializers.SerializerMethodField()
    # Aliases for frontend compatibility
    quantity_prescribed = serializers.IntegerField(source='quantity', read_only=True)
    dispensed_at = serializers.DateTimeField(source='dispensed_date', read_only=True)
    
    class Meta:
        model = PrescriptionItem
        fields = [
            'id', 'prescription', 'product', 'product_name', 'product_sku',
            'product_strength', 'medication_name', 'generic_name', 'dosage',
            'dosage_form', 'strength', 'frequency', 'duration', 'route',
            'quantity', 'quantity_prescribed', 'quantity_dispensed',
            'quantity_remaining', 'remaining_quantity',
            'instructions', 'status', 'status_display',
            'is_substitution_allowed', 'is_controlled', 'requires_counseling',
            'pharmacist_notes', 'patient_counseling', 'substitution_reason',
            'dispensed_by', 'dispensed_by_name',
            'dispensed_date', 'dispensed_at',
            'unit_price', 'total_price', 'currency',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'remaining_quantity', 'quantity_remaining',
            'quantity_prescribed', 'dispensed_at',
            'dispensed_by', 'dispensed_date',
            'created_at', 'updated_at'
        ]
    
    def get_remaining_quantity(self, obj):
        return obj.quantity - obj.quantity_dispensed


class PrescriptionNoteSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    
    class Meta:
        model = PrescriptionNote
        fields = [
            'id', 'prescription', 'note_type', 'title', 'content',
            'is_visible_to_patient', 'is_visible_to_doctor', 'is_visible_to_pharmacist',
            'priority', 'created_by', 'created_by_name', 'created_at'
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
    encounter_number = serializers.CharField(source='encounter.encounter_number', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    items_count = serializers.SerializerMethodField()
    dispensed_items_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Prescription
        fields = [
            'id', 'prescription_number', 'patient', 'patient_name', 'doctor',
            'doctor_name', 'encounter', 'encounter_number', 'status', 'status_display',
            'date', 'valid_until', 'items_count', 'dispensed_items_count',
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
    encounter_details = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    items = PrescriptionItemSerializer(many=True, read_only=True)
    notes = PrescriptionNoteSerializer(many=True, read_only=True)
    images = PrescriptionImageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Prescription
        fields = [
            'id', 'organization', 'organization_name', 'encounter', 'encounter_details',
            'prescription_number', 'patient', 'patient_name', 'patient_details', 
            'doctor', 'doctor_name', 'status', 'status_display',
            'date', 'valid_until', 'diagnosis', 'instructions',
            'is_complete', 'created_by', 'created_by_name',
            'created_at', 'updated_at', 'items', 'notes', 'images'
        ]
    
    def get_patient_name(self, obj):
        return f"{obj.patient.first_name} {obj.patient.last_name}" if obj.patient else ""
    
    def get_patient_details(self, obj):
        if not obj.patient:
            return None
        return {
            'id': str(obj.patient.id),
            'first_name': obj.patient.first_name,
            'last_name': obj.patient.last_name,
            'date_of_birth': obj.patient.date_of_birth,
            'phone': obj.patient.phone,
            'gender': obj.patient.gender
        }
    
    def get_encounter_details(self, obj):
        if not obj.encounter:
            return None
        return {
            'id': str(obj.encounter.id),
            'encounter_number': obj.encounter.encounter_number,
            'encounter_type': obj.encounter.get_encounter_type_display(),
            'status': obj.encounter.get_status_display(),
            'chief_complaint': obj.encounter.chief_complaint,
            'attending_physician': obj.encounter.attending_physician.full_name if obj.encounter.attending_physician else None
        }


class PrescriptionCreateSerializer(serializers.ModelSerializer):
    items = PrescriptionItemSerializer(many=True)
    
    class Meta:
        model = Prescription
        fields = [
            'patient', 'doctor', 'date', 'valid_until',
            'diagnosis', 'instructions', 'items'
        ]
    
    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one prescription item is required")
        return value
    
    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        
        prescription = Prescription.objects.create(
            total_items=len(items_data),
            **validated_data
        )
        
        # Create prescription items
        for item_data in items_data:
            PrescriptionItem.objects.create(prescription=prescription, **item_data)
        
        return prescription


class PrescriptionUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prescription
        fields = [
            'status', 'diagnosis', 'instructions', 'clinical_notes',
            'allergies_checked', 'interactions_checked'
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
            
            qty = item['quantity_to_dispense']
            if not isinstance(qty, int) or qty <= 0:
                raise serializers.ValidationError(
                    f"quantity_to_dispense must be a positive integer, got {qty}"
                )
            
            # Validate that prescription item exists and can be dispensed
            try:
                prescription_item = PrescriptionItem.objects.get(id=item['item_id'])
                if prescription_item.status == PrescriptionItemStatus.CANCELLED:
                    raise serializers.ValidationError(
                        f"Item {item['item_id']} is cancelled and cannot be dispensed"
                    )
                
                remaining = prescription_item.quantity - prescription_item.quantity_dispensed
                if qty > remaining:
                    raise serializers.ValidationError(
                        f"Cannot dispense {qty} units. Only {remaining} remaining for item {item['item_id']}"
                    )

                # Validate stock availability if product is linked
                if prescription_item.product:
                    inv_items = InventoryItem.objects.filter(
                        product=prescription_item.product
                    )
                    inv_item = inv_items.first()
                    if inv_item and inv_item.quantity_on_hand < qty:
                        raise serializers.ValidationError(
                            f"Stock insuffisant pour '{prescription_item.product.name}': "
                            f"{inv_item.quantity_on_hand} disponible(s), {qty} demand\u00e9(s)."
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
            if prescription_item.quantity_dispensed >= prescription_item.quantity:
                prescription_item.status = PrescriptionItemStatus.FULLY_DISPENSED
            else:
                prescription_item.status = PrescriptionItemStatus.PARTIALLY_DISPENSED
            
            prescription_item.dispensed_by = dispensed_by
            prescription_item.dispensed_date = timezone.now()
            prescription_item.save()
        
        # Update prescription status
        all_items = prescription.items.all()
        if all(item.status == PrescriptionItemStatus.FULLY_DISPENSED for item in all_items):
            prescription.status = PrescriptionStatus.FULLY_DISPENSED
            prescription.is_complete = True
            prescription.items_dispensed = all_items.count()
        elif any(item.status in [PrescriptionItemStatus.FULLY_DISPENSED, PrescriptionItemStatus.PARTIALLY_DISPENSED] for item in all_items):
            prescription.status = PrescriptionStatus.PARTIALLY_DISPENSED
            prescription.items_dispensed = all_items.filter(
                status=PrescriptionItemStatus.FULLY_DISPENSED
            ).count()
        
        if dispenser_notes:
            prescription.clinical_notes = dispenser_notes
        
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