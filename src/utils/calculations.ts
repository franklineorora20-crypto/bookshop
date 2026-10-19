export interface CartItemInput {
  book_id: number;
  quantity: number;
  unit_selling_price: number;
  unit_purchase_price: number;
  discount_amount?: number; // total discount on this line
}

export function calculateLineTotal(quantity: number, unitPrice: number, discountAmount = 0): number {
  if (quantity < 0 || unitPrice < 0) return 0;
  const rawTotal = quantity * unitPrice;
  const safeDiscount = Math.min(Math.max(0, discountAmount), rawTotal);
  return Math.round((rawTotal - safeDiscount) * 100) / 100;
}

export function calculateCartTotals(
  items: CartItemInput[],
  cartLevelDiscount = 0,
  taxRatePercent = 0
): {
  subtotal: number;
  lineDiscountTotal: number;
  cartDiscountTotal: number;
  totalDiscount: number;
  taxTotal: number;
  grandTotal: number;
  cogsTotal: number;
  estimatedProfit: number;
} {
  let subtotal = 0;
  let lineDiscountTotal = 0;
  let cogsTotal = 0;

  for (const item of items) {
    const rawLine = item.quantity * item.unit_selling_price;
    const discount = Math.min(Math.max(0, item.discount_amount || 0), rawLine);
    subtotal += rawLine;
    lineDiscountTotal += discount;
    cogsTotal += item.quantity * item.unit_purchase_price;
  }

  const afterLineDiscounts = Math.max(0, subtotal - lineDiscountTotal);
  const cartDiscount = Math.min(Math.max(0, cartLevelDiscount), afterLineDiscounts);
  const totalDiscount = lineDiscountTotal + cartDiscount;
  const taxableBase = Math.max(0, subtotal - totalDiscount);

  // In Kenya, books are typically zero-rated/exempt from VAT, but stationery may carry 16% VAT if configured
  const taxTotal = taxRatePercent > 0 ? Math.round((taxableBase * (taxRatePercent / 100)) * 100) / 100 : 0;
  const grandTotal = Math.round((taxableBase + taxTotal) * 100) / 100;
  const estimatedProfit = Math.round((grandTotal - cogsTotal) * 100) / 100;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    lineDiscountTotal: Math.round(lineDiscountTotal * 100) / 100,
    cartDiscountTotal: Math.round(cartDiscount * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    taxTotal,
    grandTotal,
    cogsTotal: Math.round(cogsTotal * 100) / 100,
    estimatedProfit,
  };
}

export function calculateChange(grandTotal: number, amountTendered: number): number {
  if (amountTendered <= grandTotal) return 0;
  return Math.round((amountTendered - grandTotal) * 100) / 100;
}

export function calculateAvailableCredit(creditLimit: number, currentBalance: number): number {
  return Math.max(0, Math.round((creditLimit - currentBalance) * 100) / 100);
}

export function canCustomerBorrow(
  creditLimit: number,
  currentBalance: number,
  requestedAmount: number
): { allowed: boolean; reason?: string } {
  if (requestedAmount <= 0) {
    return { allowed: false, reason: 'Amount must be greater than zero' };
  }
  const available = calculateAvailableCredit(creditLimit, currentBalance);
  if (requestedAmount > available) {
    return {
      allowed: false,
      reason: `Amount exceeds available credit limit. Available: KES ${available.toFixed(2)}, Requested: KES ${requestedAmount.toFixed(2)}`,
    };
  }
  return { allowed: true };
}

export function calculateProfitability(
  revenue: number,
  costOfGoodsSold: number,
  totalExpenses: number
): {
  grossProfit: number;
  grossMarginPercent: number;
  netOperatingProfit: number;
  netMarginPercent: number;
} {
  const grossProfit = Math.round((revenue - costOfGoodsSold) * 100) / 100;
  const grossMarginPercent = revenue > 0 ? Math.round(((grossProfit / revenue) * 100) * 10) / 10 : 0;
  const netOperatingProfit = Math.round((grossProfit - totalExpenses) * 100) / 100;
  const netMarginPercent = revenue > 0 ? Math.round(((netOperatingProfit / revenue) * 100) * 10) / 10 : 0;

  return {
    grossProfit,
    grossMarginPercent,
    netOperatingProfit,
    netMarginPercent,
  };
}

export function isLowStock(quantity: number, reorderLevel: number): boolean {
  return quantity <= reorderLevel;
}

export function isOutOfStock(quantity: number): boolean {
  return quantity <= 0;
}
