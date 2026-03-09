import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import { XCircle, Loader2, ShoppingBag, Home, RefreshCw } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

export default function CheckoutCancelled() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const orderId = searchParams.get('order_id')

  useEffect(() => {
    markOrderAsCancelled()
  }, [orderId])

  const markOrderAsCancelled = async () => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: 'failed',
          status: 'cancelled'
        })
        .eq('id', orderId)

      if (error) {
        setError('Failed to cancel order. Please try again.')
      } else {
        setLoading(false)
        addToast('Payment cancelled', 'info')
      }
    } catch (error) {
      console.error('Error cancelling order:', error)
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const handleContinueShopping = () => {
    navigate('/shop')
  }

  const handleRetryPayment = () => {
    navigate(`/checkout?order_id=${orderId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-amber-600 mx-auto mb-6" />
          <p className="text-stone-500 font-medium">Processing your cancellation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-12 rounded-[2.5rem] border-amber-200 shadow-2xl bg-white">
          <div className="text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="h-10 w-10 text-amber-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-4">Payment Cancelled</h2>
            <p className="text-stone-500 font-medium mb-8">{error}</p>
            <div className="flex gap-4">
              <Button
                onClick={handleRetryPayment}
                variant="outline"
                className="flex-1 rounded-full py-6 font-black"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Try Payment Again
              </Button>
              <Button
                onClick={handleContinueShopping}
                className="flex-1 rounded-full py-6 font-black shadow-xl"
              >
                <Home className="h-5 w-5 mr-2" />
                Continue Shopping
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F9F8F6] pb-24">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center gap-4 mb-8">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
              <XCircle className="h-10 w-10 text-amber-600" />
            </div>
            <div>
              <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-2">Oops, Payment Cancelled</h1>
              <p className="text-stone-500 font-medium">
                No worries. You can try again or keep shopping.
              </p>
            </div>
          </div>
        </div>

        {/* Order Details */}
        <Card className="p-8 rounded-[2rem] border-stone-100 shadow-sm bg-white">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
            <ShoppingBag className="h-6 w-6 text-slate-900" />
            Your Order
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-stone-400 font-medium">Order ID:</span>
              <span className="font-bold text-slate-900">#{orderId?.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400 font-medium">Status:</span>
              <span className="font-bold text-amber-600">Cancelled</span>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-4 mt-8">
          <Button
            onClick={handleRetryPayment}
            variant="outline"
            className="flex-1 rounded-full py-6 font-black"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Try Payment Again
          </Button>
          <Button
            onClick={handleContinueShopping}
            className="flex-1 rounded-full py-6 font-black shadow-xl"
          >
            <Home className="h-5 w-5 mr-2" />
            Continue Shopping
          </Button>
        </div>
      </div>
    </div>
  )
}
