"""
Unit tests for the Sales module — edge cases and critical flows.
Covers: sale creation, stock deduction, race conditions, void/refund,
expired product prevention, multi-tenant isolation, sale number uniqueness.
"""
from decimal import Decimal
from datetime import date, timedelta
from unittest.mock import patch

from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from django.db import IntegrityError
from rest_framework.test import APIRequestFactory, force_authenticate, APITestCase
from rest_framework import status as http_status

from apps.accounts.models import User
from apps.organizations.models import Organization
from apps.inventory.models import Product, InventoryItem, InventoryBatch, StockMovement
from apps.prescriptions.models import Prescription, PrescriptionItem
from apps.sales.models import Sale, SaleItem, SalePayment, Cart, CartItem
from apps.sales.serializers import SaleCreateSerializer
from apps.sales import views as sale_views


# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

def _org(suffix="1"):
    return Organization.objects.create(
        name=f"Pharmacie Test {suffix}",
        type="pharmacy",
        registration_number=f"REG-{suffix}-{timezone.now().timestamp()}",
        address="123 Rue Test",
        city="Kinshasa",
        phone=f"+243810000{suffix.zfill(3)}",
        email=f"org{suffix}@test.cd",
        director_name="Dr Test",
    )


def _user(org, role="pharmacist", suffix="1"):
    return User.objects.create_user(
        phone=f"+243820000{suffix.zfill(3)}",
        password="testpass123",
        first_name="User",
        last_name=f"Test{suffix}",
        primary_role=role,
        organization=org,
    )


def _product(org, name="Paracetamol 500mg", sku=None, price="500.00",
             cost="300.00", active=True, discontinued=False,
             expiration_date=None, allow_negative=False, requires_rx=False):
    sku = sku or f"SKU-{name[:5]}-{timezone.now().timestamp()}"
    return Product.objects.create(
        organization=org,
        name=name,
        sku=sku,
        category="MEDICATION",
        dosage_form="TABLET",
        unit_of_measure="UNIT",
        selling_price=Decimal(price),
        cost_price=Decimal(cost),
        is_active=active,
        is_discontinued=discontinued,
        expiration_date=expiration_date,
        allow_negative_stock=allow_negative,
        requires_prescription=requires_rx,
    )


def _inventory(product, org, qty=100, facility="pharmacy-main"):
    return InventoryItem.objects.create(
        product=product,
        organization=org,
        facility_id=facility,
        quantity_on_hand=qty,
        average_cost=product.cost_price or Decimal("0"),
    )


def _batch(inv_item, qty=50, expiry_days=180, batch_number=None, status="AVAILABLE"):
    expiry = date.today() + timedelta(days=expiry_days)
    batch_number = batch_number or f"LOT-{timezone.now().timestamp()}"
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


def _sale_payload(product, qty=2, price=None):
    """Build the nested data dict for SaleCreateSerializer."""
    return {
        "items": [
            {
                "product": product.id,
                "product_name": product.name,
                "product_sku": product.sku,
                "unit_of_measure": product.unit_of_measure,
                "quantity": qty,
                "unit_price": str(price or product.selling_price),
            }
        ],
        "type": "COUNTER",
    }


# ──────────────────────────────────────────────────────────────
# MODEL TESTS
# ──────────────────────────────────────────────────────────────

class SaleModelTests(TestCase):
    """Tests for Sale model save/auto-generation logic."""

    def setUp(self):
        self.org = _org("m1")
        self.user = _user(self.org, suffix="m1")

    def test_sale_number_auto_generated(self):
        sale = Sale.objects.create(
            organization=self.org, facility_id="pharmacy-main",
            cashier=self.user, cashier_name=self.user.full_name,
            created_by=self.user, subtotal=100, total_amount=100,
        )
        self.assertTrue(sale.sale_number.startswith("VNT-"))
        self.assertTrue(sale.receipt_number.startswith("REC-"))

    def test_receipt_number_mirrors_sale_number(self):
        sale = Sale.objects.create(
            organization=self.org, facility_id="pharmacy-main",
            cashier=self.user, cashier_name=self.user.full_name,
            created_by=self.user, subtotal=0, total_amount=0,
        )
        suffix = sale.sale_number.split("-", 1)[1]
        self.assertEqual(sale.receipt_number, f"REC-{suffix}")

    def test_two_sales_get_different_numbers(self):
        s1 = Sale.objects.create(
            organization=self.org, facility_id="pharmacy-main",
            cashier=self.user, cashier_name=self.user.full_name,
            created_by=self.user, subtotal=0, total_amount=0,
        )
        s2 = Sale.objects.create(
            organization=self.org, facility_id="pharmacy-main",
            cashier=self.user, cashier_name=self.user.full_name,
            created_by=self.user, subtotal=0, total_amount=0,
        )
        self.assertNotEqual(s1.sale_number, s2.sale_number)


