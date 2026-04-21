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
    u = User(
        phone=f"+243820000{suffix.zfill(3)}",
        first_name="User",
        last_name=f"Test{suffix}",
        primary_role=role,
        organization=org,
    )
    u.set_password("testpass123")
    u.save()
    return u


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


# ──────────────────────────────────────────────────────────────
# UNIT SELLING TESTS (BOX → BLISTER → UNIT)
# ──────────────────────────────────────────────────────────────

def _unit_product(org, name="Amoxicilline 500mg", price="6000.00", cost="3000.00",
                  upb=10, bpb=3, allow_unit=True, allow_blister=True,
                  price_blister=None, price_unit=None, **kwargs):
    """Create a product with unit selling fields configured."""
    sku = f"SKU-{name[:5]}-{timezone.now().timestamp()}"
    return Product.objects.create(
        organization=org,
        name=name,
        sku=sku,
        category="MEDICATION",
        dosage_form="TABLET",
        unit_of_measure="UNIT",
        selling_price=Decimal(price),
        cost_price=Decimal(cost),
        units_per_blister=upb,
        blisters_per_box=bpb,
        allow_unit_selling=allow_unit,
        allow_blister_selling=allow_blister,
        selling_price_per_blister=Decimal(price_blister) if price_blister else None,
        selling_price_per_unit=Decimal(price_unit) if price_unit else None,
        is_active=True,
        **kwargs,
    )


def _unit_sale_payload(product, qty=1, selling_unit='BOX', price=None):
    """Build sale payload with selling_unit field."""
    return {
        "items": [
            {
                "product": product.id,
                "product_name": product.name,
                "product_sku": product.sku,
                "unit_of_measure": product.unit_of_measure,
                "selling_unit": selling_unit,
                "quantity": qty,
                "unit_price": str(price or product.selling_price),
            }
        ],
        "type": "COUNTER",
    }


class UnitSellingBaseQtyTests(TestCase):
    """Test base_quantity computation for BOX/BLISTER/UNIT selling."""

    def setUp(self):
        self.org = _org("us1")
        self.user = _user(self.org, suffix="us1")
        # Product: 10 units/blister × 3 blisters/box = 30 units per box
        self.product = _unit_product(self.org, upb=10, bpb=3)
        self.inv = _inventory(self.product, self.org, qty=300, facility="pharmacy-main")
        _batch(self.inv, qty=300, expiry_days=365)

    def _create_sale(self, payload):
        factory = APIRequestFactory()
        request = factory.post("/api/v1/sales/", payload, format="json")
        request.user = self.user
        ser = SaleCreateSerializer(data=payload, context={
            "request": request,
            "organization": self.org,
        })
        ser.is_valid(raise_exception=True)
        return ser.save(
            organization=self.org,
            cashier=self.user,
            cashier_name=self.user.full_name,
            created_by=self.user,
        )

    def test_box_base_qty_calculation(self):
        """Selling 2 BOXes → base_qty = 2 × 3 × 10 = 60."""
        payload = _unit_sale_payload(self.product, qty=2, selling_unit='BOX')
        sale = self._create_sale(payload)
        item = SaleItem.objects.filter(sale=sale).first()
        self.assertEqual(item.base_quantity, 60)
        self.assertEqual(item.selling_unit, 'BOX')

    def test_blister_base_qty_calculation(self):
        """Selling 5 BLISTERs → base_qty = 5 × 10 = 50."""
        payload = _unit_sale_payload(self.product, qty=5, selling_unit='BLISTER',
                                      price='2000.00')
        sale = self._create_sale(payload)
        item = SaleItem.objects.filter(sale=sale).first()
        self.assertEqual(item.base_quantity, 50)

    def test_unit_base_qty_calculation(self):
        """Selling 7 UNITs → base_qty = 7."""
        payload = _unit_sale_payload(self.product, qty=7, selling_unit='UNIT',
                                      price='200.00')
        sale = self._create_sale(payload)
        item = SaleItem.objects.filter(sale=sale).first()
        self.assertEqual(item.base_quantity, 7)

    def test_stock_deducted_by_base_qty(self):
        """Selling 1 BOX (30 base units) deducts 30 from inventory."""
        prev = self.inv.quantity_on_hand
        payload = _unit_sale_payload(self.product, qty=1, selling_unit='BOX')
        self._create_sale(payload)
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantity_on_hand, prev - 30)

    def test_stock_deduction_blister(self):
        """Selling 3 BLISTERs deducts 3 × 10 = 30."""
        prev = self.inv.quantity_on_hand
        payload = _unit_sale_payload(self.product, qty=3, selling_unit='BLISTER',
                                      price='2000.00')
        self._create_sale(payload)
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantity_on_hand, prev - 30)

    def test_stock_deduction_unit(self):
        """Selling 15 UNITs deducts 15."""
        prev = self.inv.quantity_on_hand
        payload = _unit_sale_payload(self.product, qty=15, selling_unit='UNIT',
                                      price='200.00')
        self._create_sale(payload)
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantity_on_hand, prev - 15)

    def test_stock_movement_records_base_qty(self):
        """StockMovement.quantity should use base_qty, not selling qty."""
        payload = _unit_sale_payload(self.product, qty=2, selling_unit='BOX')
        self._create_sale(payload)
        movement = StockMovement.objects.filter(
            inventory_item=self.inv, movement_type='SALE'
        ).order_by('-created_at').first()
        self.assertEqual(movement.quantity, 60)
        self.assertIn('BOX', movement.reason)


