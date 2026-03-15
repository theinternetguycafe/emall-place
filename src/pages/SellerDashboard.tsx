import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useTour } from '../contexts/TourContext'
import { Product, SellerStore } from '../types'
import { Plus, Package, ShoppingBag, TrendingUp, Users, ArrowUpRight, Search, Filter, Store as StoreIcon } from 'lucide-react'
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
import { Helmet } from 'react-helmet-async'
import { StoreSetupForm } from '../components/seller/StoreSetupForm'
import { CreateStoreCard } from '../components/seller/CreateStoreCard'
import { SellerProductsTable } from '../components/seller/SellerProductsTable'
import { SellerOrdersTable } from '../components/seller/SellerOrdersTable'

const PENDING_SELLER_TOUR_KEY = 'pendingSellerSpotlightTour'

export default function SellerDashboard() {
  const { profile } = useAuth()
  const { startTour } = useTour()
  const { completeStep, isComplete, celebrationPending, dismissCelebration } = useOnboarding()
  const [store, setStore] = useState<SellerStore | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [orderItems, setOrderItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products')
  const [searchQuery, setSearchQuery] = useState('')
  const [showStoreForm, setShowStoreForm] = useState(false)
  const [storeName, setStoreName] = useState('')
  const [creatingStore, setCreatingStore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingStore, setEditingStore] = useState(false)
  const [storeForm, setStoreForm] = useState({ store_name: '', description: '' })

  useEffect(() => {
    if (!profile?.id) return

    fetchData()
  }, [profile?.id])

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

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredOrders = orderItems.filter(o => 
    o.orders.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.products?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.orders.profiles?.full_name || 'Guest').toLowerCase().includes(searchQuery.toLowerCase())
  )

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
        <CreateStoreCard
          showStoreForm={showStoreForm}
          setShowStoreForm={setShowStoreForm}
          storeName={storeName}
          setStoreName={setStoreName}
          createStore={createStore}
          creatingStore={creatingStore}
          error={error}
          setError={setError}
        />
      </div>
    )
  }

  const totalRevenue = orderItems.reduce((acc, item) => acc + item.item_total, 0)

  return (
    <>
      <Helmet>
        <title>{store.store_name} Dashboard | eMall Place</title>
      </Helmet>
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
              <span>Store Dashboard</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-slate-900 uppercase">{store.store_name}</h1>
            <p className="text-stone-500 mt-2 font-medium">Manage your products and view your incoming orders.</p>
          </div>
          <div className="flex gap-4">
            <Link to="/seller/products/new" className="inline-flex">
              <span data-tour="product-create-button" data-onboarding="add-product-btn" id="create-product-button" className="inline-flex items-center justify-center rounded-full px-8 py-6 gap-2 shadow-lg shadow-slate-200 bg-slate-900 text-white hover:bg-slate-800 font-semibold transition-all active:scale-[0.98] cursor-pointer">
                <Plus className="h-5 w-5" />
                Add Product
              </span>
            </Link>
          </div>
        </div>

        {/* Desktop Setup Checklist */}
        <div className="hidden md:block">
          <SetupChecklist />
        </div>

        {/* Store Details Section */}
        <StoreSetupForm
          store={store}
          isStoreComplete={isStoreComplete}
          storeCompletion={storeCompletion}
          editingStore={editingStore}
          setEditingStore={setEditingStore}
          storeForm={storeForm}
          setStoreForm={setStoreForm}
          updateStore={updateStore}
        />

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

            <div className="flex items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
               <div className="relative flex-1 md:flex-none">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-300" />
                 <input 
                  type="text" 
                  placeholder="Filter items..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 pr-4 py-2.5 bg-stone-50 border-none rounded-full text-xs font-bold focus:ring-2 focus:ring-slate-900/10 focus:bg-white transition-all outline-none w-full md:w-64 text-slate-900"
                 />
               </div>
               <Button variant="outline" size="sm" className="rounded-full border-stone-100 h-10 w-10 p-0 flex-shrink-0">
                 <Filter className="h-4 w-4" />
               </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {activeTab === 'products' ? (
              <SellerProductsTable 
                filteredProducts={filteredProducts} 
                searchQuery={searchQuery} 
                deleteProduct={deleteProduct} 
              />
            ) : (
              <SellerOrdersTable 
                filteredOrders={filteredOrders} 
                searchQuery={searchQuery} 
                updateItemStatus={updateItemStatus} 
              />
            )}
          </div>
        </Card>
      </div>

      {/* Completion Celebration Modal */}
      <CompletionCelebration
        isVisible={celebrationPending}
        onDismiss={dismissCelebration}
      />
    </div>
    </>
  )
}