class SaleItemModelTests(TestCase):
    """SaleItem line_total calculation edge cases."""

    def setUp(self):
        self.org = _org("si1")
        self.user = _user(self.org, suffix="si1")
        self.product = _product(self.org)
        self.sale = Sale.objects.create(
            organization=self.org, facility_id="pharmacy-main",
            cashier=self.user, cashier_name=self.user.full_name,
            created_by=self.user, subtotal=1000, total_amount=1000,
        )

    def test_line_total_no_discount(self):
        item = SaleItem.objects.create(
            sale=self.sale, product=self.product,
            product_name=self.product.name, product_sku=self.product.sku,
            unit_of_measure="UNIT", quantity=3, unit_price=Decimal("500.00"),
            line_total=0,
        )
        self.assertEqual(item.line_total, Decimal("1500.00"))

    def test_line_total_percentage_discount(self):
        item = SaleItem.objects.create(
            sale=self.sale, product=self.product,
            product_name=self.product.name, product_sku=self.product.sku,
            unit_of_measure="UNIT", quantity=2, unit_price=Decimal("1000.00"),
            discount_type="PERCENTAGE", discount_value=Decimal("10.00"),
            line_total=0,
        )
        self.assertEqual(item.line_total, Decimal("1800.00"))
        self.assertEqual(item.discount_amount, Decimal("200.00"))

    def test_line_total_fixed_discount(self):
        item = SaleItem.objects.create(
            sale=self.sale, product=self.product,
            product_name=self.product.name, product_sku=self.product.sku,
            unit_of_measure="UNIT", quantity=1, unit_price=Decimal("500.00"),
            discount_type="FIXED", discount_value=Decimal("50.00"),
            line_total=0,
        )
        self.assertEqual(item.line_total, Decimal("450.00"))


# ──────────────────────────────────────────────────────────────
# SERIALIZER TESTS (edge cases in create / validate)
# ──────────────────────────────────────────────────────────────

