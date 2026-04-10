"""
Unit tests for the Inventory module — edge cases and critical flows.
Covers: InventoryItem stock status calculation, batch expiry management,
product soft-delete, org isolation, alert auto-generation, price validators.
"""
from decimal import Decimal
from datetime import date, timedelta

from django.test import TestCase
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.organizations.models import Organization
from apps.inventory.models import (
    Product, InventoryItem, InventoryBatch, StockMovement, InventoryAlert,
)


# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

def _org(suffix="1"):
    return Organization.objects.create(
        name=f"Pharmacie Inv {suffix}",
        type="pharmacy",
        registration_number=f"INV-REG-{suffix}-{timezone.now().timestamp()}",
        address="456 Rue Inventaire",
        city="Lubumbashi",
        phone=f"+243830000{suffix.zfill(3)}",
        email=f"inv{suffix}@test.cd",
        director_name="Dr Inventaire",
    )


def _user(org, suffix="1"):
    return User.objects.create_user(
        phone=f"+243840000{suffix.zfill(3)}",
        password="testpass123",
        first_name="Inv",
        last_name=f"User{suffix}",
        primary_role="inventory_manager",
        organization=org,
    )


def _product(org, name="Amoxicilline 250mg", sku=None, price="800.00",
             cost="500.00", min_stock=10, max_stock=200):
    sku = sku or f"INV-{name[:4]}-{timezone.now().timestamp()}"
    return Product.objects.create(
        organization=org,
        name=name,
        sku=sku,
        category="MEDICATION",
        dosage_form="CAPSULE",
        unit_of_measure="UNIT",
        selling_price=Decimal(price),
        cost_price=Decimal(cost),
        min_stock_level=min_stock,
        max_stock_level=max_stock,
    )


def _inventory(product, org, qty=50, facility="pharmacy-main"):
    return InventoryItem.objects.create(
        product=product,
        organization=org,
        facility_id=facility,
        quantity_on_hand=qty,
        average_cost=product.cost_price or Decimal("0"),
    )


def _batch(inv_item, qty=20, expiry_days=90, batch_number=None, status="AVAILABLE"):
    expiry = date.today() + timedelta(days=expiry_days)
    batch_number = batch_number or f"B-{timezone.now().timestamp()}"
    return InventoryBatch.objects.create(
        inventory_item=inv_item,
        batch_number=batch_number,
        received_date=date.today(),
        expiry_date=expiry,
        initial_quantity=qty,
        current_quantity=qty,
        unit_cost=inv_item.average_cost,
        status=status,
    )


# ──────────────────────────────────────────────────────────────
# INVENTORY ITEM — stock status calculation
# ──────────────────────────────────────────────────────────────

class InventoryItemStockStatusTests(TestCase):
    """InventoryItem.save() should auto-compute stock_status."""

    def setUp(self):
        self.org = _org("is1")
        self.product = _product(self.org, min_stock=10, max_stock=200)

    def test_out_of_stock_when_zero(self):
        inv = _inventory(self.product, self.org, qty=0)
        self.assertEqual(inv.stock_status, "OUT_OF_STOCK")

    def test_out_of_stock_when_negative(self):
        inv = _inventory(self.product, self.org, qty=-5)
        self.assertEqual(inv.stock_status, "OUT_OF_STOCK")

    def test_low_stock_at_threshold(self):
        inv = _inventory(self.product, self.org, qty=10)
        self.assertEqual(inv.stock_status, "LOW_STOCK")

    def test_low_stock_below_threshold(self):
        inv = _inventory(self.product, self.org, qty=5)
        self.assertEqual(inv.stock_status, "LOW_STOCK")

    def test_in_stock_normal(self):
        inv = _inventory(self.product, self.org, qty=50)
        self.assertEqual(inv.stock_status, "IN_STOCK")

    def test_over_stock(self):
        inv = _inventory(self.product, self.org, qty=200)
        self.assertEqual(inv.stock_status, "OVER_STOCK")

    def test_discontinued_status(self):
        self.product.is_discontinued = True
        self.product.save()
        inv = _inventory(self.product, self.org, qty=50)
        self.assertEqual(inv.stock_status, "DISCONTINUED")

    def test_quantity_available_calculated(self):
        inv = InventoryItem.objects.create(
            product=self.product,
            organization=self.org,
            facility_id="pharmacy-main",
            quantity_on_hand=100,
            quantity_reserved=30,
            average_cost=Decimal("500.00"),
        )
        self.assertEqual(inv.quantity_available, 70)

    def test_quantity_available_never_negative(self):
        inv = InventoryItem.objects.create(
            product=self.product,
            organization=self.org,
            facility_id="pharmacy-main",
            quantity_on_hand=10,
            quantity_reserved=50,
            average_cost=Decimal("500.00"),
        )
        self.assertEqual(inv.quantity_available, 0)  # max(0, 10-50)

    def test_total_value_calculated(self):
        inv = _inventory(self.product, self.org, qty=20)
        self.assertEqual(inv.total_value, Decimal("20") * Decimal("500.00"))


