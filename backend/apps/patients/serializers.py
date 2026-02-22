from rest_framework import serializers
from .models import Patient, Gender, BloodType, PatientStatus


class PatientSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    age = serializers.ReadOnlyField()
    gender_display = serializers.CharField(source='get_gender_display', read_only=True)
    blood_type_display = serializers.CharField(source='get_blood_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Patient
        fields = '__all__'
        read_only_fields = ['id', 'patient_number', 'registration_date', 'created_at', 'updated_at']

    def create(self, validated_data):
        # Auto-generate patient number
        from django.utils import timezone
        year = timezone.now().year
        last_patient = Patient.objects.filter(
            patient_number__startswith=f'P{year}'
        ).order_by('patient_number').last()
        
        if last_patient:
            last_num = int(last_patient.patient_number[-4:])
            new_num = last_num + 1
        else:
            new_num = 1
            
        validated_data['patient_number'] = f'P{year}{new_num:04d}'
        return super().create(validated_data)


class PatientListSerializer(serializers.ModelSerializer):
    """Simplified serializer for patient lists"""
    full_name = serializers.ReadOnlyField()
    age = serializers.ReadOnlyField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Patient
        fields = [
            'id', 'patient_number', 'first_name', 'last_name', 'middle_name',
            'full_name', 'age', 'date_of_birth', 'gender',
            'phone', 'email', 'status', 'status_display', 'last_visit',
            'created_at', 'registration_date',
        ]