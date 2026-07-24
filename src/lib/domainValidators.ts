import { Product, Service } from '../types'

/**
 * Validates a payload intended for the Product domain.
 * Throws an Error if validation fails.
 */
export function validateProductPayload(payload: Partial<Product>, sellerType: string | undefined): void {
  // 1. Seller Type Compatibility
  if (sellerType !== 'product' && sellerType !== 'both') {
    throw new Error('Seller must have product privileges to create or update a product.')
  }

  // 2. Core Constraints
  if (!payload.title || payload.title.trim().length === 0) {
    throw new Error('Product must have a title.')
  }
  if (payload.price === undefined || payload.price === null || isNaN(Number(payload.price)) || Number(payload.price) < 0) {
    throw new Error('Product must have a valid positive price.')
  }
  if (payload.stock === undefined || payload.stock === null || isNaN(Number(payload.stock)) || Number(payload.stock) < 0) {
    throw new Error('Product must have a valid positive stock quantity.')
  }

  // 3. Reject Service Attributes (Leakage Prevention)
  if ('base_rate' in payload) {
    throw new Error('Domain Integrity Violation: A Product cannot have a base_rate.')
  }
  if ('coverage_radius_km' in payload) {
    throw new Error('Domain Integrity Violation: A Product cannot have a travel radius.')
  }
}

/**
 * Validates a payload intended for the Service domain.
 * Throws an Error if validation fails.
 */
export function validateServicePayload(payload: Partial<Service>, sellerType: string | undefined): void {
  // 1. Seller Type Compatibility
  if (sellerType !== 'service' && sellerType !== 'both') {
    throw new Error('Seller must have service privileges to create or update a service.')
  }

  // 2. Core Constraints
  if (!payload.title || payload.title.trim().length === 0) {
    throw new Error('Service must have a title.')
  }
  if (payload.base_rate === undefined || payload.base_rate === null || isNaN(Number(payload.base_rate)) || Number(payload.base_rate) < 0) {
    throw new Error('Service must have a valid positive base rate.')
  }

  // 3. Reject Product Attributes (Leakage Prevention)
  if ('stock' in payload) {
    throw new Error('Domain Integrity Violation: A Service cannot have stock inventory.')
  }
  if ('is_on_sale' in payload || 'sale_price' in payload) {
    throw new Error('Domain Integrity Violation: A Service cannot use product sale mechanics.')
  }
}

/**
 * Validates a payload intended for the Auction domain.
 * Throws an Error if validation fails.
 */
export function validateAuctionPayload(payload: any, assetRecord: any): void {
  // 1. Core Configuration Validation
  if (payload.starting_price === undefined || payload.starting_price === null || isNaN(Number(payload.starting_price)) || Number(payload.starting_price) < 0) {
    throw new Error('Auction must have a valid starting price of 0 or greater.')
  }
  
  if (payload.reserve_price !== undefined && payload.reserve_price !== null) {
    if (isNaN(Number(payload.reserve_price)) || Number(payload.reserve_price) < Number(payload.starting_price)) {
      throw new Error('Reserve price must be greater than or equal to the starting price.')
    }
  }

  // 2. Chronological Validation
  const startsAt = new Date(payload.starts_at)
  const endsAt = new Date(payload.ends_at)
  const now = new Date()

  // We allow starting slightly in the past to account for network latency in "start now" actions
  if (startsAt.getTime() < now.getTime() - (5 * 60 * 1000)) {
    throw new Error('Auction start time cannot be in the past.')
  }
  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new Error('Auction end time must be strictly after the start time.')
  }

  // 3. Asset Integrity Validation
  if (!assetRecord) {
    throw new Error('Auction must reference a valid Asset.')
  }
  
  if (payload.seller_id !== assetRecord.seller_id) {
    throw new Error('You do not own the asset being auctioned.')
  }

  if (assetRecord.status !== 'published') {
    throw new Error('Asset must be published before it can be auctioned.')
  }

  // In the future, we can add a check like: if (!assetRecord.supports_auctions) throw Error
}
