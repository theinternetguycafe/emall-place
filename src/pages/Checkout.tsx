import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { createYocoPaymentLink, verifyYocoPaymentStatus } from '../lib/yoco'
import { generateSnapScanQR, verifySnapScanPaymentStatus } from '../lib/snapscan'
import { calculateCartTotals } from '../utils/cartMath'
import { getDistance } from '../utils/distance'
import { HUB, PRODUCT_DELIVERY_RATE_PER_KM, SERVICE_DELIVERY_RATE_PER_KM, DELIVERY_FALLBACK_FEE } from '../utils/hub'
import { ShieldCheck, Loader2, CreditCard, ArrowLeft, Lock, QrCode, CheckCircle, XCircle, MapPin, Package, Phone } from 'lucide-react'
import ErrorAlert from '../components/ErrorAlert'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import AuthModal from '../components/auth/AuthModal'

const mapPaymentError = (err: any): string => {
  const msg = typeof err === 'string' ? err : (err?.message || err?.error || String(err))
  const lowerMsg = msg.toLowerCase()
  if (lowerMsg.includes('failed to fetch') || lowerMsg.includes('fetch failed') || lowerMsg.includes('network') || lowerMsg.includes('offline')) return 'Network connection lost. Please check your internet and try again.'
  if (lowerMsg.includes('timeout') || lowerMsg.includes('time out')) return 'The connection timed out. Please try again.'
  if (lowerMsg.includes('card_declined') || lowerMsg.includes('declined')) return 'Your card was declined by your bank. Please try another card.'
  if (lowerMsg.includes('expired_card') || lowerMsg.includes('expired')) return 'This card has expired. Please use a valid card.'
  if (lowerMsg.includes('insufficient_funds')) return 'Insufficient funds. Please check your balance or use another card.'
  if (lowerMsg.includes('invalid_card')) return 'Invalid card details provided. Please check the number and try again.'
  if (lowerMsg.includes('authentication_failed')) return 'Payment authentication failed. Please try again.'
  if (lowerMsg.includes('processing_error')) return 'Payment processing error. Please try again later.'
  if (typeof err === 'object' && err !== null) return 'Payment could not be completed at this time. Please try again.'
  if (lowerMsg.length < 50 && !lowerMsg.includes('object object')) return msg
  return 'Payment could not be completed at this time. Please try again.'
}

