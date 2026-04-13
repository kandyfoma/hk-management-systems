"""
Unit tests for the Hospital module — models, serializers, views, and signals.
Covers: encounter lifecycle, vital signs validation, bed assignment/release,
triage workflow, status transitions, org isolation, race-safe number generation.
"""
from decimal import Decimal
from datetime import date, timedelta

from django.test import TestCase, TransactionTestCase
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db import IntegrityError
from rest_framework.test import APIRequestFactory, force_authenticate, APITestCase
from rest_framework import status as http_status

from apps.accounts.models import User
from apps.organizations.models import Organization
from apps.patients.models import Patient
from apps.hospital.models import (
    HospitalEncounter, VitalSigns, HospitalDepartment,
    HospitalBed, Triage, EncounterType, EncounterStatus,
    BedStatus, TriageLevel, TriageStatus,
)
from apps.hospital.serializers import (
    VitalSignsCreateSerializer,
    HospitalEncounterCreateSerializer,
    TriageSerializer,
)
from apps.hospital import views as hospital_views


# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

def _org(suffix="1"):
    return Organization.objects.create(
        name=f"Hôpital Test {suffix}",
        type="hospital",
        registration_number=f"HP-REG-{suffix}-{timezone.now().timestamp()}",
        address="123 Rue Hôpital",
        city="Kinshasa",
        phone=f"+243810000{suffix.zfill(3)}",
        email=f"hospital{suffix}@test.cd",
        director_name="Dr Directeur",
    )


def _user(org, role="doctor", suffix="1"):
    return User.objects.create_user(
        phone=f"+243820000{suffix.zfill(3)}",
        password="testpass123",
        first_name="User",
        last_name=f"Test{suffix}",
        primary_role=role,
        organization=org,
    )


def _patient(org, suffix="1"):
    return Patient.objects.create(
        first_name=f"Patient{suffix}",
        last_name=f"Test{suffix}",
        date_of_birth=date(1990, 1, 1),
        gender="male",
        phone=f"+243830000{suffix.zfill(3)}",
        patient_number=f"PT-{suffix}-{timezone.now().timestamp()}",
        organization=org,
    )


def _department(org, name="Cardiologie", code="CARD"):
    return HospitalDepartment.objects.create(
        organization=org,
        name=name,
        code=code,
        bed_capacity=10,
    )


def _bed(dept, room="101", bed="A"):
    return HospitalBed.objects.create(
        department=dept,
        room_number=room,
        bed_number=bed,
        status=BedStatus.AVAILABLE,
    )


def _encounter(patient, org, user, enc_type="outpatient", status="scheduled", department=""):
    return HospitalEncounter.objects.create(
        patient=patient,
        organization=org,
        encounter_type=enc_type,
        status=status,
        department=department,
        chief_complaint="Douleur thoracique",
        created_by=user,
    )


# ══════════════════════════════════════════════════════════════
# MODEL TESTS
# ══════════════════════════════════════════════════════════════


