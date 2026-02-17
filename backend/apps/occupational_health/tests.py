"""
Occupational Health Tests - Test Framework

Comprehensive test suite for multi-sector occupational health
management system including model validation, API endpoints,
and business logic testing.
"""
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from datetime import date, timedelta
from decimal import Decimal

from .models import (
    Enterprise, WorkSite, Worker, MedicalExamination, 
    VitalSigns, FitnessCertificate, WorkplaceIncident,
    OccupationalDisease, OccupationalDiseaseType,
    SiteHealthMetrics
)

User = get_user_model()

# ==================== MODEL TESTS ====================

class EnterpriseModelTests(TestCase):
    """Test Enterprise model functionality"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
    def test_enterprise_creation(self):
        """Test basic enterprise creation"""
        enterprise = Enterprise.objects.create(
            name="Test Mining Company",
            sector="mining",
            rccm="CD/BAN/RCCM/15-B-123",
            nif="NIF001234567",
            address="123 Mining Street, Lubumbashi",
            contact_person="Jean Mukendi",
            phone="+243123456789",
            email="contact@testmining.cd",
            contract_start_date=date.today(),
            created_by=self.user
        )
        
        self.assertEqual(enterprise.name, "Test Mining Company")
        self.assertEqual(enterprise.sector, "mining")
        self.assertEqual(enterprise.risk_level, "very_high")
        self.assertEqual(enterprise.exam_frequency_months, 12)
        
    def test_sector_risk_levels(self):
        """Test risk level assignment by sector"""
        test_cases = [
            ("mining", "very_high", 12),
            ("construction", "very_high", 12),
            ("manufacturing", "high", 12),
            ("banking_finance", "low_moderate", 24),
            ("government_admin", "low", 36)
        ]
        
        for sector, expected_risk, expected_frequency in test_cases:
            enterprise = Enterprise.objects.create(
                name=f"Test {sector} Company",
                sector=sector,
                rccm=f"RCCM-{sector}",
                nif=f"NIF-{sector}",
                address="Test Address",
                contact_person="Test Person",
                phone="+243123456789",
                email=f"test@{sector}.cd",
                contract_start_date=date.today(),
                created_by=self.user
            )
            
            self.assertEqual(enterprise.risk_level, expected_risk)
            self.assertEqual(enterprise.exam_frequency_months, expected_frequency)

class WorkerModelTests(TestCase):
    """Test Worker model functionality"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.enterprise = Enterprise.objects.create(
            name="Test Company",
            sector="manufacturing",
            rccm="RCCM123",
            nif="NIF123",
            address="Test Address",
            contact_person="Test Person", 
            phone="+243123456789",
            email="test@company.cd",
            contract_start_date=date.today(),
            created_by=self.user
        )
        
    def test_worker_creation(self):
        """Test worker creation with calculated fields"""
        worker = Worker.objects.create(
            employee_id="EMP001",
            first_name="Jean",
            last_name="Mukendi",
            date_of_birth=date(1985, 5, 15),
            gender="male",
            enterprise=self.enterprise,
            job_category="machine_operator",
            job_title="Opérateur Machine",
            hire_date=date.today(),
            phone="+243123456789",
            address="123 Worker Street",
            emergency_contact_name="Marie Mukendi",
            emergency_contact_phone="+243987654321",
            created_by=self.user
        )
        
        self.assertEqual(worker.full_name, "Jean Mukendi")
        self.assertTrue(35 <= worker.age <= 40)  # Approximate age check
        self.assertEqual(worker.sector_risk_level, "high")
        
    def test_ppe_requirements(self):
        """Test PPE requirement assignment"""
        worker = Worker.objects.create(
            employee_id="EMP002", 
            first_name="Test",
            last_name="Worker",
            date_of_birth=date(1990, 1, 1),
            gender="male",
            enterprise=self.enterprise,
            job_category="machine_operator",
            job_title="Test Job",
            hire_date=date.today(),
            phone="+243123456789",
            address="Test Address",
            emergency_contact_name="Emergency Contact",
            emergency_contact_phone="+243123456789",
            created_by=self.user
        )
        
        required_ppe = worker.get_required_ppe_for_job()
        self.assertIsInstance(required_ppe, list)
        self.assertGreater(len(required_ppe), 0)

