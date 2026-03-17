import assert from 'node:assert';
import { calculateCartTotals, CartItem } from './src/utils/cartMath.ts';

// Mock product
const createProduct = (id: string, price: number, seller_id: string) => ({
  id,
  seller_store_id: seller_id,
  title: 'Test',
  price,
  category_id: 'cat1',
  description: '',
  stock: 10,
  status: 'approved',
  created_at: '',
} as any);

function runTests() {
  console.log('Running Cart Math Unit Tests...');

  // Test 1: Single Seller
  const singleSellerItems: CartItem[] = [
    { product: createProduct('p1', 100, 's1'), quantity: 1 }
  ];
  const result1 = calculateCartTotals(singleSellerItems);
  assert.strictEqual(result1.totalAmount, 100);
  assert.strictEqual(result1.totalCommission, 8);
  assert.strictEqual(result1.reconciled, true);
  console.log('✅ Single seller test passed');

  // Test 2: Multi-seller
  const multiSellerItems: CartItem[] = [
    { product: createProduct('p1', 100.50, 's1'), quantity: 2 }, // 201.00 -> comm: 16.08
    { product: createProduct('p2', 50.25, 's2'), quantity: 1 }   // 50.25 -> comm: 4.02
  ];
  const result2 = calculateCartTotals(multiSellerItems);
  assert.strictEqual(result2.totalAmount, 251.25);
  assert.strictEqual(result2.totalCommission, 20.10);
  assert.strictEqual(result2.reconciled, true);
  console.log('✅ Multi-seller test passed');

  // Test 3: Zero Commission Edge Case
  const zeroCommItems: CartItem[] = [
    { product: createProduct('p1', 100, 's1'), quantity: 1 }
  ];
  const result3 = calculateCartTotals(zeroCommItems, 0); // 0% commission
  assert.strictEqual(result3.totalAmount, 100);
  assert.strictEqual(result3.totalCommission, 0);
  assert.strictEqual(result3.reconciled, true);
  console.log('✅ Zero commission test passed');

  // Test 4: Floating point issues
  const fpItems: CartItem[] = [
    { product: createProduct('p1', 19.99, 's1'), quantity: 3 } // 59.97 -> comm: 4.80 (4.7976)
  ];
  const result4 = calculateCartTotals(fpItems);
  assert.strictEqual(result4.totalAmount, 59.97);
  assert.strictEqual(result4.totalCommission, 4.80);
  assert.strictEqual(result4.reconciled, true);
  console.log('✅ Floating point rounding test passed');

  console.log('🎉 All Cart Math Unit Tests Passed!');
}

runTests();