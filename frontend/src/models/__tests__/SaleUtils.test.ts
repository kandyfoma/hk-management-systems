/**
 * Unit tests for SaleUtils — computeLineItem, computeCartTotals, createEmptyCart.
 * Run with: npx jest src/models/__tests__/SaleUtils.test.ts
 */
import { SaleUtils, CartItem, CartState, SellingUnit } from '../Sale';

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

function makeCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: 'prod-1',
    product: {
      name: 'Amoxicilline 500mg',
      sku: 'AMOX-500',
      genericName: 'Amoxicilline',
      strength: '500mg',
      dosageForm: 'CAPSULE',
      category: 'MEDICATION',
      requiresPrescription: false,
      sellingPrice: 6000,
      costPrice: 3000,
      taxRate: 0,
      currency: 'CDF',
    },
    quantity: 1,
    sellingUnit: 'BOX' as SellingUnit,
    unitPrice: 6000,
    discountPercent: 0,
    discountAmount: 0,
    taxAmount: 0,
    lineTotal: 0,
    maxQuantity: 100,
    ...overrides,
  };
}

function makeCart(items: CartItem[], overrides: Partial<CartState> = {}): CartState {
  return {
    items,
    saleType: 'COUNTER',
    globalDiscountType: 'NONE',
    globalDiscountValue: 0,
    ...overrides,
  };
}

// ──────────────────────────────────────────────────────────────
// computeLineItem
// ──────────────────────────────────────────────────────────────

describe('SaleUtils.computeLineItem', () => {
  test('basic computation: qty × price = lineTotal', () => {
    const item = makeCartItem({ quantity: 3, unitPrice: 2000 });
    const result = SaleUtils.computeLineItem(item);
    expect(result.lineTotal).toBe(6000);
    expect(result.discountAmount).toBe(0);
    expect(result.taxAmount).toBe(0);
  });

  test('with discount percentage', () => {
    const item = makeCartItem({ quantity: 2, unitPrice: 5000, discountPercent: 10 });
    const result = SaleUtils.computeLineItem(item);
    // 2 × 5000 = 10000 → 10% = 1000 discount → 9000
    expect(result.discountAmount).toBe(1000);
    expect(result.lineTotal).toBe(9000);
  });

  test('with tax rate', () => {
    const item = makeCartItem({
      quantity: 1,
      unitPrice: 10000,
      product: { ...makeCartItem().product, taxRate: 16 },
    });
    const result = SaleUtils.computeLineItem(item);
    // 10000 + 16% tax = 11600
    expect(result.taxAmount).toBe(1600);
    expect(result.lineTotal).toBe(11600);
  });

  test('discount + tax combined', () => {
    const item = makeCartItem({
      quantity: 4,
      unitPrice: 1000,
      discountPercent: 25,
      product: { ...makeCartItem().product, taxRate: 10 },
    });
    const result = SaleUtils.computeLineItem(item);
    // 4 × 1000 = 4000, 25% off = 1000, after discount = 3000, 10% tax = 300
    expect(result.discountAmount).toBe(1000);
    expect(result.taxAmount).toBe(300);
    expect(result.lineTotal).toBe(3300);
  });

  // ─── Edge cases ────────────────────────────────────────

  test('negative quantity clamped to 0', () => {
    const item = makeCartItem({ quantity: -5, unitPrice: 1000 });
    const result = SaleUtils.computeLineItem(item);
    expect(result.quantity).toBe(0);
    expect(result.lineTotal).toBe(0);
  });

  test('zero quantity results in zero lineTotal', () => {
    const item = makeCartItem({ quantity: 0 });
    const result = SaleUtils.computeLineItem(item);
    expect(result.lineTotal).toBe(0);
  });

  test('discount percent clamped to 0-100', () => {
    const item1 = makeCartItem({ quantity: 1, unitPrice: 1000, discountPercent: -20 });
    const r1 = SaleUtils.computeLineItem(item1);
    expect(r1.discountPercent).toBe(0);
    expect(r1.discountAmount).toBe(0);

    const item2 = makeCartItem({ quantity: 1, unitPrice: 1000, discountPercent: 150 });
    const r2 = SaleUtils.computeLineItem(item2);
    expect(r2.discountPercent).toBe(100);
    expect(r2.lineTotal).toBe(0);
  });

  test('tax rate clamped to 0-100', () => {
    const item = makeCartItem({
      quantity: 1,
      unitPrice: 1000,
      product: { ...makeCartItem().product, taxRate: -10 },
    });
    const result = SaleUtils.computeLineItem(item);
    expect(result.taxAmount).toBe(0);
  });

  test('null/undefined taxRate treated as 0', () => {
    const item = makeCartItem({
      quantity: 1,
      unitPrice: 1000,
      product: { ...makeCartItem().product, taxRate: undefined as any },
    });
    const result = SaleUtils.computeLineItem(item);
    expect(result.taxAmount).toBe(0);
    expect(result.lineTotal).toBe(1000);
  });

  test('100% discount results in 0 lineTotal', () => {
    const item = makeCartItem({ quantity: 3, unitPrice: 5000, discountPercent: 100 });
    const result = SaleUtils.computeLineItem(item);
    expect(result.lineTotal).toBe(0);
  });

  test('preserves sellingUnit field', () => {
    const item = makeCartItem({ sellingUnit: 'BLISTER' });
    const result = SaleUtils.computeLineItem(item);
    expect(result.sellingUnit).toBe('BLISTER');
  });

  test('rounding precision for fractional amounts', () => {
    // 3 × 333 = 999, 10% discount = 99.9
    const item = makeCartItem({ quantity: 3, unitPrice: 333, discountPercent: 10 });
    const result = SaleUtils.computeLineItem(item);
    expect(result.discountAmount).toBe(99.9);
    expect(result.lineTotal).toBe(899.1);
  });
});

