"""
Unit tests for the Prescriptions module — edge cases and critical flows.
Covers: dispensing validation, over-dispensing prevention, stock checking,
auto-expiration, org isolation, field aliasing, status transitions.
"""
from decimal import Decimal
from datetime import date, timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.organizations.models import Organization
from apps.patients.models import Patient
from apps.inventory.models import Product, InventoryItem, InventoryBatch
from apps.prescriptions.models import Prescription, PrescriptionItem


# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

def _org(suffix="1"):
    return Organization.objects.create(
        name=f"Pharmacie Rx {suffix}",
        type="pharmacy",
        registration_number=f"RX-REG-{suffix}-{timezone.now().timestamp()}",
        address="789 Rue Prescription",
        city="Lubumbashi",
        phone=f"+243850000{suffix.zfill(3)}",
        email=f"rx{suffix}@test.cd",
        director_name="Dr Prescripteur",
    )


def _user(org, suffix="1", role="pharmacist"):
    return User.objects.create_user(
        phone=f"+243860000{suffix.zfill(3)}",
        password="testpass123",
        first_name="Rx",
        last_name=f"User{suffix}",
        primary_role=role,
        organization=org,
    )


def _patient(suffix="1"):
    return Patient.objects.create(
        first_name=f"Patient{suffix}",
        last_name="TestRx",
        date_of_birth=date(1990, 1, 15),
        gender="male",
        patient_number=f"PAT-RX-{suffix}-{timezone.now().timestamp()}",
    )


def _product(org, name="Paracétamol 500mg", sku=None, price="300.00", cost="150.00"):
    sku = sku or f"RX-{name[:4]}-{timezone.now().timestamp()}"
    return Product.objects.create(
        organization=org,
        name=name,
        sku=sku,
        category="MEDICATION",
        dosage_form="TABLET",
        unit_of_measure="UNIT",
        selling_price=Decimal(price),
        cost_price=Decimal(cost),
    )


def _inventory(product, org, qty=100):
    return InventoryItem.objects.create(
        product=product,
        organization=org,
        facility_id="pharmacy-main",
        quantity_on_hand=qty,
        average_cost=product.cost_price or Decimal("0"),
    )


def _batch(inv_item, qty=50, expiry_days=180, batch_number=None):
    batch_number = batch_number or f"BRX-{timezone.now().timestamp()}"
    return InventoryBatch.objects.create(
        inventory_item=inv_item,
        batch_number=batch_number,
        received_date=date.today(),
        expiry_date=date.today() + timedelta(days=expiry_days),
        initial_quantity=qty,
        current_quantity=qty,
        unit_cost=inv_item.average_cost,
        status="AVAILABLE",
    )


def _prescription(org, doctor, patient, days_valid=30, status="pending"):
    return Prescription.objects.create(
        organization=org,
        doctor=doctor,
        patient=patient,
        created_by=doctor,
        prescription_number=f"RX-{timezone.now().timestamp()}",
        date=date.today(),
        valid_until=date.today() + timedelta(days=days_valid),
        status=status,
        facility_id="pharmacy-main",
    )


def _rx_item(prescription, product=None, qty=10, created_by=None):
    return PrescriptionItem.objects.create(
        prescription=prescription,
        medication_name=product.name if product else "Generic Med",
        dosage="500mg",
        frequency="3x/day",
        duration="7 days",
        quantity=qty,
        quantity_remaining=qty,
        route="ORAL",
        product=product,
        created_by=created_by or prescription.doctor,
    )


# ──────────────────────────────────────────────────────────────
# PRESCRIPTION MODEL — status transitions
# ──────────────────────────────────────────────────────────────

class PrescriptionModelTests(TestCase):
    """Core model behavior for Prescription."""

    def setUp(self):
        self.org = _org("pm1")
        self.doctor = _user(self.org, suffix="pmd", role="doctor")
        self.patient = _patient("pm1")

    def test_default_status_is_pending(self):
        rx = _prescription(self.org, self.doctor, self.patient)
        self.assertEqual(rx.status, "pending")

    def test_total_items_tracking(self):
        rx = _prescription(self.org, self.doctor, self.patient)
        prod = _product(self.org, sku="PM-1")
        _rx_item(rx, prod, qty=10)
        _rx_item(rx, qty=20)
        self.assertEqual(rx.items.count(), 2)

    def test_prescription_number_unique(self):
        rx1 = _prescription(self.org, self.doctor, self.patient)
        with self.assertRaises(Exception):
            Prescription.objects.create(
                organization=self.org,
                doctor=self.doctor,
                patient=self.patient,
                created_by=self.doctor,
                prescription_number=rx1.prescription_number,
                date=date.today(),
                facility_id="pharmacy-main",
            )


