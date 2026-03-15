import { Product } from '../types';

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CalculatedItem extends CartItem {
  itemTotal: number;
  commissionAmount: number;
}

export interface CartMathResult {
  items: CalculatedItem[];
  totalAmount: number;
  totalCommission: number;
  reconciled: boolean;
}

export function calculateCartTotals(
  items: CartItem[],
  commissionRate: number = 0.08
): CartMathResult {
  let totalAmount = 0;
  let totalCommission = 0;

  const calculatedItems = items.map(item => {
    // Round to 2 decimal places to avoid floating point issues
    const itemTotal = Math.round(item.product.price * item.quantity * 100) / 100;
    const commissionAmount = Math.round(itemTotal * commissionRate * 100) / 100;

    totalAmount += itemTotal;
    totalCommission += commissionAmount;

    return {
      ...item,
      itemTotal,
      commissionAmount
    };
  });

  // Reconcile
  // Since we accumulate individual rounded amounts, the totals are exactly the sum of items.
  // We can do an overarching sanity check to ensure the math is sound.
  const rawTotalAmount = items.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const roundedRawTotalAmount = Math.round(rawTotalAmount * 100) / 100;

  // Sometimes there's a 1 cent difference between sum of individual item totals vs raw total sum
  // In accounting, sum of individual item totals is the source of truth
  const reconciled = Math.abs(totalAmount - roundedRawTotalAmount) < 0.05;

  return {
    items: calculatedItems,
    totalAmount: Math.round(totalAmount * 100) / 100,
    totalCommission: Math.round(totalCommission * 100) / 100,
    reconciled
  };
}