# ──────────────────────────────────────────────────────────────
# PRODUCT — validation edge cases
# ──────────────────────────────────────────────────────────────

class ProductValidationTests(TestCase):
    """Product model field validations."""

    def setUp(self):
        self.org = _org("pv1")

    def test_negative_cost_price_rejected(self):
        p = Product(
            organization=self.org, name="Bad", sku="BAD-1",
            category="MEDICATION", dosage_form="TABLET", unit_of_measure="UNIT",
            cost_price=Decimal("-10.00"), selling_price=Decimal("100.00"),
        )
        with self.assertRaises(ValidationError):
            p.full_clean()

    def test_negative_selling_price_rejected(self):
        p = Product(
            organization=self.org, name="Bad2", sku="BAD-2",
            category="MEDICATION", dosage_form="TABLET", unit_of_measure="UNIT",
            cost_price=Decimal("50.00"), selling_price=Decimal("-5.00"),
        )
        with self.assertRaises(ValidationError):
            p.full_clean()

    def test_zero_prices_allowed(self):
        p = Product(
            organization=self.org, name="Free Sample", sku="FREE-1",
            category="MEDICATION", dosage_form="TABLET", unit_of_measure="UNIT",
            cost_price=Decimal("0.00"), selling_price=Decimal("0.00"),
        )
        p.full_clean()  # Should not raise

    def test_duplicate_sku_same_org_rejected(self):
        _product(self.org, sku="DUP-SKU")
        with self.assertRaises(Exception):
            _product(self.org, name="Other", sku="DUP-SKU")

    def test_same_sku_different_org_allowed(self):
        org2 = _org("pv2")
        _product(self.org, sku="SHARED-SKU")
        p2 = _product(org2, sku="SHARED-SKU")  # Should not raise
        self.assertIsNotNone(p2.id)


# ──────────────────────────────────────────────────────────────
# PRODUCT SOFT DELETE — via API
# ──────────────────────────────────────────────────────────────

class ProductSoftDeleteTests(APITestCase):
    """ProductDetailAPIView.perform_destroy soft-deletes."""

    def setUp(self):
        self.org = _org("sd1")
        self.user = _user(self.org, suffix="sd1")
        self.client.force_authenticate(user=self.user)

    def test_delete_with_no_stock_soft_deletes(self):
        product = _product(self.org, sku="SD-1")
        inv = _inventory(product, self.org, qty=0)
        resp = self.client.delete(f"/api/v1/inventory/products/{product.id}/")
        self.assertIn(resp.status_code, [200, 204])
        product.refresh_from_db()
        self.assertFalse(product.is_active)
        self.assertTrue(product.is_discontinued)

    def test_delete_with_active_stock_rejected(self):
        product = _product(self.org, sku="SD-2")
        inv = _inventory(product, self.org, qty=50)
        resp = self.client.delete(f"/api/v1/inventory/products/{product.id}/")
        self.assertEqual(resp.status_code, 400)
        product.refresh_from_db()
        self.assertTrue(product.is_active)  # Still active


# ──────────────────────────────────────────────────────────────
# MULTI-TENANT — product/inventory isolation
# ──────────────────────────────────────────────────────────────

class InventoryMultiTenantTests(APITestCase):
    """Org A can't see org B's products or stock movements."""

    def setUp(self):
        self.org_a = _org("ia")
        self.org_b = _org("ib")
        self.user_a = _user(self.org_a, suffix="ia")
        self.user_b = _user(self.org_b, suffix="ib")
        self.prod_a = _product(self.org_a, sku="PROD-A")
        self.prod_b = _product(self.org_b, sku="PROD-B")

    def test_user_a_only_sees_own_products(self):
        self.client.force_authenticate(user=self.user_a)
        resp = self.client.get("/api/v1/inventory/products/")
        self.assertEqual(resp.status_code, 200)
        results = resp.data.get("results", resp.data)
        skus = [p["sku"] for p in results]
        self.assertIn("PROD-A", skus)
        self.assertNotIn("PROD-B", skus)

    def test_user_b_cannot_see_prod_a_detail(self):
        self.client.force_authenticate(user=self.user_b)
        resp = self.client.get(f"/api/v1/inventory/products/{self.prod_a.id}/")
        self.assertEqual(resp.status_code, 404)


# ──────────────────────────────────────────────────────────────
# STOCK MOVEMENT — edge cases
# ──────────────────────────────────────────────────────────────

