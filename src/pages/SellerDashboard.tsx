import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useTour } from '../contexts/TourContext'
import { Product, SellerStore } from '../types'
import { Plus, Package, Edit2, Trash2, ShoppingBag, TrendingUp, Users, ArrowUpRight, Search, Filter, Store as StoreIcon, AlertCircle, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { Input } from '../components/ui/Input'
import { OnboardingBanner } from '../components/onboarding/OnboardingBanner'
import { SetupChecklist } from '../components/onboarding/SetupChecklist'
import { CompletionCelebration } from '../components/onboarding/CompletionCelebration'
import { useOnboarding } from '../contexts/OnboardingContext'

const PENDING_SELLER_TOUR_KEY = 'pendingSellerSpotlightTour'

export default function SellerDashboard() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { startTour } = useTour()
  const { completeStep, isComplete, celebrationPending, skipStep } = useOnboarding()
  const [store, setStore] = useState<SellerStore | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [orderItems, setOrderItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products')
  const [showStoreForm, setShowStoreForm] = useState(false)
  const [storeName, setStoreName] = useState('')
  const [creatingStore, setCreatingStore] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingStore, setEditingStore] = useState(false)
  const [storeForm, setStoreForm] = useState({ store_name: '', description: '' })

  useEffect(() => {
    if (!profile?.id) return

    fetchData()
  }, [profile?.id])

  useEffect(() => {
    if (isComplete && !localStorage.getItem('celebrationShown')) {
      setShowCelebration(true)
      localStorage.setItem('celebrationShown', 'true')
    }
  }, [isComplete])

  useEffect(() => {
    if (loading) return

    if (localStorage.getItem(PENDING_SELLER_TOUR_KEY) !== 'true') {
      return
    }

    localStorage.removeItem(PENDING_SELLER_TOUR_KEY)
    const timer = window.setTimeout(() => {
      startTour()
    }, 300)

    return () => window.clearTimeout(timer)
  }, [loading, startTour])

  const fetchData = async () => {
    setLoading(true)
    const { data: storeData } = await supabase
      .from('seller_stores')
      .select('*')
      .eq('owner_id', profile!.id)
      .maybeSingle()

    if (storeData) {
      setStore(storeData)
      setStoreForm({
        store_name: storeData.store_name || '',
        description: storeData.description || ''
      })
      
      const [pRes, oRes] = await Promise.all([
        supabase.from('products').select('*, product_images(*)').eq('seller_store_id', storeData.id).order('created_at', { ascending: false }),
        supabase.from('order_items').select('*, orders(*, profiles(full_name)), products(title)').eq('seller_store_id', storeData.id).order('id', { ascending: false })
      ])

      if (pRes.data) setProducts(pRes.data)
      if (oRes.error) {
        console.error('Error fetching order items:', oRes.error)
        setOrderItems([]) // fail gracefully
      } else {
        setOrderItems(oRes.data ?? [])
      }
    }

    setLoading(false)
  }

  const updateItemStatus = async (itemId: string, status: string) => {
    const { error } = await supabase
      .from('order_items')
      .update({ item_status: status })
      .eq('id', itemId)
    
    if (!error) fetchData()
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) return

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting product:', error)
      alert('Failed to delete product.')
    } else {
      fetchData()
    }
  }

  const createStore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!storeName.trim()) {
      setError('Please enter a store name')
      return
    }

    setCreatingStore(true)
    setError(null)

    try {
      const { error: storeError } = await supabase
        .from('seller_stores')
        .insert({
          owner_id: profile!.id,
          store_name: storeName.trim(),
          status: 'pending'
        })

      if (storeError) {
        throw new Error(`Failed to create store: ${storeError.message}`)
      }

      // Mark store_created step as complete
      try {
        await completeStep('store_created')
      } catch (err) {
        console.error('Error completing store_created step:', err)
      }

      // Refresh data to get the new store
      await fetchData()
      setShowStoreForm(false)
      setStoreName('')
    } catch (err: any) {
      console.error('Error creating store:', err)
      setError(err.message || 'Failed to create store')
    } finally {
      setCreatingStore(false)
    }
  }

  const updateStore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!store) return

    const { error } = await supabase
      .from('seller_stores')
      .update({
        store_name: storeForm.store_name.trim(),
        description: storeForm.description.trim()
      })
      .eq('id', store.id)

    if (!error) {
      setEditingStore(false)
      fetchData()
    }
  }

  const getStoreCompletion = () => {
    if (!store) return 0
    const fields = [store.store_name, store.description]
    const completed = fields.filter(f => f && f.toString().trim() !== '').length
    return Math.round((completed / fields.length) * 100)
  }

  const storeCompletion = getStoreCompletion()
  const isStoreComplete = storeCompletion === 100

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex justify-between items-end mb-12">
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-12 w-64" />
          </div>
          <Skeleton className="h-12 w-40 rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}
        </div>
        <Skeleton className="h-96 w-full rounded-3xl" />
      </div>
    )
  }

  if (!store) {
    return (
      <div data-tour="seller-shell" className="min-h-[80vh] flex items-center justify-center px-4">
        {!showStoreForm ? (
          <Card className="max-w-md w-full text-center p-12 rounded-[2.5rem] border-stone-100 shadow-2xl bg-white">
            <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-8">
              <ShoppingBag className="h-8 w-8 text-stone-300" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-4">Initialize Workshop</h2>
            <p className="text-stone-500 mb-10 font-medium">You haven't established your merchant profile yet. Set up your store to start showcasing your craft.</p>
            <Button
              size="lg"
              data-tour="store-create-cta"
              onClick={() => setShowStoreForm(true)}
              className="w-full rounded-2xl shadow-xl shadow-slate-200 uppercase tracking-widest font-black text-xs py-8"
            >
              Complete Setup
            </Button>
          </Card>
        ) : (
          <Card className="max-w-md w-full p-12 rounded-[2.5rem] border-stone-100 shadow-2xl bg-white">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <StoreIcon className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">Create Your Store</h2>
              <p className="text-stone-500 font-medium">Enter your store name to get started</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl">
                <p className="text-sm text-rose-600 font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={createStore} className="space-y-6" id="store-form-section">
              <Input
                label="Store Name"
                placeholder="My Artisan Shop"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                disabled={creatingStore}
                data-tour="store-name-input"
                data-onboarding="store-name"
              />

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowStoreForm(false)
                    setStoreName('')
                    setError(null)
                  }}
                  disabled={creatingStore}
                  className="flex-1 rounded-full py-6 font-black"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  data-tour="store-submit"
                  disabled={creatingStore}
                  className="flex-1 rounded-full py-6 font-black shadow-xl shadow-slate-200"
                >
                  {creatingStore ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Creating...</span>
                    </div>
                  ) : (
                    'Create Store'
                  )}
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    )
  }

  const totalRevenue = orderItems.reduce((acc, item) => acc + item.item_total, 0)

  return (
    <div data-tour="seller-shell" className="min-h-screen bg-[#F9F8F6] pb-24">
      {/* Mobile banner only */}
      <div className="md:hidden">
        <OnboardingBanner />
      </div>
      <div className="mx-auto max-w-7xl px-4 py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-12">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-stone-400 mb-4">
              <TrendingUp className="h-3 w-3" />
              <span>Merchant Console</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-slate-900 uppercase">{store.store_name}</h1>
            <p className="text-stone-500 mt-2 font-medium">Managing your professional inventory and fulfillment.</p>
          </div>
          <div className="flex gap-4">
            <Link to="/seller/products/new" className="inline-flex">
              <span data-tour="product-create-button" data-onboarding="add-product-btn" id="create-product-button" className="inline-flex items-center justify-center rounded-full px-8 py-6 gap-2 shadow-lg shadow-slate-200 bg-slate-900 text-white hover:bg-slate-800 font-semibold transition-all active:scale-[0.98] cursor-pointer">
                <Plus className="h-5 w-5" />
                Add New Craft
              </span>
            </Link>
          </div>
        </div>

        {/* Desktop Setup Checklist */}
        <div className="hidden md:block">
          <SetupChecklist />
        </div>

        {/* Store Details Section */}
        <div className="mb-12">
          {!isStoreComplete && (
            <Card className="p-6 mb-8 bg-amber-50 border border-amber-200 rounded-3xl">
              <div className="flex items-start gap-4">
                <div className="text-2xl flex-shrink-0">⚠️</div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-amber-900 mb-2">Store Details Incomplete</h3>
                  <p className="text-sm text-amber-800 mb-4">Complete your store profile to build trust with customers and improve your visibility.</p>
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-amber-900">Progress</span>
                      <span className="text-xs font-bold text-amber-900">{storeCompletion}%</span>
                    </div>
                    <div className="w-full h-2 bg-amber-200 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 transition-all" style={{ width: `${storeCompletion}%` }} />
                    </div>
                  </div>
                </div>
                {!editingStore && (
                  <button
                    data-tour="store-edit"
                    onClick={() => setEditingStore(true)}
                    className="flex-shrink-0 p-2 hover:bg-amber-100 rounded-lg transition-colors"
                  >
                    <Edit2 className="h-5 w-5 text-amber-700" />
                  </button>
                )}
              </div>
            </Card>
          )}

          <Card data-tour="store-section" className="p-8 rounded-3xl border-stone-100 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Store Details</h2>
              {!editingStore && (
                <button
                  data-tour="store-edit"
                  onClick={() => setEditingStore(true)}
                  className="p-2 hover:bg-stone-50 rounded-lg transition-colors"
                >
                  <Edit2 className="h-5 w-5 text-slate-600" />
                </button>
              )}
            </div>

            {!editingStore ? (
              <div className="space-y-6">
                <div>
                  <span className="text-xs text-stone-400 font-bold uppercase tracking-wider">Store Name</span>
                  <p className="font-bold text-slate-900 text-lg mt-1">{store.store_name}</p>
                </div>
                <div>
                  <span className="text-xs text-stone-400 font-bold uppercase tracking-wider">Description</span>
                  {store.description ? (
                    <p className="text-slate-600 mt-1">{store.description}</p>
                  ) : (
                    <p className="text-stone-400 italic mt-1">No description provided yet</p>
                  )}
                </div>
                <div>
                  <span className="text-xs text-stone-400 font-bold uppercase tracking-wider">Store Status</span>
                  <Badge
                    variant={store.status === 'active' ? 'success' : store.status === 'pending' ? 'warning' : 'error'}
                    className="mt-1 text-xs font-black uppercase"
                  >
                    {store.status}
                  </Badge>
                </div>
              </div>
            ) : (
              <form onSubmit={updateStore} className="space-y-6">
                <div>
                  <label className="text-xs text-stone-400 font-bold uppercase tracking-wider block mb-2">Store Name</label>
                  <input
                    data-tour="store-name-input"
                    data-onboarding="store-name"
                    type="text"
                    value={storeForm.store_name}
                    onChange={(e) => setStoreForm({ ...storeForm, store_name: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all font-bold text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-stone-400 font-bold uppercase tracking-wider block mb-2">Store Description</label>
                  <textarea
                    data-tour="store-description-input"
                    value={storeForm.description}
                    onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })}
                    placeholder="Tell customers about your store, what you offer, and what makes you unique..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all text-slate-900"
                    rows={4}
                  />
                </div>
                <div className="flex gap-3">
                  <Button type="submit" data-tour="store-save-button" className="flex-1 rounded-xl py-3 font-black shadow-lg shadow-slate-200">
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingStore(false)
                      setStoreForm({
                        store_name: store.store_name || '',
                        description: store.description || ''
                      })
                    }}
                    className="flex-1 rounded-xl py-3 font-black"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card className="p-8 rounded-3xl border-stone-100 shadow-sm bg-white hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-stone-50 rounded-2xl text-slate-900">
                <Package className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="text-[9px] font-black border-stone-100 rounded-full">Inventory</Badge>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Total Products</p>
            <p className="text-3xl font-black text-slate-900 italic">{products.length}</p>
          </Card>

          <Card className="p-8 rounded-3xl border-stone-100 shadow-sm bg-white hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-stone-50 rounded-2xl text-slate-900">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <Badge variant="warning" className="text-[9px] font-black rounded-full">Active</Badge>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Pending Orders</p>
            <p className="text-3xl font-black text-slate-900 italic">
              {orderItems.filter(i => i.item_status === 'pending').length}
            </p>
          </Card>

          <Card className="p-8 rounded-3xl border-stone-100 shadow-sm bg-white hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-stone-50 rounded-2xl text-slate-900">
                <Users className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="text-[9px] font-black border-stone-100 rounded-full">Engagement</Badge>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Total Sales</p>
            <p className="text-3xl font-black text-slate-900 italic">{orderItems.length}</p>
          </Card>

          <Card className="p-8 rounded-3xl bg-slate-900 text-white shadow-xl shadow-slate-200 hover:scale-[1.02] transition-transform">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-white/10 rounded-2xl text-white">
                <TrendingUp className="h-6 w-6" />
              </div>
              <ArrowUpRight className="h-5 w-5 text-stone-400" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Revenue</p>
            <p className="text-3xl font-black italic">R {totalRevenue.toFixed(0).toLocaleString()}</p>
          </Card>
        </div>

        {/* Main Content Area */}
        <Card className="rounded-[2.5rem] border-stone-100 overflow-hidden shadow-sm bg-white">
          <div className="border-b border-stone-50 px-8 py-6 flex flex-wrap items-center justify-between gap-6 bg-white">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('products')}
                className={`text-[10px] font-black uppercase tracking-[0.3em] transition-all relative pb-2 ${
                  activeTab === 'products' ? 'text-slate-900' : 'text-stone-300 hover:text-stone-500'
                }`}
              >
                Inventory List
                {activeTab === 'products' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full" />}
              </button>
              <button
                data-tour="orders-tab"
                data-onboarding="orders-tab"
                id="orders-tab"
                onClick={() => setActiveTab('orders')}
                className={`text-[10px] font-black uppercase tracking-[0.3em] transition-all relative pb-2 ${
                  activeTab === 'orders' ? 'text-slate-900' : 'text-stone-300 hover:text-stone-500'
                }`}
              >
                Order Fulfillment
                {activeTab === 'orders' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full" />}
              </button>
            </div>

            <div className="flex items-center gap-4">
               <div className="relative">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-300" />
                 <input 
                  type="text" 
                  placeholder="Filter items..." 
                  className="pl-11 pr-4 py-2.5 bg-stone-50 border-none rounded-full text-xs font-bold focus:ring-2 focus:ring-slate-900/10 focus:bg-white transition-all outline-none w-64"
                 />
               </div>
               <Button variant="outline" size="sm" className="rounded-full border-stone-100 h-10 w-10 p-0">
                 <Filter className="h-4 w-4" />
               </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {activeTab === 'products' ? (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-stone-50/50">
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-stone-400">Item Details</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-stone-400">Valuation</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-stone-400">Stock</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-stone-400">Status</th>
                    <th className="px-8 py-4 text-right text-[10px] font-black uppercase tracking-widest text-stone-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50 bg-white">
                  {products.map((product) => (
                    <tr key={product.id} className="group hover:bg-stone-50/30 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="h-16 w-16 flex-shrink-0 bg-stone-100 rounded-2xl overflow-hidden border border-stone-200">
                            {product.product_images?.[0] && (
                              <img src={product.product_images[0].url} className="h-full w-full object-cover" alt="" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900 group-hover:text-stone-600 transition-colors">{product.title}</div>
                            <div className="text-[10px] text-stone-400 font-mono mt-1 uppercase tracking-tighter">ID: {product.id.slice(0, 8)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-sm font-black text-slate-900">
                        R {product.price.toLocaleString()}
                      </td>
                      <td className="px-8 py-6">
                        <span className={`text-sm font-bold ${product.stock < 5 ? 'text-rose-600' : 'text-slate-600'}`}>
                          {product.stock} units
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <Badge variant={product.status === 'approved' ? 'success' : product.status === 'pending' ? 'warning' : 'error'} className="text-[9px] font-black uppercase rounded-full">
                          {product.status}
                        </Badge>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link to={`/seller/products/${product.id}/edit`} className="inline-flex">
                            <span className="inline-flex items-center justify-center h-10 w-10 p-0 rounded-xl text-stone-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer">
                              <Edit2 className="h-4 w-4" />
                            </span>
                          </Link>
                          <Button onClick={() => deleteProduct(product.id)} variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl text-stone-400 hover:text-rose-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-8 py-24 text-center">
                         <div className="max-w-xs mx-auto text-center">
                            <Package className="h-12 w-12 text-stone-200 mx-auto mb-4" />
                            <p className="text-stone-400 text-sm font-medium italic">Your inventory is currently empty. Start adding your unique products to showcase them in the marketplace.</p>
                         </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-stone-50/50">
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-stone-400">Order Ref</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-stone-400">Acquirer</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-stone-400">Item</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-stone-400">Investment</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-stone-400">Status</th>
                    <th className="px-8 py-4 text-right text-[10px] font-black uppercase tracking-widest text-stone-400">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50 bg-white">
                  {orderItems.map((item) => (
                    <tr key={item.id} className="group hover:bg-stone-50/30 transition-colors">
                      <td className="px-8 py-6">
                        <div className="text-sm font-bold text-slate-900">#{item.orders.id.slice(0, 8).toUpperCase()}</div>
                        <div className="text-[10px] text-stone-400 font-mono mt-1 uppercase tracking-tighter">{new Date(item.orders.created_at).toLocaleDateString()}</div>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-stone-100 rounded-full flex items-center justify-center text-[10px] font-black text-slate-500 border border-stone-200">
                               {item.orders.profiles?.full_name?.charAt(0) || 'G'}
                            </div>
                            <span className="text-sm font-medium text-slate-600 truncate max-w-[120px]">
                              {item.orders.profiles?.full_name || 'Guest'}
                            </span>
                         </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm font-bold text-slate-900 group-hover:text-stone-600 transition-colors">{item.products?.title}</div>
                        <div className="text-[10px] text-stone-400 font-medium mt-0.5">Quantity: {item.qty}</div>
                      </td>
                      <td className="px-8 py-6 text-sm font-black text-slate-900">
                        R {item.item_total.toLocaleString()}
                      </td>
                      <td className="px-8 py-6">
                        <Badge 
                          variant={
                            item.item_status === 'delivered' ? 'success' : 
                            item.item_status === 'cancelled' ? 'error' : 
                            'warning'
                          } 
                          className="text-[9px] font-black uppercase rounded-full"
                        >
                          {item.item_status}
                        </Badge>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <select
                          className="bg-stone-50 border border-stone-100 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white transition-all cursor-pointer appearance-none text-slate-900 shadow-sm"
                          value={item.item_status}
                          onChange={(e) => updateItemStatus(item.id, e.target.value)}
                        >
                          <option value="pending">Pending</option>
                          <option value="packed">Packed</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {orderItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-8 py-24 text-center">
                         <div className="max-w-xs mx-auto text-center">
                            <ShoppingBag className="h-12 w-12 text-stone-200 mx-auto mb-4" />
                            <p className="text-stone-400 text-sm font-medium italic">No orders have been placed for your items yet. They will appear here once acquired.</p>
                         </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      {/* Completion Celebration Modal */}
      <CompletionCelebration
        isVisible={celebrationPending}
        onDismiss={() => skipStep('celebration_seen')}
      />
    </div>
  )
}