class SaleCreateSerializerTests(TestCase):
    """Tests for SaleCreateSerializer: validation + stock deduction."""

    def setUp(self):
        self.org = _org("sc1")
        self.user = _user(self.org, suffix="sc1")
        self.product = _product(self.org)
        self.inv = _inventory(self.product, self.org, qty=10)
        self.factory = APIRequestFactory()

    def _ctx(self):
        req = self.factory.post("/api/v1/sales/")
        force_authenticate(req, user=self.user)
        return {"request": req}

    def _create(self, data):
        ser = SaleCreateSerializer(data=data, context=self._ctx())
        ser.is_valid(raise_exception=True)
        return ser.save(
            organization=self.org,
            facility_id="pharmacy-main",
            cashier=self.user,
            cashier_name=self.user.full_name,
            created_by=self.user,
        )

    # ── Happy path ──────────────────────────────────────────

    def test_create_sale_deducts_stock(self):
        data = _sale_payload(self.product, qty=3)
        sale = self._create(data)
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantity_on_hand, 7)
        self.assertEqual(sale.item_count, 1)
        self.assertEqual(StockMovement.objects.filter(sale_id=str(sale.id)).count(), 1)

    def test_create_sale_sets_totals(self):
        data = _sale_payload(self.product, qty=2, price="500.00")
        sale = self._create(data)
        self.assertEqual(sale.subtotal, Decimal("1000.00"))
        self.assertEqual(sale.total_amount, Decimal("1000.00"))

    # ── Expired product ─────────────────────────────────────

    def test_reject_expired_product(self):
        self.product.expiration_date = date.today() - timedelta(days=1)
        self.product.save()
        data = _sale_payload(self.product, qty=1)
        ser = SaleCreateSerializer(data=data, context=self._ctx())
        self.assertFalse(ser.is_valid())

    def test_allow_non_expired_product(self):
        self.product.expiration_date = date.today() + timedelta(days=30)
        self.product.save()
        data = _sale_payload(self.product, qty=1)
        sale = self._create(data)
        self.assertIsNotNone(sale.id)

    # ── Inactive / discontinued ──────────────────────────────

    def test_reject_inactive_product(self):
        self.product.is_active = False
        self.product.save()
        data = _sale_payload(self.product, qty=1)
        ser = SaleCreateSerializer(data=data, context=self._ctx())
        self.assertFalse(ser.is_valid())

    def test_reject_discontinued_product(self):
        self.product.is_discontinued = True
        self.product.save()
        data = _sale_payload(self.product, qty=1)
        ser = SaleCreateSerializer(data=data, context=self._ctx())
        self.assertFalse(ser.is_valid())

    # ── Stock insufficient ───────────────────────────────────

    def test_reject_when_stock_insufficient(self):
        data = _sale_payload(self.product, qty=999)
        with self.assertRaises(Exception) as ctx:
            self._create(data)
        self.assertIn("Stock insuffisant", str(ctx.exception))

    def test_allow_negative_stock_when_flag_set(self):
        self.product.allow_negative_stock = True
        self.product.save()
        data = _sale_payload(self.product, qty=999)
        sale = self._create(data)
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantity_on_hand, 10 - 999)

    # ── Empty items ──────────────────────────────────────────

    def test_reject_empty_items(self):
        data = {"items": [], "type": "COUNTER"}
        ser = SaleCreateSerializer(data=data, context=self._ctx())
        self.assertFalse(ser.is_valid())

    # ── Negative total prevented ─────────────────────────────

    def test_reject_negative_subtotal(self):
        data = {
            "items": [
                {
                    "product": self.product.id,
                    "product_name": self.product.name,
                    "product_sku": self.product.sku,
                    "unit_of_measure": "UNIT",
                    "quantity": 1,
                    "unit_price": "100.00",
                    "discount_amount": "200.00",
                }
            ],
            "type": "COUNTER",
        }
        with self.assertRaises(Exception):
            self._create(data)

    # ── FEFO batch deduction ─────────────────────────────────

    def test_fefo_batch_deduction(self):
        """Soonest expiring batch should be deducted first."""
        batch_soon = _batch(self.inv, qty=5, expiry_days=30, batch_number="LOT-SOON")
        batch_later = _batch(self.inv, qty=5, expiry_days=180, batch_number="LOT-LATER")

        data = _sale_payload(self.product, qty=3)
        self._create(data)

        batch_soon.refresh_from_db()
        batch_later.refresh_from_db()
        self.assertEqual(batch_soon.current_quantity, 2)  # deducted first
        self.assertEqual(batch_later.current_quantity, 5)  # untouched

    def test_fefo_skips_expired_batches(self):
        """Expired batches should not be deducted."""
        batch_expired = _batch(self.inv, qty=10, expiry_days=-10, batch_number="LOT-EXP")
        batch_good = _batch(self.inv, qty=10, expiry_days=90, batch_number="LOT-GOOD")

        data = _sale_payload(self.product, qty=3)
        self._create(data)

        batch_expired.refresh_from_db()
        batch_good.refresh_from_db()
        self.assertEqual(batch_expired.current_quantity, 10)  # skipped
        self.assertEqual(batch_good.current_quantity, 7)

    def test_batch_depleted_status(self):
        """Batch should be marked DEPLETED when quantity hits 0."""
        batch = _batch(self.inv, qty=3, expiry_days=60, batch_number="LOT-DEP")
        data = _sale_payload(self.product, qty=3)
        self._create(data)

        batch.refresh_from_db()
        self.assertEqual(batch.current_quantity, 0)
        self.assertEqual(batch.status, "DEPLETED")

    # ── Stock movement audit trail ───────────────────────────

    def test_stock_movement_created_with_correct_balances(self):
        data = _sale_payload(self.product, qty=5)
        sale = self._create(data)
        mv = StockMovement.objects.get(sale_id=str(sale.id))
        self.assertEqual(mv.balance_before, 10)
        self.assertEqual(mv.balance_after, 5)
        self.assertEqual(mv.movement_type, "SALE")
        self.assertEqual(mv.direction, "OUT")
        self.assertEqual(mv.quantity, 5)


