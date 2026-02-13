import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Order } from '../types'
import { Package, ChevronRight, Clock, ExternalLink, Calendar, Receipt } from 'lucide-react'
import { Link } from 'react-router-dom'
import ErrorAlert from '../components/ErrorAlert'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'

export default function Orders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchOrders()
    }
  }, [user])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const { data, error: oError } = await supabase
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
        .eq('buyer_id', user?.id)
        .order('created_at', { ascending: false })

      if (oError) throw oError
      setOrders(data || [])
    } catch (err: any) {
      console.error('Error fetching orders:', err)
      setError('Failed to load your orders. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'success'
      case 'processing': return 'warning'
      case 'pending': return 'outline'
      case 'cancelled': return 'danger'
      default: return 'outline'
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20">
        <div className="mb-12">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-12 w-64" />
        </div>
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-64 w-full rounded-3xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F9F8F6]">
      <div className="mx-auto max-w-4xl px-4 py-20">
        {/* Header */}
        <div className="mb-16">
          <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-stone-400 mb-6">
            <Link to="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-900">My Orders</span>
          </nav>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-5xl font-black tracking-tighter text-slate-900 uppercase">Your Orders</h1>
              <p className="text-stone-500 mt-2 font-medium">View and track your purchases.</p>
            </div>
            <Link to="/shop">
              <Button variant="outline" className="rounded-full border-stone-200">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>

        {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

        {orders.length === 0 ? (
          <Card className="text-center py-24 bg-white border-2 border-dashed border-stone-100 rounded-[2.5rem]">
            <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-8">
              <Package className="h-8 w-8 text-stone-300" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">No Orders Yet</h3>
            <p className="text-stone-500 mt-2 max-w-xs mx-auto">Start shopping to see your orders here.</p>
            <Link to="/shop" className="mt-10 inline-block">
              <Button size="lg" className="rounded-2xl px-12 shadow-xl shadow-slate-200">
                Start Shopping
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-10">
            {orders.map((order) => (
              <Card key={order.id} className="overflow-hidden border-stone-100 shadow-sm hover:shadow-xl transition-all duration-500 rounded-[2rem]">
                {/* Order Header */}
                <div className="bg-slate-900 p-8 text-white">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex flex-wrap gap-8">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Order Number</p>
                        <p className="text-sm font-bold font-mono">#{order.id.slice(0, 12).toUpperCase()}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Date</p>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-stone-500" />
                          <p className="text-sm font-bold">{new Date(order.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Total</p>
                        <p className="text-lg font-black italic">R {order.total_amount.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={getStatusVariant(order.status) as any} className="py-1.5 px-4 rounded-full font-black uppercase tracking-widest text-[9px] bg-white/10 border-white/20 text-white">
                        {order.status}
                      </Badge>
                      <Badge variant={order.payment_status === 'paid' ? 'success' : 'outline'} className="py-1.5 px-4 rounded-full font-black uppercase tracking-widest text-[9px]">
                        {order.payment_status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="p-8 bg-white">
                  <div className="flow-root">
                    <ul className="divide-y divide-stone-100">
                      {order.order_items?.map((item: any) => (
                        <li key={item.id} className="py-8 first:pt-0 last:pb-0">
                          <div className="flex gap-8">
                            <div className="flex-shrink-0 w-24 h-24 bg-stone-50 rounded-2xl overflow-hidden border border-stone-100 group">
                              <img
                                src={item.product?.product_images?.[0]?.url || 'https://via.placeholder.com/150'}
                                alt={item.product?.title}
                                className="w-full h-full object-center object-cover group-hover:scale-110 transition-transform duration-500"
                              />
                            </div>

                            <div className="flex-1 flex flex-col justify-between">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="text-lg font-bold text-slate-900 mb-1">{item.product?.title || 'Unknown Product'}</h3>
                                  <div className="flex items-center gap-4">
                                    <p className="text-sm text-stone-500 font-medium">Qty: {item.qty}</p>
                                    <span className="h-1 w-1 rounded-full bg-stone-300"></span>
                                    <Badge variant="outline" className="text-[10px] font-bold border-stone-100 text-stone-400 py-0 px-2 uppercase tracking-tighter">
                                      {item.item_status}
                                    </Badge>
                                  </div>
                                </div>
                                <p className="text-lg font-black text-slate-900">R {item.unit_price.toFixed(2)}</p>
                              </div>
                              
                              <div className="flex justify-end mt-4">
                                <Link to={`/product/${item.product_id}`}>
                                  <Button variant="ghost" size="sm" className="text-stone-400 hover:text-slate-900 gap-2 font-bold uppercase tracking-widest text-[9px]">
                                    View Product <ExternalLink className="h-3 w-3" />
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer/Action */}
                <div className="bg-stone-50 px-8 py-4 border-t border-stone-100 flex justify-between items-center">
                   <div className="flex items-center gap-2 text-stone-400">
                      <Receipt className="h-4 w-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Invoice</span>
                   </div>
                   <Button variant="ghost" size="sm" className="text-slate-900 font-bold uppercase tracking-widest text-[10px]">
                      Download
                   </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