class StockMovementTests(TestCase):
    """StockMovement model edge cases."""

    def setUp(self):
        self.org = _org("sm1")
        self.user = _user(self.org, suffix="sm1")
        self.product = _product(self.org)
        self.inv = _inventory(self.product, self.org, qty=100)

    def test_movement_preserves_balance_snapshot(self):
        mv = StockMovement.objects.create(
            inventory_item=self.inv,
            movement_type="SALE",
            direction="OUT",
            quantity=10,
            balance_before=100,
            balance_after=90,
            movement_date=timezone.now(),
            performed_by=self.user,
        )
        self.assertEqual(mv.balance_before, 100)
        self.assertEqual(mv.balance_after, 90)

    def test_movement_in_direction(self):
        mv = StockMovement.objects.create(
            inventory_item=self.inv,
            movement_type="PURCHASE_RECEIPT",
            direction="IN",
            quantity=50,
            balance_before=100,
            balance_after=150,
            movement_date=timezone.now(),
            performed_by=self.user,
        )
        self.assertEqual(mv.direction, "IN")
        self.assertEqual(mv.quantity, 50)


# ──────────────────────────────────────────────────────────────
# BATCH — expiry edge cases
# ──────────────────────────────────────────────────────────────

class InventoryBatchTests(TestCase):
    """InventoryBatch edge cases: expiry, quantity, status."""

    def setUp(self):
        self.org = _org("bt1")
        self.product = _product(self.org)
        self.inv = _inventory(self.product, self.org, qty=100)

    def test_batch_with_past_expiry(self):
        batch = _batch(self.inv, qty=10, expiry_days=-30, batch_number="EXP-OLD")
        self.assertTrue(batch.expiry_date < date.today())

    def test_batch_zero_quantity_stays_available(self):
        """Batch with 0 qty but AVAILABLE status — edge case."""
        batch = _batch(self.inv, qty=0, batch_number="ZERO-QTY")
        batch.current_quantity = 0
        batch.save()
        self.assertEqual(batch.status, "AVAILABLE")  # model doesn't auto-update

    def test_batch_reserved_can_exceed_current(self):
        """Edge case: reserved > current (should be prevented by app logic)."""
        batch = _batch(self.inv, qty=10, batch_number="OVER-RES")
        batch.reserved_quantity = 20
        batch.save()  # No model-level constraint, but app should prevent this
        self.assertEqual(batch.reserved_quantity, 20)

    def test_multiple_batches_same_product(self):
        b1 = _batch(self.inv, qty=10, batch_number="MULTI-1")
        b2 = _batch(self.inv, qty=20, batch_number="MULTI-2")
        b3 = _batch(self.inv, qty=30, batch_number="MULTI-3")
        self.assertEqual(self.inv.batches.count(), 3)


# ──────────────────────────────────────────────────────────────
# EXPIRING PRODUCTS REPORT — API
# ──────────────────────────────────────────────────────────────

class ExpiringProductsAPITests(APITestCase):
    """Tests for the expiring_products_view."""

    def setUp(self):
        self.org = _org("ep1")
        self.user = _user(self.org, suffix="ep1")
        self.product = _product(self.org, sku="EXP-PROD")
        self.inv = _inventory(self.product, self.org, qty=50)
        self.client.force_authenticate(user=self.user)

    def test_expiring_soon_batch_returned(self):
        _batch(self.inv, qty=10, expiry_days=15, batch_number="EXP-SOON")
        resp = self.client.get("/api/v1/inventory/expiring/", {"days": 30})
        self.assertEqual(resp.status_code, 200)
        self.assertGreaterEqual(resp.data["count"], 1)

    def test_far_future_batch_excluded(self):
        _batch(self.inv, qty=10, expiry_days=365, batch_number="FAR-FUTURE")
        resp = self.client.get("/api/v1/inventory/expiring/", {"days": 30})
        self.assertEqual(resp.status_code, 200)
        batch_numbers = [r["batch_number"] for r in resp.data.get("results", [])]
        self.assertNotIn("FAR-FUTURE", batch_numbers)

    def test_expired_batch_with_scope_expired(self):
        _batch(self.inv, qty=10, expiry_days=-5, batch_number="ALREADY-EXP")
        resp = self.client.get("/api/v1/inventory/expiring/", {"scope": "expired"})
        self.assertEqual(resp.status_code, 200)
        batch_numbers = [r["batch_number"] for r in resp.data.get("results", [])]
        self.assertIn("ALREADY-EXP", batch_numbers)


# ──────────────────────────────────────────────────────────────
# INVENTORY STATS — API
# ──────────────────────────────────────────────────────────────

class InventoryStatsAPITests(APITestCase):
    """Tests for inventory_stats_view."""

    def setUp(self):
        self.org = _org("st1")
        self.user = _user(self.org, suffix="st1")
        self.client.force_authenticate(user=self.user)

        p1 = _product(self.org, name="Active", sku="ACT-1")
        p2 = _product(self.org, name="Out", sku="OUT-1")
        _inventory(p1, self.org, qty=50)
        _inventory(p2, self.org, qty=0)

    def test_stats_returns_counts(self):
        resp = self.client.get("/api/v1/inventory/stats/")
        self.assertEqual(resp.status_code, 200)
        self.assertGreaterEqual(resp.data["total_products"], 2)
        self.assertGreaterEqual(resp.data["out_of_stock_count"], 1)
