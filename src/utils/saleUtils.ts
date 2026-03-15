export interface SaleInfo {
  isOnSale: boolean
  displayPrice: number
  originalPrice: number
  discountPercent: number | null
  saleLabel: string | null
}

export function getSaleInfo(product: {
  price: number
  is_on_sale: boolean
  sale_price: number | null
  sale_starts_at: string | null
  sale_ends_at: string | null
  sale_label: string | null
}): SaleInfo {
  const now = new Date()
  const saleStarted = product.sale_starts_at
    ? new Date(product.sale_starts_at) <= now
    : true
  const saleEnded = product.sale_ends_at
    ? new Date(product.sale_ends_at) < now
    : false

  const isOnSale =
    product.is_on_sale &&
    product.sale_price !== null &&
    product.sale_price < product.price &&
    saleStarted &&
    !saleEnded

  const displayPrice = isOnSale ? product.sale_price! : product.price
  const discountPercent = isOnSale
    ? Math.round(((product.price - product.sale_price!) / product.price) * 100)
    : null

  return {
    isOnSale,
    displayPrice,
    originalPrice: product.price,
    discountPercent,
    saleLabel: isOnSale ? (product.sale_label ?? `${discountPercent}% OFF`) : null
  }
}