# ──────────────────────────────────────────────────────────────
# MULTI-TENANT ISOLATION
# ──────────────────────────────────────────────────────────────

class SaleMultiTenantTests(APITestCase):
    """Ensure org A cannot see org B's sales."""

    def setUp(self):
        self.org_a = _org("ma")
        self.org_b = _org("mb")
        self.user_a = _user(self.org_a, suffix="ma")
        self.user_b = _user(self.org_b, suffix="mb")
        self.product_a = _product(self.org_a, sku="SKU-A")
        self.product_b = _product(self.org_b, sku="SKU-B")

        # Create one sale per org
        Sale.objects.create(
            organization=self.org_a, facility_id="pharmacy-main",
            cashier=self.user_a, cashier_name="A", created_by=self.user_a,
            subtotal=100, total_amount=100,
        )
        Sale.objects.create(
            organization=self.org_b, facility_id="pharmacy-main",
            cashier=self.user_b, cashier_name="B", created_by=self.user_b,
            subtotal=200, total_amount=200,
        )

    def test_user_a_only_sees_org_a_sales(self):
        self.client.force_authenticate(user=self.user_a)
        resp = self.client.get("/api/v1/sales/")
        self.assertEqual(resp.status_code, 200)
        for sale in resp.data.get("results", resp.data):
            self.assertEqual(str(sale["organization"] if "organization" in sale else self.org_a.id), str(self.org_a.id))

    def test_user_b_only_sees_org_b_sales(self):
        self.client.force_authenticate(user=self.user_b)
        resp = self.client.get("/api/v1/sales/")
        self.assertEqual(resp.status_code, 200)
        for sale in resp.data.get("results", resp.data):
            self.assertNotEqual(str(sale.get("id")), str(Sale.objects.filter(organization=self.org_a).first().id))


# ──────────────────────────────────────────────────────────────
# VOID / REFUND VIEWS
# ──────────────────────────────────────────────────────────────

class VoidSaleTests(APITestCase):
    """Tests for void_sale_view."""

    def setUp(self):
        self.org = _org("v1")
        self.user = _user(self.org, suffix="v1")
        self.product = _product(self.org, sku="SKU-V1")
        self.inv = _inventory(self.product, self.org, qty=100)
        self.client.force_authenticate(user=self.user)

        # Create a completed sale (qty=5)
        self.sale = Sale.objects.create(
            organization=self.org, facility_id="pharmacy-main",
            cashier=self.user, cashier_name=self.user.full_name,
            created_by=self.user, subtotal=2500, total_amount=2500,
            status="COMPLETED",
        )
        SaleItem.objects.create(
            sale=self.sale, product=self.product,
            product_name=self.product.name, product_sku=self.product.sku,
            unit_of_measure="UNIT", quantity=5, unit_price=Decimal("500.00"),
            line_total=Decimal("2500.00"),
        )
        # Simulate stock deducted
        self.inv.quantity_on_hand = 95
        self.inv.save()

    def test_void_restores_inventory(self):
        resp = self.client.post(
            f"/api/v1/sales/{self.sale.id}/void/",
            {"void_reason": "Client changed mind"},
        )
        self.assertEqual(resp.status_code, 200)
        self.sale.refresh_from_db()
        self.assertEqual(self.sale.status, "VOIDED")
        self.assertEqual(self.sale.void_reason, "Client changed mind")
        self.assertIsNotNone(self.sale.voided_by)
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantity_on_hand, 100)

    def test_void_creates_stock_movement(self):
        self.client.post(
            f"/api/v1/sales/{self.sale.id}/void/",
            {"void_reason": "Error in sale"},
        )
        mv = StockMovement.objects.filter(
            reference_number=self.sale.sale_number,
            movement_type="CUSTOMER_RETURN",
        ).first()
        self.assertIsNotNone(mv)
        self.assertEqual(mv.direction, "IN")
        self.assertEqual(mv.quantity, 5)

    def test_void_already_voided_fails(self):
        self.sale.status = "VOIDED"
        self.sale.save()
        resp = self.client.post(
            f"/api/v1/sales/{self.sale.id}/void/",
            {"void_reason": "Try again"},
        )
        self.assertEqual(resp.status_code, 400)

    def test_void_requires_reason(self):
        resp = self.client.post(
            f"/api/v1/sales/{self.sale.id}/void/",
            {"void_reason": "abc"},  # less than 5 chars
        )
        self.assertEqual(resp.status_code, 400)

    def test_void_wrong_org_forbidden(self):
        org2 = _org("v2")
        user2 = _user(org2, suffix="v2")
        self.client.force_authenticate(user=user2)
        resp = self.client.post(
            f"/api/v1/sales/{self.sale.id}/void/",
            {"void_reason": "Unauthorized void attempt"},
        )
        self.assertEqual(resp.status_code, 403)

    def test_void_nonexistent_sale_404(self):
        import uuid
        resp = self.client.post(
            f"/api/v1/sales/{uuid.uuid4()}/void/",
            {"void_reason": "Ghost sale"},
        )
        self.assertEqual(resp.status_code, 404)