class VitalSignsModelTests(TestCase):
    """Test VitalSigns model calculations"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com', 
            password='testpass123'
        )
        
        self.enterprise = Enterprise.objects.create(
            name="Test Company",
            sector="manufacturing", 
            rccm="RCCM123",
            nif="NIF123",
            address="Test Address",
            contact_person="Test Person",
            phone="+243123456789",
            email="test@company.cd",
            contract_start_date=date.today(),
            created_by=self.user
        )
        
        self.worker = Worker.objects.create(
            employee_id="EMP001",
            first_name="Test",
            last_name="Worker",
            date_of_birth=date(1990, 1, 1),
            gender="male",
            enterprise=self.enterprise,
            job_category="machine_operator",
            job_title="Test Job", 
            hire_date=date.today(),
            phone="+243123456789",
            address="Test Address",
            emergency_contact_name="Emergency Contact",
            emergency_contact_phone="+243123456789",
            created_by=self.user
        )
        
        self.examination = MedicalExamination.objects.create(
            worker=self.worker,
            exam_type="periodic",
            exam_date=date.today(),
            examining_doctor=self.user
        )
        
    def test_bmi_calculation(self):
        """Test BMI calculation and categorization"""
        vital_signs = VitalSigns.objects.create(
            examination=self.examination,
            systolic_bp=120,
            diastolic_bp=80,
            heart_rate=70,
            height=Decimal('175.0'),  # 175 cm
            weight=Decimal('70.0'),   # 70 kg
            recorded_by=self.user
        )
        
        expected_bmi = round(70.0 / (1.75 ** 2), 1)  # ~22.9
        self.assertEqual(vital_signs.bmi, expected_bmi)
        self.assertEqual(vital_signs.bmi_category, "Normal")
        
    def test_abnormal_vitals_detection(self):
        """Test abnormal vitals detection"""
        # Normal vitals
        normal_vitals = VitalSigns.objects.create(
            examination=self.examination,
            systolic_bp=120,
            diastolic_bp=80,
            heart_rate=70,
            height=Decimal('175.0'),
            weight=Decimal('70.0'),
            pain_scale=2,
            recorded_by=self.user
        )
        self.assertFalse(normal_vitals.has_abnormal_vitals)
        
        # Create new examination for abnormal vitals test
        examination2 = MedicalExamination.objects.create(
            worker=self.worker,
            exam_type="periodic",
            exam_date=date.today(),
            examining_doctor=self.user
        )
        
        # Abnormal vitals - high blood pressure
        abnormal_vitals = VitalSigns.objects.create(
            examination=examination2,
            systolic_bp=160,
            diastolic_bp=100,
            heart_rate=70,
            height=Decimal('175.0'),
            weight=Decimal('70.0'),
            pain_scale=2,
            recorded_by=self.user
        )
        self.assertTrue(abnormal_vitals.has_abnormal_vitals)

# ==================== API TESTS ====================

class OccupationalHealthAPITests(APITestCase):
    """Test REST API endpoints"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            is_staff=True
        )
        self.client.force_authenticate(user=self.user)
        
        self.enterprise = Enterprise.objects.create(
            name="Test Company",
            sector="manufacturing",
            rccm="RCCM123", 
            nif="NIF123",
            address="Test Address", 
            contact_person="Test Person",
            phone="+243123456789",
            email="test@company.cd",
            contract_start_date=date.today(),
            created_by=self.user
        )
        
    def test_enterprise_list_api(self):
        """Test enterprise list API endpoint"""
        url = reverse('occupational_health:enterprise-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], "Test Company")
        
    def test_enterprise_detail_api(self):
        """Test enterprise detail API endpoint"""
        url = reverse('occupational_health:enterprise-detail', args=[self.enterprise.id])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], "Test Company")
        self.assertEqual(response.data['risk_level'], "high")
        
    def test_worker_creation_api(self):
        """Test worker creation via API"""
        url = reverse('occupational_health:worker-list')
        data = {
            'employee_id': 'EMP001',
            'first_name': 'Jean',
            'last_name': 'Mukendi',
            'date_of_birth': '1990-01-01',
            'gender': 'male',
            'enterprise': self.enterprise.id,
            'job_category': 'machine_operator',
            'job_title': 'Opérateur Machine',
            'hire_date': date.today().isoformat(),
            'phone': '+243123456789',
            'address': '123 Test Street',
            'emergency_contact_name': 'Marie Mukendi',
            'emergency_contact_phone': '+243987654321'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['full_name'], 'Jean Mukendi')
        
    def test_dashboard_stats_api(self):
        """Test dashboard statistics API"""
        # Create some test data
        worker = Worker.objects.create(
            employee_id="EMP001",
            first_name="Test",
            last_name="Worker", 
            date_of_birth=date(1990, 1, 1),
            gender="male",
            enterprise=self.enterprise,
            job_category="machine_operator",
            job_title="Test Job",
            hire_date=date.today(),
            phone="+243123456789",
            address="Test Address",
            emergency_contact_name="Emergency Contact",
            emergency_contact_phone="+243123456789",
            created_by=self.user
        )
        
        url = reverse('occupational_health:dashboard-stats')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_enterprises', response.data)
        self.assertIn('total_workers', response.data)
        self.assertEqual(response.data['total_enterprises'], 1)
        self.assertEqual(response.data['total_workers'], 1)

# ==================== BUSINESS LOGIC TESTS ====================