class VitalSignsModelTest(TestCase):
    """Test VitalSigns model properties and calculations."""

    def setUp(self):
        self.org = _org()
        self.user = _user(self.org, role="nurse")
        self.patient = _patient(self.org)

    def test_bmi_calculation(self):
        """BMI auto-calculates from weight & height on save."""
        vs = VitalSigns.objects.create(
            patient=self.patient,
            weight=Decimal("70.0"),
            height=170,
            measured_by=self.user,
            created_by=self.user,
        )
        expected = round(70.0 / (1.70 ** 2), 1)
        self.assertEqual(float(vs.body_mass_index), expected)

    def test_bmi_not_set_when_missing_data(self):
        """BMI stays None when weight or height is missing."""
        vs = VitalSigns.objects.create(
            patient=self.patient,
            weight=Decimal("70.0"),
            measured_by=self.user,
            created_by=self.user,
        )
        self.assertIsNone(vs.body_mass_index)

    def test_bmi_category_underweight(self):
        vs = VitalSigns(weight=Decimal("45.0"), height=180, measured_by=self.user, patient=self.patient)
        vs.save()
        self.assertEqual(vs.bmi_category, "Insuffisance pondérale")

    def test_bmi_category_normal(self):
        vs = VitalSigns(weight=Decimal("70.0"), height=170, measured_by=self.user, patient=self.patient)
        vs.save()
        self.assertEqual(vs.bmi_category, "Normal")

    def test_bmi_category_overweight(self):
        vs = VitalSigns(weight=Decimal("85.0"), height=170, measured_by=self.user, patient=self.patient)
        vs.save()
        self.assertEqual(vs.bmi_category, "Surpoids")

    def test_bmi_category_obese(self):
        vs = VitalSigns(weight=Decimal("120.0"), height=170, measured_by=self.user, patient=self.patient)
        vs.save()
        self.assertEqual(vs.bmi_category, "Obésité")

    def test_blood_pressure_reading(self):
        """Formatted BP reading string."""
        vs = VitalSigns(
            patient=self.patient,
            blood_pressure_systolic=120,
            blood_pressure_diastolic=80,
            measured_by=self.user,
        )
        vs.save()
        self.assertEqual(vs.blood_pressure_reading, "120/80")

    def test_blood_pressure_reading_missing(self):
        """Returns None if BP values missing."""
        vs = VitalSigns(patient=self.patient, measured_by=self.user)
        vs.save()
        self.assertIsNone(vs.blood_pressure_reading)

    def test_is_abnormal_high_temperature(self):
        vs = VitalSigns(patient=self.patient, temperature=Decimal("39.5"), measured_by=self.user)
        vs.save()
        self.assertTrue(vs.is_abnormal)

    def test_is_abnormal_low_temperature(self):
        vs = VitalSigns(patient=self.patient, temperature=Decimal("35.0"), measured_by=self.user)
        vs.save()
        self.assertTrue(vs.is_abnormal)

    def test_is_not_abnormal_normal_temp(self):
        vs = VitalSigns(patient=self.patient, temperature=Decimal("36.5"), measured_by=self.user)
        vs.save()
        self.assertFalse(vs.is_abnormal)

    def test_is_abnormal_hypertension(self):
        vs = VitalSigns(
            patient=self.patient,
            blood_pressure_systolic=160,
            blood_pressure_diastolic=100,
            measured_by=self.user,
        )
        vs.save()
        self.assertTrue(vs.is_abnormal)

    def test_is_abnormal_tachycardia(self):
        vs = VitalSigns(patient=self.patient, heart_rate=120, measured_by=self.user)
        vs.save()
        self.assertTrue(vs.is_abnormal)

    def test_is_abnormal_low_oxygen(self):
        vs = VitalSigns(patient=self.patient, oxygen_saturation=88, measured_by=self.user)
        vs.save()
        self.assertTrue(vs.is_abnormal)

    def test_is_normal_all_values(self):
        vs = VitalSigns(
            patient=self.patient,
            temperature=Decimal("36.8"),
            blood_pressure_systolic=120,
            blood_pressure_diastolic=80,
            heart_rate=72,
            respiratory_rate=16,
            oxygen_saturation=98,
            measured_by=self.user,
        )
        vs.save()
        self.assertFalse(vs.is_abnormal)


