import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLineTotal,
  calculateCartTotals,
  calculateChange,
  calculateProfitability,
  isLowStock,
  isOutOfStock,
} from './calculations.ts';

test('calculateLineTotal handles basic line pricing with discount', () => {
  assert.equal(calculateLineTotal(3, 500, 0), 1500);
  assert.equal(calculateLineTotal(2, 650, 100), 1200);
  assert.equal(calculateLineTotal(1, 400, 500), 0); // discount exceeds price
  assert.equal(calculateLineTotal(-1, 500), 0); // negative quantity protection
});

test('calculateCartTotals calculates subtotal, discounts, cogs, and grand total', () => {
  const items = [
    {
      book_id: 1,
      quantity: 2,
      unit_selling_price: 750, // Selling price
      unit_purchase_price: 500, // Cost price
      discount_amount: 50, // Line discount: 1500 - 50 = 1450
    },
    {
      book_id: 2,
      quantity: 1,
      unit_selling_price: 450,
      unit_purchase_price: 300,
      discount_amount: 0, // 450
    },
  ];

  const totals = calculateCartTotals(items, 100, 0); // KES 100 cart discount, 0% VAT

  assert.equal(totals.subtotal, 1950); // 1500 + 450
  assert.equal(totals.lineDiscountTotal, 50);
  assert.equal(totals.cartDiscountTotal, 100);
  assert.equal(totals.totalDiscount, 150);
  assert.equal(totals.grandTotal, 1800); // 1950 - 150
  assert.equal(totals.cogsTotal, 1300); // (2 * 500) + (1 * 300)
  assert.equal(totals.estimatedProfit, 500); // 1800 - 1300
});

test('calculateChange returns correct change tendered', () => {
  assert.equal(calculateChange(1800, 2000), 200);
  assert.equal(calculateChange(1800, 1800), 0);
  assert.equal(calculateChange(1800, 1500), 0);
});

test('change calculation returns zero when amount tendered equals or is less than total', () => {
  assert.equal(calculateChange(500, 500), 0);
  assert.equal(calculateChange(500, 400), 0);
});

test('calculateProfitability computes gross and net profit margins', () => {
  const result = calculateProfitability(100000, 60000, 15000);
  assert.equal(result.grossProfit, 40000);
  assert.equal(result.grossMarginPercent, 40);
  assert.equal(result.netOperatingProfit, 25000);
  assert.equal(result.netMarginPercent, 25);
});

test('stock alerts identify low and out-of-stock items', () => {
  assert.equal(isLowStock(3, 5), true);
  assert.equal(isLowStock(5, 5), true);
  assert.equal(isLowStock(6, 5), false);
  assert.equal(isOutOfStock(0), true);
  assert.equal(isOutOfStock(-1), true);
  assert.equal(isOutOfStock(2), false);
});