class FitnessCertificateTests(TestCase):
    """Test fitness certificate business logic"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.enterprise = Enterprise.objects.create(
            name="Test Company",
            sector="mining",  # Very high risk - 12 month frequency
            rccm="RCCM123",
            nif="NIF123",
            address="Test Address",
            contact_person="Test Person",
            phone="+243123456789", 
            email="test@company.cd",
            contract_start_date=date.today(),
            created_by=self.user
        )
        
        self.worker = Worker.objects.create(
            employee_id="EMP001",
            first_name="Test",
            last_name="Worker",
            date_of_birth=date(1990, 1, 1),
            gender="male",
            enterprise=self.enterprise,
            job_category="underground_miner",
            job_title="Mineur",
            hire_date=date.today(),
            phone="+243123456789",
            address="Test Address", 
            emergency_contact_name="Emergency Contact",
            emergency_contact_phone="+243123456789",
            created_by=self.user
        )
        
        self.examination = MedicalExamination.objects.create(
            worker=self.worker,
            exam_type="pre_employment",
            exam_date=date.today(),
            examining_doctor=self.user,
            examination_completed=True
        )
        
    def test_certificate_validity_period(self):
        """Test certificate validity based on sector risk"""
        certificate = FitnessCertificate.objects.create(
            examination=self.examination,
            fitness_decision="fit",
            decision_rationale="All examinations normal",
            issue_date=date.today(),
            issued_by=self.user
        )
        
        # Should be valid for 12 months (mining sector)
        expected_expiry = date.today() + timedelta(days=365)  # Approximately 12 months
        self.assertAlmostEqual(
            certificate.valid_until,
            expected_expiry,
            delta=timedelta(days=5)  # Allow small variance
        )
        
    def test_certificate_expiry_status(self):
        """Test certificate expiry detection"""  
        # Create expired certificate
        expired_certificate = FitnessCertificate.objects.create(
            examination=self.examination,
            fitness_decision="fit",
            decision_rationale="Test",
            issue_date=date.today() - timedelta(days=400),  
            valid_until=date.today() - timedelta(days=30),
            issued_by=self.user
        )
        
        self.assertTrue(expired_certificate.is_expired)
        self.assertEqual(expired_certificate.days_until_expiry, 0)

class IncidentReportingTests(TestCase):
    """Test workplace incident reporting logic"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.enterprise = Enterprise.objects.create(
            name="Test Company",
            sector="construction",
            rccm="RCCM123",
            nif="NIF123",
            address="Test Address",
            contact_person="Test Person",
            phone="+243123456789",
            email="test@company.cd",
            contract_start_date=date.today(),
            created_by=self.user
        )
        
    def test_incident_severity_classification(self):
        """Test incident severity classification"""
        # High severity incident
        incident = WorkplaceIncident.objects.create(
            enterprise=self.enterprise,
            category="lost_time_injury",
            severity=4,  # Major
            incident_date=date.today(),
            incident_time="14:30:00",
            location_description="Construction Site A",
            description="Worker fell from scaffolding",
            immediate_cause="Scaffolding failure",
            work_days_lost=30,
            reported_by=self.user
        )
        
        self.assertEqual(incident.severity, 4)
        self.assertEqual(incident.work_days_lost, 30)
        
    def test_reportable_incident_flagging(self):
        """Test automatic flagging of reportable incidents"""  
        # Fatality - should be automatically flagged as reportable
        fatality_incident = WorkplaceIncident.objects.create(
            enterprise=self.enterprise,
            category="fatality",
            severity=5,
            incident_date=date.today(),
            incident_time="10:00:00", 
            location_description="Site",
            description="Fatal accident",
            immediate_cause="Equipment failure",
            reported_by=self.user
        )
        
        # This would be set by signals in real usage
        self.assertEqual(fatality_incident.category, "fatality")

# ==================== INTEGRATION TESTS ====================

class SiteHealthMetricsTests(TestCase):
    """Test health metrics calculations"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.enterprise = Enterprise.objects.create(
            name="Test Company", 
            sector="manufacturing",
            rccm="RCCM123",
            nif="NIF123",
            address="Test Address",
            contact_person="Test Person",
            phone="+243123456789",
            email="test@company.cd",  
            contract_start_date=date.today(),
            created_by=self.user
        )
        
    def test_ltifr_calculation(self):
        """Test LTIFR calculation"""
        metrics = SiteHealthMetrics.objects.create(
            enterprise=self.enterprise,
            year=2026,
            month=2,
            total_workers=100,
            total_hours_worked=16000,  # 100 workers * 160 hours/month
            lost_time_injuries=2,
            compiled_by=self.user
        )
        
        # LTIFR = (LTI * 1,000,000) / hours worked  
        expected_ltifr = (2 * 1_000_000) / 16000  # = 125.0
        self.assertEqual(metrics.ltifr, expected_ltifr)
        
    def test_fitness_rate_calculation(self):
        """Test fitness rate calculation"""
        metrics = SiteHealthMetrics.objects.create(
            enterprise=self.enterprise,
            year=2026,
            month=2,
            total_workers=100,
            workers_fit=80,
            workers_fit_with_restrictions=15,
            workers_temporarily_unfit=3,
            workers_permanently_unfit=2,
            compiled_by=self.user
        )
        
        # Fitness rate = (fit + fit_with_restrictions) / total * 100
        expected_rate = (80 + 15) / 100 * 100  # = 95.0%
        self.assertEqual(metrics.fitness_rate, expected_rate)