import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Product } from '../../types'
import { ArrowRight, Flame, ChevronLeft, ChevronRight, Tag } from 'lucide-react'
import ProductImage from '../ProductImage'
import SaleBadge from '../SaleBadge'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Skeleton } from '../ui/Skeleton'
import { getSaleInfo } from '../../utils/saleUtils'
import ShareSale from '../ShareSale'

interface OnSaleSliderProps {
  limit?: number
}

export default function OnSaleSlider({ limit = 10 }: OnSaleSliderProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current
      const offset = direction === 'left' ? -clientWidth / 1.5 : clientWidth / 1.5
      scrollRef.current.scrollTo({ left: scrollLeft + offset, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    fetchOnSaleProducts()
  }, [])

  const fetchOnSaleProducts = async () => {
    try {
      setLoading(true)
      const now = new Date().toISOString()
      
      const { data, error } = await supabase
        .from('products')
        .select(
          `
          id,
          seller_id,
          category_id,
          title,
          description,
          price,
          sale_price,
          sale_label,
          sale_starts_at,
          sale_ends_at,
          is_on_sale,
          stock,
          status,
          created_at,
          seller_store:seller_profiles!seller_id (
            id,
            store_name,
            rating_avg,
            onboarding_completed,
            kyc_status
          ),
          product_images:product_images (
            id,
            product_id,
            url,
            sort_order
          )
          `
        )
        .eq('status', 'approved')
        .eq('is_on_sale', true)
        .eq('seller_store.onboarding_completed', true)
        .eq('seller_store.kyc_status', 'approved')
        .or(`sale_ends_at.is.null,sale_ends_at.gt.${now}`)
        .order('sale_starts_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      const safeProducts: Product[] = Array.isArray(data)
        ? data.map((p: any) => ({
            ...p,
            seller_store: Array.isArray(p.seller_store)
              ? p.seller_store[0]
              : p.seller_store,
          }))
        : []

      setProducts(safeProducts)
    } catch (err: any) {
      console.error('Error fetching on-sale products:', err)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const isEmpty = products.length === 0 && !loading

  if (isEmpty) {
    return null // Don't show section if no on-sale products
  }

  return (
    <>
      <section className="container mx-auto px-4 overflow-hidden pt-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8 border-b border-stone-100 pb-12">
          <div className="max-w-2xl">
            <Badge
              variant="outline"
              className="mb-4 border-red-200 text-red-600 bg-red-50 rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest flex w-fit items-center gap-2"
            >
              <Flame size={12} className="fill-red-600" />
              Hot Deals
            </Badge>
            <h2 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 uppercase leading-[0.9]">
              On Sale <br />
              <span className="text-stone-300">Right Now</span>
            </h2>
            <p className="mt-8 text-stone-500 font-medium text-lg leading-relaxed max-w-lg">
              Handpicked items on sale from trusted South African creators. Limited time offers — grab them before they're gone!
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/marketplace?sale=true">
              <Button
                variant="outline"
                className="rounded-full px-8 py-6 font-black uppercase tracking-widest text-[10px] group h-auto border-stone-200 shadow-sm hover:shadow-lg transition-all"
              >
                View All Sales <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>

            {products.length > 0 && (
              <div className="hidden md:flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => scroll('left')}
                  className="rounded-full w-12 h-12 border-stone-200 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                >
                  <ChevronLeft size={20} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => scroll('right')}
                  className="rounded-full w-12 h-12 border-stone-200 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                >
                  <ChevronRight size={20} />
                </Button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex gap-8 overflow-x-auto pb-12 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-shrink-0 w-[320px] sm:w-[450px]">
                <Skeleton className="rounded-3xl h-96" />
              </div>
            ))}
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="flex gap-8 overflow-x-auto pb-12 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth"
          >
            {products.map((product: any) => {
              const saleInfo = getSaleInfo({
                price: product.price,
                is_on_sale: product.is_on_sale || false,
                sale_price: product.sale_price || null,
                sale_starts_at: product.sale_starts_at || null,
                sale_ends_at: product.sale_ends_at || null,
                sale_label: product.sale_label || null,
              })

              return (
                <div key={product.id} className="flex-shrink-0 w-[320px] sm:w-[450px] group">
                  <div className="bg-white rounded-[3rem] p-4 border border-stone-100 shadow-sm hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] transition-all duration-700 flex flex-col h-full relative overflow-hidden">
                    {/* Image Section */}
                    <div className="relative aspect-[16/10] rounded-[2.5rem] overflow-hidden mb-8 shadow-inner bg-gradient-to-br from-stone-100 to-stone-50 border border-stone-100/50">
                      {product.product_images?.[0] ? (
                        <img
                          src={product.product_images[0].url}
                          alt={product.title}
                          className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-300 bg-stone-50">
                          <Tag size={40} />
                        </div>
                      )}

                      {/* Sale Badge */}
                      {saleInfo.isOnSale && (
                        <div className="absolute top-6 left-6">
                          <SaleBadge
                            label={saleInfo.saleLabel || `${saleInfo.discountPercent}% OFF`}
                          />
                        </div>
                      )}

                      {/* Price Section */}
                      <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between pointer-events-none">
                        <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-white/50">
                          <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-0.5">
                            Sale Price
                          </p>
                          <p className="text-lg font-black text-slate-900 leading-none">
                            R {saleInfo.displayPrice.toLocaleString('en-ZA', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}
                          </p>
                          {saleInfo.isOnSale && (
                            <p className="text-[8px] text-stone-500 mt-1 line-through">
                              R{' '}
                              {saleInfo.originalPrice.toLocaleString('en-ZA', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="px-4 pb-4 flex-1 flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 group-hover:text-red-600 transition-colors mb-2">
                        {product.seller_store?.store_name || 'Seller'}
                      </span>

                      <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight group-hover:text-stone-600 transition-colors leading-tight line-clamp-2">
                        {product.title}
                      </h3>

                      {product.description && (
                        <p className="text-sm text-stone-500 font-medium leading-relaxed line-clamp-2 mb-8">
                          {product.description}
                        </p>
                      )}

                      <div className="mt-auto flex items-center justify-between pt-6 border-t border-stone-50 gap-4">
                        {product.seller_store?.rating_avg ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                              {product.seller_store.rating_avg.toFixed(1)} ★
                            </span>
                          </div>
                        ) : (
                          <span className="text-[8px] font-black text-stone-300 uppercase tracking-widest">
                            New
                          </span>
                        )}

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              setSelectedProduct(product)
                              setShowShareModal(true)
                            }}
                            className="flex items-center gap-2 bg-red-50 px-4 py-2.5 rounded-xl hover:bg-red-100 transition-all text-[10px] font-black uppercase tracking-widest text-red-600 group-hover/btn:translate-x-1 transition-transform"
                          >
                            Share
                          </button>

                          <Link
                            to={`/product/${product.id}`}
                            className="group/btn flex items-center gap-2 bg-stone-50 px-5 py-2.5 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-all"
                          >
                            <span className="text-[10px] font-black uppercase tracking-widest">
                              Shop
                            </span>
                            <ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Share Modal */}
      {selectedProduct && (
        <ShareSale
          product={selectedProduct}
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </>
  )
}