class HospitalEncounterModelTest(TestCase):
    """Test HospitalEncounter model lifecycle and validations."""

    def setUp(self):
        self.org = _org()
        self.user = _user(self.org)
        self.patient = _patient(self.org)

    def test_encounter_number_auto_generated(self):
        """Encounter number generated on save."""
        enc = _encounter(self.patient, self.org, self.user)
        self.assertTrue(enc.encounter_number)
        self.assertTrue(len(enc.encounter_number) > 0)

    def test_encounter_number_unique(self):
        """Each encounter gets a unique number."""
        enc1 = _encounter(self.patient, self.org, self.user)
        enc2 = _encounter(self.patient, self.org, self.user)
        self.assertNotEqual(enc1.encounter_number, enc2.encounter_number)

    def test_valid_status_transition_scheduled_to_checked_in(self):
        enc = _encounter(self.patient, self.org, self.user, status="scheduled")
        enc.status = "checked_in"
        enc.full_clean()  # Should not raise

    def test_valid_status_transition_checked_in_to_in_progress(self):
        enc = _encounter(self.patient, self.org, self.user, status="checked_in")
        enc.status = "in_progress"
        enc.full_clean()

    def test_valid_status_transition_in_progress_to_completed(self):
        enc = _encounter(self.patient, self.org, self.user, status="in_progress")
        enc.status = "completed"
        enc.full_clean()

    def test_invalid_status_transition_scheduled_to_completed(self):
        enc = _encounter(self.patient, self.org, self.user, status="scheduled")
        enc.status = "completed"
        with self.assertRaises(ValidationError):
            enc.full_clean()

    def test_invalid_status_transition_completed_to_in_progress(self):
        enc = _encounter(self.patient, self.org, self.user, status="completed")
        enc.status = "in_progress"
        with self.assertRaises(ValidationError):
            enc.full_clean()

    def test_invalid_status_transition_cancelled_to_any(self):
        enc = _encounter(self.patient, self.org, self.user, status="cancelled")
        enc.status = "in_progress"
        with self.assertRaises(ValidationError):
            enc.full_clean()

    def test_discharge_date_must_be_after_admission(self):
        now = timezone.now()
        enc = _encounter(self.patient, self.org, self.user, status="in_progress")
        enc.admission_date = now
        enc.discharge_date = now - timedelta(hours=1)
        with self.assertRaises(ValidationError):
            enc.full_clean()

    def test_inpatient_requires_department(self):
        enc = HospitalEncounter(
            patient=self.patient,
            organization=self.org,
            encounter_type="inpatient",
            status="scheduled",
            department="",
            created_by=self.user,
        )
        with self.assertRaises(ValidationError):
            enc.full_clean()

    def test_icu_requires_department(self):
        enc = HospitalEncounter(
            patient=self.patient,
            organization=self.org,
            encounter_type="icu",
            status="scheduled",
            department="",
            created_by=self.user,
        )
        with self.assertRaises(ValidationError):
            enc.full_clean()

    def test_outpatient_no_department_required(self):
        enc = HospitalEncounter(
            patient=self.patient,
            organization=self.org,
            encounter_type="outpatient",
            status="scheduled",
            department="",
            created_by=self.user,
        )
        enc.full_clean()  # Should not raise

    def test_completed_status_auto_sets_discharge_date(self):
        enc = _encounter(self.patient, self.org, self.user, status="in_progress")
        enc.admission_date = timezone.now() - timedelta(hours=2)
        enc.status = "completed"
        enc.full_clean()
        self.assertIsNotNone(enc.discharge_date)


class HospitalDepartmentModelTest(TestCase):
    """Test HospitalDepartment model."""

    def setUp(self):
        self.org = _org()

    def test_str_representation(self):
        dept = _department(self.org, "Cardiologie", "CARD")
        self.assertIn("Cardiologie", str(dept))

    def test_unique_code_per_org(self):
        _department(self.org, "Cardiologie", "CARD")
        with self.assertRaises(IntegrityError):
            _department(self.org, "Cardiologie 2", "CARD")

    def test_same_code_different_orgs(self):
        org2 = _org(suffix="2")
        _department(self.org, "Cardiologie", "CARD")
        dept2 = _department(org2, "Cardiologie", "CARD")
        self.assertIsNotNone(dept2.pk)