interface SellerLocation {
  seller_id: string
  latitude: number | null
  longitude: number | null
  store_name: string | null
  seller_type?: 'product' | 'service' | 'both'
}

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
  const [showAuthModal, setShowAuthModal] = useState(false)

  // Delivery state
  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>('delivery')
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [locating, setLocating] = useState(false)
  const [sellerLocations, setSellerLocations] = useState<SellerLocation[]>([])
  const [loadingSellerLocs, setLoadingSellerLocs] = useState(false)

  // Autofill phone from profile
  useEffect(() => {
    if (profile?.phone && !buyerPhone) setBuyerPhone(profile.phone)
  }, [profile?.phone])

  // Fetch seller locations for all items in cart
  useEffect(() => {
    const uniqueSellerIds = [...new Set(items.map(i => i.product.seller_id).filter(Boolean))] as string[]
    if (!uniqueSellerIds.length) return
    setLoadingSellerLocs(true)
    supabase
      .from('seller_profiles')
      .select('id, latitude, longitude, store_name, seller_type')
      .in('id', uniqueSellerIds)
      .then(({ data }) => {
        if (data) {
          setSellerLocations(data.map(d => ({
            seller_id: d.id,
            latitude: d.latitude,
            longitude: d.longitude,
            store_name: d.store_name,
            seller_type: d.seller_type
          })))
        }
        setLoadingSellerLocs(false)
      })
  }, [items])

  const cartHasServices = items.some(item => {
    const seller = sellerLocations.find(s => s.seller_id === item.product.seller_id)
    return seller?.seller_type === 'service' || (seller?.seller_type === 'both' && item.product.stock >= 999)
  })
  
  const cartHasProducts = items.some(item => {
    const seller = sellerLocations.find(s => s.seller_id === item.product.seller_id)
    return seller?.seller_type === 'product' || (seller?.seller_type === 'both' && item.product.stock < 999)
  })

  // Delivery fee: sum of travel fees per seller
  const deliveryFee = React.useMemo(() => {
    if (deliveryMode === 'pickup') return 0

    if (!userCoords) return DELIVERY_FALLBACK_FEE // R100 flat if no location

    const sellersWithCoords = sellerLocations.filter(s => s.latitude != null && s.longitude != null)
    if (!sellersWithCoords.length) {
      // Fall back to hub→buyer distance if no seller coords found (assuming mostly products)
      const hubDist = getDistance(userCoords, { latitude: HUB.lat, longitude: HUB.lng })
      const minFee = cartHasServices ? 10 : 5
      const rate = cartHasServices ? SERVICE_DELIVERY_RATE_PER_KM : PRODUCT_DELIVERY_RATE_PER_KM
      return hubDist !== null ? Math.max(minFee, Math.ceil(hubDist * rate)) : DELIVERY_FALLBACK_FEE
    }

    // Calculate per-seller fees
    const totalFee = sellersWithCoords.reduce((sum, seller) => {
      const sellerItems = items.filter(i => i.product.seller_id === seller.seller_id)
      const hasService = sellerItems.some(i => seller.seller_type === 'service' || (seller.seller_type === 'both' && i.product.stock >= 999))
      
      const rate = hasService ? SERVICE_DELIVERY_RATE_PER_KM : PRODUCT_DELIVERY_RATE_PER_KM
      const minFee = hasService ? 10 : 5

      const dist = getDistance(userCoords, { latitude: seller.latitude!, longitude: seller.longitude! })
      if (dist === null) return sum + minFee // fallback per seller
      return sum + Math.max(minFee, Math.ceil(dist * rate))
    }, 0)

    return totalFee
  }, [userCoords, sellerLocations, deliveryMode, cartHasServices])

  // Biggest seller distance for display
  const maxSellerDistKm = React.useMemo(() => {
    if (!userCoords || !sellerLocations.length) return null
    const dists = sellerLocations
      .filter(s => s.latitude != null && s.longitude != null)
      .map(s => getDistance(userCoords, { latitude: s.latitude!, longitude: s.longitude! }))
      .filter((d): d is number => d !== null)
    return dists.length ? Math.max(...dists) : null
  }, [userCoords, sellerLocations])

  const grandTotal = totalAmount + deliveryFee

  useEffect(() => {
    if (!authLoading && !user) setShowAuthModal(true)
  }, [user, authLoading])

  const handleCheckoutFailure = async (orderId: string, reason: string) => {
    try {
      await supabase.from('orders').update({ status: 'failed', payment_status: 'failed' }).eq('id', orderId)
    } catch (err) {
      console.error('[Checkout] Failed to update order failure status:', err)
    }
  }

  const handleCheckout = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!user) { setShowAuthModal(true); return }
    if (loading || polling || authLoading) return

    if (returningFromPayment && orderId) {
      if (paymentStatus === 'failed') {
        setError(null)
        setPaymentStatus('processing')
        setLoading(true)
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          if (sessionError || !session?.access_token) throw new Error('Your session has expired. Please sign in again.')
          const { redirectUrl, error: paymentError } = await createYocoPaymentLink(orderId, grandTotal, calculateCartTotals(items).items, session.access_token, session.user.email, profile?.full_name || undefined)
          if (paymentError) throw new Error(paymentError)
          window.location.href = redirectUrl
        } catch (err: any) {
          setError(err.message || 'Failed to retry payment.')
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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.access_token) throw new Error('Your session has expired. Please sign in again.')

      setLoading(true)
      addToast('Processing payment...', 'info')

      const { items: calculatedItems, totalCommission, totalAmount: mathTotal, reconciled } = calculateCartTotals(items)
      if (!reconciled || Math.abs(totalAmount - mathTotal) > 0.05) {
        console.warn('[Checkout] Cart totals did not reconcile exactly.')
      }

      // Create order with delivery info
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          buyer_id: session.user.id,
          total_amount: grandTotal,
          total_commission: totalCommission,
          status: 'pending',
          payment_status: 'unpaid',
          delivery_fee: deliveryFee,
          delivery_mode: deliveryMode,
          delivery_address: deliveryMode === 'delivery' ? (deliveryAddress || null) : (cartHasServices && !cartHasProducts ? 'At Service Provider Location' : 'Pickup at The Internet Guy Cafe'),
          buyer_phone: buyerPhone || null,
          buyer_lat: userCoords?.lat || null,
          buyer_lng: userCoords?.lng || null,
        })
        .select()
        .single()

      if (orderError) throw new Error(`Order creation failed: ${orderError.message}`)

      currentOrderId = order.id
      setOrderId(order.id)

      const orderItemsData = calculatedItems.map(item => ({
        order_id: order.id,
        seller_id: item.product.seller_id,
        product_id: item.product.id,
        qty: item.quantity,
        unit_price: item.product.price,
        item_total: item.itemTotal,
        commission_amount: item.commissionAmount,
        item_status: 'pending'
      }))

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsData)
      if (itemsError) throw new Error(`Failed to save order items: ${itemsError.message}`)

      if (paymentMethod === 'yoco') {
        const { redirectUrl, error: paymentError } = await createYocoPaymentLink(order.id, grandTotal, calculatedItems, session.access_token, session.user.email, profile?.full_name || undefined)
        if (paymentError) throw new Error(paymentError)
        window.location.href = redirectUrl
      } else if (paymentMethod === 'snapscan') {
        const { qrCode, transactionId, error: qrError } = await generateSnapScanQR(order.id, grandTotal, calculatedItems)
        if (qrError) throw new Error(qrError)
        setSnapScanQR(qrCode)
        setShowSnapScanQR(true)
        setTimeout(() => pollPaymentStatus(order.id, 'snapscan'), 1000)
      }
    } catch (err: any) {
      console.error('Checkout error:', err)
      const errorMessage = mapPaymentError(err)
      if (currentOrderId) await handleCheckoutFailure(currentOrderId, errorMessage)
      setError(errorMessage)
      addToast(errorMessage, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const orderIdParam = searchParams.get('order_id')
    const statusParam = searchParams.get('status')
    const errorParam = searchParams.get('error') || searchParams.get('errorCode') || searchParams.get('error_description')
    if (orderIdParam) {
      setOrderId(orderIdParam)
      setReturningFromPayment(true)
      if (statusParam === 'success') {
        setPaymentStatus('processing')
        setError(null)
        pollPaymentStatus(orderIdParam, 'yoco')
      } else if (statusParam === 'failed') {
        setPaymentStatus('failed')
        setError(errorParam ? mapPaymentError(errorParam) : "Payment didn't go through. Please try again.")
      } else if (statusParam === 'cancelled') {
        setPaymentStatus('failed')
        setError('Payment was cancelled. Feel free to try again.')
      }
    }
  }, [searchParams])

  const pollPaymentStatus = async (orderId: string, method: 'yoco' | 'snapscan') => {
    setPolling(true)
    setError(null)
    try {
      const maxAttempts = 30
      let attempts = 0
      const checkStatus = async () => {
        attempts++
        let paid = false, status = 'pending'
        if (method === 'yoco') { const r = await verifyYocoPaymentStatus(orderId); paid = r.paid; status = r.status }
        else { const r = await verifySnapScanPaymentStatus(orderId); paid = r.paid; status = r.status }
        if (paid) { if (pollInterval) clearInterval(pollInterval); setPolling(false); setPaymentStatus('success'); setShowSnapScanQR(false); clearCart(); addToast('Payment received! 🎉', 'success'); setTimeout(() => navigate('/account/orders'), 2000); return true }
        if (status === 'failed' || status === 'cancelled') { if (pollInterval) clearInterval(pollInterval); setPolling(false); setShowSnapScanQR(false); setPaymentStatus('failed'); setError(status === 'failed' ? "Payment didn't go through." : 'Payment was cancelled.'); return true }
        if (attempts >= maxAttempts) { if (pollInterval) clearInterval(pollInterval); setPolling(false); setShowSnapScanQR(false); setPaymentStatus('failed'); setError('Payment verification timed out. Please contact support.'); return true }
        return false
      }
      const done = await checkStatus()
      if (done) return
      let pollInterval: ReturnType<typeof setInterval> | null = setInterval(checkStatus, 10000)
    } catch (error) {
      setPolling(false); setPaymentStatus('failed'); setShowSnapScanQR(false)
      setError('Payment check failed. Please try again.')
    }
  }

  const handleLocateMe = () => {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
        addToast('Location captured ✓', 'success')
      },
      (err) => {
        console.warn(err)
        addToast("Couldn't get your location. A flat fee may apply.", 'error')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
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

  if (!user && !authLoading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-5xl min-h-[50vh] flex flex-col items-center justify-center">
        <h2 className="text-2xl font-black text-slate-900 mb-4">Account Required</h2>
        <p className="text-stone-500 mb-8 text-center max-w-md">Please sign in or create an account to complete your checkout and secure your order.</p>
        <Button onClick={() => setShowAuthModal(true)} className="bg-slate-900 text-white hover:bg-slate-800 px-8 py-3 rounded-full font-bold">Sign In / Register</Button>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onSuccess={() => setShowAuthModal(false)} />
      </div>
    )
  }

  if (returningFromPayment && orderId && paymentStatus === 'processing') {
    return (
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center max-w-md">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-6" />
            <h2 className="text-2xl font-black text-slate-900 mb-2">Payment Processing</h2>
            <p className="text-stone-500 mb-6">We're confirming your payment. This usually takes a few seconds...</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900"><span className="font-bold">Order ID:</span> {orderId}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (returningFromPayment && orderId && paymentStatus === 'success') {
    return (
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center max-w-md">
            <CheckCircle className="h-16 w-16 text-emerald-600 mx-auto mb-6" />
            <h2 className="text-2xl font-black text-slate-900 mb-2">Payment Successful!</h2>
            <p className="text-stone-500 mb-6">Thank you for your order. Your items will be processed shortly.</p>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-emerald-900"><span className="font-bold">Order ID:</span> {orderId}</p>
            </div>
            <Button onClick={() => navigate('/account/orders')} className="w-full bg-slate-900 text-white hover:bg-slate-800">View Your Orders</Button>
          </div>
        </div>
      </div>
    )
  }

  if (returningFromPayment && orderId && paymentStatus === 'failed') {
    return (
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center max-w-md">
            <XCircle className="h-16 w-16 text-red-600 mx-auto mb-6" />
            <h2 className="text-2xl font-black text-slate-900 mb-2">Payment Failed</h2>
            {error && <p className="text-stone-600 mb-6">{error}</p>}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-900"><span className="font-bold">Order ID:</span> {orderId}</p>
            </div>
            <div className="space-y-3">
              <Button onClick={handleCheckout} disabled={loading} className="w-full bg-blue-600 text-white hover:bg-blue-700">
                {loading ? <div className="flex items-center gap-2"><Loader2 className="animate-spin h-4 w-4" /><span>Retrying...</span></div> : 'Try Payment Again'}
              </Button>
              <Button variant="ghost" onClick={() => navigate('/cart')} className="w-full">Back to Cart</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-5xl">
      <Button variant="ghost" size="sm" className="mb-8 -ml-2 text-stone-500 hover:text-slate-900" onClick={() => navigate('/cart')}>
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
          <form onSubmit={handleCheckout} className="space-y-8">

            {/* ── STEP 1: Your Details ─────────────────────────── */}
            <section>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm">1</div>
                Your Details
              </h2>
              <Card className="p-8">
                <div className="grid grid-cols-1 gap-5">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-stone-400 mb-2">Full Name</label>
                    <Input readOnly value={profile?.full_name || ''} className="bg-stone-50 border-none font-medium" />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-stone-400 mb-2">Email</label>
                    <Input readOnly value={user?.email || ''} className="bg-stone-50 border-none font-medium" />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-stone-400 mb-2">
                      Phone Number <span className="text-stone-300">(for delivery contact)</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                      <input
                        type="tel"
                        value={buyerPhone}
                        onChange={e => setBuyerPhone(e.target.value)}
                        placeholder="e.g. 071 234 5678"
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-stone-200 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 placeholder:text-stone-300"
                      />
                    </div>
                  </div>
                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-100 flex items-start gap-3">
                    <ShieldCheck className="text-emerald-600 mt-0.5 shrink-0" size={18} />
                    <p className="text-xs text-stone-500 leading-relaxed">Your details are used for this order only. Update them anytime in your profile.</p>
                  </div>
                </div>
              </Card>
            </section>

            {/* ── STEP 2: Delivery or Pickup ────────────────────── */}
            <section>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm">2</div>
                Delivery / Pickup
              </h2>
              <Card className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryMode('delivery')}
                    className={`p-4 rounded-2xl border-2 transition-all text-left ${deliveryMode === 'delivery' ? 'border-slate-900 bg-slate-50' : 'border-stone-100 bg-white hover:border-stone-200'}`}
                  >
                    <Package className={`mb-2 ${deliveryMode === 'delivery' ? 'text-slate-900' : 'text-stone-400'}`} size={20} />
                    <p className={`text-xs font-black uppercase tracking-widest ${deliveryMode === 'delivery' ? 'text-slate-900' : 'text-stone-400'}`}>
                      {cartHasServices && !cartHasProducts ? 'On-site Service' : (cartHasServices ? 'Delivery & On-site' : 'Delivery')}
                    </p>
                    <p className="text-[10px] text-stone-400 mt-1">
                      {cartHasServices && !cartHasProducts ? 'We come to your location' : (cartHasServices ? 'Delivered to you / Service at location' : 'We bring it to you')}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMode('pickup')}
                    className={`p-4 rounded-2xl border-2 transition-all text-left ${deliveryMode === 'pickup' ? 'border-slate-900 bg-slate-50' : 'border-stone-100 bg-white hover:border-stone-200'}`}
                  >
                    <MapPin className={`mb-2 ${deliveryMode === 'pickup' ? 'text-slate-900' : 'text-stone-400'}`} size={20} />
                    <p className={`text-xs font-black uppercase tracking-widest ${deliveryMode === 'pickup' ? 'text-slate-900' : 'text-stone-400'}`}>
                      {cartHasServices && !cartHasProducts ? 'In-house Service' : (cartHasServices ? 'Pickup & In-house' : 'Pickup')}
                    </p>
                    <p className="text-[10px] text-stone-400 mt-1">
                      {cartHasServices && !cartHasProducts ? "At Service Provider's Location — Free" : (cartHasServices ? 'Products at Hub / Services at Provider — Free' : 'Collect at The Internet Guy Cafe — Free')}
                    </p>
                  </button>
                </div>

                {deliveryMode === 'delivery' && (
                  <div className="space-y-4">
                    {/* GPS location capture */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <div>
                        <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-1">
                          <MapPin className="text-blue-500" size={16} /> Your Location
                        </h3>
                        <p className="text-xs text-stone-500">
                          {userCoords
                            ? maxSellerDistKm != null
                              ? `Farthest seller is ${maxSellerDistKm.toFixed(1)} km from you — R${deliveryFee} delivery fee`
                              : `Location captured — R${deliveryFee} delivery fee`
                            : 'Share your location so we can calculate delivery from each seller.'}
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={handleLocateMe}
                        disabled={locating}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full shrink-0 text-sm"
                      >
                        {locating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MapPin className="h-4 w-4 mr-2" />}
                        {userCoords ? 'Update' : 'Locate Me'}
                      </Button>
                    </div>

                    {/* sellers distance breakdown */}
                    {userCoords && sellerLocations.length > 0 && (
                      <div className="text-xs text-stone-500 space-y-1 bg-stone-50 p-4 rounded-xl border border-stone-100">
                        <p className="font-black text-stone-700 uppercase tracking-widest mb-2">Delivery Breakdown</p>
                        {sellerLocations.map(s => {
                          const sellerItems = items.filter(i => i.product.seller_id === s.seller_id)
                          const hasService = sellerItems.some(i => s.seller_type === 'service' || (s.seller_type === 'both' && i.product.stock >= 999))
                          const rate = hasService ? SERVICE_DELIVERY_RATE_PER_KM : PRODUCT_DELIVERY_RATE_PER_KM
                          const minFee = hasService ? 10 : 5

                          const d = s.latitude && s.longitude
                            ? getDistance(userCoords, { latitude: s.latitude, longitude: s.longitude })
                            : null
                          const fee = d !== null ? Math.max(minFee, Math.ceil(d * rate)) : minFee
                          
                          return (
                            <div key={s.seller_id} className="flex justify-between">
                              <span>{s.store_name || 'Seller'} {hasService ? '(Service)' : ''} ({d !== null ? `${d.toFixed(1)} km` : '?'})</span>
                              <span className="font-bold text-slate-900">R{fee}</span>
                            </div>
                          )
                        })}
                        <div className="border-t border-stone-200 mt-2 pt-2 flex justify-between font-black text-slate-900">
                          <span>Total Fees</span>
                          <span>R{deliveryFee}</span>
                        </div>
                        <p className="text-[10px] text-stone-400 mt-1">
                          Product Rate: R{PRODUCT_DELIVERY_RATE_PER_KM}/km (Min R5) • Service Rate: R{SERVICE_DELIVERY_RATE_PER_KM}/km (Min R10)
                        </p>
                      </div>
                    )}

                    {!userCoords && (
                      <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl font-medium border border-amber-200">
                        ⚠️ Without your location a flat rate of R{DELIVERY_FALLBACK_FEE} applies. Tap "Locate Me" for an accurate fee.
                      </div>
                    )}

                    {/* Street address */}
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-stone-400 mb-2">
                        Delivery Address <span className="text-stone-300">(Optional — helps the courier)</span>
                      </label>
                      <textarea
                        value={deliveryAddress}
                        onChange={e => setDeliveryAddress(e.target.value)}
                        placeholder="e.g. 12 Main Street, Soshanguve, 0152"
                        rows={2}
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 placeholder:text-stone-300 resize-none"
                      />
                    </div>
                  </div>
                )}

                {deliveryMode === 'pickup' && (
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-sm text-emerald-800 flex items-start gap-3">
                    <MapPin className="text-emerald-600 shrink-0 mt-0.5" size={16} />
                    <div className="space-y-4">
                      {cartHasProducts && (
                        <div>
                          <p className="font-bold">The Internet Guy Cafe</p>
                          <p className="text-xs text-emerald-700 mt-1">Collect your products at the hub — no delivery fee. We'll notify you when they're ready.</p>
                        </div>
                      )}
                      {cartHasServices && (
                        <div>
                          <p className="font-bold">Service Provider Location (In-house)</p>
                          <p className="text-xs text-emerald-700 mt-1">Visit your service provider at their registered location at the scheduled time — no travel fees.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </section>

            {/* ── STEP 3: Payment Method ────────────────────────── */}
            <section>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm">3</div>
                Payment Method
              </h2>
              <Card className="p-8 border-2 border-slate-900">
                {!showSnapScanQR ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('yoco')}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${paymentMethod === 'yoco' ? 'border-blue-600 bg-blue-50' : 'border-stone-200 bg-white hover:border-blue-300'}`}
                      >
                        <CreditCard className="h-5 w-5 mb-2 text-blue-600" />
                        <p className="font-bold text-sm">Yoco</p>
                        <p className="text-xs text-stone-500">Card & tap payment</p>
                      </button>
                      <button type="button" disabled className="p-4 rounded-xl border-2 border-stone-200 bg-stone-50 text-left opacity-50 cursor-not-allowed">
                        <QrCode className="h-5 w-5 mb-2 text-purple-400" />
                        <p className="font-bold text-sm text-purple-400">SnapScan</p>
                        <p className="text-xs text-purple-400">Coming soon</p>
                      </button>
                    </div>
                    <div className="p-4 bg-stone-50 rounded-xl border border-stone-100">
                      <p className="text-sm text-stone-700">💳 Card or tap payment with Yoco</p>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <QrCode className="h-12 w-12 mx-auto mb-4 text-purple-600" />
                    <h3 className="text-xl font-bold mb-2">Scan to pay</h3>
                    <p className="text-sm text-stone-500 mb-6">Open SnapScan and scan the QR code below</p>
                    <p className="text-xs text-stone-500 mt-4 max-w-sm mx-auto">Waiting for payment... (auto-redirects when done)</p>
                  </div>
                )}
              </Card>
            </section>
          </form>
        </div>

        {/* ── ORDER SUMMARY SIDEBAR ───────────────────────────── */}
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
              <div className="flex justify-between text-sm font-medium">
                <span className="text-white/60">
                  {deliveryMode === 'pickup' 
                    ? (cartHasServices && !cartHasProducts ? 'In-house Service' : (cartHasServices ? 'Pickup & In-house' : 'Pickup'))
                    : (cartHasServices && !cartHasProducts ? 'On-site Service' : (cartHasServices ? 'Delivery & On-site' : 'Delivery'))
                  }
                </span>
                <span className={deliveryFee === 0 ? 'text-emerald-400 font-black text-[10px] uppercase tracking-widest' : 'font-bold text-white'}>
                  {deliveryFee === 0 ? 'Free' : loadingSellerLocs ? '...' : `R ${deliveryFee}`}
                </span>
              </div>
              {deliveryMode === 'delivery' && !userCoords && (
                <p className="text-[10px] text-amber-400 font-medium">⚠️ Flat rate — tap "Locate Me" for accurate fee</p>
              )}
              <div className="h-px bg-white/5 my-4" />
              <div className="flex justify-between items-baseline">
                <span className="text-lg font-bold">Total</span>
                <span className="text-3xl font-black">R {grandTotal.toLocaleString()}</span>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleCheckout}
              disabled={loading || polling || authLoading}
              className="w-full bg-white text-slate-900 hover:bg-stone-200 py-8 text-lg font-black rounded-full mt-10 shadow-xl"
            >
              {authLoading ? (
                <div className="flex items-center gap-3"><Loader2 className="animate-spin" size={20} /><span>Verifying session...</span></div>
              ) : loading || polling ? (
                <div className="flex items-center gap-3"><Loader2 className="animate-spin" size={20} /><span>{polling ? 'Waiting for payment...' : 'Processing'}</span></div>
              ) : (
                <span>Pay Now — R {grandTotal.toLocaleString()}</span>
              )}
            </Button>

            <p className="text-[10px] text-center text-white/30 uppercase tracking-widest font-bold mt-6">🔒 Your payment is secure</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
