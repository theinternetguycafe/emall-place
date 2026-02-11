import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart3, Users, ShoppingBag, DollarSign, Check, X, ShieldAlert } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalSellers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalCommission: 0
  })
  const [pendingSellers, setPendingSellers] = useState<any[]>([])
  const [pendingProducts, setPendingProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAdminData()
  }, [])

  const fetchAdminData = async () => {
    setLoading(true)
    const [sellers, products, orders, pSellers, pProducts] = await Promise.all([
      supabase.from('seller_stores').select('*', { count: 'exact' }),
      supabase.from('products').select('*', { count: 'exact' }),
      supabase.from('orders').select('*'),
      supabase.from('seller_stores').select('*, profiles(full_name)').eq('status', 'pending'),
      supabase.from('products').select('*, seller_stores(store_name)').eq('status', 'pending')
    ])

    const revenue = orders.data?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0
    const commission = orders.data?.reduce((sum, o) => sum + Number(o.total_commission), 0) || 0

    setStats({
      totalSellers: sellers.count || 0,
      totalProducts: products.count || 0,
      totalOrders: orders.data?.length || 0,
      totalRevenue: revenue,
      totalCommission: commission
    })

    setPendingSellers(pSellers.data || [])
    setPendingProducts(pProducts.data || [])
    setLoading(false)
  }

  const approveSeller = async (id: string) => {
    await supabase.from('seller_stores').update({ status: 'active' }).eq('id', id)
    fetchAdminData()
  }

  const rejectSeller = async (id: string) => {
    if (!confirm('Are you sure you want to reject this seller?')) return
    await supabase.from('seller_stores').update({ status: 'suspended' }).eq('id', id)
    fetchAdminData()
  }

  const approveProduct = async (id: string) => {
    await supabase.from('products').update({ status: 'approved' }).eq('id', id)
    fetchAdminData()
  }

  const rejectProduct = async (id: string) => {
    if (!confirm('Are you sure you want to reject this product?')) return
    await supabase.from('products').update({ status: 'hidden' }).eq('id', id)
    fetchAdminData()
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-64 mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight uppercase">Admin Command Center</h1>
          <p className="text-slate-500 mt-1 font-medium">Manage marketplace growth and quality.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAdminData} className="rounded-full px-6">Refresh Data</Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
        <StatCard icon={<Users size={20} />} label="Sellers" value={stats.totalSellers} color="bg-slate-900 text-stone-100" />
        <StatCard icon={<ShoppingBag size={20} />} label="Products" value={stats.totalProducts} color="bg-slate-900 text-stone-100" />
        <StatCard icon={<BarChart3 size={20} />} label="Orders" value={stats.totalOrders} color="bg-slate-900 text-stone-100" />
        <StatCard icon={<DollarSign size={20} />} label="Revenue" value={`R${stats.totalRevenue.toLocaleString()}`} color="bg-slate-900 text-stone-100" />
        <StatCard icon={<ShieldAlert size={20} />} label="Commission" value={`R${stats.totalCommission.toLocaleString()}`} color="bg-slate-900 text-stone-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Pending Sellers */}
        <section>
          <div className="flex items-center justify-between mb-6 border-b border-stone-100 pb-4">
            <h2 className="text-xl font-bold flex items-center gap-3 text-slate-900 uppercase tracking-tight">
              Pending Sellers
              {pendingSellers.length > 0 && <Badge variant="warning" className="rounded-full">{pendingSellers.length}</Badge>}
            </h2>
          </div>
          <Card className="p-0 overflow-hidden border-stone-100 shadow-sm">
            {pendingSellers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-stone-100">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-stone-400 uppercase tracking-widest">Store Info</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-stone-400 uppercase tracking-widest">Owner</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-stone-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-stone-50">
                    {pendingSellers.map(s => (
                      <tr key={s.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{s.store_name}</div>
                          <div className="text-[10px] text-stone-400 font-mono uppercase mt-1">Joined: {new Date(s.created_at).toLocaleDateString()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600">
                          {s.profiles?.full_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" className="text-emerald-600 hover:bg-emerald-50 rounded-full" onClick={() => approveSeller(s.id)}>
                              <Check size={18} />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50 rounded-full" onClick={() => rejectSeller(s.id)}>
                              <X size={18} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-20 text-center">
                <div className="bg-stone-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="text-stone-300" />
                </div>
                <p className="text-stone-400 font-medium italic">All caught up! No pending sellers.</p>
              </div>
            )}
          </Card>
        </section>

        {/* Pending Products */}
        <section>
          <div className="flex items-center justify-between mb-6 border-b border-stone-100 pb-4">
            <h2 className="text-xl font-bold flex items-center gap-3 text-slate-900 uppercase tracking-tight">
              Pending Products
              {pendingProducts.length > 0 && <Badge variant="warning" className="rounded-full">{pendingProducts.length}</Badge>}
            </h2>
          </div>
          <Card className="p-0 overflow-hidden border-stone-100 shadow-sm">
            {pendingProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-stone-100">
                  <thead className="bg-stone-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-stone-400 uppercase tracking-widest">Product Info</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-stone-400 uppercase tracking-widest">Store</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-stone-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-stone-50">
                    {pendingProducts.map(p => (
                      <tr key={p.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{p.title}</div>
                          <div className="text-[10px] text-stone-400 font-mono uppercase mt-1">Valuation: R{p.price.toLocaleString()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600">
                          {p.seller_stores?.store_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" className="text-emerald-600 hover:bg-emerald-50 rounded-full" onClick={() => approveProduct(p.id)}>
                              <Check size={18} />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50 rounded-full" onClick={() => rejectProduct(p.id)}>
                              <X size={18} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-20 text-center">
                <div className="bg-stone-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="text-stone-300" />
                </div>
                <p className="text-stone-400 font-medium italic">All caught up! No pending products.</p>
              </div>
            )}
          </Card>
        </section>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string | number, color: string }) {
  return (
    <Card className="p-6 flex items-center space-x-5 border-stone-100 shadow-sm hover:shadow-md transition-shadow">
      <div className={`p-4 rounded-[1.25rem] shadow-inner ${color}`}>{icon}</div>
      <div>
        <p className="text-[10px] text-stone-400 uppercase font-black tracking-[0.2em] mb-1">{label}</p>
        <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
      </div>
    </Card>
  )
}