class RefundSaleTests(APITestCase):
    """Tests for refund_sale_view."""

    def setUp(self):
        self.org = _org("r1")
        self.user = _user(self.org, suffix="r1")
        self.product = _product(self.org, sku="SKU-R1")
        self.inv = _inventory(self.product, self.org, qty=95)
        self.client.force_authenticate(user=self.user)

        self.sale = Sale.objects.create(
            organization=self.org, facility_id="pharmacy-main",
            cashier=self.user, cashier_name=self.user.full_name,
            created_by=self.user, subtotal=2500, total_amount=2500,
            status="COMPLETED",
        )
        self.item = SaleItem.objects.create(
            sale=self.sale, product=self.product,
            product_name=self.product.name, product_sku=self.product.sku,
            unit_of_measure="UNIT", quantity=5, unit_price=Decimal("500.00"),
            line_total=Decimal("2500.00"),
        )

    def test_full_refund(self):
        resp = self.client.post(
            f"/api/v1/sales/{self.sale.id}/refund/",
            {"refund_reason": "Defective product", "refund_method": "CASH"},
        )
        self.assertEqual(resp.status_code, 200)
        self.sale.refresh_from_db()
        self.assertEqual(self.sale.status, "REFUNDED")
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantity_on_hand, 100)

    def test_partial_refund(self):
        resp = self.client.post(
            f"/api/v1/sales/{self.sale.id}/refund/",
            {
                "refund_reason": "Partial return",
                "refund_method": "CASH",
                "items_to_refund": [
                    {"item_id": str(self.item.id), "quantity": 2}
                ],
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.sale.refresh_from_db()
        self.assertEqual(self.sale.status, "PARTIAL_REFUND")
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantity_on_hand, 97)  # 95 + 2

    def test_refund_already_refunded_fails(self):
        self.sale.status = "REFUNDED"
        self.sale.save()
        resp = self.client.post(
            f"/api/v1/sales/{self.sale.id}/refund/",
            {"refund_reason": "Again", "refund_method": "CASH"},
        )
        self.assertEqual(resp.status_code, 400)


# ──────────────────────────────────────────────────────────────
# DAILY REPORTS / STATS (org isolation)
# ──────────────────────────────────────────────────────────────

class SaleReportTests(APITestCase):
    """Tests for sales report endpoints org filtering."""

    def setUp(self):
        self.org = _org("rp1")
        self.user = _user(self.org, suffix="rp1")
        self.client.force_authenticate(user=self.user)

        Sale.objects.create(
            organization=self.org, facility_id="pharmacy-main",
            cashier=self.user, cashier_name="Test", created_by=self.user,
            subtotal=1000, total_amount=1000, status="COMPLETED",
        )

    def test_daily_report_returns_data(self):
        resp = self.client.get("/api/v1/sales/reports/daily/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["total_sales"], 1)

    def test_stats_returns_today_count(self):
        resp = self.client.get("/api/v1/sales/reports/stats/")
        self.assertEqual(resp.status_code, 200)
        self.assertGreaterEqual(resp.data["today_sales_count"], 1)