# ──────────────────────────────────────────────────────────────
# PRESCRIPTION ITEM — quantity validation
# ──────────────────────────────────────────────────────────────

class PrescriptionItemTests(TestCase):
    """PrescriptionItem quantity and status edge cases."""

    def setUp(self):
        self.org = _org("pi1")
        self.doctor = _user(self.org, suffix="pid", role="doctor")
        self.patient = _patient("pi1")
        self.rx = _prescription(self.org, self.doctor, self.patient)
        self.prod = _product(self.org, sku="PI-1")

    def test_quantity_remaining_set_on_create(self):
        item = _rx_item(self.rx, self.prod, qty=20)
        self.assertEqual(item.quantity_remaining, 20)

    def test_status_defaults_to_pending(self):
        item = _rx_item(self.rx, self.prod, qty=10)
        self.assertEqual(item.status, "pending")


# ──────────────────────────────────────────────────────────────
# DISPENSING — API edge cases
# ──────────────────────────────────────────────────────────────

class DispensingAPITests(APITestCase):
    """Tests for dispense_prescription_view."""

    def setUp(self):
        self.org = _org("ds1")
        self.pharmacist = _user(self.org, suffix="dsp", role="pharmacist")
        self.doctor = _user(self.org, suffix="dsd", role="doctor")
        self.patient = _patient("ds1")
        self.prod = _product(self.org, sku="DS-1")
        self.inv = _inventory(self.prod, self.org, qty=100)
        self.batch = _batch(self.inv, qty=100, batch_number="DS-BATCH")
        self.client.force_authenticate(user=self.pharmacist)

    def _create_rx_with_item(self, qty=10):
        rx = _prescription(self.org, self.doctor, self.patient)
        item = _rx_item(rx, self.prod, qty=qty, created_by=self.doctor)
        return rx, item

    def test_dispense_full_quantity(self):
        rx, item = self._create_rx_with_item(qty=10)
        resp = self.client.post(
            f"/api/v1/prescriptions/{rx.id}/dispense/",
            {"items": [{"item_id": str(item.id), "quantity_to_dispense": 10}]},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        item.refresh_from_db()
        self.assertEqual(item.quantity_dispensed, 10)
        self.assertEqual(item.status, "fully_dispensed")

    def test_dispense_partial_quantity(self):
        rx, item = self._create_rx_with_item(qty=20)
        resp = self.client.post(
            f"/api/v1/prescriptions/{rx.id}/dispense/",
            {"items": [{"item_id": str(item.id), "quantity_to_dispense": 5}]},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        item.refresh_from_db()
        self.assertEqual(item.quantity_dispensed, 5)
        self.assertEqual(item.status, "partially_dispensed")

    def test_over_dispensing_rejected(self):
        rx, item = self._create_rx_with_item(qty=10)
        resp = self.client.post(
            f"/api/v1/prescriptions/{rx.id}/dispense/",
            {"items": [{"item_id": str(item.id), "quantity_to_dispense": 15}]},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_dispense_zero_quantity_rejected(self):
        rx, item = self._create_rx_with_item(qty=10)
        resp = self.client.post(
            f"/api/v1/prescriptions/{rx.id}/dispense/",
            {"items": [{"item_id": str(item.id), "quantity_to_dispense": 0}]},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_dispense_negative_quantity_rejected(self):
        rx, item = self._create_rx_with_item(qty=10)
        resp = self.client.post(
            f"/api/v1/prescriptions/{rx.id}/dispense/",
            {"items": [{"item_id": str(item.id), "quantity_to_dispense": -5}]},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_dispense_empty_items_rejected(self):
        rx, _ = self._create_rx_with_item(qty=10)
        resp = self.client.post(
            f"/api/v1/prescriptions/{rx.id}/dispense/",
            {"items": []},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_dispense_insufficient_stock_rejected(self):
        """Product has stock < quantity_to_dispense."""
        prod2 = _product(self.org, name="Scarce Med", sku="DS-SCARCE")
        inv2 = _inventory(prod2, self.org, qty=2)
        _batch(inv2, qty=2, batch_number="DS-SCARCE-B")
        rx = _prescription(self.org, self.doctor, self.patient)
        item = _rx_item(rx, prod2, qty=50, created_by=self.doctor)
        resp = self.client.post(
            f"/api/v1/prescriptions/{rx.id}/dispense/",
            {"items": [{"item_id": str(item.id), "quantity_to_dispense": 50}]},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_dispense_already_fully_dispensed_rejected(self):
        """Cannot dispense an already fully-dispensed item."""
        rx, item = self._create_rx_with_item(qty=5)
        # First dispense — full
        self.client.post(
            f"/api/v1/prescriptions/{rx.id}/dispense/",
            {"items": [{"item_id": str(item.id), "quantity_to_dispense": 5}]},
            format="json",
        )
        # Second attempt
        resp = self.client.post(
            f"/api/v1/prescriptions/{rx.id}/dispense/",
            {"items": [{"item_id": str(item.id), "quantity_to_dispense": 1}]},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)


# ──────────────────────────────────────────────────────────────
# AUTO-EXPIRATION — report view side-effect
# ──────────────────────────────────────────────────────────────

class AutoExpirationTests(APITestCase):
    """expired_prescriptions_view auto-expires past-due RXs."""

    def setUp(self):
        self.org = _org("ae1")
        self.pharmacist = _user(self.org, suffix="aep", role="pharmacist")
        self.doctor = _user(self.org, suffix="aed", role="doctor")
        self.patient = _patient("ae1")
        self.client.force_authenticate(user=self.pharmacist)

    def test_pending_rx_past_valid_until_gets_expired(self):
        rx = _prescription(self.org, self.doctor, self.patient, days_valid=-5)
        resp = self.client.get("/api/v1/prescriptions/reports/expired/")
        self.assertEqual(resp.status_code, 200)
        rx.refresh_from_db()
        self.assertEqual(rx.status, "expired")

    def test_partially_dispensed_rx_past_valid_until_gets_expired(self):
        rx = _prescription(
            self.org, self.doctor, self.patient, days_valid=-1
        )
        rx.status = "partially_dispensed"
        rx.save()
        resp = self.client.get("/api/v1/prescriptions/reports/expired/")
        self.assertEqual(resp.status_code, 200)
        rx.refresh_from_db()
        self.assertEqual(rx.status, "expired")

    def test_already_expired_rx_stays_expired(self):
        rx = _prescription(
            self.org, self.doctor, self.patient, days_valid=-10
        )
        rx.status = "expired"
        rx.save()
        resp = self.client.get("/api/v1/prescriptions/reports/expired/")
        self.assertEqual(resp.status_code, 200)
        rx.refresh_from_db()
        self.assertEqual(rx.status, "expired")

    def test_future_valid_until_not_expired(self):
        rx = _prescription(self.org, self.doctor, self.patient, days_valid=30)
        resp = self.client.get("/api/v1/prescriptions/reports/expired/")
        self.assertEqual(resp.status_code, 200)
        rx.refresh_from_db()
        self.assertEqual(rx.status, "pending")  # Still pending


# ──────────────────────────────────────────────────────────────
# MULTI-TENANT — prescription isolation
# ──────────────────────────────────────────────────────────────

class PrescriptionMultiTenantTests(APITestCase):
    """Org A can't see org B's prescriptions."""

    def setUp(self):
        self.org_a = _org("mta")
        self.org_b = _org("mtb")
        self.user_a = _user(self.org_a, suffix="mta")
        self.user_b = _user(self.org_b, suffix="mtb")
        self.doc_a = _user(self.org_a, suffix="mda", role="doctor")
        self.doc_b = _user(self.org_b, suffix="mdb", role="doctor")
        self.patient = _patient("mt1")
        self.rx_a = _prescription(self.org_a, self.doc_a, self.patient)
        self.rx_b = _prescription(self.org_b, self.doc_b, self.patient)

    def test_user_a_only_sees_own_prescriptions(self):
        self.client.force_authenticate(user=self.user_a)
        resp = self.client.get("/api/v1/prescriptions/")
        self.assertEqual(resp.status_code, 200)
        results = resp.data.get("results", resp.data)
        rx_ids = [str(r["id"]) for r in results]
        self.assertIn(str(self.rx_a.id), rx_ids)
        self.assertNotIn(str(self.rx_b.id), rx_ids)

    def test_user_b_cannot_see_rx_a_detail(self):
        self.client.force_authenticate(user=self.user_b)
        resp = self.client.get(f"/api/v1/prescriptions/{self.rx_a.id}/")
        self.assertEqual(resp.status_code, 404)


# ──────────────────────────────────────────────────────────────
# CANCEL / COMPLETE — status management
# ──────────────────────────────────────────────────────────────

class PrescriptionStatusManagementTests(APITestCase):
    """Tests for cancel and complete endpoints."""

    def setUp(self):
        self.org = _org("csm1")
        self.pharmacist = _user(self.org, suffix="csm")
        self.doctor = _user(self.org, suffix="cmd", role="doctor")
        self.patient = _patient("csm1")
        self.client.force_authenticate(user=self.pharmacist)

    def test_cancel_pending_prescription(self):
        rx = _prescription(self.org, self.doctor, self.patient)
        resp = self.client.post(f"/api/v1/prescriptions/{rx.id}/cancel/")
        self.assertIn(resp.status_code, [200, 204])
        rx.refresh_from_db()
        self.assertEqual(rx.status, "cancelled")

    def test_cancel_already_completed_fails(self):
        rx = _prescription(self.org, self.doctor, self.patient, status="fully_dispensed")
        resp = self.client.post(f"/api/v1/prescriptions/{rx.id}/cancel/")
        self.assertEqual(resp.status_code, 400)


# ──────────────────────────────────────────────────────────────
# PRESCRIPTION REPORTS — stats
# ──────────────────────────────────────────────────────────────

class PrescriptionReportTests(APITestCase):
    """Tests for prescription report endpoints."""

    def setUp(self):
        self.org = _org("rp1")
        self.pharmacist = _user(self.org, suffix="rp1")
        self.doctor = _user(self.org, suffix="rpd", role="doctor")
        self.patient = _patient("rp1")
        self.client.force_authenticate(user=self.pharmacist)

    def test_pending_prescriptions_report(self):
        _prescription(self.org, self.doctor, self.patient)
        resp = self.client.get("/api/v1/prescriptions/reports/pending/")
        self.assertEqual(resp.status_code, 200)
        self.assertGreaterEqual(resp.data["count"], 1)

    def test_stats_report_structure(self):
        _prescription(self.org, self.doctor, self.patient)
        resp = self.client.get("/api/v1/prescriptions/reports/stats/")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("total_prescriptions", resp.data)


# ──────────────────────────────────────────────────────────────
# CREATE via API — field validation
# ──────────────────────────────────────────────────────────────

class PrescriptionCreateAPITests(APITestCase):
    """Tests for creating prescriptions via the API."""

    def setUp(self):
        self.org = _org("cr1")
        self.doctor = _user(self.org, suffix="crd", role="doctor")
        self.patient = _patient("cr1")
        self.prod = _product(self.org, sku="CR-1")
        self.client.force_authenticate(user=self.doctor)

    def test_create_prescription_with_items(self):
        payload = {
            "patient": str(self.patient.id),
            "doctor": str(self.doctor.id),
            "date": str(date.today()),
            "valid_until": str(date.today() + timedelta(days=30)),
            "diagnosis": "Headache",
            "items": [
                {
                    "medication_name": self.prod.name,
                    "dosage": "500mg",
                    "frequency": "3x/day",
                    "duration": "7 days",
                    "quantity": 21,
                    "route": "ORAL",
                    "product": str(self.prod.id),
                }
            ],
        }
        resp = self.client.post("/api/v1/prescriptions/", payload, format="json")
        self.assertIn(resp.status_code, [200, 201])
        self.assertEqual(resp.data["items"][0]["medication_name"], self.prod.name)

    def test_create_prescription_without_items_rejected(self):
        payload = {
            "patient": str(self.patient.id),
            "doctor": str(self.doctor.id),
            "date": str(date.today()),
            "items": [],
        }
        resp = self.client.post("/api/v1/prescriptions/", payload, format="json")
        self.assertEqual(resp.status_code, 400)
