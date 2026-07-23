import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'
import { Product } from '../types'
import { ShoppingCart, ArrowLeft, Store, ShieldCheck, Truck, RefreshCw, BadgeCheck, CreditCard } from 'lucide-react'
import { getSaleInfo } from '../utils/saleUtils'
import SaleBadge from '../components/SaleBadge'
import SaleCountdown from '../components/SaleCountdown'
import MarketplaceImage from '../components/MarketplaceImage'
import ErrorAlert from '../components/ErrorAlert'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { Helmet } from 'react-helmet-async'
import { WhatsAppButton } from '../components/ui/WhatsAppButton'
import Breadcrumb from '../components/nav/Breadcrumb'
import UnifiedProductCard from '../components/UnifiedProductCard'

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { addToast } = useToast()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [sellerProducts, setSellerProducts] = useState<Product[]>([])

  useEffect(() => { if (id) fetchProduct() }, [id])

  const fetchProduct = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: pError } = await supabase
        .from('products')
        .select('*, product_images(*), seller_store:seller_profiles(*)')
        .eq('id', id)
        .single()
      if (pError) throw pError
      setProduct(data)

      // Fetch related and seller products
      if (data) {
        Promise.all([
          supabase.from('products').select('*, product_images(*), seller_store:seller_profiles(*)').eq('category_id', data.category_id).neq('id', data.id).eq('status', 'approved').limit(4),
          supabase.from('products').select('*, product_images(*), seller_store:seller_profiles(*)').eq('seller_id', data.seller_id).neq('id', data.id).eq('status', 'approved').limit(4)
        ]).then(([relatedRes, sellerRes]) => {
          if (relatedRes.data) setRelatedProducts(relatedRes.data)
          if (sellerRes.data) setSellerProducts(sellerRes.data)
        })
      }
    } catch (err: any) {
      console.error('Error fetching product:', err)
      setError('Product not found or failed to load.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = async () => {
    if (!product) return
    setAdding(true)
    addToCart(product)
    addToast(`${product.title} added to your bag 🛍️`, 'success')
    setTimeout(() => setAdding(false), 800)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <Skeleton className="aspect-square rounded-3xl" />
          <div className="space-y-6">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-16 w-full rounded-full" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-md mx-auto">
          <ErrorAlert message={error || 'Product not found'} />
          <Button variant="outline" onClick={() => navigate('/shop')} className="mt-8 rounded-full">
            Return to Marketplace
          </Button>
        </div>
      </div>
    )
  }

  const allImages = product.product_images || []
  const saleInfo = getSaleInfo({
    price: product.price,
    is_on_sale: product.is_on_sale || false,
    sale_price: product.sale_price || null,
    sale_starts_at: product.sale_starts_at || null,
    sale_ends_at: product.sale_ends_at || null,
    sale_label: product.sale_label || null,
  })

  const sellerStore = (product as any).seller_store
  const storeName = sellerStore?.store_name || 'Local Seller'
  const storeSlug = sellerStore?.store_slug || sellerStore?.id
  const isVerified = sellerStore?.kyc_status === 'approved' || sellerStore?.kyc_status === 'verified'

  return (
    <>
      <Helmet>
        <title>{product.title} | eMall Place</title>
        <meta name="description" content={product.description?.slice(0, 160) || `Buy ${product.title} on eMall Place Collective.`} />
        {allImages[0]?.url && <meta property="og:image" content={allImages[0].url} />}
      </Helmet>

      <div className="container mx-auto px-4 py-8">

        {/* Breadcrumb */}
        <Breadcrumb items={[
          { label: 'Marketplace', href: '/marketplace' },
          { label: product.title },
        ]} />

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-4">

          {/* ── Image Gallery ── */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="p-0 border-none bg-[#FAFAF8] overflow-hidden rounded-[20px] aspect-square relative group flex items-center justify-center">
              <MarketplaceImage
                src={allImages[selectedImage]?.url}
                alt={product.title}
                className="w-full h-full group-hover:scale-[1.03] transition-transform duration-700"
                imgClassName="object-contain"
                fetchPriority="high"
                transformOptions={{ width: 900, quality: 90, format: 'webp' }}
              />
              {saleInfo.isOnSale && (
                <SaleBadge label={saleInfo.saleLabel || `${saleInfo.discountPercent ?? 0}% OFF`} className="top-5 right-5" />
              )}
              {!saleInfo.isOnSale && product.stock <= 5 && product.stock > 0 && (
                <Badge variant="warning" className="absolute top-5 left-5 shadow-xl py-1.5 px-4 rounded-full">
                  Only {product.stock} Left
                </Badge>
              )}
            </Card>

            {allImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {allImages.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(idx)}
                    aria-label={`View image ${idx + 1}`}
                    className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                      selectedImage === idx ? 'border-slate-900 ring-4 ring-slate-900/5' : 'border-transparent opacity-50 hover:opacity-100'
                    }`}
                  >
                    <MarketplaceImage src={img.url} alt="" className="w-full h-full" imgClassName="object-contain" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Product Info ── */}
          <div className="lg:col-span-5 flex flex-col">

            {/* Seller pill */}
            <button
              onClick={() => storeSlug && navigate(`/store/${storeSlug}`)}
              className="w-full sm:w-auto flex items-center justify-between gap-4 bg-white border border-stone-200 hover:border-slate-900 p-2 pr-5 rounded-full shadow-sm hover:shadow-lg transition-all mb-6 group cursor-pointer"
              aria-label={`Visit ${storeName} storefront`}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-stone-100 rounded-full flex items-center justify-center group-hover:bg-slate-900 transition-colors">
                  <Store className="h-4 w-4 text-stone-500 group-hover:text-white transition-colors" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Sold by</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-slate-900 text-sm">{storeName}</span>
                    {isVerified && (
                      <BadgeCheck size={14} className="text-emerald-500" aria-label="Verified seller" />
                    )}
                  </div>
                </div>
              </div>
              <ArrowLeft className="h-4 w-4 text-stone-400 group-hover:text-slate-900 rotate-180 transition-colors flex-shrink-0" />
            </button>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4 leading-[1.1]">
              {product.title}
            </h1>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-3 flex-wrap">
              <span className={`text-4xl font-black tracking-tight ${saleInfo.isOnSale ? 'text-red-600' : 'text-slate-900'}`}>
                R {saleInfo.displayPrice.toLocaleString('en-ZA', { minimumFractionDigits: 0 })}
              </span>
              {saleInfo.isOnSale && (
                <>
                  <span className="text-xl text-stone-400 line-through">
                    R {saleInfo.originalPrice.toLocaleString('en-ZA', { minimumFractionDigits: 0 })}
                  </span>
                  {(saleInfo.discountPercent ?? 0) > 0 && (
                    <Badge variant="success" className="rounded-full px-3 py-1 font-bold text-sm">
                      Save {saleInfo.discountPercent}%
                    </Badge>
                  )}
                </>
              )}
            </div>

            {/* Stock and Shipping */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {product.stock > 0 ? (
                <Badge variant="success" className="rounded-full px-4 py-1.5 font-bold">In Stock</Badge>
              ) : (
                <Badge variant="error" className="rounded-full px-4 py-1.5 font-bold">Sold Out</Badge>
              )}
              {product.stock > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 bg-stone-100 px-3 py-1.5 rounded-full">
                  <Truck size={14} className="text-stone-400" />
                  <span>Ships within 2-3 days</span>
                </div>
              )}
            </div>

            {/* Sale countdown */}
            {saleInfo.isOnSale && product.sale_ends_at && (
              <SaleCountdown endsAt={product.sale_ends_at} className="mb-6" />
            )}

            {/* Description */}
            <div className="mb-8">
              <h2 className="text-xs font-black uppercase tracking-widest text-stone-400 mb-3">Product Description</h2>
              <p className="text-stone-600 text-base leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>

            {/* Trust icons */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { icon: Truck, label: 'Nationwide Delivery', color: 'text-blue-500' },
                { icon: ShieldCheck, label: 'Secure Checkout', color: 'text-emerald-500' },
                { icon: RefreshCw, label: 'Easy Returns', color: 'text-amber-500' },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className="flex flex-col items-center text-center gap-1.5 p-3 rounded-xl bg-stone-50">
                  <Icon className={`h-5 w-5 ${color}`} aria-hidden="true" />
                  <span className="text-xs font-bold text-stone-600 leading-tight">{label}</span>
                </div>
              ))}
            </div>

            {/* Add to Cart */}
            <Button
              size="lg"
              onClick={handleAddToCart}
              disabled={product.stock === 0 || adding}
              className="w-full rounded-full py-7 text-lg group shadow-2xl shadow-slate-900/10 mb-4"
            >
              {adding ? (
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Adding to Cart...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-5 w-5 group-hover:-translate-y-0.5 transition-transform" />
                  <span>{product.stock === 0 ? 'Sold Out' : 'Add to Cart'}</span>
                </div>
              )}
            </Button>

            {/* Payment methods */}
            <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
              <CreditCard size={14} className="text-stone-400" />
              {['Yoco', 'Visa', 'Mastercard', 'EFT'].map(m => (
                <span key={m} className="text-xs font-bold text-stone-400 bg-stone-100 px-2.5 py-1 rounded-md">{m}</span>
              ))}
            </div>

            {/* WhatsApp CTA */}
            <WhatsAppButton
              sellerId={product.seller_id || ''}
              sellerPhone={sellerStore?.whatsapp_number || sellerStore?.seller_phone}
              productId={product.id}
              productName={product.title}
              price={saleInfo.displayPrice}
              intent="buy"
              className="w-full py-4 text-lg rounded-full shadow-lg"
            />

            {/* Buyer protection note */}
            <p className="text-center text-xs text-stone-400 mt-4">
              Protected by eMall Place{' '}
              <Link to="/returns-policy" className="underline hover:text-slate-900 transition-colors">
                Buyer Guarantee
              </Link>
            </p>
          </div>
      </div>

      {/* --- Extra Sections --- */}
      {(relatedProducts.length > 0 || sellerProducts.length > 0) && (
        <div className="mt-20 space-y-20 border-t border-stone-100 pt-16">
          {relatedProducts.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">You may also like</h2>
                <Link to={`/marketplace?category=${product?.category_id || 'all'}`} className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors">See all</Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {relatedProducts.map(p => (
                  <UnifiedProductCard key={p.id} product={p} variant="grid" showAddToCart={false} showSeller={true} />
                ))}
              </div>
            </section>
          )}

          {sellerProducts.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">More from {storeName}</h2>
                <Link to={`/store/${storeSlug || ''}`} className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors">Visit store</Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {sellerProducts.map(p => (
                  <UnifiedProductCard key={p.id} product={p} variant="grid" showAddToCart={false} showSeller={false} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
    </>
  )
}