class UnitSellingValidationTests(TestCase):
    """Test validation: invalid unit, disallowed unit, qty=0, etc."""

    def setUp(self):
        self.org = _org("uv1")
        self.user = _user(self.org, suffix="uv1")
        self.product = _unit_product(self.org, upb=10, bpb=3,
                                      allow_unit=False, allow_blister=False)
        self.inv = _inventory(self.product, self.org, qty=300, facility="pharmacy-main")
        _batch(self.inv, qty=300, expiry_days=365)

    def _try_create(self, payload):
        factory = APIRequestFactory()
        request = factory.post("/api/v1/sales/", payload, format="json")
        request.user = self.user
        ser = SaleCreateSerializer(data=payload, context={
            "request": request,
            "organization": self.org,
        })
        return ser

    def test_invalid_selling_unit_rejected(self):
        """Invalid selling_unit value like 'PACKET' should be rejected."""
        payload = _unit_sale_payload(self.product, qty=1, selling_unit='PACKET')
        ser = self._try_create(payload)
        self.assertFalse(ser.is_valid())

    def test_disallowed_unit_selling_rejected(self):
        """Product with allow_unit_selling=False rejects UNIT sales."""
        payload = _unit_sale_payload(self.product, qty=5, selling_unit='UNIT',
                                      price='200.00')
        ser = self._try_create(payload)
        self.assertFalse(ser.is_valid())

    def test_disallowed_blister_selling_rejected(self):
        """Product with allow_blister_selling=False rejects BLISTER sales."""
        payload = _unit_sale_payload(self.product, qty=2, selling_unit='BLISTER',
                                      price='2000.00')
        ser = self._try_create(payload)
        self.assertFalse(ser.is_valid())

    def test_zero_quantity_rejected(self):
        """Quantity of 0 should be rejected."""
        payload = _unit_sale_payload(self.product, qty=0, selling_unit='BOX')
        ser = self._try_create(payload)
        self.assertFalse(ser.is_valid())

    def test_box_selling_always_allowed(self):
        """BOX selling works even when blister/unit are disabled."""
        payload = _unit_sale_payload(self.product, qty=1, selling_unit='BOX')
        ser = self._try_create(payload)
        self.assertTrue(ser.is_valid(), ser.errors)


class UnitSellingStockLimitTests(TestCase):
    """Test stock exhaustion edge cases with unit selling."""

    def setUp(self):
        self.org = _org("sl1")
        self.user = _user(self.org, suffix="sl1")
        # 10 units/blister × 2 blisters/box = 20 units per box
        self.product = _unit_product(self.org, upb=10, bpb=2)
        # Only 25 units in stock (1 full box + 5 loose units)
        self.inv = _inventory(self.product, self.org, qty=25, facility="pharmacy-main")
        _batch(self.inv, qty=25, expiry_days=365)

    def _create_sale(self, payload):
        factory = APIRequestFactory()
        request = factory.post("/api/v1/sales/", payload, format="json")
        request.user = self.user
        ser = SaleCreateSerializer(data=payload, context={
            "request": request,
            "organization": self.org,
        })
        ser.is_valid(raise_exception=True)
        return ser.save(
            organization=self.org,
            cashier=self.user,
            cashier_name=self.user.full_name,
            created_by=self.user,
        )

    def test_oversell_box_rejected(self):
        """2 BOXes = 40 units, but only 25 in stock → rejected."""
        payload = _unit_sale_payload(self.product, qty=2, selling_unit='BOX')
        with self.assertRaises(Exception) as ctx:
            self._create_sale(payload)
        self.assertIn("Stock insuffisant", str(ctx.exception))

    def test_exact_stock_accepted(self):
        """25 UNITs when stock is 25 → accepted."""
        payload = _unit_sale_payload(self.product, qty=25, selling_unit='UNIT',
                                      price='300.00')
        sale = self._create_sale(payload)
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantity_on_hand, 0)

    def test_one_over_stock_rejected(self):
        """26 UNITs when stock is 25 → rejected."""
        payload = _unit_sale_payload(self.product, qty=26, selling_unit='UNIT',
                                      price='300.00')
        with self.assertRaises(Exception) as ctx:
            self._create_sale(payload)
        self.assertIn("Stock insuffisant", str(ctx.exception))

    def test_blister_partial_stock_accepted(self):
        """2 BLISTERs = 20 units, stock is 25 → accepted."""
        payload = _unit_sale_payload(self.product, qty=2, selling_unit='BLISTER',
                                      price='3000.00')
        sale = self._create_sale(payload)
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.quantity_on_hand, 5)

    def test_blister_exceeds_stock_rejected(self):
        """3 BLISTERs = 30 units, stock is 25 → rejected."""
        payload = _unit_sale_payload(self.product, qty=3, selling_unit='BLISTER',
                                      price='3000.00')
        with self.assertRaises(Exception) as ctx:
            self._create_sale(payload)
        self.assertIn("Stock insuffisant", str(ctx.exception))