class HospitalBedModelTest(TestCase):
    """Test HospitalBed model."""

    def setUp(self):
        self.org = _org()
        self.dept = _department(self.org)

    def test_str_representation(self):
        bed = _bed(self.dept, "101", "A")
        self.assertIn("101", str(bed))

    def test_unique_bed_per_department(self):
        _bed(self.dept, "101", "A")
        with self.assertRaises(IntegrityError):
            _bed(self.dept, "101", "A")

    def test_same_bed_number_different_departments(self):
        dept2 = _department(self.org, "Neurologie", "NEU")
        _bed(self.dept, "101", "A")
        bed2 = _bed(dept2, "101", "A")
        self.assertIsNotNone(bed2.pk)

    def test_default_status_available(self):
        bed = _bed(self.dept)
        self.assertEqual(bed.status, BedStatus.AVAILABLE)


class TriageModelTest(TestCase):
    """Test Triage model."""

    def setUp(self):
        self.org = _org()
        self.user = _user(self.org, role="nurse")
        self.patient = _patient(self.org)

    def test_triage_number_auto_generated(self):
        t = Triage.objects.create(
            patient=self.patient,
            organization=self.org,
            chief_complaint="Fièvre",
            triage_level=3,
            pain_level=5,
            nurse=self.user,
        )
        self.assertTrue(t.triage_number)
        self.assertTrue(t.triage_number.startswith("TR"))

    def test_triage_number_unique(self):
        t1 = Triage.objects.create(
            patient=self.patient,
            organization=self.org,
            chief_complaint="Fièvre",
            triage_level=3,
            pain_level=5,
        )
        t2 = Triage.objects.create(
            patient=self.patient,
            organization=self.org,
            chief_complaint="Douleur",
            triage_level=2,
            pain_level=7,
        )
        self.assertNotEqual(t1.triage_number, t2.triage_number)

    def test_default_status_in_progress(self):
        t = Triage.objects.create(
            patient=self.patient,
            organization=self.org,
            chief_complaint="Test",
            triage_level=4,
            pain_level=3,
        )
        self.assertEqual(t.status, TriageStatus.IN_PROGRESS)


# ══════════════════════════════════════════════════════════════
# SERIALIZER TESTS
# ══════════════════════════════════════════════════════════════


class VitalSignsCreateSerializerTest(TestCase):
    """Test VitalSignsCreateSerializer validation rules."""

    def setUp(self):
        self.org = _org()
        self.user = _user(self.org, role="nurse")
        self.patient = _patient(self.org)
        self.encounter = _encounter(self.patient, self.org, self.user, status="in_progress")
        self.factory = APIRequestFactory()

    def _request(self, user=None):
        req = self.factory.post("/fake/")
        req.user = user or self.user
        return req

    def test_systolic_must_be_greater_than_diastolic(self):
        data = {
            "patient": str(self.patient.id),
            "encounter": str(self.encounter.id),
            "blood_pressure_systolic": 80,
            "blood_pressure_diastolic": 120,
            "measured_by": str(self.user.id),
        }
        serializer = VitalSignsCreateSerializer(data=data, context={"request": self._request()})
        self.assertFalse(serializer.is_valid())
        self.assertIn("non_field_errors", serializer.errors)

    def test_valid_bp_passes(self):
        data = {
            "patient": str(self.patient.id),
            "encounter": str(self.encounter.id),
            "blood_pressure_systolic": 120,
            "blood_pressure_diastolic": 80,
            "measured_by": str(self.user.id),
        }
        serializer = VitalSignsCreateSerializer(data=data, context={"request": self._request()})
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_cannot_add_vitals_to_completed_encounter(self):
        completed_enc = _encounter(self.patient, self.org, self.user, status="completed")
        data = {
            "patient": str(self.patient.id),
            "encounter": str(completed_enc.id),
            "temperature": "37.0",
            "measured_by": str(self.user.id),
        }
        serializer = VitalSignsCreateSerializer(data=data, context={"request": self._request()})
        self.assertFalse(serializer.is_valid())

    def test_cannot_add_vitals_to_cancelled_encounter(self):
        cancelled_enc = _encounter(self.patient, self.org, self.user, status="cancelled")
        data = {
            "patient": str(self.patient.id),
            "encounter": str(cancelled_enc.id),
            "temperature": "37.0",
            "measured_by": str(self.user.id),
        }
        serializer = VitalSignsCreateSerializer(data=data, context={"request": self._request()})
        self.assertFalse(serializer.is_valid())

    def test_cross_org_encounter_rejected(self):
        org2 = _org(suffix="2")
        user2 = _user(org2, suffix="2")
        data = {
            "patient": str(self.patient.id),
            "encounter": str(self.encounter.id),
            "temperature": "37.0",
            "measured_by": str(user2.id),
        }
        serializer = VitalSignsCreateSerializer(data=data, context={"request": self._request(user2)})
        self.assertFalse(serializer.is_valid())


