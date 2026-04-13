import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Product, SellerStore } from '../types'
import {
  ChevronRight, Store as StoreIcon, Package, Edit2, Loader,
  Star, MapPin, Phone, Mail, Tag, ShieldCheck, Clock, Zap,
  Camera, ExternalLink, Globe
} from 'lucide-react'
import { getStoreLogo } from '../lib/storeUtils'
import ProductImage from '../components/ProductImage'
import LikeButton from '../components/ui/LikeButton'
import ErrorAlert from '../components/ErrorAlert'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '../contexts/AuthContext'
import StoreReviews from '../components/store/StoreReviews'
import { StoreShare } from '../components/store/StoreShare'

export default function StoreHome() {
  const { storeSlug } = useParams<{ storeSlug: string }>()
  const { user } = useAuth()
  const [store, setStore] = useState<SellerStore | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [activeTab, setActiveTab] = useState<'products' | 'services'>('products')

  const isOwner = user && store && user.id === store.owner_id
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (storeSlug) fetchStoreData()
  }, [storeSlug])

  const fetchStoreData = async () => {
    setLoading(true)
    setError(null)
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeSlug!)
      const queryCol = isUuid ? 'id' : 'store_slug'

      const { data: spData, error: profileError } = await supabase
        .from('seller_profiles')
        .select('*, stores(*)')
        .eq(queryCol, storeSlug!)
        .maybeSingle()
        
      if (profileError || !spData) throw new Error('Store not found')
      
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
        store_slug: spData.store_slug
      }
      setStore(mappedStore)

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*, product_images(*)')
        .eq('seller_id', spData.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        
      if (productsError) throw productsError

      let combinedItems: Product[] = productsData || []

      // If they are a service provider, fetch services and map to Product shape
      if (spData.seller_type === 'service' || spData.seller_type === 'both') {
         const { data: servicesData } = await supabase
           .from('services')
           .select('*')
           .eq('seller_id', spData.id)
           .eq('status', 'approved')
           .eq('is_active', true)
           .order('created_at', { ascending: false })
           
         if (servicesData && servicesData.length > 0) {
           const mappedServices = servicesData.map((s: any) => ({
              id: s.id,
              seller_id: s.seller_id,
              category_id: s.category_id,
              title: s.title,
              description: s.description,
              price: s.base_rate, // Map base_rate to price
              stock: 999,
              status: s.status,
              created_at: s.created_at,
              updated_at: s.updated_at || s.created_at,
              is_on_sale: false,
              product_images: [], 
              type: 'service' // discriminator
           })) as unknown as Product[]
           
           combinedItems = [...combinedItems, ...mappedServices]
           // Sort combined by created_at desc
           combinedItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
         }
      }

      setProducts(combinedItems)
    } catch (err: any) {
      console.error('Error fetching store data:', err)
      setError('Failed to load store. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBannerUpload = async (file: File) => {
    if (!store || !isOwner) return
    setUploadingBanner(true)
    setError(null)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const fileName = `${store.id}/banner_${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('store-banners')
        .upload(fileName, file, { upsert: true })

      if (uploadError) {
        if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('bucket not found')) {
          throw new Error('Storage bucket "store-banners" not found. Please run FIX_STORE_REVIEWS.sql in your Supabase SQL Editor.')
        }
        throw uploadError
      }

      const { data: urlData } = supabase.storage.from('store-banners').getPublicUrl(fileName)
      // Append cache-buster to force browser refresh
      const bannerUrl = `${urlData.publicUrl}?t=${Date.now()}`

      const { error: updateError } = await supabase
        .from('stores')
        .upsert({ seller_id: store.id, banner_url: bannerUrl }, { onConflict: 'seller_id' })
        
      if (updateError) throw updateError

      setStore({ ...store, banner_url: bannerUrl })
    } catch (err: any) {
      console.error('Error uploading banner:', err)
      setError(err.message || 'Failed to upload banner image')
    } finally {
      setUploadingBanner(false)
    }
  }

  const handleLogoUpload = async (file: File) => {
    if (!store || !isOwner) return
    setUploadingLogo(true)
    setError(null)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const fileName = `${store.id}/logo_${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('store-logos')
        .upload(fileName, file, { upsert: true })

      if (uploadError) {
        if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('bucket not found')) {
          throw new Error('Storage bucket "store-logos" not found. Please run FIX_STORE_REVIEWS.sql in your Supabase SQL Editor.')
        }
        throw uploadError
      }

      const { data: urlData } = supabase.storage.from('store-logos').getPublicUrl(fileName)
      const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`

      const { error: updateError } = await supabase
        .from('stores')
        .upsert({ seller_id: store.id, logo_url: logoUrl }, { onConflict: 'seller_id' })
        
      if (updateError) throw updateError

      setStore({ ...store, logo_url: logoUrl })
    } catch (err: any) {
      console.error('Error uploading logo:', err)
      setError(err.message || 'Failed to upload logo image')
    } finally {
      setUploadingLogo(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-[#F9F8F6] min-h-screen">
        <Skeleton className="h-72 w-full" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-end gap-6 -mt-24 mb-12">
            <Skeleton className="w-32 h-32 rounded-[2rem]" />
            <div className="space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-48" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-square rounded-2xl" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-6 w-1/3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!store) {
    return (
      <div className="bg-[#F9F8F6] min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <ErrorAlert message={error || 'Store not found'} onClose={() => {}} />
          <Button variant="outline" onClick={() => window.history.back()} className="mt-8">Go Back</Button>
        </div>
      </div>
    )
  }

  const avgRating = store.average_rating ? Number(store.average_rating).toFixed(1) : null
  const reviewCount = store.review_count || 0

  return (
    <>
      <Helmet>
        <title>{store.store_name} | eMall Place</title>
        <meta name="description" content={store.description?.slice(0, 160) || `${store.seller_type === 'service' ? 'Book' : 'Shop'} from ${store.store_name} on eMall Place Collective.`} />
      </Helmet>

      <div className="bg-[#F9F8F6] min-h-screen">

        {/* ─── HERO BANNER ────────────────────────────────────────────────── */}
        <div className="relative">
          {/* Banner Image */}
          <div
            className={`h-56 sm:h-72 md:h-80 w-full relative group ${!store.banner_url ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : ''}`}
            style={store.banner_url ? {
              backgroundImage: `url(${store.banner_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            } : {}}
            onClick={() => isOwner && bannerInputRef.current?.click()}
          >
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            {/* Pattern overlay for default banner */}
            {!store.banner_url && (
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                backgroundSize: '40px 40px'
              }} />
            )}

            {/* Owner Edit Overlay */}
            {isOwner && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer z-10">
                <div className="bg-white/20 backdrop-blur-md text-white rounded-2xl px-6 py-3 flex items-center gap-3 border border-white/30 shadow-2xl">
                  <Camera className="w-5 h-5" />
                  <span className="text-sm font-black uppercase tracking-widest">Change Banner</span>
                </div>
              </div>
            )}

            {uploadingBanner && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                <Loader className="h-10 w-10 text-white animate-spin" />
              </div>
            )}

            {/* Breadcrumb on banner */}
            <div className="absolute top-6 left-6 z-10">
              <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/70">
                <Link to="/" className="hover:text-white transition-colors">Home</Link>
                <ChevronRight className="h-3 w-3" />
                <Link to="/marketplace" className="hover:text-white transition-colors">Marketplace</Link>
                <ChevronRight className="h-3 w-3" />
                <span className="text-white">{store.store_name}</span>
              </nav>
            </div>
          </div>

          {/* Store Identity Bar (overlaps banner) */}
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative -mt-20 flex flex-col sm:flex-row items-start sm:items-end gap-6 pb-8">
              {/* Logo */}
              <div
                className="flex-shrink-0 w-32 h-32 sm:w-36 sm:h-36 bg-white rounded-[2rem] p-2 shadow-2xl border-4 border-white relative z-10 group cursor-pointer"
                onClick={() => isOwner && logoInputRef.current?.click()}
              >
                <img 
                  src={getStoreLogo(store.store_name, store.logo_url)} 
                  alt={store.store_name} 
                  className="w-full h-full object-cover rounded-[1.4rem] group-hover:opacity-80 transition-opacity" 
                />
                {isOwner && (
                  <div className="absolute inset-2 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-[1.4rem]">
                    <div className="bg-black/50 text-white rounded-full p-3 backdrop-blur">
                      <Camera className="h-5 w-5" />
                    </div>
                  </div>
                )}
                {uploadingLogo && (
                  <div className="absolute inset-2 flex items-center justify-center bg-black/40 rounded-[1.4rem]">
                    <Loader className="h-6 w-6 text-white animate-spin" />
                  </div>
                )}
              </div>

              {/* Store Name + Badges */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
                  <div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none mb-2">
                      {store.store_name}
                    </h1>
                    {store.tagline && (
                      <p className="text-stone-500 font-medium text-sm sm:text-base italic">"{store.tagline}"</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 mt-2 sm:mt-0 pt-1">
                    <StoreShare storeName={store.store_name} />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {store.kyc_status === 'verified' && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verified Seller
                    </span>
                  )}
                  {store.seller_type && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-100">
                      <Tag className="w-3 h-3" />
                      {store.seller_type === 'both' ? 'Products & Services' : store.seller_type === 'service' ? 'Services' : 'Products'}
                    </span>
                  )}
                  {avgRating && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full border border-amber-100">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {avgRating} ({reviewCount})
                    </span>
                  )}
                  {store.is_online && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full border border-emerald-100">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Online
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── MAIN CONTENT ───────────────────────────────────────────────── */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-24">

          {/* Error Display */}
          {error && <ErrorAlert message={error} onClose={() => setError(null)} className="mb-8" />}

          {/* ─── STORE INFO CARDS ──────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* About */}
            <Card className="p-6 border-stone-100 shadow-sm md:col-span-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-stone-400 mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4" /> About This {store.seller_type === 'service' ? 'Service Provider' : 'Store'}
              </h3>
              {store.description ? (
                <p className="text-slate-700 leading-relaxed font-medium">{store.description}</p>
              ) : (
                <p className="text-stone-400 italic">This seller hasn't added a description yet.</p>
              )}
              {(store as any).category && (
                <div className="mt-4 pt-4 border-t border-stone-50">
                  <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Category: </span>
                  <span className="text-sm font-bold text-slate-900">{(store as any).category}</span>
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-stone-50 flex items-center gap-6 text-sm text-stone-500 flex-wrap">
                <span className="flex items-center gap-2"><Package className="w-4 h-4 text-slate-400" />{products.length} {store.seller_type === 'service' ? 'Services' : 'Products'}</span>
                <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" />Joined {new Date(store.created_at).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}</span>
                {reviewCount > 0 && (
                  <span className="flex items-center gap-2"><Star className="w-4 h-4 text-amber-400 fill-amber-400" />{avgRating} ({reviewCount} reviews)</span>
                )}
              </div>
            </Card>

            {/* Contact Details */}
            <Card className="p-6 border-stone-100 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-stone-400 mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4" /> Contact & Location
              </h3>
              <div className="space-y-4">
                {store.seller_email && (
                  <a href={`mailto:${store.seller_email}`} className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors flex-shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Email</p>
                      <p className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{store.seller_email}</p>
                    </div>
                  </a>
                )}
                {store.seller_phone && (
                  <a href={`tel:${store.seller_phone}`} className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-colors flex-shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Phone</p>
                      <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{store.seller_phone}</p>
                    </div>
                  </a>
                )}
                {store.address && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 flex-shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Address</p>
                      <p className="text-sm font-bold text-slate-900 line-clamp-2">{store.address}</p>
                    </div>
                  </div>
                )}
                {!store.seller_email && !store.seller_phone && !store.address && (
                  <p className="text-sm text-stone-400 italic py-4 text-center">No contact details available.</p>
                )}
                {store.seller_type !== 'product' && store.service_mode && (
                  <div className="mt-4 pt-4 border-t border-stone-50">
                    <div className="bg-slate-900 rounded-2xl p-4 text-white">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Service Range</span>
                        <span className="text-sm font-black italic">{store.radius_km || 10} KM</span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Mode</span>
                        <span className="text-[10px] font-black uppercase bg-white/10 px-2 py-1 rounded-full">{store.service_mode.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* ─── PRODUCTS SECTION ──────────────────────────────────────────── */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
                  {store.seller_type === 'both' ? 'Explore Store' : store.seller_type === 'service' ? 'Explore Services' : 'Shop All Products'}
                </h2>
                <p className="text-stone-500 mt-1 font-medium">{store.seller_type === 'both' ? 'Browse products and services' : store.seller_type === 'service' ? 'Professional services you can book today' : 'Explore our full collection'}</p>
              </div>
              <div className="flex items-center gap-4">
                {store.seller_type === 'both' && (
                  <div className="flex bg-stone-100 p-1 rounded-full border border-stone-200">
                    <button
                      onClick={() => setActiveTab('products')}
                      className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                        activeTab === 'products' ? 'bg-white text-slate-900 shadow-sm' : 'text-stone-400 hover:text-slate-900'
                      }`}
                    >
                      Products
                    </button>
                    <button
                      onClick={() => setActiveTab('services')}
                      className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                        activeTab === 'services' ? 'bg-white text-slate-900 shadow-sm' : 'text-stone-400 hover:text-slate-900'
                      }`}
                    >
                      Services
                    </button>
                  </div>
                )}
                {products.length > 0 && store.seller_type !== 'both' && (
                  <Badge variant="outline" className="rounded-full px-4 py-2 font-black text-xs hidden sm:flex">
                    {products.length} {store.seller_type === 'service' ? 'Services' : 'Items'}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {(() => {
            const displayedItems = store.seller_type === 'both' 
              ? products.filter(p => {
                  const isSvc = (p as any).type === 'service' || (p.stock ?? 0) >= 999;
                  return activeTab === 'products' ? !isSvc : isSvc;
                })
              : products;
            
            return displayedItems.length === 0 ? (
              <Card className="p-16 text-center border-stone-100">
                <div className="bg-stone-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Package className="h-8 w-8 text-stone-300" />
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">No {store.seller_type === 'both' ? activeTab : store.seller_type === 'service' ? 'Services' : 'Products'} Yet</h3>
                <p className="text-stone-500 mt-2">This store is setting up their catalog.</p>
                {store.seller_type !== 'both' && (
                  <Button variant="outline" className="mt-8" onClick={() => window.history.back()}>Go Back</Button>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {displayedItems.map(product => (
                  <Link key={product.id} to={`/product/${product.id}`} className="group">
                  <Card className="h-full overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col bg-white border-stone-100">
                    {/* Image */}
                    <div className="relative aspect-square bg-stone-100 overflow-hidden flex-shrink-0">
                      {product.product_images?.[0] ? (
                        <ProductImage
                          src={product.product_images[0].url}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-300 bg-stone-50">
                          <Package size={40} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      {/* Sale Badge */}
                      {product.is_on_sale && (
                        <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                          {product.sale_label || 'SALE'}
                        </div>
                      )}

                      {/* Quick View Arrow */}
                      <div className="absolute bottom-3 right-3 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 shadow-lg">
                        <ExternalLink className="w-4 h-4 text-slate-900" />
                      </div>

                      {/* Like Button */}
                      <div className="absolute top-3 right-3 z-10">
                        <LikeButton productId={product.id} size={16} />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-bold text-sm leading-tight text-slate-900 line-clamp-2 mb-auto group-hover:text-blue-600 transition-colors">
                        {product.title}
                      </h3>

                      {product.description && (
                        <p className="text-xs text-stone-500 line-clamp-1 mt-2 mb-3">{product.description}</p>
                      )}

                      <div className="pt-3 border-t border-stone-100 mt-auto flex items-end justify-between">
                        <div>
                          {product.is_on_sale && product.sale_price ? (
                            <>
                              <span className="text-lg font-black text-red-600">R{product.sale_price.toLocaleString()}</span>
                              <span className="text-xs text-stone-400 line-through ml-2">R{product.price.toLocaleString()}</span>
                            </>
                          ) : (
                            <span className="text-lg font-black text-slate-900">
                              R{product.price.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                          )}
                        </div>
                        {product.stock <= 5 && product.stock > 0 && (
                          <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">Low Stock</span>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          );
          })()}

          {/* ─── REVIEWS SECTION ───────────────────────────────────────────── */}
          <StoreReviews sellerId={store.id} storeOwnerId={store.owner_id} />
        </div>

        {/* Hidden file inputs */}
        <input ref={bannerInputRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleBannerUpload(f); e.target.value = '' }} className="hidden" />
        <input ref={logoInputRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = '' }} className="hidden" />
      </div>
    </>
  )
}
