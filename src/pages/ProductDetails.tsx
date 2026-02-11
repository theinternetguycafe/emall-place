import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCart } from '../contexts/CartContext'
import { Product } from '../types'
import { ShoppingCart, ArrowLeft, Store, ShieldCheck, Truck, RefreshCw } from 'lucide-react'
import ProductImage from '../components/ProductImage'
import ErrorAlert from '../components/ErrorAlert'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addToCart } = useCart()
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
        .select('*, product_images(*), seller_store:seller_store_id(*)')
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

  return (
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* Image Gallery */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="p-0 border-none bg-stone-100 overflow-hidden rounded-3xl aspect-square relative group">
            <ProductImage
              src={allImages[selectedImage]?.url}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            {product.stock <= 5 && product.stock > 0 && (
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
                  <ProductImage src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="mb-8">
            <div className="flex items-center gap-2 text-stone-400 mb-4">
              <Store className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-[0.2em]">
                {(product as any).seller_store?.store_name}
              </span>
            </div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-4 leading-[1.1]">{product.title}</h1>
            <div className="flex items-center gap-4 mb-8">
              <span className="text-4xl font-black text-slate-900 tracking-tight">R {product.price.toLocaleString()}</span>
              {product.stock > 0 ? (
                <Badge variant="success" className="rounded-full px-3 py-1">In Stock</Badge>
              ) : (
                <Badge variant="error" className="rounded-full px-3 py-1">Sold Out</Badge>
              )}
            </div>
          </div>
          
          <div className="prose prose-stone mb-10">
            <h3 className="text-sm font-black uppercase tracking-widest text-stone-400 mb-4">The Detail</h3>
            <p className="text-stone-600 text-lg leading-relaxed whitespace-pre-line">{product.description}</p>
          </div>

          <div className="space-y-8 mt-auto pt-10 border-t border-stone-100">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center gap-2">
                <Truck className="h-5 w-5 text-stone-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Fast Delivery</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <ShieldCheck className="h-5 w-5 text-stone-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Secure Store</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <RefreshCw className="h-5 w-5 text-stone-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Easy Returns</span>
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
                  <span>Adding...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-6 w-6 group-hover:-translate-y-1 transition-transform" />
                  <span>Secure for Bag</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