// ──────────────────────────────────────────────────────────────
// computeCartTotals
// ──────────────────────────────────────────────────────────────

describe('SaleUtils.computeCartTotals', () => {
  test('empty cart returns zero totals', () => {
    const cart = makeCart([]);
    const totals = SaleUtils.computeCartTotals(cart);
    expect(totals.itemCount).toBe(0);
    expect(totals.grandTotal).toBe(0);
  });

  test('single item cart computes correctly', () => {
    const item = SaleUtils.computeLineItem(makeCartItem({ quantity: 2, unitPrice: 5000 }));
    const cart = makeCart([item]);
    const totals = SaleUtils.computeCartTotals(cart);
    expect(totals.itemCount).toBe(1);
    expect(totals.totalQuantity).toBe(2);
    expect(totals.subtotal).toBe(10000);
    expect(totals.grandTotal).toBe(10000);
  });

  test('multiple items cart sums correctly', () => {
    const item1 = SaleUtils.computeLineItem(makeCartItem({ productId: 'p1', quantity: 2, unitPrice: 1000 }));
    const item2 = SaleUtils.computeLineItem(makeCartItem({ productId: 'p2', quantity: 3, unitPrice: 2000 }));
    const cart = makeCart([item1, item2]);
    const totals = SaleUtils.computeCartTotals(cart);
    expect(totals.itemCount).toBe(2);
    expect(totals.totalQuantity).toBe(5);
    expect(totals.subtotal).toBe(8000);
    expect(totals.grandTotal).toBe(8000);
  });

  test('global percentage discount applied', () => {
    const item = SaleUtils.computeLineItem(makeCartItem({ quantity: 1, unitPrice: 10000 }));
    const cart = makeCart([item], { globalDiscountType: 'PERCENTAGE', globalDiscountValue: 20 });
    const totals = SaleUtils.computeCartTotals(cart);
    expect(totals.globalDiscount).toBe(2000);
    expect(totals.grandTotal).toBe(8000);
  });

  test('global fixed discount applied', () => {
    const item = SaleUtils.computeLineItem(makeCartItem({ quantity: 1, unitPrice: 10000 }));
    const cart = makeCart([item], { globalDiscountType: 'FIXED', globalDiscountValue: 3000 });
    const totals = SaleUtils.computeCartTotals(cart);
    expect(totals.globalDiscount).toBe(3000);
    expect(totals.grandTotal).toBe(7000);
  });

  test('global fixed discount cannot exceed subtotal', () => {
    const item = SaleUtils.computeLineItem(makeCartItem({ quantity: 1, unitPrice: 1000 }));
    const cart = makeCart([item], { globalDiscountType: 'FIXED', globalDiscountValue: 5000 });
    const totals = SaleUtils.computeCartTotals(cart);
    expect(totals.globalDiscount).toBe(1000); // capped at subtotal
    expect(totals.grandTotal).toBe(0);
  });

  test('grandTotal never goes negative', () => {
    const item = SaleUtils.computeLineItem(
      makeCartItem({ quantity: 1, unitPrice: 100, discountPercent: 100 })
    );
    const cart = makeCart([item], { globalDiscountType: 'FIXED', globalDiscountValue: 500 });
    const totals = SaleUtils.computeCartTotals(cart);
    expect(totals.grandTotal).toBeGreaterThanOrEqual(0);
  });

  test('same product different selling units counted separately', () => {
    const boxItem = SaleUtils.computeLineItem(
      makeCartItem({ productId: 'p1', sellingUnit: 'BOX', quantity: 2, unitPrice: 6000 })
    );
    const unitItem = SaleUtils.computeLineItem(
      makeCartItem({ productId: 'p1', sellingUnit: 'UNIT', quantity: 10, unitPrice: 200 })
    );
    const cart = makeCart([boxItem, unitItem]);
    const totals = SaleUtils.computeCartTotals(cart);
    expect(totals.itemCount).toBe(2);
    expect(totals.totalQuantity).toBe(12);
    expect(totals.subtotal).toBe(14000); // 12000 + 2000
  });
});

// ──────────────────────────────────────────────────────────────
// createEmptyCart
// ──────────────────────────────────────────────────────────────

describe('SaleUtils.createEmptyCart', () => {
  test('returns empty cart with defaults', () => {
    const cart = SaleUtils.createEmptyCart();
    expect(cart.items).toEqual([]);
    expect(cart.saleType).toBe('COUNTER');
    expect(cart.globalDiscountType).toBe('NONE');
    expect(cart.globalDiscountValue).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────
// formatCurrency
// ──────────────────────────────────────────────────────────────

describe('SaleUtils.formatCurrency', () => {
  test('CDF formatting', () => {
    const result = SaleUtils.formatCurrency(15000, 'CDF');
    expect(result).toContain('FC');
    expect(result).toContain('15');
  });

  test('USD formatting', () => {
    const result = SaleUtils.formatCurrency(25.5, 'USD');
    expect(result).toBe('$25.50');
  });
});
