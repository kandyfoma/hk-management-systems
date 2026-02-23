from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    HospitalEncounter, VitalSigns, HospitalDepartment, 
    HospitalBed, EncounterType, EncounterStatus, BedStatus,
    Triage, TriageLevel, TriageStatus
)

User = get_user_model()


# ═══════════════════════════════════════════════════════════════
#  VITAL SIGNS SERIALIZERS
# ═══════════════════════════════════════════════════════════════

class VitalSignsSerializer(serializers.ModelSerializer):
    """Complete vital signs serializer"""
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    patient_number = serializers.CharField(source='patient.patient_number', read_only=True)
    encounter_number = serializers.CharField(source='encounter.encounter_number', read_only=True)
    measured_by_name = serializers.CharField(source='measured_by.full_name', read_only=True)
    verified_by_name = serializers.CharField(source='verified_by.full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.full_name', read_only=True)
    
    # Computed fields
    bmi_category = serializers.CharField(read_only=True)
    blood_pressure_reading = serializers.CharField(read_only=True)
    is_abnormal = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = VitalSigns
        fields = [
            'id', 'patient', 'patient_name', 'patient_number',
            'encounter', 'encounter_number',
            'temperature', 'blood_pressure_systolic', 'blood_pressure_diastolic',
            'blood_pressure_reading', 'heart_rate', 'respiratory_rate',
            'oxygen_saturation', 'weight', 'height', 'body_mass_index',
            'bmi_category', 'pain_level', 'blood_glucose',
            'measurement_location', 'measurement_method', 'clinical_notes',
            'measured_by', 'measured_by_name', 'verified_by', 'verified_by_name',
            'is_abnormal', 'measured_at',
            'created_by', 'created_by_name', 'updated_by', 'updated_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'body_mass_index', 'created_by', 'updated_by',
            'created_at', 'updated_at', 'measured_at'
        ]


class VitalSignsCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating vital signs"""
    
    class Meta:
        model = VitalSigns
        fields = [
            'patient', 'encounter', 'temperature', 'blood_pressure_systolic',
            'blood_pressure_diastolic', 'heart_rate', 'respiratory_rate',
            'oxygen_saturation', 'weight', 'height', 'pain_level',
            'blood_glucose', 'measurement_location', 'measurement_method',
            'clinical_notes', 'measured_by', 'verified_by'
        ]


class VitalSignsListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing vital signs"""
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    patient_number = serializers.CharField(source='patient.patient_number', read_only=True)
    measured_by_name = serializers.CharField(source='measured_by.full_name', read_only=True)
    blood_pressure_reading = serializers.CharField(read_only=True)
    bmi_category = serializers.CharField(read_only=True)
    is_abnormal = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = VitalSigns
        fields = [
            'id', 'patient', 'patient_name', 'patient_number',
            'temperature', 'blood_pressure_reading', 'heart_rate',
            'respiratory_rate', 'oxygen_saturation', 'weight', 'height',
            'body_mass_index', 'bmi_category', 'pain_level',
            'measured_by_name', 'is_abnormal', 'measured_at'
        ]


# ═══════════════════════════════════════════════════════════════
#  HOSPITAL ENCOUNTER SERIALIZERS
# ═══════════════════════════════════════════════════════════════

