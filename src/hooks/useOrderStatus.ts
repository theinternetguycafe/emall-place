import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface UseOrderStatusResult {
  updateItemStatus: (itemId: string, newStatus: string) => Promise<void>
  loading: boolean
  error: string | null
  clearError: () => void
}

/**
 * Hook to update order item status (for sellers)
 * Updates the item_status and triggers related order status updates
 * Also triggers notifications when status changes
 */
export function useOrderStatus(): UseOrderStatusResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateItemStatus = async (itemId: string, newStatus: string) => {
    setLoading(true)
    setError(null)

    try {
      // 1. Get the item to find the order
      const { data: itemData, error: fetchError } = await supabase
        .from('order_items')
        .select('order_id, seller_id')
        .eq('id', itemId)
        .single()

      if (fetchError) throw fetchError
      if (!itemData) throw new Error('Order item not found')

      const { order_id, seller_id } = itemData

      // 2. Update the item status
      const { error: updateError } = await supabase
        .from('order_items')
        .update({ item_status: newStatus })
        .eq('id', itemId)

      if (updateError) throw updateError

      // 3. Check if all items in the order have the same status to update order status
      const { data: allItems, error: checkError } = await supabase
        .from('order_items')
        .select('item_status')
        .eq('order_id', order_id)

      if (!checkError && allItems && allItems.length > 0) {
        const allSameStatus = allItems.every((item) => item.item_status === newStatus)

        if (allSameStatus) {
          // Map item status to order status
          let orderStatus = newStatus
          if (newStatus === 'packed') orderStatus = 'finalized'
          else if (newStatus === 'delivered') orderStatus = 'completed'
          else if (newStatus === 'dispatched') orderStatus = 'dispatched'

          await supabase.from('orders').update({ status: orderStatus }).eq('id', order_id)
        }
      }

      // 4. Create notification for buyer about status change
      try {
        const { data: orderData } = await supabase
          .from('orders')
          .select('buyer_id')
          .eq('id', order_id)
          .single()

        if (orderData?.buyer_id) {
          const notificationTitle = getNotificationTitle(newStatus)
          const notificationMessage = getNotificationMessage(newStatus)

          await supabase.from('notifications').insert({
            user_id: orderData.buyer_id,
            type: 'order_update',
            title: notificationTitle,
            message: notificationMessage,
            data: { order_id, item_id: itemId, status: newStatus },
          })
        }
      } catch (notifErr) {
        // Log but don't fail if notification creation fails
        console.error('Failed to create notification:', notifErr)
      }
    } catch (err: any) {
      console.error('Error updating order status:', err)
      setError(err.message || 'Failed to update order status')
    } finally {
      setLoading(false)
    }
  }

  const clearError = () => setError(null)

  return { updateItemStatus, loading, error, clearError }
}

/**
 * Helper function to get notification title based on status
 */
function getNotificationTitle(status: string): string {
  switch (status) {
    case 'packed':
      return '📦 Order Packed'
    case 'dispatched':
      return '🚚 Order Shipped'
    case 'delivered':
      return '✅ Order Delivered'
    case 'cancelled':
      return '❌ Order Cancelled'
    default:
      return '📋 Order Updated'
  }
}

/**
 * Helper function to get notification message based on status
 */
function getNotificationMessage(status: string): string {
  switch (status) {
    case 'packed':
      return 'Your order has been packed and is ready for dispatch'
    case 'dispatched':
      return 'Your order is on the way! Track it to stay updated'
    case 'delivered':
      return 'Your order has been delivered. Enjoy your purchase!'
    case 'cancelled':
      return 'Your order has been cancelled. Refund will be processed soon'
    default:
      return 'Your order status has been updated'
  }
}
