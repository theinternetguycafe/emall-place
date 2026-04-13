import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export interface NearbyService {
  id: string
  store_name: string
  seller_type: string
  is_online: boolean
  latitude: number
  longitude: number
  address: string | null
  rating_avg: number
  rating_count: number
  radius_km: number | null
  service_mode: string | null
  seller_email: string | null
  seller_phone: string | null
  stores: Array<{ logo_url: string | null; tagline: string | null; banner_url: string | null }>
  min_base_rate?: number
  store_slug?: string
}

interface ServiceState {
  services: NearbyService[]
  loading: boolean
  /** Unix ms timestamp of last successful fetch */
  lastFetchedAt: number | null
  userLat: number | null
  userLng: number | null

  fetchNearby: (lat: number, lng: number, radiusKm?: number) => Promise<void>
  reset: () => void
}

export const useServiceStore = create<ServiceState>((set) => ({
  services: [],
  loading: false,
  lastFetchedAt: null,
  userLat: null,
  userLng: null,

  fetchNearby: async (lat: number, lng: number, radiusKm = 50) => {
    set({ loading: true, userLat: lat, userLng: lng })
    try {
      // Bounding box approximation (~111 km per degree of latitude)
      const degRadius = radiusKm / 111

      const { data, error } = await supabase
        .from('seller_profiles')
        .select('*, store_slug, stores(logo_url, tagline, banner_url)')
        .not('latitude', 'is', null)
        .neq('store_name', 'dev test 2')
        .not('longitude', 'is', null)
        .in('seller_type', ['service', 'both', 'product'])
        .eq('is_online', true)
        .eq('onboarding_completed', true)
        .eq('kyc_status', 'approved')
        .gte('latitude', lat - degRadius)
        .lte('latitude', lat + degRadius)
        .gte('longitude', lng - degRadius)
        .lte('longitude', lng + degRadius)
        .limit(100)

      if (error) throw error

      let services = (data as NearbyService[]) || []
      
      // Calculate min base rate for each provider
      if (services.length > 0) {
        const sellerIds = services.map(s => s.id)
        const { data: allSvcRates } = await supabase
          .from('services')
          .select('seller_id, base_rate')
          .in('seller_id', sellerIds)
          .eq('status', 'approved')
          .eq('is_active', true)
        
        if (allSvcRates) {
          const minPricesBySeller: Record<string, number> = {}
          allSvcRates.forEach((rate: any) => {
            const sid = rate.seller_id
            const val = Number(rate.base_rate)
            if (!minPricesBySeller[sid] || val < minPricesBySeller[sid]) {
              minPricesBySeller[sid] = val
            }
          })

          services = services.map(s => ({
            ...s,
            min_base_rate: minPricesBySeller[s.id] || 0
          }))
        }
      }

      set({ services, lastFetchedAt: Date.now() })
    } catch (err) {
      console.error('[ServiceStore] fetchNearby error:', err)
      set({ services: [] })
    } finally {
      set({ loading: false })
    }
  },

  reset: () => set({ services: [], lastFetchedAt: null, userLat: null, userLng: null }),
}))
