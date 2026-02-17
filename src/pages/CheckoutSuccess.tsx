import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../contexts/ToastContext'
import { CheckCircle, Loader2, ShoppingBag, Home } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

export default function CheckoutSuccess() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const orderId = searchParams.get('order_id')

  useEffect(() => {
    verifyPayment()
  }, [orderId])

  const verifyPayment = async () => {
    try {
      const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (error) {
        setError('Failed to verify payment. Please contact support.')
        setLoading(false)
        return
      }

      if (!order) {
        setError('Order not found. Please contact support.')
        setLoading(false)
        return
      }

      const isPaid = order.payment_status === 'paid' || order.status === 'completed'

      if (isPaid) {
        setSuccess(true)
        setLoading(false)
        addToast('Payment received! 🎉', 'success')
      } else {
        setError('Payment is still processing. Please wait...')
        setLoading(false)
      }
    } catch (error) {
      console.error('Error verifying payment:', error)
      setError('An error occurred while verifying your payment.')
      setLoading(false)
    }
  }

  const handleContinueShopping = () => {
    navigate('/shop')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-emerald-600 mx-auto mb-6" />
          <p className="text-stone-500 font-medium">Verifying your payment...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-12 rounded-[2.5rem] border-rose-200 shadow-2xl bg-white">
          <div className="text-center">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="animate-spin h-8 w-8 text-rose-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-4">Payment Issue</h2>
            <p className="text-stone-500 font-medium mb-8">{error}</p>
            <Button
              onClick={handleContinueShopping}
              className="w-full rounded-full py-6 font-black"
            >
              Continue Shopping
            </Button>
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
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-2">
                All Set! 🎉
              </h1>
              <p className="text-stone-500 font-medium">
                Your payment went through. Your goods are on the way soon.
              </p>
            </div>
          </div>
        </div>

        {/* Order Details */}
        <Card className="p-8 rounded-[2rem] border-stone-100 shadow-sm bg-white mb-8">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
            <ShoppingBag className="h-6 w-6 text-slate-900" />
            Your Order
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-stone-400 font-medium">Order ID:</span>
              <span className="font-bold text-slate-900 font-mono">#{orderId?.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400 font-medium">Status:</span>
              <span className="font-bold text-emerald-600">Payment Confirmed ✓</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 mt-6">
              <p className="text-sm text-emerald-900">
                <span className="font-bold">What happens next?</span> We'll notify you when the seller ships your order. Keep an eye on your email for updates.
              </p>
            </div>
          </div>
        </Card>

        {/* Next Steps */}
        <Card className="p-8 rounded-[2rem] border-stone-100 shadow-sm bg-white mb-8">
          <h2 className="text-lg font-bold mb-6">Next Steps</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">1</div>
              <div>
                <p className="font-bold text-slate-900">Seller Confirmation</p>
                <p className="text-sm text-stone-500">The seller will confirm and prepare your order.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">2</div>
              <div>
                <p className="font-bold text-slate-900">Shipping Notification</p>
                <p className="text-sm text-stone-500">You'll get an email when your order ships.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">3</div>
              <div>
                <p className="font-bold text-slate-900">Track Your Order</p>
                <p className="text-sm text-stone-500">Use "My Orders" to track delivery progress.</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            onClick={() => navigate('/account/orders')}
            className="flex-1 rounded-full py-6 font-black shadow-xl bg-slate-900 hover:bg-slate-800"
          >
            <Home className="h-5 w-5 mr-2" />
            View Your Orders
          </Button>
          <Button
            onClick={handleContinueShopping}
            variant="outline"
            className="flex-1 rounded-full py-6 font-black"
          >
            <ShoppingBag className="h-5 w-5 mr-2" />
            Continue Shopping
          </Button>
        </div>
      </div>
    </div>

  )
}
