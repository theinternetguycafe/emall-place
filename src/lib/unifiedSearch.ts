import { supabase } from './supabase'
import { Product, Service } from '../types'

export type UnifiedFeedItem = 
  | { type: 'product'; data: Product & { seller_store?: any } }
  | { type: 'service'; data: Service & { seller_store?: any } }

interface SearchOptions {
  query?: string
  categoryId?: string | 'all'
  storeId?: string | 'all'
  sortBy?: 'newest' | 'price_low' | 'price_high'
  domain?: 'all' | 'product' | 'service'
  limit?: number
}

/**
 * The Conductor: Performs parallel queries to products and services
 * and interleaves the results.
 */
export async function fetchUnifiedFeed({
  query = '',
  categoryId = 'all',
  storeId = 'all',
  sortBy = 'newest',
  domain = 'all',
  limit = 50
}: SearchOptions): Promise<UnifiedFeedItem[]> {
  
  const [productsRes, servicesRes] = await Promise.all([
    // Fetch Products
    domain === 'all' || domain === 'product'
      ? (async () => {
          let q = supabase.from('products').select('*, seller_store:seller_profiles(*), product_images(*)').eq('status', 'approved')
          if (query) q = q.ilike('title', `%${query}%`)
          if (categoryId !== 'all') q = q.eq('category_id', categoryId)
          if (storeId !== 'all') q = q.eq('seller_id', storeId)
          
          if (sortBy === 'price_low') q = q.order('price', { ascending: true })
          else if (sortBy === 'price_high') q = q.order('price', { ascending: false })
          else q = q.order('created_at', { ascending: false })

          const { data, error } = await q.limit(limit)
          if (error) { console.error('Products error', error); return [] }
          return (data || []).map(p => ({ type: 'product' as const, data: p }))
        })()
      : Promise.resolve([]),

    // Fetch Services
    domain === 'all' || domain === 'service'
      ? (async () => {
          let q = supabase.from('services').select('*, seller_store:seller_profiles(*)').eq('status', 'approved').eq('is_active', true)
          if (query) q = q.ilike('title', `%${query}%`)
          if (categoryId !== 'all') q = q.eq('category_id', categoryId)
          if (storeId !== 'all') q = q.eq('seller_id', storeId)
          
          if (sortBy === 'price_low') q = q.order('base_rate', { ascending: true })
          else if (sortBy === 'price_high') q = q.order('base_rate', { ascending: false })
          else q = q.order('created_at', { ascending: false })

          const { data, error } = await q.limit(limit)
          if (error) { console.error('Services error', error); return [] }
          return (data || []).map(s => ({ type: 'service' as const, data: s }))
        })()
      : Promise.resolve([])
  ])

  // Combine and interleave
  const mixed: UnifiedFeedItem[] = []
  
  // Simple interleaving (1 product, 1 service, 1 product, 1 service...)
  let pIdx = 0
  let sIdx = 0
  
  while (pIdx < productsRes.length || sIdx < servicesRes.length) {
    if (pIdx < productsRes.length) {
      mixed.push(productsRes[pIdx])
      pIdx++
    }
    if (sIdx < servicesRes.length) {
      mixed.push(servicesRes[sIdx])
      sIdx++
    }
  }

  // If a specific sort was requested, apply it globally after combining
  if (sortBy === 'price_low') {
    mixed.sort((a, b) => {
      const pA = a.type === 'product' ? a.data.price : a.data.base_rate
      const pB = b.type === 'product' ? b.data.price : b.data.base_rate
      return pA - pB
    })
  } else if (sortBy === 'price_high') {
    mixed.sort((a, b) => {
      const pA = a.type === 'product' ? a.data.price : a.data.base_rate
      const pB = b.type === 'product' ? b.data.price : b.data.base_rate
      return pB - pA
    })
  } else if (sortBy === 'newest') {
    mixed.sort((a, b) => {
      const tA = new Date(a.data.created_at || 0).getTime()
      const tB = new Date(b.data.created_at || 0).getTime()
      return tB - tA
    })
  }

  return mixed.slice(0, limit)
}