class HospitalEncounterSerializer(serializers.ModelSerializer):
    """Complete hospital encounter serializer"""
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    patient_number = serializers.CharField(source='patient.patient_number', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    attending_physician_name = serializers.CharField(source='attending_physician.full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.full_name', read_only=True)
    
    # Related data counts
    vital_signs_count = serializers.SerializerMethodField()
    prescriptions_count = serializers.SerializerMethodField()
    nursing_staff_names = serializers.SerializerMethodField()
    
    def get_vital_signs_count(self, obj):
        return obj.vital_signs_set.count() if hasattr(obj, 'vital_signs_set') else 0
    
    def get_prescriptions_count(self, obj):
        # Assuming relationship to prescriptions app exists
        return getattr(obj, 'prescriptions_count', 0)
    
    def get_nursing_staff_names(self, obj):
        return [staff.get_full_name() for staff in obj.nursing_staff.all()]
    
    class Meta:
        model = HospitalEncounter
        fields = [
            'id', 'encounter_number', 'patient', 'patient_name', 'patient_number',
            'organization', 'organization_name', 'encounter_type', 'status',
            'chief_complaint', 'history_of_present_illness',
            'attending_physician', 'attending_physician_name',
            'department', 'room_number', 'bed_number',
            'referred_by', 'referred_to', 'admission_date', 'discharge_date',
            'estimated_cost', 'final_cost', 'vital_signs_count', 'prescriptions_count',
            'created_by', 'created_by_name', 'updated_by', 'updated_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'encounter_number', 'created_by', 'updated_by',
            'created_at', 'updated_at'
        ]
    
    def get_vital_signs_count(self, obj):
        """Get count of vital signs for this encounter"""
        return obj.vital_signs.count()
    
    def get_prescriptions_count(self, obj):
        """Get count of prescriptions for this encounter"""
        return obj.prescriptions.count()


class HospitalEncounterCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating encounters"""
    
    class Meta:
        model = HospitalEncounter
        fields = [
            'patient', 'organization', 'encounter_type', 'status',
            'chief_complaint', 'history_of_present_illness',
            'attending_physician', 'department', 'room_number', 'bed_number',
            'referred_by', 'referred_to', 'admission_date', 'discharge_date',
            'estimated_cost'
        ]


class HospitalEncounterDetailSerializer(serializers.ModelSerializer):
    """Detailed hospital encounter serializer with nested relations"""
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    patient_number = serializers.CharField(source='patient.patient_number', read_only=True)
    patient_details = serializers.SerializerMethodField()
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    attending_physician_name = serializers.CharField(source='attending_physician.full_name', read_only=True)
    nursing_staff_details = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.full_name', read_only=True)
    
    # Related data
    latest_vital_signs = serializers.SerializerMethodField()
    recent_prescriptions = serializers.SerializerMethodField()
    
    class Meta:
        model = HospitalEncounter
        fields = [
            'id', 'encounter_number', 'patient', 'patient_name', 'patient_number',
            'patient_details', 'organization', 'organization_name', 'encounter_type', 'status',
            'chief_complaint', 'history_of_present_illness',
            'attending_physician', 'attending_physician_name', 'nursing_staff_details',
            'department', 'room_number', 'bed_number',
            'referred_by', 'referred_to', 'admission_date', 'discharge_date',
            'estimated_cost', 'final_cost', 'latest_vital_signs', 'recent_prescriptions',
            'created_by', 'created_by_name', 'updated_by', 'updated_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'encounter_number', 'created_by', 'updated_by',
            'created_at', 'updated_at'
        ]
    
    def get_patient_details(self, obj):
        """Get essential patient information"""
        patient = obj.patient
        return {
            'id': str(patient.id),
            'full_name': patient.full_name,
            'age': patient.age,
            'gender': patient.get_gender_display() if patient.gender else None,
            'blood_type': patient.blood_type,
            'allergies': patient.allergies,
            'chronic_conditions': patient.chronic_conditions
        } if patient else None
    
    def get_nursing_staff_details(self, obj):
        """Get nursing staff information"""
        return [
            {
                'id': str(staff.id),
                'full_name': staff.full_name,
                'user_type': staff.get_user_type_display()
            }
            for staff in obj.nursing_staff.all()
        ]
    
    def get_latest_vital_signs(self, obj):
        """Get most recent vital signs for this encounter"""
        latest = obj.vital_signs.order_by('-measured_at').first()
        if latest:
            return {
                'id': str(latest.id),
                'temperature': latest.temperature,
                'blood_pressure_reading': latest.blood_pressure_reading,
                'heart_rate': latest.heart_rate,
                'respiratory_rate': latest.respiratory_rate,
                'oxygen_saturation': latest.oxygen_saturation,
                'measured_at': latest.measured_at,
                'is_abnormal': latest.is_abnormal
            }
        return None
    
    def get_recent_prescriptions(self, obj):
        """Get recent prescriptions for this encounter"""
        prescriptions = obj.prescriptions.order_by('-created_at')[:3]
        return [
            {
                'id': str(prescription.id),
                'prescription_number': prescription.prescription_number,
                'status': prescription.status,
                'status_display': prescription.get_status_display(),
                'total_items': prescription.total_items,
                'items_dispensed': prescription.items_dispensed,
                'created_at': prescription.created_at
            }
            for prescription in prescriptions
        ]


class HospitalEncounterListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing encounters"""
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    patient_number = serializers.CharField(source='patient.patient_number', read_only=True)
    attending_physician_name = serializers.CharField(source='attending_physician.full_name', read_only=True)
    
    class Meta:
        model = HospitalEncounter
        fields = [
            'id', 'encounter_number', 'patient', 'patient_name', 'patient_number',
            'encounter_type', 'status', 'chief_complaint',
            'attending_physician_name', 'department',
            'admission_date', 'created_at'
        ]
    
    class Meta:
        model = HospitalEncounter
        fields = [
            'id', 'encounter_number', 'patient', 'patient_name', 'patient_number',
            'encounter_type', 'status', 'chief_complaint',
            'attending_physician_name', 'department',
            'admission_date', 'created_at'
        ]


# ═══════════════════════════════════════════════════════════════
#  HOSPITAL DEPARTMENT SERIALIZERS
# ═══════════════════════════════════════════════════════════════

class HospitalDepartmentSerializer(serializers.ModelSerializer):
    """Hospital department serializer"""
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    department_head_name = serializers.CharField(source='department_head.full_name', read_only=True)
    
    # Department statistics
    total_beds = serializers.SerializerMethodField()
    occupied_beds = serializers.SerializerMethodField()
    available_beds = serializers.SerializerMethodField()
    occupancy_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = HospitalDepartment
        fields = [
            'id', 'organization', 'organization_name', 'name', 'code', 'description',
            'department_head', 'department_head_name', 'phone', 'extension',
            'location', 'floor', 'bed_capacity', 'total_beds', 'occupied_beds',
            'available_beds', 'occupancy_rate', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_total_beds(self, obj):
        """Get total number of beds in department"""
        return obj.beds.filter(is_active=True).count()
    
    def get_occupied_beds(self, obj):
        """Get number of occupied beds"""
        return obj.beds.filter(
            is_active=True, 
            status=BedStatus.OCCUPIED
        ).count()
    
    def get_available_beds(self, obj):
        """Get number of available beds"""
        return obj.beds.filter(
            is_active=True, 
            status=BedStatus.AVAILABLE
        ).count()
        
    def get_occupancy_rate(self, obj):
        """Get occupancy rate as percentage"""
        total = self.get_total_beds(obj)
        if total == 0:
            return 0
        occupied = self.get_occupied_beds(obj)
        return round((occupied / total) * 100, 1)


# ═══════════════════════════════════════════════════════════════
#  HOSPITAL BED SERIALIZERS
# ═══════════════════════════════════════════════════════════════

class HospitalBedSerializer(serializers.ModelSerializer):
    """Hospital bed serializer"""
    department_name = serializers.CharField(source='department.name', read_only=True)
    department_code = serializers.CharField(source='department.code', read_only=True)
    current_patient_name = serializers.CharField(source='current_patient.full_name', read_only=True)
    current_patient_number = serializers.CharField(source='current_patient.patient_number', read_only=True)
    current_encounter_number = serializers.CharField(source='current_encounter.encounter_number', read_only=True)
    
    class Meta:
        model = HospitalBed
        fields = [
            'id', 'department', 'department_name', 'department_code',
            'bed_number', 'room_number', 'status', 'current_patient',
            'current_patient_name', 'current_patient_number',
            'current_encounter', 'current_encounter_number',
            'bed_type', 'has_cardiac_monitor', 'has_oxygen_supply',
            'has_suction', 'last_cleaned', 'last_maintenance',
            'notes', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class HospitalBedListSerializer(serializers.ModelSerializer):
    """Simplified bed serializer for listing"""
    department_name = serializers.CharField(source='department.name', read_only=True)
    current_patient_name = serializers.CharField(source='current_patient.full_name', read_only=True)
    
    class Meta:
        model = HospitalBed
        fields = [
            'id', 'department_name', 'bed_number', 'room_number',
            'status', 'current_patient_name', 'bed_type', 'is_active'
        ]


# ═══════════════════════════════════════════════════════════════
#  CHOICE FIELD SERIALIZERS
# ═══════════════════════════════════════════════════════════════

class EncounterTypeChoicesSerializer(serializers.Serializer):
    """Serializer for encounter type choices"""
    value = serializers.CharField()
    label = serializers.CharField()


class EncounterStatusChoicesSerializer(serializers.Serializer):
    """Serializer for encounter status choices"""
    value = serializers.CharField()
    label = serializers.CharField()


class BedStatusChoicesSerializer(serializers.Serializer):
    """Serializer for bed status choices"""
    value = serializers.CharField()
    label = serializers.CharField()


# ═══════════════════════════════════════════════════════════════
#  TRIAGE SERIALIZERS
# ═══════════════════════════════════════════════════════════════

class TriageSerializer(serializers.ModelSerializer):
    """Complete triage serializer"""
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    patient_number = serializers.CharField(source='patient.patient_number', read_only=True)
    encounter_number = serializers.CharField(source='encounter.encounter_number', read_only=True, allow_null=True)
    nurse_name = serializers.CharField(source='nurse.full_name', read_only=True, allow_null=True)
    assigned_doctor_name = serializers.CharField(source='assigned_doctor.full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = Triage
        fields = [
            'id', 'triage_number', 'triage_date',
            'patient', 'patient_name', 'patient_number',
            'encounter', 'encounter_number',
            'organization',
            'triage_level', 'triage_category', 'acuity',
            'chief_complaint', 'symptom_onset',
            'vitals', 'pain_level',
            'consciousness_level', 'airway_status', 'breathing_status',
            'circulation_status', 'mobility_status',
            'red_flags', 'has_red_flags',
            'is_trauma', 'fever_screening', 'respiratory_symptoms',
            'isolation_required',
            'allergies_verified', 'immunocompromised',
            'assigned_area', 'assigned_doctor', 'assigned_doctor_name',
            'nurse', 'nurse_name',
            'status',
            'arrival_time', 'triage_start_time', 'triage_end_time',
            'estimated_wait_time',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'triage_number', 'triage_date', 'created_at', 'updated_at',
            'organization', 'nurse'
        ]
    
    def create(self, validated_data):
        """Generate triage number on creation"""
        import datetime
        triage_number = f"TR{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"
        validated_data['triage_number'] = triage_number
        return super().create(validated_data)


class TriageListSerializer(serializers.ModelSerializer):
    """Simplified triage serializer for lists"""
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    patient_number = serializers.CharField(source='patient.patient_number', read_only=True)
    nurse_name = serializers.CharField(source='nurse.full_name', read_only=True, allow_null=True)
    assigned_doctor_name = serializers.CharField(source='assigned_doctor.full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = Triage
        fields = [
            'id', 'triage_number', 'triage_date',
            'patient_name', 'patient_number',
            'triage_level', 'acuity', 'chief_complaint',
            'pain_level', 'status',
            'assigned_area', 'assigned_doctor_name',
            'nurse_name'
        ]