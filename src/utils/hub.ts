/**
 * The Internet Guy Cafe — Central Hub / Dispatch Point
 * Coordinates: -25.5432483, 28.0228925
 * Used as: default map center, fallback location for services
 */
export const HUB = {
  lat: -25.5432483,
  lng: 28.0228925,
} as const

/** R5 per km — product delivery rate */
export const PRODUCT_DELIVERY_RATE_PER_KM = 5

/** R10 per km — service request / radius rate */
export const SERVICE_DELIVERY_RATE_PER_KM = 10

/** Max delivery fee fallback when no location provided */
export const DELIVERY_FALLBACK_FEE = 100
