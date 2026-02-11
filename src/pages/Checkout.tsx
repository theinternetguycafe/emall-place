import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { MockPaymentProvider } from '../lib/payments'
import { ShieldCheck, Loader2, CreditCard, ArrowLeft, Lock } from 'lucide-react'
import ErrorAlert from '../components/ErrorAlert'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function Checkout() {
  const { items, totalAmount, clearCart } = useCart()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!user) {
      navigate('/auth')
      return
    }

    setLoading(true)
    try {
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

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          buyer_id: user.id,
          total_amount: totalAmount,
          total_commission: totalCommission,
          status: 'pending',
          payment_status: 'unpaid'
        })
        .select()
        .single()

      if (orderError) throw new Error(`Order creation failed: ${orderError.message}`)

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

      const payment = await MockPaymentProvider.processPayment(totalAmount, { orderId: order.id })

      if (payment.success) {
        const { error: updateError } = await supabase
          .from('orders')
          .update({ payment_status: 'paid', status: 'processing' })
          .eq('id', order.id)
        
        if (updateError) throw new Error(`Payment succeeded but order update failed: ${updateError.message}`)

        clearCart()
        navigate('/account/orders')
      } else {
        await supabase
          .from('orders')
          .update({ payment_status: 'failed' })
          .eq('id', order.id)
        setError('Payment failed. Please try again or use a different card.')
      }
    } catch (err: any) {
      console.error('Checkout error:', err)
      setError(err.message || 'An unexpected error occurred during checkout.')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    navigate('/shop')
    return null
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
          <section>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm">1</div>
              Shipping & Billing
            </h2>
            <Card className="p-8">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-stone-400 mb-2">Recipient Name</label>
                  <Input
                    readOnly
                    value={profile?.full_name || ''}
                    className="bg-stone-50 border-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-stone-400 mb-2">Email Address</label>
                  <Input
                    readOnly
                    value={user?.email || ''}
                    className="bg-stone-50 border-none font-medium"
                  />
                </div>
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-100 flex items-start gap-3">
                  <ShieldCheck className="text-emerald-600 mt-0.5" size={18} />
                  <p className="text-xs text-stone-500 leading-relaxed">
                    Your account details are used for billing. To change these, please update your profile settings.
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
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <CreditCard className="text-slate-900" />
                  <span className="font-bold text-slate-900">Secure Card Payment</span>
                </div>
                <div className="flex gap-2">
                  <div className="h-6 w-10 bg-stone-100 rounded" />
                  <div className="h-6 w-10 bg-stone-100 rounded" />
                </div>
              </div>
              <p className="text-sm text-stone-500 mb-0">
                You will be redirected to our secure payment gateway to complete your transaction. We support all major South African cards.
              </p>
            </Card>
          </section>
        </div>

        <div className="lg:col-span-5">
          <Card className="sticky top-24 bg-stone-900 text-white p-8 border-none shadow-2xl">
            <h2 className="text-2xl font-black mb-8 tracking-tight">Order Review</h2>
            
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
                <span>Subtotal</span>
                <span>R {totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-white/60 text-sm font-medium">
                <span>Shipping</span>
                <span className="text-emerald-400 font-bold uppercase text-[10px] tracking-widest">Calculated</span>
              </div>
              <div className="h-px bg-white/5 my-4" />
              <div className="flex justify-between items-baseline">
                <span className="text-lg font-bold">Total</span>
                <span className="text-3xl font-black">R {totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <Button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full bg-white text-slate-900 hover:bg-stone-200 py-8 text-lg font-black rounded-full mt-10 shadow-xl"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="animate-spin" size={20} />
                  <span>Processing</span>
                </div>
              ) : (
                <span>Pay R {totalAmount.toLocaleString()}</span>
              )}
            </Button>
            
            <p className="text-[10px] text-center text-white/30 uppercase tracking-widest font-bold mt-6">
              Encrypted 256-bit SSL Connection
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
