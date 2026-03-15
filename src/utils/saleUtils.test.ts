import { getSaleInfo, SaleInfo } from './saleUtils'

// Simple test utility
function test(description: string, fn: () => void) {
  try {
    fn()
    console.log(`✓ ${description}`)
  } catch (error) {
    console.error(`✗ ${description}`)
    console.error(`  ${error instanceof Error ? error.message : String(error)}`)
  }
}

function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, but got ${actual}`)
      }
    },
    toEqual(expected: T) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`)
      }
    }
  }
}

// Test Suite
const now = new Date()
const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
const inOneHour = new Date(now.getTime() + 60 * 60 * 1000).toISOString()
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

console.log('\n=== Sale Utils Tests ===\n')

test('Active sale: should show sale price when is_on_sale is true and within date range', () => {
  const product = {
    price: 100,
    is_on_sale: true,
    sale_price: 75,
    sale_starts_at: oneHourAgo,
    sale_ends_at: inOneHour,
    sale_label: null
  }
  const result = getSaleInfo(product)

  expect(result.isOnSale).toBe(true)
  expect(result.displayPrice).toBe(75)
  expect(result.originalPrice).toBe(100)
  expect(result.discountPercent).toBe(25)
  expect(result.saleLabel).toBe('25% OFF')
})

test('Active sale with custom label: should use custom sale_label', () => {
  const product = {
    price: 100,
    is_on_sale: true,
    sale_price: 49.99,
    sale_starts_at: oneHourAgo,
    sale_ends_at: inOneHour,
    sale_label: 'Flash Sale'
  }
  const result = getSaleInfo(product)

  expect(result.isOnSale).toBe(true)
  expect(result.saleLabel).toBe('Flash Sale')
  expect(result.discountPercent).toBe(50)
})

test('Expired sale: should not show sale when sale_ends_at is in past', () => {
  const product = {
    price: 100,
    is_on_sale: true,
    sale_price: 75,
    sale_starts_at: yesterday,
    sale_ends_at: yesterday,
    sale_label: 'Expired Sale'
  }
  const result = getSaleInfo(product)

  expect(result.isOnSale).toBe(false)
  expect(result.displayPrice).toBe(100)
  expect(result.discountPercent).toBe(null)
  expect(result.saleLabel).toBe(null)
})

test('Future sale not started: should not show sale when sale_starts_at is in future', () => {
  const product = {
    price: 100,
    is_on_sale: true,
    sale_price: 75,
    sale_starts_at: inOneHour,
    sale_ends_at: tomorrow,
    sale_label: 'Upcoming Sale'
  }
  const result = getSaleInfo(product)

  expect(result.isOnSale).toBe(false)
  expect(result.displayPrice).toBe(100)
  expect(result.discountPercent).toBe(null)
  expect(result.saleLabel).toBe(null)
})

test('No sale: should show original price when is_on_sale is false', () => {
  const product = {
    price: 100,
    is_on_sale: false,
    sale_price: 75,
    sale_starts_at: oneHourAgo,
    sale_ends_at: inOneHour,
    sale_label: null
  }
  const result = getSaleInfo(product)

  expect(result.isOnSale).toBe(false)
  expect(result.displayPrice).toBe(100)
  expect(result.originalPrice).toBe(100)
  expect(result.discountPercent).toBe(null)
  expect(result.saleLabel).toBe(null)
})

test('Zero discount guard: should not show sale when sale_price equals original price', () => {
  const product = {
    price: 100,
    is_on_sale: true,
    sale_price: 100,
    sale_starts_at: oneHourAgo,
    sale_ends_at: inOneHour,
    sale_label: null
  }
  const result = getSaleInfo(product)

  expect(result.isOnSale).toBe(false)
  expect(result.displayPrice).toBe(100)
  expect(result.discountPercent).toBe(null)
})

test('Zero discount guard: should not show sale when sale_price is higher than original', () => {
  const product = {
    price: 100,
    is_on_sale: true,
    sale_price: 150,
    sale_starts_at: oneHourAgo,
    sale_ends_at: inOneHour,
    sale_label: null
  }
  const result = getSaleInfo(product)

  expect(result.isOnSale).toBe(false)
  expect(result.displayPrice).toBe(100)
  expect(result.discountPercent).toBe(null)
})

test('Null sale_price: should not show sale when sale_price is null', () => {
  const product = {
    price: 100,
    is_on_sale: true,
    sale_price: null,
    sale_starts_at: oneHourAgo,
    sale_ends_at: inOneHour,
    sale_label: null
  }
  const result = getSaleInfo(product)

  expect(result.isOnSale).toBe(false)
  expect(result.displayPrice).toBe(100)
  expect(result.discountPercent).toBe(null)
})

test('No date boundaries: should treat null dates as always valid', () => {
  const product = {
    price: 100,
    is_on_sale: true,
    sale_price: 50,
    sale_starts_at: null,
    sale_ends_at: null,
    sale_label: null
  }
  const result = getSaleInfo(product)

  expect(result.isOnSale).toBe(true)
  expect(result.displayPrice).toBe(50)
  expect(result.discountPercent).toBe(50)
})

test('Edge case - 1 cent discount: should calculate correct percentage', () => {
  const product = {
    price: 100,
    is_on_sale: true,
    sale_price: 99.99,
    sale_starts_at: null,
    sale_ends_at: null,
    sale_label: null
  }
  const result = getSaleInfo(product)

  expect(result.isOnSale).toBe(true)
  expect(result.displayPrice).toBe(99.99)
  expect(result.discountPercent).toBe(0)
})

test('Edge case - Large discount: should calculate correct percentage', () => {
  const product = {
    price: 100,
    is_on_sale: true,
    sale_price: 10,
    sale_starts_at: null,
    sale_ends_at: null,
    sale_label: null
  }
  const result = getSaleInfo(product)

  expect(result.isOnSale).toBe(true)
  expect(result.displayPrice).toBe(10)
  expect(result.discountPercent).toBe(90)
})

console.log('\n=== Tests Complete ===\n')