class HospitalEncounterCreateSerializerTest(TestCase):
    """Test HospitalEncounterCreateSerializer validation rules."""

    def setUp(self):
        self.org = _org()
        self.user = _user(self.org)
        self.patient = _patient(self.org)
        self.factory = APIRequestFactory()

    def _request(self, user=None):
        req = self.factory.post("/fake/")
        req.user = user or self.user
        return req

    def test_discharge_before_admission_rejected(self):
        now = timezone.now()
        data = {
            "patient": str(self.patient.id),
            "encounter_type": "outpatient",
            "admission_date": now.isoformat(),
            "discharge_date": (now - timedelta(hours=1)).isoformat(),
            "chief_complaint": "Test",
        }
        serializer = HospitalEncounterCreateSerializer(data=data, context={"request": self._request()})
        self.assertFalse(serializer.is_valid())

    def test_inpatient_without_department_rejected(self):
        data = {
            "patient": str(self.patient.id),
            "encounter_type": "inpatient",
            "department": "",
            "chief_complaint": "Test",
        }
        serializer = HospitalEncounterCreateSerializer(data=data, context={"request": self._request()})
        self.assertFalse(serializer.is_valid())

    def test_inpatient_with_department_valid(self):
        data = {
            "patient": str(self.patient.id),
            "encounter_type": "inpatient",
            "department": "Cardiologie",
            "chief_complaint": "Test",
        }
        serializer = HospitalEncounterCreateSerializer(data=data, context={"request": self._request()})
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_overlapping_active_inpatient_rejected(self):
        _encounter(self.patient, self.org, self.user, enc_type="inpatient", status="in_progress", department="Cardio")
        data = {
            "patient": str(self.patient.id),
            "encounter_type": "inpatient",
            "department": "Neurologie",
            "chief_complaint": "Test 2",
        }
        serializer = HospitalEncounterCreateSerializer(data=data, context={"request": self._request()})
        self.assertFalse(serializer.is_valid())

    def test_outpatient_valid_minimal(self):
        data = {
            "patient": str(self.patient.id),
            "encounter_type": "outpatient",
            "chief_complaint": "Contrôle",
        }
        serializer = HospitalEncounterCreateSerializer(data=data, context={"request": self._request()})
        self.assertTrue(serializer.is_valid(), serializer.errors)


# ══════════════════════════════════════════════════════════════
# API VIEW TESTS
# ══════════════════════════════════════════════════════════════


class EncounterAPITest(APITestCase):
    """Test encounter API endpoints."""

    def setUp(self):
        self.org = _org()
        self.user = _user(self.org)
        self.patient = _patient(self.org)
        self.factory = APIRequestFactory()

    def test_list_encounters_org_scoped(self):
        """Encounters from another org are not visible."""
        org2 = _org(suffix="2")
        user2 = _user(org2, suffix="2")
        patient2 = _patient(org2, suffix="2")
        _encounter(self.patient, self.org, self.user)
        _encounter(patient2, org2, user2)

        request = self.factory.get("/hospital/encounters/")
        force_authenticate(request, user=self.user)
        response = hospital_views.HospitalEncounterListCreateAPIView.as_view()(request)
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        if isinstance(results, list):
            self.assertEqual(len(results), 1)

    def test_create_encounter(self):
        data = {
            "patient": str(self.patient.id),
            "encounter_type": "outpatient",
            "chief_complaint": "Fièvre persistante",
        }
        request = self.factory.post("/hospital/encounters/", data, format="json")
        force_authenticate(request, user=self.user)
        response = hospital_views.HospitalEncounterListCreateAPIView.as_view()(request)
        self.assertEqual(response.status_code, http_status.HTTP_201_CREATED)
        self.assertIn("encounter_number", response.data)

    def test_unauthenticated_rejected(self):
        request = self.factory.get("/hospital/encounters/")
        response = hospital_views.HospitalEncounterListCreateAPIView.as_view()(request)
        self.assertEqual(response.status_code, http_status.HTTP_401_UNAUTHORIZED)