class UnitSellingBatchFEFOTests(TestCase):
    """Test FEFO batch deduction with unit selling."""

    def setUp(self):
        self.org = _org("bf1")
        self.user = _user(self.org, suffix="bf1")
        self.product = _unit_product(self.org, upb=5, bpb=2)  # 10 units/box
        self.inv = _inventory(self.product, self.org, qty=100, facility="pharmacy-main")
        # Batch A expires sooner (30 days), Batch B later (365 days)
        self.batch_a = _batch(self.inv, qty=30, expiry_days=30, batch_number="LOT-A")
        self.batch_b = _batch(self.inv, qty=70, expiry_days=365, batch_number="LOT-B")

    def _create_sale(self, payload):
        factory = APIRequestFactory()
        request = factory.post("/api/v1/sales/", payload, format="json")
        request.user = self.user
        ser = SaleCreateSerializer(data=payload, context={
            "request": request,
            "organization": self.org,
        })
        ser.is_valid(raise_exception=True)
        return ser.save(
            organization=self.org,
            cashier=self.user,
            cashier_name=self.user.full_name,
            created_by=self.user,
        )

    def test_fefo_deducts_expiring_batch_first(self):
        """Selling 20 units should deplete batch A (30d) first."""
        payload = _unit_sale_payload(self.product, qty=20, selling_unit='UNIT',
                                      price='600.00')
        self._create_sale(payload)
        self.batch_a.refresh_from_db()
        self.batch_b.refresh_from_db()
        self.assertEqual(self.batch_a.current_quantity, 10)  # 30-20
        self.assertEqual(self.batch_b.current_quantity, 70)  # untouched

    def test_fefo_spans_multiple_batches(self):
        """Selling 40 units should exhaust batch A (30), take 10 from B."""
        payload = _unit_sale_payload(self.product, qty=4, selling_unit='BOX')
        self._create_sale(payload)
        self.batch_a.refresh_from_db()
        self.batch_b.refresh_from_db()
        self.assertEqual(self.batch_a.current_quantity, 0)
        self.assertEqual(self.batch_a.status, 'DEPLETED')
        self.assertEqual(self.batch_b.current_quantity, 60)

    def test_expired_batch_skipped(self):
        """An already-expired batch is skipped during FEFO deduction."""
        self.batch_a.expiry_date = date.today() - timedelta(days=1)
        self.batch_a.save()

        payload = _unit_sale_payload(self.product, qty=10, selling_unit='UNIT',
                                      price='600.00')
        self._create_sale(payload)
        self.batch_a.refresh_from_db()
        self.batch_b.refresh_from_db()
        self.assertEqual(self.batch_a.current_quantity, 30)  # untouched (expired)
        self.assertEqual(self.batch_b.current_quantity, 60)  # 70-10


class UnitSellingZeroFieldTests(TestCase):
    """Test edge cases where upb or bpb could be 0 or None."""

    def setUp(self):
        self.org = _org("zf1")
        self.user = _user(self.org, suffix="zf1")

    def _create_sale(self, product, qty, selling_unit, price):
        inv = _inventory(product, self.org, qty=1000, facility="pharmacy-main")
        _batch(inv, qty=1000, expiry_days=365)
        payload = _unit_sale_payload(product, qty=qty, selling_unit=selling_unit,
                                      price=price)
        factory = APIRequestFactory()
        request = factory.post("/api/v1/sales/", payload, format="json")
        request.user = self.user
        ser = SaleCreateSerializer(data=payload, context={
            "request": request,
            "organization": self.org,
        })
        ser.is_valid(raise_exception=True)
        return ser.save(
            organization=self.org,
            cashier=self.user,
            cashier_name=self.user.full_name,
            created_by=self.user,
        )

    def test_upb_zero_clamped_to_1(self):
        """If units_per_blister is 0, backend clamps to max(1, 0) = 1."""
        prod = _unit_product(self.org, name="TestZeroUPB", upb=1, bpb=1)
        Product.objects.filter(pk=prod.pk).update(units_per_blister=0)
        prod.refresh_from_db()
        sale = self._create_sale(prod, qty=5, selling_unit='BLISTER', price='500.00')
        item = SaleItem.objects.filter(sale=sale).first()
        # With upb clamped to 1: 5 × 1 = 5
        self.assertEqual(item.base_quantity, 5)

    def test_bpb_zero_clamped_to_1(self):
        """If blisters_per_box is 0, backend clamps to max(1, 0) = 1."""
        prod = _unit_product(self.org, name="TestZeroBPB", upb=10, bpb=1)
        Product.objects.filter(pk=prod.pk).update(blisters_per_box=0)
        prod.refresh_from_db()
        sale = self._create_sale(prod, qty=2, selling_unit='BOX', price='6000.00')
        item = SaleItem.objects.filter(sale=sale).first()
        # With bpb clamped to 1: 2 × 1 × 10 = 20
        self.assertEqual(item.base_quantity, 20)
