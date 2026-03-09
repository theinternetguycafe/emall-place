import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { createYocoPaymentLink, verifyYocoPaymentStatus } from '../lib/yoco'
import { generateSnapScanQR, verifySnapScanPaymentStatus } from '../lib/snapscan'
import { ShieldCheck, Loader2, CreditCard, ArrowLeft, Lock, Zap, QrCode, CheckCircle, XCircle } from 'lucide-react'
import ErrorAlert from '../components/ErrorAlert'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function Checkout() {
  const { items, totalAmount, clearCart } = useCart()
  const { user, profile, loading: authLoading } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'yoco' | 'snapscan'>('yoco')
  const [orderId, setOrderId] = useState<string | null>(null)
  const [polling, setPolling] = useState(false)
  const [snapScanQR, setSnapScanQR] = useState<string | null>(null)
  const [showSnapScanQR, setShowSnapScanQR] = useState(false)
  const [returningFromPayment, setReturningFromPayment] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'processing' | 'success' | 'failed' | null>(null)

  const handleCheckoutFailure = async (orderId: string, reason: string) => {
    try {
      await supabase
        .from('orders')
        .update({
          status: 'failed',
          payment_status: 'failed'
        })
        .eq('id', orderId)
      
      console.log(`[Checkout] Order ${orderId} marked as failed. Reason: ${reason}`)
    } catch (err) {
      console.error('[Checkout] Failed to update order failure status:', err)
    }
  }

  const handleCheckout = async (e: React.FormEvent) => {
    if (e) e.preventDefault()
    
    // 1) Block duplicate checkout + ensure valid state
    if (loading || polling || authLoading) return
    
    // 2) If returning from payment, do NOT create a new order - just use the existing one
    if (returningFromPayment && orderId) {
      // For failed payments, user can retry with same order
      if (paymentStatus === 'failed') {
        setError(null)
        setPaymentStatus('processing')
        setLoading(true)

        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError || !session?.access_token) {
            throw new Error('Your session has expired. Please sign in again.')
          }

          // Reinitiate payment for the same order
          const { redirectUrl, error: paymentError } = await createYocoPaymentLink(
            orderId,
            totalAmount,
            items.map(item => ({
              ...item,
              itemTotal: Number((item.product.price * item.quantity).toFixed(2)),
              commissionAmount: Number((item.product.price * item.quantity * 0.08).toFixed(2))
            })),
            session.access_token,
            session.user.email,
            profile?.full_name || undefined
          )

          if (paymentError) throw new Error(paymentError)
          window.location.href = redirectUrl
        } catch (err: any) {
          console.error('[Checkout] Retry payment error:', err)
          setError(err.message || 'Failed to retry payment. Please try again.')
          setPaymentStatus('failed')
        } finally {
          setLoading(false)
        }
      }
      return
    }
    
    setError(null)
    let currentOrderId: string | null = null

    try {
      // 3) Fetch fresh session & verify token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        throw new Error('Your session has expired. Please sign in again.')
      }

      setLoading(true)
      addToast('Processing payment...', 'info')

      const commissionRate = 0.08
      const calculatedItems = items.map(item => {
        const itemTotal = Number((item.product.price * item.quantity).toFixed(2))
        const commissionAmount = Number((itemTotal * commissionRate).toFixed(2))
        return {
          ...item,
          itemTotal,
          commissionAmount
        }
      })

      const totalCommission = calculatedItems.reduce((sum, item) => sum + item.commissionAmount, 0)

      // 4) Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          buyer_id: session.user.id,
          total_amount: totalAmount,
          total_commission: totalCommission,
          status: 'pending',
          payment_status: 'unpaid'
        })
        .select()
        .single()

      if (orderError) throw new Error(`Order creation failed: ${orderError.message}`)

      currentOrderId = order.id
      setOrderId(order.id)
      console.log('[Checkout] Order created:', order.id)

      const orderItemsData = calculatedItems.map(item => ({
        order_id: order.id,
        seller_store_id: item.product.seller_store_id,
        product_id: item.product.id,
        qty: item.quantity,
        unit_price: item.product.price,
        item_total: item.itemTotal,
        commission_amount: item.commissionAmount,
        item_status: 'pending'
      }))

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsData)
      if (itemsError) throw new Error(`Failed to save order items: ${itemsError.message}`)

      // 4) Process payment
      if (paymentMethod === 'yoco') {
        const { redirectUrl, error: paymentError } = await createYocoPaymentLink(
          order.id,
          totalAmount,
          calculatedItems,
          session.access_token,
          session.user.email,
          profile?.full_name || undefined
        )

        if (paymentError) throw new Error(paymentError)
        window.location.href = redirectUrl
      } else if (paymentMethod === 'snapscan') {
        const { qrCode, transactionId, error: qrError } = await generateSnapScanQR(
          order.id,
          totalAmount,
          calculatedItems
        )

        if (qrError) throw new Error(qrError)

        console.log('[Checkout] SnapScan QR generated:', transactionId)
        setSnapScanQR(qrCode)
        setShowSnapScanQR(true)
        setTimeout(() => pollPaymentStatus(order.id, 'snapscan'), 1000)
      }
    } catch (err: any) {
      console.error('Checkout error:', err)
      const errorMessage = err.message || 'Something went wrong. Please try again.'
      
      if (currentOrderId) {
        await handleCheckoutFailure(currentOrderId, errorMessage)
      }

      setError(errorMessage)
      addToast(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  // Poll for payment status when returning from payment redirect
  useEffect(() => {
    const orderIdParam = searchParams.get('order_id')
    const statusParam = searchParams.get('status')

    if (orderIdParam) {
      setOrderId(orderIdParam)
      setReturningFromPayment(true)

      if (statusParam === 'success') {
        // Payment was successful, start polling
        setPaymentStatus('processing')
        setError(null)
        pollPaymentStatus(orderIdParam, 'yoco')
      } else if (statusParam === 'failed') {
        // Payment failed
        setPaymentStatus('failed')
        setError("Payment didn't go through. Please try again or use a different payment method.")
      } else if (statusParam === 'cancelled') {
        // Payment was cancelled
        setPaymentStatus('failed')
        setError('Payment was cancelled. Feel free to try again.')
      }
    }
  }, [searchParams])

  const pollPaymentStatus = async (orderId: string, method: 'yoco' | 'snapscan') => {
    setPolling(true)
    setError(null)

    try {
      const maxAttempts = 30 // Poll for up to 5 minutes (30 * 10 seconds)
      let attempts = 0

      const pollInterval = setInterval(async () => {
        attempts++

        let paid = false
        let status = 'pending'

        if (method === 'yoco') {
          const result = await verifyYocoPaymentStatus(orderId)
          paid = result.paid
          status = result.status
        } else if (method === 'snapscan') {
          const result = await verifySnapScanPaymentStatus(orderId)
          paid = result.paid
          status = result.status
        }

        console.log(`[Checkout] Poll attempt ${attempts}:`, { paid, status })

        if (paid) {
          clearInterval(pollInterval)
          setPolling(false)
          setPaymentStatus('success')
          setShowSnapScanQR(false)
          // Only clear cart after payment is confirmed
          clearCart()
          addToast('Payment received! 🎉', 'success')
          setTimeout(() => navigate('/account/orders'), 2000)
          return
        }

        if (status === 'failed' || status === 'cancelled') {
          clearInterval(pollInterval)
          setPolling(false)
          setShowSnapScanQR(false)
          setPaymentStatus('failed')
          setError(status === 'failed' ? "Payment didn't go through." : 'Payment was cancelled.')
          return
        }

        if (attempts >= maxAttempts) {
          clearInterval(pollInterval)
          setPolling(false)
          setShowSnapScanQR(false)
          setPaymentStatus('failed')
          setError('Payment verification timed out. Please contact support.')
        }
      }, 10000) // Poll every 10 seconds

    } catch (error) {
      setPolling(false)
      setPaymentStatus('failed')
      setShowSnapScanQR(false)
      console.error('[Checkout] Polling error:', error)
      setError('Payment check failed. Please try again.')
    }
  }

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-slate-900 mb-4" />
          <p className="text-stone-500">Verifying your session...</p>
        </div>
      </div>
    )
  }

  // Redirect to auth if not logged in
  if (!user) {
    navigate('/auth')
    return null
  }

  // Show payment processing screen when returning from payment
  if (returningFromPayment && orderId && paymentStatus === 'processing') {
    return (
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center max-w-md">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-6" />
            <h2 className="text-2xl font-black text-slate-900 mb-2">Payment Processing</h2>
            <p className="text-stone-500 mb-6">
              We're confirming your payment. This usually takes a few seconds...
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <span className="font-bold">Order ID:</span> {orderId}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show success screen when payment is confirmed
  if (returningFromPayment && orderId && paymentStatus === 'success') {
    return (
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center max-w-md">
            <CheckCircle className="h-16 w-16 text-emerald-600 mx-auto mb-6" />
            <h2 className="text-2xl font-black text-slate-900 mb-2">Payment Successful!</h2>
            <p className="text-stone-500 mb-6">
              Thank you for your order. Your items will be processed shortly.
            </p>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-emerald-900">
                <span className="font-bold">Order ID:</span> {orderId}
              </p>
            </div>
            <Button
              onClick={() => navigate('/account/orders')}
              className="w-full bg-slate-900 text-white hover:bg-slate-800"
            >
              View Your Orders
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Show failure screen when returning with failed/cancelled status
  if (returningFromPayment && orderId && paymentStatus === 'failed') {
    return (
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center max-w-md">
            <XCircle className="h-16 w-16 text-red-600 mx-auto mb-6" />
            <h2 className="text-2xl font-black text-slate-900 mb-2">Payment Failed</h2>
            {error && <p className="text-stone-600 mb-6">{error}</p>}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-900">
                <span className="font-bold">Order ID:</span> {orderId}
              </p>
            </div>
            <div className="space-y-3">
              <Button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full bg-blue-600 text-white hover:bg-blue-700"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin h-4 w-4" />
                    <span>Retrying...</span>
                  </div>
                ) : (
                  'Try Payment Again'
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/cart')}
                className="w-full"
              >
                Back to Cart
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-5xl">
      <Button 
        variant="ghost" 
        size="sm" 
        className="mb-8 -ml-2 text-stone-500 hover:text-slate-900"
        onClick={() => navigate('/cart')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Bag
      </Button>

      <div className="flex flex-col md:flex-row justify-between items-baseline mb-12 gap-4">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Checkout</h1>
        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
          <Lock size={16} />
          <span className="text-xs font-bold uppercase tracking-widest">Secure Checkout</span>
        </div>
      </div>

      {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7 space-y-8">
          {/* Show form only if not returning from successful payment */}
          {!(returningFromPayment && orderId && (paymentStatus === 'processing' || paymentStatus === 'success')) && (
            <form onSubmit={handleCheckout} className="space-y-8">
            <section>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm">1</div>
              Your Details
            </h2>
            <Card className="p-8">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-stone-400 mb-2">Name</label>
                  <Input
                    readOnly
                    value={profile?.full_name || ''}
                    className="bg-stone-50 border-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-stone-400 mb-2">Email</label>
                  <Input
                    readOnly
                    value={user?.email || ''}
                    className="bg-stone-50 border-none font-medium"
                  />
                </div>
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-100 flex items-start gap-3">
                  <ShieldCheck className="text-emerald-600 mt-0.5" size={18} />
                  <p className="text-xs text-stone-500 leading-relaxed">
                    We use this info for your order. Change it in your profile if needed.
                  </p>
                </div>
              </div>
            </Card>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm">2</div>
              Payment Method
            </h2>
            <Card className="p-8 border-2 border-slate-900">
              {!showSnapScanQR ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('yoco')}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        paymentMethod === 'yoco'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-stone-200 bg-white hover:border-blue-300'
                      }`}
                    >
                      <CreditCard className="h-5 w-5 mb-2 text-blue-600" />
                      <p className="font-bold text-sm">Yoco</p>
                      <p className="text-xs text-stone-500">Card & tap payment</p>
                    </button>

                    <button
                      type="button"
                      disabled
                      className="p-4 rounded-xl border-2 border-stone-200 bg-stone-50 text-left opacity-50 cursor-not-allowed"
                    >
                      <QrCode className="h-5 w-5 mb-2 text-purple-400" />
                      <p className="font-bold text-sm text-purple-400">SnapScan</p>
                      <p className="text-xs text-purple-400">Coming soon</p>
                    </button>

                    <button
                      type="button"
                      disabled
                      className="p-4 rounded-xl border-2 border-stone-200 bg-stone-50 text-left opacity-50 cursor-not-allowed"
                    >
                      <Zap className="h-5 w-5 mb-2 text-stone-400" />
                      <p className="font-bold text-sm text-stone-400">PayFast</p>
                      <p className="text-xs text-stone-400">Coming soon</p>
                    </button>
                  </div>

                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
                    <p className="text-sm text-stone-700">
                      {paymentMethod === 'yoco' && '💳 Card or tap payment with Yoco'}
                      {paymentMethod === 'snapscan' && '📱 Scan and pay with your SnapScan app'}
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <QrCode className="h-12 w-12 mx-auto mb-4 text-purple-600" />
                  <h3 className="text-xl font-bold mb-2">Scan to pay</h3>
                  <p className="text-sm text-stone-500 mb-6">
                    Open SnapScan and scan the QR code below
                  </p>
                  <div className="bg-white p-4 rounded-lg border border-stone-200 inline-block">
                    <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                      <rect width="200" height="200" fill="white"/>
                      <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="14" fill="#666">
                        <tspan x="50%" dy=".3em">📱 SnapScan QR</tspan>
                        <tspan x="50%" dy="1.2em" fontSize="10">{snapScanQR?.substring(0, 20)}...</tspan>
                      </text>
                    </svg>
                  </div>
                  <p className="text-xs text-stone-500 mt-4 max-w-sm mx-auto">
                    Waiting for payment... (auto-redirects when done)
                  </p>
                </div>
              )}
            </Card>
          </section>
            </form>
          )}
        </div>

        <div className="lg:col-span-5">
          <Card className="sticky top-24 bg-stone-900 text-white p-8 border-none shadow-2xl">
            <h2 className="text-2xl font-black mb-8 tracking-tight">Summary</h2>
            
            <div className="space-y-4 mb-8 max-h-64 overflow-y-auto pr-2 scrollbar-hide">
              {items.map(item => (
                <div key={item.product.id} className="flex justify-between items-start gap-4 py-2 border-b border-white/5 last:border-0">
                  <div className="flex-grow">
                    <p className="font-bold text-sm leading-tight mb-1">{item.product.title}</p>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-bold text-sm">R {(item.product.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
            
            <div className="space-y-4 border-t border-white/10 pt-8">
              <div className="flex justify-between text-white/60 text-sm font-medium">
                <span>Items</span>
                <span>R {totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-white/60 text-sm font-medium">
                <span>Delivery</span>
                <span className="text-emerald-400 font-bold uppercase text-[10px] tracking-widest">Free</span>
              </div>
              <div className="h-px bg-white/5 my-4" />
              <div className="flex justify-between items-baseline">
                <span className="text-lg font-bold">Total</span>
                <span className="text-3xl font-black">R {totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleCheckout}
              disabled={loading || polling || authLoading}
              className="w-full bg-white text-slate-900 hover:bg-stone-200 py-8 text-lg font-black rounded-full mt-10 shadow-xl"
            >
              {authLoading ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="animate-spin" size={20} />
                  <span>Verifying session...</span>
                </div>
              ) : loading || polling ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="animate-spin" size={20} />
                  <span>{polling ? 'Waiting for payment...' : 'Processing'}</span>
                </div>
              ) : (
                <span>
                  Pay Now - R {totalAmount.toLocaleString()}
                </span>
              )}
            </Button>
            
            <p className="text-[10px] text-center text-white/30 uppercase tracking-widest font-bold mt-6">
              🔒 Your payment is secure
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