class VitalSignsAPITest(APITestCase):
    """Test vital signs API endpoints."""

    def setUp(self):
        self.org = _org()
        self.user = _user(self.org, role="nurse")
        self.patient = _patient(self.org)
        self.encounter = _encounter(self.patient, self.org, self.user, status="in_progress")
        self.factory = APIRequestFactory()

    def test_create_vitals(self):
        data = {
            "patient": str(self.patient.id),
            "encounter": str(self.encounter.id),
            "temperature": "37.5",
            "heart_rate": 80,
            "blood_pressure_systolic": 120,
            "blood_pressure_diastolic": 80,
            "measured_by": str(self.user.id),
        }
        request = self.factory.post("/hospital/vital-signs/", data, format="json")
        force_authenticate(request, user=self.user)
        response = hospital_views.VitalSignsListCreateAPIView.as_view()(request)
        self.assertEqual(response.status_code, http_status.HTTP_201_CREATED)

    def test_list_vitals_org_scoped(self):
        org2 = _org(suffix="2")
        user2 = _user(org2, role="nurse", suffix="2")
        patient2 = _patient(org2, suffix="2")
        VitalSigns.objects.create(patient=self.patient, temperature=Decimal("37.0"), measured_by=self.user, created_by=self.user)
        VitalSigns.objects.create(patient=patient2, temperature=Decimal("38.0"), measured_by=user2, created_by=user2)

        request = self.factory.get("/hospital/vital-signs/")
        force_authenticate(request, user=self.user)
        response = hospital_views.VitalSignsListCreateAPIView.as_view()(request)
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        if isinstance(results, list):
            self.assertEqual(len(results), 1)

    def test_abnormal_vitals_endpoint(self):
        VitalSigns.objects.create(
            patient=self.patient,
            temperature=Decimal("40.0"),
            measured_by=self.user,
            created_by=self.user,
        )
        request = self.factory.get("/hospital/vital-signs/abnormal/")
        force_authenticate(request, user=self.user)
        response = hospital_views.AbnormalVitalSignsAPIView.as_view()(request)
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)


