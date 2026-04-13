import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface OrderItem {
  id: string
  order_id: string
  seller_id: string
  product_id: string
  quantity: number
  price_at_purchase: number
  item_status: string
  created_at: string
  orders?: {
    id: string
    buyer_id: string
    buyer_phone?: string
    total_amount: number
    payment_status: string
    status: string
    delivery_address?: string
    created_at: string
    paid_at?: string
    profiles?: {
      full_name: string
    }
  }
  products?: {
    title: string
    price: number
  }
}

interface UseSellerOrdersResult {
  orders: OrderItem[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook for sellers to fetch their orders with real-time updates
 * Fetches from order_items table filtered by seller_id with relations
 */
export function useSellerOrders(sellerId: string | undefined): UseSellerOrdersResult {
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = async () => {
    if (!sellerId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('order_items')
        .select(`
          *,
          orders (
            id,
            buyer_id,
            buyer_phone,
            total_amount,
            payment_status,
            status,
            delivery_address,
            created_at,
            paid_at,
            profiles:buyer_id (full_name)
          ),
          products (title, price)
        `)
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setOrders(data || [])
    } catch (err: any) {
      console.error('Error fetching seller orders:', err)
      setError('Failed to load your orders. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!sellerId) return

    fetchOrders()

    // Subscribe to real-time updates on order_items table
    const channel = supabase
      .channel(`seller-orders-${sellerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items',
          filter: `seller_id=eq.${sellerId}`,
        },
        () => {
          fetchOrders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sellerId])

  return { orders, loading, error, refetch: fetchOrders }
}
