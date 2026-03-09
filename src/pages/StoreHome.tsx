import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Product, SellerStore } from '../types'
import { ChevronRight, Store as StoreIcon, Package, AlertCircle } from 'lucide-react'
import ProductImage from '../components/ProductImage'
import ErrorAlert from '../components/ErrorAlert'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'

export default function StoreHome() {
  const { storeId } = useParams<{ storeId: string }>()
  const [store, setStore] = useState<SellerStore | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (storeId) {
      fetchStoreData()
    }
  }, [storeId])

  const fetchStoreData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch store details
      const { data: storeData, error: storeError } = await supabase
        .from('seller_stores')
        .select('*')
        .eq('id', storeId!)
        .single()

      if (storeError) throw storeError
      setStore(storeData)

      // Fetch products from this store
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*, product_images(*)')
        .eq('seller_store_id', storeId!)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })

      if (productsError) throw productsError
      // Shuffle products for random display
      const shuffled = (productsData || []).sort(() => Math.random() - 0.5)
      setProducts(shuffled)
    } catch (err: any) {
      console.error('Error fetching store data:', err)
      setError('Failed to load store. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-[#F9F8F6] min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 sm:gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-square rounded-2xl" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-6 w-1/3" />
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
          <Button variant="outline" onClick={() => window.history.back()} className="mt-8">
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#F9F8F6] min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Area */}
        <div className="mb-12">
          <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
            <Link to="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/shop" className="hover:text-slate-900 transition-colors">Marketplace</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-900">{store.store_name}</span>
          </nav>

          {/* Store Info Card */}
          <Card className="p-8 mb-12 bg-gradient-to-br from-slate-50 to-white">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-24 h-24 bg-gradient-to-br from-slate-900 to-slate-700 rounded-2xl flex items-center justify-center">
                <StoreIcon className="h-12 w-12 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-4xl font-black text-slate-900 mb-2 flex items-center gap-3">
                  {store.store_name}
                  {store.status === 'active' && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
                      ✓ Active
                    </span>
                  )}
                </h1>
                {store.description ? (
                  <p className="text-slate-600 text-lg mb-4">{store.description}</p>
                ) : (
                  <p className="text-slate-400 text-lg mb-4 italic">No description provided yet</p>
                )}
                <div className="flex items-center gap-6">
                  <Badge variant="outline" className="py-2 px-4">
                    <Package className="h-4 w-4 mr-2 inline" />
                    {products.length} Products
                  </Badge>
                  <Badge variant="outline" className="py-2 px-4">
                    Joined {new Date(store.created_at).toLocaleDateString()}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* Section Title */}
          <div className="mb-8">
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
              Shop All Products
            </h2>
            <p className="text-slate-500 mt-2">Explore our full collection</p>
          </div>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <Card className="p-16 text-center">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">No Products Yet</h3>
            <p className="text-slate-500 mt-2">This store doesn't have any products yet.</p>
            <Button variant="outline" className="mt-8" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map(product => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className="group"
              >
                <Card className="h-full overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col bg-white">
                  {/* Image */}
                  <div className="relative aspect-square bg-stone-100 overflow-hidden flex-shrink-0">
                    {product.product_images?.[0] ? (
                      <ProductImage
                        src={product.product_images[0].url}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-300">
                        <Package size={40} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col flex-1">
                    {/* Title */}
                    <h3 className="font-bold text-sm leading-tight text-slate-900 line-clamp-2 mb-auto">
                      {product.title}
                    </h3>

                    {/* Description */}
                    {product.description && (
                      <p className="text-xs text-stone-500 line-clamp-1 mt-2 mb-3">
                        {product.description}
                      </p>
                    )}

                    {/* Price */}
                    <div className="pt-3 border-t border-stone-100 mt-auto">
                      <span className="text-lg font-black text-slate-900">
                        R {product.price.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