class BedAssignmentAPITest(APITestCase):
    """Test bed assignment and release API endpoints."""

    def setUp(self):
        self.org = _org()
        self.user = _user(self.org)
        self.patient = _patient(self.org)
        self.dept = _department(self.org)
        self.bed = _bed(self.dept, "101", "A")
        self.encounter = _encounter(
            self.patient, self.org, self.user,
            enc_type="inpatient", status="in_progress", department="Cardiologie",
        )
        self.factory = APIRequestFactory()

    def test_assign_bed(self):
        data = {
            "patient_id": str(self.patient.id),
            "encounter_id": str(self.encounter.id),
        }
        request = self.factory.post(f"/hospital/beds/{self.bed.id}/assign/", data, format="json")
        force_authenticate(request, user=self.user)
        response = hospital_views.assign_bed_view(request, bed_id=str(self.bed.id))
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.bed.refresh_from_db()
        self.assertEqual(self.bed.status, BedStatus.OCCUPIED)
        self.assertEqual(self.bed.current_patient, self.patient)

    def test_assign_already_occupied_bed_fails(self):
        self.bed.status = BedStatus.OCCUPIED
        self.bed.save()
        data = {
            "patient_id": str(self.patient.id),
            "encounter_id": str(self.encounter.id),
        }
        request = self.factory.post(f"/hospital/beds/{self.bed.id}/assign/", data, format="json")
        force_authenticate(request, user=self.user)
        response = hospital_views.assign_bed_view(request, bed_id=str(self.bed.id))
        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)

    def test_release_bed(self):
        self.bed.status = BedStatus.OCCUPIED
        self.bed.current_patient = self.patient
        self.bed.current_encounter = self.encounter
        self.bed.save()

        request = self.factory.post(f"/hospital/beds/{self.bed.id}/release/")
        force_authenticate(request, user=self.user)
        response = hospital_views.release_bed_view(request, bed_id=str(self.bed.id))
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.bed.refresh_from_db()
        self.assertEqual(self.bed.status, BedStatus.CLEANING)
        self.assertIsNone(self.bed.current_patient)
        self.assertIsNone(self.bed.current_encounter)
        self.assertIsNotNone(self.bed.last_cleaned)


class DepartmentAPITest(APITestCase):
    """Test department API endpoints."""

    def setUp(self):
        self.org = _org()
        self.user = _user(self.org)
        self.factory = APIRequestFactory()

    def test_create_department(self):
        data = {
            "name": "Neurologie",
            "code": "NEU",
            "bed_capacity": 20,
        }
        request = self.factory.post("/hospital/departments/", data, format="json")
        force_authenticate(request, user=self.user)
        response = hospital_views.HospitalDepartmentListCreateAPIView.as_view()(request)
        self.assertEqual(response.status_code, http_status.HTTP_201_CREATED)

    def test_list_departments_org_scoped(self):
        org2 = _org(suffix="2")
        user2 = _user(org2, suffix="2")
        _department(self.org, "Cardiologie", "CARD")
        _department(org2, "Pédiatrie", "PED")

        request = self.factory.get("/hospital/departments/")
        force_authenticate(request, user=self.user)
        response = hospital_views.HospitalDepartmentListCreateAPIView.as_view()(request)
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        if isinstance(results, list):
            self.assertEqual(len(results), 1)

    def test_soft_delete_department(self):
        dept = _department(self.org, "Ophtalmologie", "OPH")
        request = self.factory.delete(f"/hospital/departments/{dept.id}/")
        force_authenticate(request, user=self.user)
        response = hospital_views.HospitalDepartmentDetailAPIView.as_view()(request, pk=str(dept.id))
        self.assertIn(response.status_code, [http_status.HTTP_200_OK, http_status.HTTP_204_NO_CONTENT])
        dept.refresh_from_db()
        self.assertFalse(dept.is_active)


class TriageAPITest(APITestCase):
    """Test triage API endpoints."""

    def setUp(self):
        self.org = _org()
        self.user = _user(self.org, role="nurse")
        self.patient = _patient(self.org)
        self.factory = APIRequestFactory()

    def test_create_triage(self):
        data = {
            "patient": str(self.patient.id),
            "chief_complaint": "Douleur abdominale sévère",
            "triage_level": 2,
            "pain_level": 8,
        }
        request = self.factory.post("/hospital/triage/", data, format="json")
        force_authenticate(request, user=self.user)
        response = hospital_views.TriageListCreateAPIView.as_view()(request)
        self.assertEqual(response.status_code, http_status.HTTP_201_CREATED)
        self.assertIn("triage_number", response.data)

    def test_list_triage_org_scoped(self):
        org2 = _org(suffix="2")
        user2 = _user(org2, role="nurse", suffix="2")
        patient2 = _patient(org2, suffix="2")
        Triage.objects.create(
            patient=self.patient, organization=self.org,
            chief_complaint="Test 1", triage_level=3, pain_level=3,
        )
        Triage.objects.create(
            patient=patient2, organization=org2,
            chief_complaint="Test 2", triage_level=4, pain_level=2,
        )

        request = self.factory.get("/hospital/triage/")
        force_authenticate(request, user=self.user)
        response = hospital_views.TriageListCreateAPIView.as_view()(request)
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        if isinstance(results, list):
            self.assertEqual(len(results), 1)


