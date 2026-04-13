import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useTour } from '../contexts/TourContext'
import { Product, SellerStore } from '../types'
import { 
  Plus, Package, ShoppingBag, TrendingUp, ArrowUpRight, Search, 
  Edit3, Trash2, Store as StoreIcon, Eye, EyeOff, Tag, BarChart3,
  RefreshCw, X, Save, Upload, Star, Zap, Activity, CheckCircle,
  AlertTriangle, ArrowRight, Link as LinkIcon, Settings, ShieldCheck, Heart, MessageCircle
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { Input } from '../components/ui/Input'
import { CompletionCelebration } from '../components/onboarding/CompletionCelebration'
import { useOnboarding } from '../contexts/OnboardingContext'
import { Helmet } from 'react-helmet-async'
import StoreSettingsForm from '../components/seller/StoreSettingsForm'
import { StoreSetupForm } from '../components/seller/StoreSetupForm'
import { CreateStoreCard } from '../components/seller/CreateStoreCard'
import { SellerProductsTable } from '../components/seller/SellerProductsTable'
import { SellerOrdersTable } from '../components/seller/SellerOrdersTable'
import LiveRequestsPanel from '../components/seller/LiveRequestsPanel'
import { SellerCautionNote } from '../components/seller/SellerCautionNote'
import SellerOnSaleItems from '../components/seller/SellerOnSaleItems'
import { uploadProductImage } from '../lib/storage'
import { useSellerOrders } from '../hooks/useSellerOrders'
import { useOrderStatus } from '../hooks/useOrderStatus'

// ─── Seller Product Edit Modal ─────────────────────────────────────────────────
function SellerProductEditModal({ product, onClose, onSave, isService }: { product: Product & { product_images?: any[] }; onClose: () => void; onSave: () => void; isService?: boolean }) {
  const [form, setForm] = useState({
    title: product.title,
    description: product.description || '',
    price: String(product.price),
    stock: String(product.stock),
    is_on_sale: product.is_on_sale || false,
    sale_price: String(product.sale_price || ''),
    sale_label: product.sale_label || '',
    sale_starts_at: product.sale_starts_at ? product.sale_starts_at.slice(0, 16) : '',
    sale_ends_at: product.sale_ends_at ? product.sale_ends_at.slice(0, 16) : '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [images, setImages] = useState<any[]>(product.product_images || [])

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title is required'); return }
    if (!form.price || isNaN(parseFloat(form.price))) { setError('Valid price required'); return }
    setSaving(true); setError(null)
    try {
      const { error } = await supabase.from('products').update({
        title: form.title.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        stock: parseInt(form.stock) || 0,
        is_on_sale: form.is_on_sale,
        sale_price: form.is_on_sale && form.sale_price ? parseFloat(form.sale_price) : null,
        sale_label: form.sale_label || null,
        sale_starts_at: form.is_on_sale && form.sale_starts_at ? new Date(form.sale_starts_at).toISOString() : null,
        sale_ends_at: form.is_on_sale && form.sale_ends_at ? new Date(form.sale_ends_at).toISOString() : null,
      }).eq('id', product.id)
      if (error) throw error
      onSave(); onClose()
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try {
      const url = await uploadProductImage(file)
      if (!url) throw new Error('Upload failed. Check storage bucket setup.')
      const { data } = await supabase.from('product_images').insert({ product_id: product.id, url, sort_order: images.length }).select().single()
      if (data) setImages(prev => [...prev, data])
    } catch (err: any) { setError(err.message) } finally { setUploading(false) }
  }

  const deleteImage = async (id: string) => {
    await supabase.from('product_images').delete().eq('id', id)
    setImages(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-stone-100 px-8 py-6 flex items-center justify-between rounded-t-3xl z-10">
          <h2 className="text-xl font-black text-slate-900">Edit Product</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-stone-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-8 space-y-6">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm font-medium">{error}</div>}
          <div className="space-y-4">
            <Input label={isService ? 'Service Name' : 'Product Title'} value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} />
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-stone-400 mb-2">Description</label>
              <textarea rows={4} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-stone-50 focus:bg-white focus:border-slate-900 outline-none transition-all text-sm resize-none" />
            </div>
            <div className={`grid ${isService ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
              <Input label={isService ? 'Base Rate / Fixed Price (R)' : 'Price (R)'} type="number" value={form.price} onChange={e => setForm(p => ({...p, price: e.target.value}))} />
              {!isService && <Input label="Stock Quantity" type="number" value={form.stock} onChange={e => setForm(p => ({...p, stock: e.target.value}))} />}
            </div>
          </div>

          {/* Sale Toggle */}
          {!isService && (
            <div className="border-t border-stone-100 pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Sale / Discount</h3>
                  <p className="text-xs text-stone-400 mt-0.5">Put this product on sale with a custom price</p>
                </div>
              <button onClick={() => setForm(p => ({...p, is_on_sale: !p.is_on_sale}))} className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${form.is_on_sale ? 'bg-emerald-500' : 'bg-stone-200'}`}>
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300 ${form.is_on_sale ? 'left-8' : 'left-1'}`} />
              </button>
            </div>
            {form.is_on_sale && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                <Input label="Sale Price (R)" type="number" value={form.sale_price} onChange={e => setForm(p => ({...p, sale_price: e.target.value}))} />
                <Input label="Sale Badge Label" value={form.sale_label} placeholder="e.g. WEEKEND DEAL" onChange={e => setForm(p => ({...p, sale_label: e.target.value}))} />
                <Input label="Starts At" type="datetime-local" value={form.sale_starts_at} onChange={e => setForm(p => ({...p, sale_starts_at: e.target.value}))} />
                <Input label="Ends At" type="datetime-local" value={form.sale_ends_at} onChange={e => setForm(p => ({...p, sale_ends_at: e.target.value}))} />
              </div>
            )}
          </div>
          )}

          {/* Images */}
          <div className="border-t border-stone-100 pt-6 space-y-4">
            <h3 className="font-black text-slate-900 text-sm">{isService ? 'Service Images' : 'Product Images'}</h3>
            <div className="flex flex-wrap gap-3">
              {images.map(img => (
                <div key={img.id} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-stone-200">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => deleteImage(img.id)} className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="h-4 w-4 text-white" />
                  </button>
                </div>
              ))}
              <label className={`w-20 h-20 border-2 border-dashed border-stone-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-slate-900 hover:bg-stone-50 transition-all ${uploading ? 'opacity-50' : ''}`}>
                {uploading ? <RefreshCw className="h-5 w-5 text-stone-400 animate-spin" /> : <Upload className="h-5 w-5 text-stone-400" />}
                <span className="text-[10px] text-stone-400 mt-1">Add</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
              </label>
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-stone-100 px-8 py-5 flex justify-end gap-3 rounded-b-3xl">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="px-8">
            {saving ? <RefreshCw className="animate-spin h-4 w-4" /> : <><Save className="h-4 w-4 mr-2" />Save</>}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Analytics helpers ─────────────────────────────────────────────────────────
function computeAnalytics(products: Product[], orderItems: any[]) {
  const totalRevenue = orderItems.reduce((a, o) => a + (o.item_total || 0), 0)
  const completedOrders = orderItems.filter(o => o.item_status === 'delivered' || o.item_status === 'completed').length
  const pendingOrders = orderItems.filter(o => o.item_status === 'pending').length
  const approvedProducts = products.filter(p => p.status === 'approved').length
  const onSaleProducts = products.filter(p => p.is_on_sale).length
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= 5).length
  const outOfStock = products.filter(p => p.stock === 0).length

  // Revenue by product (top 5)
  const productRevMap: Record<string, { title: string; revenue: number; units: number }> = {}
  orderItems.forEach(o => {
    const id = o.product_id || 'unknown'
    const title = o.products?.title || 'Unknown'
    if (!productRevMap[id]) productRevMap[id] = { title, revenue: 0, units: 0 }
    productRevMap[id].revenue += o.item_total || 0
    productRevMap[id].units += o.qty || 0
  })
  const topProducts = Object.values(productRevMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

  // Last 7 days revenue
  const now = Date.now()
  const week = 7 * 864e5
  const last7 = orderItems.filter(o => o.orders?.created_at && (now - new Date(o.orders.created_at).getTime()) < week)
  const revenueThisWeek = last7.reduce((a, o) => a + (o.item_total || 0), 0)

  return { totalRevenue, completedOrders, pendingOrders, approvedProducts, onSaleProducts, lowStock, outOfStock, topProducts, revenueThisWeek }
}

// ─── Main Seller Dashboard ─────────────────────────────────────────────────────
export default function SellerDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { startTour } = useTour()
  const { completeStep, celebrationPending, dismissCelebration } = useOnboarding()
  const [store, setStore] = useState<SellerStore | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [productLikes, setProductLikes] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'analytics' | 'products' | 'orders' | 'likes' | 'leads'>('analytics')
  const [searchQuery, setSearchQuery] = useState('')
  const [showStoreForm, setShowStoreForm] = useState(false)
  const [storeName, setStoreName] = useState('')
  const [creatingStore, setCreatingStore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingStore, setEditingStore] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [kycSubmission, setKycSubmission] = useState<any>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [storeForm, setStoreForm] = useState({ store_name: '', description: '', tagline: '', seller_email: '', seller_phone: '', address: '', service_mode: '', radius_km: 10 })

  // Orders hooks
  const { orders, loading: ordersLoading, refetch: refetchOrders } = useSellerOrders(store?.id)
  const { updateItemStatus, loading: updatingStatus, error: statusError, clearError: clearStatusError } = useOrderStatus()

  useEffect(() => { if (profile?.id) fetchData() }, [profile?.id])

  const fetchData = async () => {
    setLoading(true)
    const { data: spData } = await supabase.from('seller_profiles').select('*, stores(*)').eq('user_id', profile!.id).maybeSingle()
    if (spData) {
      const storeRow = Array.isArray(spData.stores) ? spData.stores[0] : spData.stores
      const storeObj = storeRow || {}
      const mappedStore: any = {
        id: spData.id,
        owner_id: spData.user_id,
        store_name: spData.store_name,
        description: storeObj.description,
        tagline: storeObj.tagline,
        seller_email: spData.seller_email,
        seller_phone: spData.seller_phone,
        address: spData.address,
        service_mode: spData.service_mode,
        radius_km: spData.radius_km,
        is_online: spData.is_online,
        kyc_status: spData.kyc_status,
        seller_type: spData.seller_type,
        latitude: spData.latitude,
        longitude: spData.longitude,
        logo_url: storeObj.logo_url,
        banner_url: storeObj.banner_url,
        store_policies: storeObj.store_policies,
        featured_product_ids: storeObj.featured_product_ids,
        theme_color: storeObj.theme_color,
        announcement_text: storeObj.announcement_text,
      }
      setStore(mappedStore)
      setStoreForm({ store_name: mappedStore.store_name || '', description: mappedStore.description || '', tagline: mappedStore.tagline || '', seller_email: mappedStore.seller_email || '', seller_phone: mappedStore.seller_phone || '', address: mappedStore.address || '', service_mode: mappedStore.service_mode || 'on_site', radius_km: mappedStore.radius_km || 10 })
      const [pRes, kRes, lRes, leadsRes] = await Promise.all([
        supabase.from('products').select('*, product_images(*)').eq('seller_id', spData.id).order('created_at', { ascending: false }),
        supabase.from('kyc_submissions').select('*').eq('user_id', profile!.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('product_likes').select('*, products!inner(title, seller_id), profiles:user_id(full_name, email)').eq('products.seller_id', spData.id).order('created_at', { ascending: false }),
        supabase.from('whatsapp_leads').select('*, products(title)').eq('seller_id', spData.id).order('created_at', { ascending: false })
      ])
      if (pRes.data) setProducts(pRes.data)
      if (lRes.data) setProductLikes(lRes.data)
      if (leadsRes?.data) setLeads(leadsRes.data)
      if (kRes.data) {
        const kycParams = { ...kRes.data };
        
        // Generate signed URLs for private KYC documents.
        // Handles: (1) plain storage paths like "userId/ts_id_doc" [new]
        //          (2) legacy full URLs containing "/kyc-documents/" [old]
        const getSigned = async (url: string) => {
          if (!url) return url;
          // Plain path (no http) — use directly
          if (!url.startsWith('http')) {
            const { data } = await supabase.storage.from('kyc-documents').createSignedUrl(url, 3600);
            return data?.signedUrl || url;
          }
          // Legacy full URL — extract path after bucket name
          if (url.includes('/kyc-documents/')) {
            const path = url.split('/kyc-documents/')[1];
            const { data } = await supabase.storage.from('kyc-documents').createSignedUrl(path, 3600);
            return data?.signedUrl || url;
          }
          return url;
        };
        
        kycParams.document_url = await getSigned(kycParams.document_url);
        kycParams.selfie_url = await getSigned(kycParams.selfie_url);
        
        setKycSubmission(kycParams)
      }
    }
    setLoading(false)
  }

  // Onboarding sync
  useEffect(() => {
    if (!profile?.id || !store || loading) return
    const sync = async () => {
      try {
        await completeStep('store_created')
        if ((store.latitude || 0) !== 0 && (store.longitude || 0) !== 0) await completeStep('location_pinned')
        if (store.kyc_status) await completeStep('kyc_submitted')
        if (products.length > 0) await completeStep('first_product')
      } catch {}
    }
    sync()
  }, [store?.id, store?.kyc_status, products.length, loading])

  const handleItemStatusChange = async (itemId: string, status: string) => {
    try {
      clearStatusError()
      await updateItemStatus(itemId, status)
      await refetchOrders()
    } catch (err: any) {
      console.error('Error updating status:', err)
    }
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product? This cannot be undone.')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) { alert('Failed to delete product.') } else fetchData()
  }

  const toggleProductVisibility = async (p: Product) => {
    const next = p.status === 'approved' ? 'hidden' : 'approved'
    await supabase.from('products').update({ status: next }).eq('id', p.id)
    fetchData()
  }

  const createStore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!storeName.trim()) { setError('Please enter a store name'); return }
    setCreatingStore(true); setError(null)
    try {
      const storeSlugBase = storeName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const storeSlug = `${storeSlugBase}-${profile!.id.replace(/-/g, '').substring(0, 6)}`
      const { data: spData, error } = await supabase.from('seller_profiles').insert({ 
        user_id: profile!.id, 
        store_name: storeName.trim(), 
        store_slug: storeSlug,
        seller_type: 'both' 
      }).select().single()
      if (error) throw new Error(error.message)
      await supabase.from('stores').insert({ seller_id: spData.id })
      await completeStep('store_created').catch(() => {})
      await fetchData()
      setShowStoreForm(false); setStoreName('')
    } catch (err: any) { setError(err.message) } finally { setCreatingStore(false) }
  }

  const updateStore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!store) return
    setLoading(true)

    const { error: pErr } = await supabase.from('seller_profiles').update({
      store_name: storeForm.store_name.trim(),
      seller_email: storeForm.seller_email.trim(),
      seller_phone: storeForm.seller_phone.trim(),
      address: storeForm.address.trim(),
      service_mode: store.seller_type !== 'product' ? storeForm.service_mode : null,
      radius_km: store.seller_type !== 'product' ? storeForm.radius_km : null
    }).eq('id', store.id)

    const { error: sErr } = await supabase.from('stores').update({
      description: storeForm.description.trim(),
      tagline: storeForm.tagline.trim(),
    }).eq('seller_id', store.id)

    if (!pErr && !sErr) { setEditingStore(false); fetchData() } else { alert('Failed to update store'); setLoading(false) }
  }

  if (loading) return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="space-y-4 mb-12"><Skeleton className="h-4 w-32" /><Skeleton className="h-12 w-64" /></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">{[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}</div>
      <Skeleton className="h-96 rounded-3xl" />
    </div>
  )

  if (!store) return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <CreateStoreCard showStoreForm={showStoreForm} setShowStoreForm={setShowStoreForm} storeName={storeName} setStoreName={setStoreName} createStore={createStore} creatingStore={creatingStore} error={error} setError={setError} />
    </div>
  )

  const analytics = computeAnalytics(products, orders)
  const filteredProducts = products.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.toLowerCase().includes(searchQuery.toLowerCase()))
  const filteredOrders = orders.filter(o => o.orders?.id?.toLowerCase().includes(searchQuery.toLowerCase()) || o.products?.title?.toLowerCase().includes(searchQuery.toLowerCase()) || (o.orders?.profiles?.full_name || 'Guest').toLowerCase().includes(searchQuery.toLowerCase()))
  const getStoreCompletion = () => {
    const fields = [store.store_name, store.description, store.seller_email, store.seller_phone, store.address, store.logo_url, store.tagline]
    return Math.round(fields.filter(f => f && String(f).trim()).length / fields.length * 100)
  }
  const storeCompletion = getStoreCompletion()

  return (
    <>
      <Helmet><title>{store.store_name} Hub | eMall Place</title></Helmet>
      {editingProduct && <SellerProductEditModal product={editingProduct} isService={store.seller_type === 'service' || (store.seller_type === 'both' && (editingProduct?.stock ?? 0) >= 999)} onClose={() => setEditingProduct(null)} onSave={fetchData} />}
      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors" onClick={() => setPreviewImage(null)}><X className="w-6 h-6" /></button>
          <img src={previewImage} alt="Full screen preview" className="max-w-full max-h-full rounded-[2rem] shadow-2xl object-contain animate-in zoom-in-95 cursor-default" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
      
      <div data-tour="seller-shell" className="min-h-screen bg-[#F9F8F6] pb-24">
        <SellerCautionNote />
        <div className="max-w-7xl mx-auto px-4 py-12">

          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-stone-400 mb-3"><TrendingUp className="h-3 w-3" /> Seller Hub</div>
              <h1 className="text-5xl font-black tracking-tighter text-slate-900 uppercase">{store.store_name}</h1>
              <div className="flex items-center gap-3 mt-3">
                <Badge variant={store.kyc_status === 'verified' ? 'success' : 'warning'} className="rounded-full text-[10px] font-black capitalize">
                  {store.kyc_status === 'verified' ? '✓ KYC Verified' : '⏳ KYC Pending'}
                </Badge>
                <Badge variant={store.is_online ? 'success' : 'outline'} className="rounded-full text-[10px] font-black">{store.is_online ? 'Online' : 'Offline'}</Badge>
                {storeCompletion < 100 && <Badge variant="warning" className="rounded-full text-[10px] font-black">{storeCompletion}% Profile</Badge>}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Online toggle */}
              <button onClick={async () => { const { error } = await supabase.from('seller_profiles').update({ is_online: !store.is_online }).eq('id', store.id); if (!error) fetchData() }} className={`flex items-center gap-2 px-5 py-3 rounded-full border-2 transition-all text-[10px] font-black uppercase tracking-widest ${store.is_online ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-stone-50 border-stone-200 text-stone-400 hover:text-stone-600'}`}>
                <div className={`w-2 h-2 rounded-full ${store.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'}`} /> {store.is_online ? 'Accepting Orders' : 'Set Online'}
              </button>
              {store.seller_type === 'both' ? (
                <>
                  <Link to="/seller/products/new" className="inline-flex">
                    <span className="inline-flex items-center justify-center rounded-full px-6 py-3 gap-2 shadow-lg bg-slate-900 text-white hover:bg-slate-800 font-bold text-sm transition-all active:scale-[0.98]">
                      <Plus className="h-4 w-4" /> Add Product
                    </span>
                  </Link>
                  <Link to="/seller/services/new" className="inline-flex">
                    <span id="create-product-button" data-tour="product-create-button" className="inline-flex items-center justify-center rounded-full px-6 py-3 gap-2 shadow-md border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white font-bold text-sm transition-all active:scale-[0.98]">
                      <Plus className="h-4 w-4" /> Add Service
                    </span>
                  </Link>
                </>
              ) : (
                <Link to={store.seller_type === 'service' ? '/seller/services/new' : '/seller/products/new'} className="inline-flex">
                  <span id="create-product-button" data-tour="product-create-button" className="inline-flex items-center justify-center rounded-full px-8 py-3 gap-2 shadow-lg bg-slate-900 text-white hover:bg-slate-800 font-bold text-sm transition-all active:scale-[0.98]">
                    <Plus className="h-5 w-5" /> Add {store.seller_type === 'service' ? 'Service' : 'Product'}
                  </span>
                </Link>
              )}
            </div>
          </div>

          {/* Analytics Stat Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-10">
            {[
              { icon: <ShoppingBag className="h-5 w-5" />, label: store.seller_type === 'both' ? 'Listings' : store.seller_type === 'service' ? 'Services' : 'Products', value: products.length, sub: `${analytics.approvedProducts} live` },
              { icon: <TrendingUp className="h-5 w-5" />, label: store.seller_type === 'both' ? 'Total Sales' : store.seller_type === 'service' ? 'Bookings' : 'Total Sales', value: orders.length, sub: `${analytics.completedOrders} completed` },
              { icon: <Activity className="h-5 w-5" />, label: 'Pending', value: analytics.pendingOrders, sub: 'require action', color: analytics.pendingOrders > 0 ? 'bg-amber-500' : undefined },
              { icon: <BarChart3 className="h-5 w-5" />, label: 'Earnings', value: `R${Math.round(analytics.totalRevenue).toLocaleString()}`, color: 'bg-emerald-600' },
              { icon: <Zap className="h-5 w-5" />, label: 'This Week', value: `R${Math.round(analytics.revenueThisWeek).toLocaleString()}`, color: 'bg-blue-600' },
              ...(store.seller_type !== 'service' ? [
                { icon: <Tag className="h-5 w-5" />, label: 'On Sale', value: analytics.onSaleProducts, sub: 'products discounted' },
                { icon: <AlertTriangle className="h-5 w-5" />, label: 'Low Stock', value: analytics.lowStock + analytics.outOfStock, sub: `${analytics.outOfStock} OOS`, color: (analytics.lowStock + analytics.outOfStock) > 0 ? 'bg-rose-500' : undefined }
              ] : [])
            ].map((s, i) => (
              <Card key={i} className="p-5 border-stone-100 shadow-sm hover:shadow-md transition-all group lg:col-span-1">
                <div className={`w-9 h-9 rounded-2xl ${s.color || 'bg-slate-900'} text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>{s.icon}</div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-stone-400 mb-0.5">{s.label}</p>
                <p className="text-2xl font-black text-slate-900 leading-none mb-1">{s.value}</p>
                {s.sub && <p className="text-[10px] text-stone-400 font-medium">{s.sub}</p>}
              </Card>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-8 border-b border-stone-200 mb-8 overflow-x-auto scrollbar-hide">
            {[
              ['analytics', 'Dashboard'], 
              ['products', store.seller_type === 'service' ? 'Services' : store.seller_type === 'both' ? 'Inventory' : 'Inventory'], 
              ['orders', store.seller_type === 'service' ? 'Bookings' : 'Orders'],
              ['likes', 'Insights/Likes'],
              ['leads', 'WhatsApp Leads']
            ].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id as any)} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all relative ${tab === id ? 'text-slate-900' : 'text-stone-400 hover:text-stone-600'}`}>
                {label}
                {tab === id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900 rounded-full" />}
              </button>
            ))}
          </div>

          {/* ── ANALYTICS TAB ─────────────────────────────────────────────── */}
          {tab === 'analytics' && (
            <div className="space-y-8">
              {/* Alerts */}
              <div className="space-y-3">
                {store.kyc_status === 'pending' && !kycSubmission && (
                  <div className="flex items-center gap-4 p-4 bg-indigo-50 border border-indigo-200 rounded-2xl">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0"><ShieldCheck className="h-5 w-5 text-indigo-600" /></div>
                    <div className="flex-1"><p className="font-bold text-indigo-900 text-sm">Action Required: Verify Identity</p><p className="text-xs text-indigo-700">Your previous identity submission was incomplete. Please verify your identity.</p></div>
                    <Link to="/seller/onboarding" className="text-[10px] font-black uppercase tracking-widest text-indigo-700 hover:text-indigo-900">Verify Now <ArrowRight className="inline h-3 w-3" /></Link>
                  </div>
                )}
                {analytics.pendingOrders > 0 && (
                  <div className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
                    <div className="flex-1"><p className="font-bold text-amber-900 text-sm">You have {analytics.pendingOrders} pending {store.seller_type === 'both' ? 'orders/bookings' : store.seller_type === 'service' ? 'requests/bookings' : 'orders'}</p><p className="text-xs text-amber-700">Fulfill these to keep your rating high.</p></div>
                    <button onClick={() => setTab('orders')} className="text-[10px] font-black uppercase tracking-widest text-amber-700 hover:text-amber-900">View <ArrowRight className="inline h-3 w-3" /></button>
                  </div>
                )}
                {store.seller_type !== 'service' && analytics.outOfStock > 0 && (
                  <div className="flex items-center gap-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0"><Package className="h-5 w-5 text-red-600" /></div>
                    <div className="flex-1"><p className="font-bold text-red-900 text-sm">{analytics.outOfStock} products are out of stock</p><p className="text-xs text-red-700">Update stock to keep selling.</p></div>
                    <button onClick={() => setTab('products')} className="text-[10px] font-black uppercase tracking-widest text-red-700 hover:text-red-900">Fix <ArrowRight className="inline h-3 w-3" /></button>
                  </div>
                )}
                {store.seller_type !== 'product' && !store.is_online && (
                  <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0"><Zap className="h-5 w-5 text-blue-600" /></div>
                    <div className="flex-1"><p className="font-bold text-blue-900 text-sm">You are currently OFFLINE</p><p className="text-xs text-blue-700">Toggle your status to Online to appear on the live Map and accept duty requests.</p></div>
                    <button onClick={async () => { const { error } = await supabase.from('seller_profiles').update({ is_online: true }).eq('id', store.id); if (!error) fetchData() }} className="text-[10px] font-black uppercase tracking-widest text-blue-700 hover:text-blue-900">Set Online <ArrowRight className="inline h-3 w-3" /></button>
                  </div>
                )}
                {storeCompletion < 100 && (
                  <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0"><StoreIcon className="h-5 w-5 text-blue-600" /></div>
                    <div className="flex-1">
                      <p className="font-bold text-blue-900 text-sm">Professional Profile Incomplete ({storeCompletion}%)</p>
                      <p className="text-xs text-blue-700">Complete your store branding (Logo & Banner) to build trust with customers.</p>
                      <div className="w-full h-1.5 bg-blue-200 rounded-full mt-2"><div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${storeCompletion}%` }} /></div>
                    </div>
                    <button onClick={() => { setEditingStore(true); setTimeout(() => document.getElementById('store-setup-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100) }} className="text-[10px] font-black uppercase tracking-widest text-blue-700 hover:text-blue-900">Finish Now <ArrowRight className="inline h-3 w-3" /></button>
                  </div>
                )}
                {(!store.logo_url || !store.banner_url) && (
                  <div className="flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl animate-in fade-in slide-in-from-left-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0"><Zap className="h-5 w-5 text-emerald-600" /></div>
                    <div className="flex-1">
                      <p className="font-bold text-emerald-900 text-sm">Boost Your Visibility</p>
                      <p className="text-xs text-emerald-700">Stores with custom branding get up to 4x more orders. Complete your branding to stand out.</p>
                    </div>
                    <button onClick={() => { setTab('analytics'); setEditingStore(true); setTimeout(() => document.getElementById('store-settings-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100) }} className="text-[10px] font-black uppercase tracking-widest text-emerald-700 hover:text-emerald-900">Add Branding <ArrowRight className="inline h-3 w-3" /></button>
                  </div>
                )}
              </div>

              {/* Top Products */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="p-0 overflow-hidden border-stone-100 shadow-sm">
                  <div className="px-6 py-5 border-b border-stone-50"><h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">Top Earning {store.seller_type === 'both' ? 'Listings' : store.seller_type === 'service' ? 'Services' : 'Products'}</h3></div>
                  {analytics.topProducts.length > 0 ? (
                    <div className="divide-y divide-stone-50">
                      {analytics.topProducts.map((p, i) => (
                        <div key={i} className="px-6 py-4 flex items-center gap-4">
                          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-xs flex-shrink-0">#{i + 1}</div>
                          <div className="flex-1 min-w-0"><p className="font-bold text-slate-900 text-sm truncate">{p.title}</p><p className="text-xs text-stone-400">{p.units} units sold</p></div>
                          <p className="font-black text-emerald-600 text-sm">R{Math.round(p.revenue).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-16 text-center text-stone-400"><Package className="h-8 w-8 mx-auto mb-3 text-stone-200" /><p className="text-sm font-medium">No sales recorded yet</p></div>
                  )}
                </Card>

                {/* Store Settings Quick Access */}
                <Card className="p-6 border-stone-100 shadow-sm space-y-4">
                  <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm mb-4">Quick Actions</h3>
                  <button onClick={() => {
                    setEditingStore(true)
                    setTimeout(() => document.getElementById('store-setup-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
                  }} className="w-full flex items-center gap-4 p-4 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-colors text-left group">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white"><Settings className="h-4 w-4" /></div>
                    <div><p className="font-bold text-slate-900 text-sm">Store Settings</p><p className="text-xs text-stone-400">Edit name, bio, contact</p></div>
                    <ArrowRight className="h-4 w-4 text-stone-300 group-hover:text-slate-900 ml-auto transition-colors" />
                  </button>
                  {store.seller_type === 'both' ? (
                    <>
                      <Link to="/seller/products/new" className="w-full flex items-center gap-4 p-4 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-colors text-left group block">
                        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white"><Plus className="h-4 w-4" /></div>
                        <div><p className="font-bold text-slate-900 text-sm">Add New Product</p><p className="text-xs text-stone-400">List a new physical item for sale</p></div>
                        <ArrowRight className="h-4 w-4 text-stone-300 group-hover:text-slate-900 ml-auto transition-colors" />
                      </Link>
                      <Link to="/seller/services/new" className="w-full flex items-center gap-4 p-4 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-colors text-left group block">
                        <div className="w-10 h-10 bg-violet-500 rounded-xl flex items-center justify-center text-white"><Zap className="h-4 w-4" /></div>
                        <div><p className="font-bold text-slate-900 text-sm">Add New Service</p><p className="text-xs text-stone-400">List a new service offering</p></div>
                        <ArrowRight className="h-4 w-4 text-stone-300 group-hover:text-slate-900 ml-auto transition-colors" />
                      </Link>
                    </>
                  ) : (
                    <Link to={store.seller_type === 'service' ? '/seller/services/new' : '/seller/products/new'} className="w-full flex items-center gap-4 p-4 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-colors text-left group block">
                      <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white"><Plus className="h-4 w-4" /></div>
                      <div><p className="font-bold text-slate-900 text-sm">Add New {store.seller_type === 'service' ? 'Service' : 'Product'}</p><p className="text-xs text-stone-400">List a new {store.seller_type === 'service' ? 'service offering' : 'item for sale'}</p></div>
                      <ArrowRight className="h-4 w-4 text-stone-300 group-hover:text-slate-900 ml-auto transition-colors" />
                    </Link>
                  )}
                  <button onClick={() => setTab('products')} className="w-full flex items-center gap-4 p-4 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-colors text-left group">
                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white"><Tag className="h-4 w-4" /></div>
                    <div><p className="font-bold text-slate-900 text-sm">Manage Sales & Pricing</p><p className="text-xs text-stone-400">Set discounts, update prices</p></div>
                    <ArrowRight className="h-4 w-4 text-stone-300 group-hover:text-slate-900 ml-auto transition-colors" />
                  </button>
                  <button onClick={() => setTab('orders')} className="w-full flex items-center gap-4 p-4 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-colors text-left group">
                    <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white"><ShoppingBag className="h-4 w-4" /></div>
                    <div><p className="font-bold text-slate-900 text-sm">Fulfill Orders</p><p className="text-xs text-stone-400">{analytics.pendingOrders} pending actions</p></div>
                    <ArrowRight className="h-4 w-4 text-stone-300 group-hover:text-slate-900 ml-auto transition-colors" />
                  </button>
                  <button onClick={() => setTab('likes')} className="w-full flex items-center gap-4 p-4 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-colors text-left group">
                    <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-white"><Heart className="h-4 w-4" /></div>
                    <div><p className="font-bold text-slate-900 text-sm">Audience Insights</p><p className="text-xs text-stone-400">{productLikes.length} product likes</p></div>
                    <ArrowRight className="h-4 w-4 text-stone-300 group-hover:text-slate-900 ml-auto transition-colors" />
                  </button>
                </Card>
              </div>

              {/* Store Details */}
              <StoreSetupForm store={store} isStoreComplete={storeCompletion >= 100} storeCompletion={storeCompletion} editingStore={editingStore} setEditingStore={setEditingStore} storeForm={storeForm} setStoreForm={setStoreForm} updateStore={updateStore} />

              {/* Advanced Store Branding & Customization (Images, Policies, Announcements) */}
              <div className="mt-8">
                <StoreSettingsForm store={store} onSaved={() => fetchData()} />
              </div>

              {/* KYC Status Module */}
              {kycSubmission && (
                <Card className="p-8 mb-8 border border-stone-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 rounded-[2.5rem]">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <ShieldCheck className="text-blue-500 w-8 h-8" /> Identity Verification
                      </h3>
                      <p className="text-sm text-stone-500 font-medium mt-1">Your submitted KYC documents and compliance status.</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={kycSubmission.status === 'approved' || kycSubmission.status === 'verified' ? 'success' : kycSubmission.status === 'rejected' ? 'error' : 'warning'} className="rounded-full text-xs font-black uppercase px-5 py-2">
                        {kycSubmission.status}
                      </Badge>
                      {kycSubmission.status !== 'approved' && kycSubmission.status !== 'verified' && (
                        <Link to="/seller/onboarding" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 underline underline-offset-4 transition-colors">
                          Resubmit Application
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-stone-50 p-8 rounded-3xl border border-stone-200 shadow-inner flex flex-col justify-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">ID/Passport Number</p>
                      <p className="text-xl font-mono font-bold text-slate-900">{kycSubmission.id_number}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-8 mb-2">Submitted On</p>
                      <p className="text-base font-bold text-slate-900">{new Date(kycSubmission.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="group relative aspect-[4/3] bg-stone-100 rounded-3xl overflow-hidden border border-stone-200 cursor-zoom-in" onClick={() => setPreviewImage(kycSubmission.document_url)}>
                        <img src={kycSubmission.document_url} alt="ID Document" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-full text-white"><Eye className="w-6 h-6" /></div>
                        </div>
                        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg text-slate-900 border border-stone-100">ID Document</div>
                      </div>
                      <div className="group relative aspect-[4/3] bg-stone-100 rounded-3xl overflow-hidden border border-stone-200 cursor-zoom-in" onClick={() => setPreviewImage(kycSubmission.selfie_url)}>
                        <img src={kycSubmission.selfie_url} alt="Selfie" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-full text-white"><Eye className="w-6 h-6" /></div>
                        </div>
                        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg text-slate-900 border border-stone-100">Selfie Match</div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Live Requests */}
              {store.seller_type !== 'product' && <LiveRequestsPanel sellerStore={store} />}

              {/* On Sale Items */}
              {store.seller_type !== 'service' && (
                <div className="mt-8">
                  <SellerOnSaleItems products={products} />
                </div>
              )}
            </div>
          )}

          {/* ── PRODUCTS TAB ─────────────────────────────────────────────────── */}
          {tab === 'products' && (
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input type="text" placeholder={store.seller_type === 'both' ? 'Search products & services...' : store.seller_type === 'service' ? 'Search services...' : 'Search products...'} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-stone-200 rounded-full text-sm font-medium focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all" />
                </div>
                {store.seller_type === 'both' ? (
                  <div className="flex gap-2">
                    <Link to="/seller/products/new">
                      <Button className="rounded-full px-5 bg-slate-900"><Plus className="h-4 w-4 mr-1" />Product</Button>
                    </Link>
                    <Link to="/seller/services/new">
                      <Button variant="outline" className="rounded-full px-5 border-slate-900 text-slate-900"><Plus className="h-4 w-4 mr-1" />Service</Button>
                    </Link>
                  </div>
                ) : (
                  <Link to={store.seller_type === 'service' ? '/seller/services/new' : '/seller/products/new'}>
                    <Button className="rounded-full px-6"><Plus className="h-4 w-4 mr-2" />New</Button>
                  </Link>
                )}
              </div>
              <Card className="p-0 overflow-hidden border-stone-100 shadow-sm">
                <SellerProductsTable 
                  filteredProducts={filteredProducts}
                  searchQuery={searchQuery}
                  deleteProduct={deleteProduct}
                  toggleProductVisibility={toggleProductVisibility}
                  setEditingProduct={setEditingProduct}
                  sellerType={store.seller_type}
                />
              </Card>
            </div>
          )}

          {/* ── ORDERS TAB ────────────────────────────────────────────────────── */}
          {tab === 'orders' && (
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input type="text" placeholder="Search orders..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-stone-200 rounded-full text-sm font-medium focus:outline-none focus:border-slate-900 transition-all" />
                </div>
              </div>
              <SellerOrdersTable filteredOrders={filteredOrders} searchQuery={searchQuery} updateItemStatus={handleItemStatusChange} sellerType={store.seller_type} />
            </div>
          )}

          {/* ── LIKES / INSIGHTS TAB ──────────────────────────────────────────── */}
          {tab === 'likes' && (
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1">
                  <Heart className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-400" />
                  <input type="text" placeholder="Search likes history..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-stone-200 rounded-full text-sm font-medium focus:outline-none focus:border-slate-900 transition-all" />
                </div>
              </div>
              <Card className="p-0 overflow-hidden border-stone-100 shadow-sm">
                <table className="min-w-full">
                  <thead className="bg-stone-50 border-b border-stone-100">
                    <tr>
                      {['Product / Service', 'Liked By', 'Time'].map(h => <th key={h} className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-stone-400">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-stone-50">
                    {productLikes.filter(l => l.products?.title?.toLowerCase().includes(searchQuery.toLowerCase()) || l.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())).map(l => (
                      <tr key={l.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-6 py-4 min-w-0">
                          <p className="font-bold text-slate-900 text-sm">{l.products?.title}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-slate-900">{l.profiles?.full_name || 'Guest User'}</p>
                          <p className="text-xs text-stone-400">{l.profiles?.email}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-stone-500 font-medium">
                            {new Date(l.created_at).toLocaleDateString()} at {new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>
                      </tr>
                    ))}
                    {productLikes.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-20 text-center text-stone-400 font-medium">
                          <Heart className="h-8 w-8 mx-auto mb-3 text-stone-200" />
                          <p className="text-sm">No likes received yet.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Card>
            </div>
          )}
          {/* ── WHATSAPP LEADS TAB ──────────────────────────────────────────── */}
          {tab === 'leads' && (
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1">
                  <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#25D366]" />
                  <input type="text" placeholder="Search leads by product or ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border border-stone-200 rounded-full text-sm font-medium focus:outline-none focus:border-slate-900 transition-all" />
                </div>
              </div>
              <Card className="p-0 overflow-hidden border-stone-100 shadow-sm">
                <table className="min-w-full">
                  <thead className="bg-stone-50 border-b border-stone-100">
                    <tr>
                      {['Product / Service', 'Lead Type', 'Time'].map(h => <th key={h} className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-stone-400">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-stone-50">
                    {leads.filter(l => l.products?.title?.toLowerCase().includes(searchQuery.toLowerCase())).map(l => (
                      <tr key={l.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-6 py-4 min-w-0">
                          <p className="font-bold text-slate-900 text-sm">{l.products?.title || 'General Store Enquiry'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-stone-50 text-stone-600 border-stone-200">
                            {l.intent || 'enquire'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-stone-500 font-medium">
                            {new Date(l.created_at).toLocaleDateString()} at {new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>
                      </tr>
                    ))}
                    {leads.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-20 text-center text-stone-400 font-medium">
                          <MessageCircle className="h-8 w-8 mx-auto mb-3 text-stone-200" />
                          <p className="text-sm">No WhatsApp leads tracked yet.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Card>
            </div>
          )}
        </div>

        <CompletionCelebration isVisible={celebrationPending} onDismiss={dismissCelebration} />
      </div>
    </>
  )
}
