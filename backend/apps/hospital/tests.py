from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
from .models import (
    HospitalEncounter, VitalSigns, HospitalDepartment, 
    HospitalBed, EncounterType, EncounterStatus, BedStatus
)

User = get_user_model()


class VitalSignsModelTest(TestCase):
    """Test VitalSigns model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            phone='+237650123456',
            first_name='Test',
            last_name='Nurse',
            user_type='nurse'
        )
        
        # Create test patient (you'll need to adjust this based on your Patient model)
        # self.patient = Patient.objects.create(...)
    
    def test_bmi_calculation(self):
        """Test BMI automatic calculation"""
        vital_signs = VitalSigns(
            weight=Decimal('70.0'),
            height=170,
            measured_by=self.user
        )
        vital_signs.save()
        
        expected_bmi = round(70.0 / (1.7 ** 2), 1)  # 24.2
        self.assertEqual(float(vital_signs.body_mass_index), expected_bmi)
    
    def test_bmi_category(self):
        """Test BMI category calculation"""
        # Normal BMI
        vital_signs = VitalSigns(
            weight=Decimal('70.0'),
            height=170,
            measured_by=self.user
        )
        vital_signs.save()
        self.assertEqual(vital_signs.bmi_category, 'Normal')
        
        # Overweight BMI
        vital_signs2 = VitalSigns(
            weight=Decimal('85.0'),
            height=170,
            measured_by=self.user
        )
        vital_signs2.save()
        self.assertEqual(vital_signs2.bmi_category, 'Surpoids')
    
    def test_blood_pressure_reading(self):
        """Test blood pressure reading format"""
        vital_signs = VitalSigns(
            blood_pressure_systolic=120,
            blood_pressure_diastolic=80,
            measured_by=self.user
        )
        vital_signs.save()
        self.assertEqual(vital_signs.blood_pressure_reading, "120/80")
    
    def test_abnormal_detection(self):
        """Test abnormal vital signs detection"""
        # High temperature
        vital_signs = VitalSigns(
            temperature=Decimal('39.0'),  # High fever
            measured_by=self.user
        )
        vital_signs.save()
        self.assertTrue(vital_signs.is_abnormal)
        
        # Normal temperature
        vital_signs2 = VitalSigns(
            temperature=Decimal('36.5'),  # Normal
            measured_by=self.user
        )
        vital_signs2.save()
        self.assertFalse(vital_signs2.is_abnormal)


class HospitalEncounterModelTest(TestCase):
    """Test HospitalEncounter model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            phone='+237650123456',
            first_name='Test',
            last_name='Doctor',
            user_type='doctor'
        )
    
    def test_encounter_number_generation(self):
        """Test automatic encounter number generation"""
        # You'll need to create organization and patient objects first
        # encounter = HospitalEncounter.objects.create(...)
        # self.assertTrue(encounter.encounter_number.startswith('HE-'))
        pass


class HospitalDepartmentModelTest(TestCase):
    """Test HospitalDepartment model"""
    
    def test_department_string_representation(self):
        """Test department __str__ method"""
        # You'll need to create organization first
        # department = HospitalDepartment(name='Cardiology', code='CARD')
        # self.assertEqual(str(department), 'Cardiology (CARD)')
        pass


class HospitalBedModelTest(TestCase):
    """Test HospitalBed model"""
    
    def test_bed_string_representation(self):
        """Test bed __str__ method"""
        # You'll need to create department first
        # bed = HospitalBed(room_number='101', bed_number='A')
        # Expected format: "Department - Chambre 101 - Lit A"
        pass


# Integration tests would go here to test the full workflow:
# 1. Create encounter
# 2. Take vital signs
# 3. Assign bed
# 4. Complete encounter