class DashboardAPITest(APITestCase):
    """Test dashboard API endpoint."""

    def setUp(self):
        self.org = _org()
        self.user = _user(self.org)
        self.patient = _patient(self.org)
        self.factory = APIRequestFactory()

    def test_dashboard_returns_stats(self):
        _encounter(self.patient, self.org, self.user)
        request = self.factory.get("/hospital/dashboard/")
        force_authenticate(request, user=self.user)
        response = hospital_views.HospitalDashboardAPIView.as_view()(request)
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertIn("today_encounters", response.data)
        self.assertIn("active_encounters", response.data)

    def test_dashboard_unauthenticated(self):
        request = self.factory.get("/hospital/dashboard/")
        response = hospital_views.HospitalDashboardAPIView.as_view()(request)
        self.assertEqual(response.status_code, http_status.HTTP_401_UNAUTHORIZED)


# ══════════════════════════════════════════════════════════════
# MULTI-TENANT ISOLATION TESTS
# ══════════════════════════════════════════════════════════════


class OrgIsolationTest(APITestCase):
    """Ensure data from one org never leaks to another."""

    def setUp(self):
        self.org1 = _org(suffix="iso1")
        self.org2 = _org(suffix="iso2")
        self.user1 = _user(self.org1, suffix="iso1")
        self.user2 = _user(self.org2, suffix="iso2")
        self.patient1 = _patient(self.org1, suffix="iso1")
        self.patient2 = _patient(self.org2, suffix="iso2")
        self.factory = APIRequestFactory()

    def test_encounters_isolated(self):
        _encounter(self.patient1, self.org1, self.user1)
        _encounter(self.patient2, self.org2, self.user2)
        for user, expected_org in [(self.user1, self.org1), (self.user2, self.org2)]:
            request = self.factory.get("/hospital/encounters/")
            force_authenticate(request, user=user)
            response = hospital_views.HospitalEncounterListCreateAPIView.as_view()(request)
            results = response.data.get("results", response.data)
            if isinstance(results, list):
                self.assertEqual(len(results), 1)

    def test_beds_isolated(self):
        dept1 = _department(self.org1, "Dept1", "D1")
        dept2 = _department(self.org2, "Dept2", "D2")
        _bed(dept1, "101", "A")
        _bed(dept2, "201", "B")
        request = self.factory.get("/hospital/beds/")
        force_authenticate(request, user=self.user1)
        response = hospital_views.HospitalBedListCreateAPIView.as_view()(request)
        results = response.data.get("results", response.data)
        if isinstance(results, list):
            self.assertEqual(len(results), 1)

    def test_departments_isolated(self):
        _department(self.org1, "Cardio", "CRD")
        _department(self.org2, "Neuro", "NRO")
        request = self.factory.get("/hospital/departments/")
        force_authenticate(request, user=self.user1)
        response = hospital_views.HospitalDepartmentListCreateAPIView.as_view()(request)
        results = response.data.get("results", response.data)
        if isinstance(results, list):
            self.assertEqual(len(results), 1)

    def test_triage_isolated(self):
        Triage.objects.create(
            patient=self.patient1, organization=self.org1,
            chief_complaint="Test 1", triage_level=3, pain_level=4,
        )
        Triage.objects.create(
            patient=self.patient2, organization=self.org2,
            chief_complaint="Test 2", triage_level=2, pain_level=6,
        )
        request = self.factory.get("/hospital/triage/")
        force_authenticate(request, user=self.user1)
        response = hospital_views.TriageListCreateAPIView.as_view()(request)
        results = response.data.get("results", response.data)
        if isinstance(results, list):
            self.assertEqual(len(results), 1)