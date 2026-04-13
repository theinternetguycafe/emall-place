import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Order } from '../types'

interface UseOrdersResult {
  orders: Order[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook for buyers to fetch their orders with real-time updates
 * Fetches from orders table and includes order_items + product details
 */
export function useOrders(userId: string | undefined): UseOrdersResult {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            product:product_id (
              title,
              product_images (url)
            )
          )
        `)
        .eq('buyer_id', userId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setOrders(data || [])
    } catch (err: any) {
      console.error('Error fetching orders:', err)
      setError('Failed to load your orders. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!userId) return

    fetchOrders()

    // Subscribe to real-time updates on orders table
    const channel = supabase
      .channel(`orders-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `buyer_id=eq.${userId}`,
        },
        () => {
          fetchOrders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  return { orders, loading, error, refetch: fetchOrders }
}
