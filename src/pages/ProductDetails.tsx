import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCart } from '../contexts/CartContext'
import { useToast } from '../contexts/ToastContext'
import { Product } from '../types'
import { ShoppingCart, ArrowLeft, Store, ShieldCheck, Truck, RefreshCw, Clock } from 'lucide-react'
import { getSaleInfo } from '../utils/saleUtils'
import SaleBadge from '../components/SaleBadge'
import ProductImage from '../components/ProductImage'
import ErrorAlert from '../components/ErrorAlert'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { Helmet } from 'react-helmet-async'
import { WhatsAppButton } from '../components/ui/WhatsAppButton'

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

  useEffect(() => {
    if (id) fetchProduct()
  }, [id])

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
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-8 w-40" />
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
    sale_label: product.sale_label || null
  })

  return (
    <>
      <Helmet>
        <title>{product.title} | eMall Place</title>
        <meta name="description" content={product.description?.slice(0, 160) || `Buy ${product.title} on eMall Place Collective.`} />
        {allImages[0]?.url && <meta property="og:image" content={allImages[0].url} />}
      </Helmet>
      <div className="container mx-auto px-4 py-12">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="mb-10 -ml-2 text-stone-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Results
      </Button>

      {/* Trust cues */}
      <div className="flex flex-wrap gap-4 mb-8">
        <Badge variant="outline" className="border-emerald-200 text-emerald-600 bg-emerald-50 rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest">
          Secure checkout at next step
        </Badge>
        <Badge variant="outline" className="border-blue-200 text-blue-600 bg-blue-50 rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest">
          Local is lekker
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* Image Gallery */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-0 border-none bg-stone-100 overflow-hidden rounded-3xl aspect-square relative group flex items-center justify-center">
            <ProductImage
              src={allImages[selectedImage]?.url}
              alt={product.title}
              className="w-full h-full group-hover:scale-105 transition-transform duration-700"
              imgClassName="object-contain"
              transformOptions={{ width: 800, quality: 85, format: 'webp' }}
            />
            {saleInfo.isOnSale && (
              <SaleBadge label={saleInfo.saleLabel || `${saleInfo.discountPercent}% OFF`} className="top-6 right-6" />
            )}
            {!saleInfo.isOnSale && product.stock <= 5 && product.stock > 0 && (
              <Badge variant="warning" className="absolute top-6 left-6 shadow-xl py-1.5 px-4 rounded-full">
                Only {product.stock} Left
              </Badge>
            )}
          </Card>
          
          {allImages.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {allImages.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(idx)}
                  className={`flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all ${
                    selectedImage === idx ? 'border-slate-900 ring-4 ring-slate-900/5' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <ProductImage src={img.url} alt="" className="w-full h-full" imgClassName="object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="mb-8">
            <button
              onClick={() => {
                const storeId = (product as any).seller_store?.id
                if (storeId) {
                  navigate(`/store/${storeId}`)
                }
              }}
              className="w-full sm:w-auto flex items-center justify-between gap-6 bg-white border-2 border-slate-900/5 hover:border-slate-900 p-2 pr-6 rounded-full shadow-sm hover:shadow-xl transition-all mb-8 group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-stone-100 rounded-full flex items-center justify-center group-hover:bg-slate-900 transition-colors">
                  <Store className="h-5 w-5 text-stone-500 group-hover:text-white transition-colors" />
                </div>
                <div className="flex flex-col items-start pr-4">
                  <span className="text-[9px] font-black uppercase tracking-widest text-stone-400">Storefront</span>
                  <span className="font-black text-slate-900 text-sm">
                    {(product as any).seller_store?.store_name || 'Local Seller'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-center h-8 w-8 bg-stone-100 rounded-full group-hover:bg-slate-100 transition-colors">
                <ArrowLeft className="h-4 w-4 text-slate-400 group-hover:text-slate-900 rotate-180 transition-colors" />
              </div>
            </button>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4 leading-[1.1]">{product.title}</h1>
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-black text-slate-900 tracking-tight">R {saleInfo.displayPrice.toLocaleString()}</span>
                {saleInfo.isOnSale && (
                  <span className="text-lg text-stone-400 line-through">
                    R {saleInfo.originalPrice.toLocaleString()}
                  </span>
                )}
              </div>
              {product.stock > 0 ? (
                <Badge variant="success" className="rounded-full px-4 py-1.5 font-bold">In Stock</Badge>
              ) : (
                <Badge variant="error" className="rounded-full px-4 py-1.5 font-bold">Sold Out</Badge>
              )}
            </div>
            {saleInfo.isOnSale && product.sale_ends_at && (
              <div className="flex items-center gap-2 text-sm text-orange-600 mb-6 bg-orange-50 px-4 py-2 rounded-lg w-fit">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Sale ends {new Date(product.sale_ends_at).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
          </div>
          
          <div className="prose prose-stone mb-10 max-w-none">
            <h3 className="text-sm font-black uppercase tracking-widest text-stone-400 mb-4">Product Description</h3>
            <p className="text-stone-600 text-lg leading-relaxed whitespace-pre-line">{product.description}</p>
          </div>

          <div className="space-y-8 mt-auto pt-10 border-t border-stone-100">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col items-center text-center gap-2 p-4 rounded-2xl bg-stone-50">
                <Truck className="h-6 w-6 text-blue-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-600">Nationwide Delivery</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2 p-4 rounded-2xl bg-stone-50">
                <ShieldCheck className="h-6 w-6 text-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-600">Secure Yoco Pay</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2 p-4 rounded-2xl bg-stone-50">
                <RefreshCw className="h-6 w-6 text-amber-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-600">Trusted Seller</span>
              </div>
            </div>

            <Button
              size="lg"
              onClick={handleAddToCart}
              disabled={product.stock === 0 || adding}
              className="w-full rounded-full py-8 text-xl group shadow-2xl shadow-slate-900/10"
            >
              {adding ? (
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Adding to Cart...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-6 w-6 group-hover:-translate-y-1 transition-transform" />
                  <span>Add to Cart</span>
                </div>
              )}
            </Button>
            
            <WhatsAppButton
              sellerId={product.seller_id || ''}
              sellerPhone={(product as any).seller_store?.whatsapp_number || (product as any).seller_store?.seller_phone}
              productId={product.id}
              productName={product.title}
              price={saleInfo.displayPrice}
              intent="buy"
              className="w-full py-4 text-xl rounded-full mt-4 shadow-xl"
            />
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
