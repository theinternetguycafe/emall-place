import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export interface KycSubmission {
  id: string
  user_id: string
  status: string
  created_at: string
  document_url: string | null
  selfie_url: string | null
  id_number: string | null
  profiles: { full_name: string | null } | null
}

export interface AdminStats {
  totalUsers: number
  totalSellers: number
  pendingKyc: number
  totalProducts: number
  approvedProducts: number
  pendingProducts: number
  totalRevenue: number
  totalCommission: number
  newSellers7d: number
  totalOrders: number
}

interface AdminState {
  stats: AdminStats | null
  kycList: KycSubmission[]
  sellers: any[]
  products: any[]
  loadingStats: boolean
  loadingKyc: boolean

  fetchDashboard: () => Promise<void>
  fetchKYC: (status?: string) => Promise<void>
  fetchProducts: () => Promise<void>
  approveKYC: (submissionId: string, userId: string) => Promise<void>
  rejectKYC: (submissionId: string, userId: string) => Promise<void>
  toggleSellerStatus: (sellerId: string, currentStatus: string) => Promise<void>
  deleteStore: (sellerId: string) => Promise<{ error: string | null }>
}

export const useAdminStore = create<AdminState>((set, get) => ({
  stats: null,
  kycList: [],
  sellers: [],
  products: [],
  loadingStats: false,
  loadingKyc: false,

  fetchProducts: async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('*, product_images(*), seller_store:seller_profiles(*), category:category_id(name)')
        .order('created_at', { ascending: false })
      set({ products: data || [] })
    } catch (err) {
      console.error('[AdminStore] fetchProducts error:', err)
    }
  },

  fetchDashboard: async () => {
    set({ loadingStats: true })
    try {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
      
      const [usersRes, sellersRes, kycRes, allProductsRes, approvedRes, pendingRes, ordersRes, newSellersRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('seller_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('kyc_submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('orders').select('total_amount, total_commission'),
        supabase.from('seller_profiles').select('id', { count: 'exact', head: true }).gt('created_at', weekAgo)
      ])

      const allOrders = ordersRes.data || []
      const totalRevenue = allOrders.reduce((s, o) => s + Number(o.total_amount), 0)
      const totalCommission = allOrders.reduce((s, o) => s + Number(o.total_commission), 0)

      set({
        stats: {
          totalUsers: usersRes.count ?? 0,
          totalSellers: sellersRes.count ?? 0,
          pendingKyc: kycRes.count ?? 0,
          totalProducts: allProductsRes.count ?? 0,
          approvedProducts: approvedRes.count ?? 0,
          pendingProducts: pendingRes.count ?? 0,
          totalRevenue,
          totalCommission,
          totalOrders: allOrders.length,
          newSellers7d: newSellersRes.count ?? 0
        },
      })

      // Fetch sellers list — only profiles with a real store_name (excludes phantom/incomplete signups)
      const { data: sellers } = await supabase
        .from('seller_profiles')
        .select('*, profiles:user_id(full_name, email)')
        .not('store_name', 'is', null)
        .order('created_at', { ascending: false })
      set({ sellers: sellers || [] })
    } catch (err) {
      console.error('[AdminStore] fetchDashboard error:', err)
    } finally {
      set({ loadingStats: false })
    }
  },

  fetchKYC: async (status = 'pending') => {
    set({ loadingKyc: true })
    try {
      let query = supabase
        .from('kyc_submissions')
        .select('*, profiles:user_id(full_name, email)')
        .order('created_at', { ascending: false })
        
      if (status && status !== 'all') {
        query = query.eq('status', status)
      }

      const { data, error } = await query
      if (error) throw error

      set({ kycList: (data as KycSubmission[]) || [] })
    } catch (err) {
      console.error('[AdminStore] fetchKYC error:', err)
    } finally {
      set({ loadingKyc: false })
    }
  },

  approveKYC: async (submissionId: string, userId: string) => {
    await supabase.from('kyc_submissions').update({ status: 'approved' }).eq('id', submissionId)
    await supabase.from('seller_profiles').update({ kyc_status: 'approved' }).eq('user_id', userId)
    await get().fetchKYC()
  },

  rejectKYC: async (submissionId: string, userId: string) => {
    await supabase.from('kyc_submissions').update({ status: 'rejected' }).eq('id', submissionId)
    await supabase.from('seller_profiles').update({ kyc_status: 'rejected' }).eq('user_id', userId)
    await get().fetchKYC()
  },

  toggleSellerStatus: async (sellerId: string, currentStatus: string) => {
    const next = currentStatus === 'active' ? 'suspended' : 'active'
    await supabase.from('seller_profiles').update({ status: next }).eq('id', sellerId)
    await get().fetchDashboard()
  },

  deleteStore: async (sellerId: string) => {
    try {
      // 1. Delete product images for all products belonging to this seller
      const { data: sellerProducts } = await supabase
        .from('products')
        .select('id')
        .eq('seller_id', sellerId)

      if (sellerProducts && sellerProducts.length > 0) {
        const productIds = sellerProducts.map(p => p.id)
        await supabase.from('product_images').delete().in('product_id', productIds)
        await supabase.from('product_likes').delete().in('product_id', productIds)
        await supabase.from('products').delete().in('id', productIds)
      }

      // 2. Delete store branding record
      await supabase.from('stores').delete().eq('seller_id', sellerId)

      // 3. Delete KYC submissions tied to this seller's user_id
      const { data: sp } = await supabase.from('seller_profiles').select('user_id').eq('id', sellerId).single()
      if (sp?.user_id) {
        await supabase.from('kyc_submissions').delete().eq('user_id', sp.user_id)
      }

      // 4. Finally delete the seller profile itself
      const { error } = await supabase.from('seller_profiles').delete().eq('id', sellerId)
      if (error) throw error

      await get().fetchDashboard()
      return { error: null }
    } catch (err: any) {
      console.error('[AdminStore] deleteStore error:', err)
      return { error: err.message || 'Failed to delete store' }
    }
  },
}))
