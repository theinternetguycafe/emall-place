import React from 'react'
import { Link } from 'react-router-dom'
import { Product } from '../../types'
import { LayoutGrid, Package, Search, Plus, Share2 } from 'lucide-react'
import ProductImage from '../ProductImage'
import LikeButton from '../ui/LikeButton'
import { getStoreLogo } from '../../lib/storeUtils'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Skeleton } from '../ui/Skeleton'
import SaleBadge from '../SaleBadge'
import ShareSale from '../ShareSale'
import { getSaleInfo } from '../../utils/saleUtils'
import { useNavigate } from 'react-router-dom'

interface ProductGridProps {
  products: Product[]
  loading: boolean
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
  onClearFilters: () => void
}

export function ProductGrid({ 
  products, 
  loading, 
  hasMore, 
  loadingMore, 
  onLoadMore,
  onClearFilters
}: ProductGridProps) {
  const navigate = useNavigate()
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null)
  const [showShareModal, setShowShareModal] = React.useState(false)

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="space-y-6">
            <Skeleton className="aspect-[4/5] rounded-[2.5rem]" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-6 w-1/3" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-12 border-b border-stone-100 pb-8 tracking-tight">
         <div className="flex items-center gap-3">
           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
             {products.length} Curated Essentials
           </span>
         </div>
         <div className="flex gap-4">
           <button className="w-10 h-10 flex items-center justify-center bg-white rounded-full border border-stone-100 text-slate-900 shadow-sm hover:shadow-md transition-all"><LayoutGrid size={16} /></button>
         </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-24">
        {products.map(product => {
          const saleInfo = getSaleInfo({
            price: product.price,
            is_on_sale: product.is_on_sale || false,
            sale_price: product.sale_price || null,
            sale_starts_at: product.sale_starts_at || null,
            sale_ends_at: product.sale_ends_at || null,
            sale_label: product.sale_label || null
          })

          return (
            <div
              key={product.id}
              className="group cursor-pointer flex flex-col"
            >
              {/* Image Container */}
              <div className="relative aspect-[4/5] bg-white rounded-[2.5rem] overflow-hidden mb-8 border border-stone-100 shadow-sm group-hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.12)] transition-all duration-700">
                <div className="w-full h-full cursor-pointer" onClick={() => navigate(`/product/${product.id}`)}>
                  {product.product_images?.[0] ? (
                    <ProductImage
                      src={product.product_images[0].url}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                      transformOptions={{ width: 600, quality: 85, format: 'webp' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-stone-50 text-stone-200">
                      <Package size={48} />
                    </div>
                  )}
                </div>
                
                {/* Overlay for quick info/action */}
                <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/5 transition-colors duration-700" />
                
                <div className="absolute top-6 right-6 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                  <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl text-slate-950 cursor-pointer" onClick={() => navigate(`/product/${product.id}`)}>
                     <Search size={18} />
                  </div>
                </div>

                {/* Like Button */}
                <div className="absolute top-6 left-6 z-10">
                  <LikeButton productId={product.id} size={20} />
                </div>

                {/* Sale Badge */}
                {saleInfo.isOnSale && (
                  <div className="absolute top-6 right-6 -translate-y-16 group-hover:translate-y-0 transition-transform duration-500">
                    <SaleBadge label={saleInfo.saleLabel || `${saleInfo.discountPercent}% OFF`} />
                  </div>
                )}
              </div>

              {/* Content Container */}
              <div className="flex flex-col flex-1 px-1">
                {/* Store Name Badge */}
                {(product as any).seller_store?.store_name && (
                  <div className="flex mb-4 items-center gap-2">
                    <img 
                      src={getStoreLogo((product as any).seller_store?.store_name, (product as any).seller_store?.logo_url)} 
                      alt={(product as any).seller_store?.store_name} 
                      className="w-5 h-5 rounded-full object-cover border border-emerald-100" 
                    />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 bg-emerald-50/50 px-3 py-1 rounded-full">
                      {(product as any).seller_store?.store_name}
                    </span>
                  </div>
                )}

                {/* Title */}
                <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-tight group-hover:text-stone-600 transition-colors duration-300" onClick={() => navigate(`/product/${product.id}`)}>
                  {product.title}
                </h3>

                {/* Sale Label */}
                {saleInfo.isOnSale && saleInfo.saleLabel && (
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mt-2">
                    {saleInfo.saleLabel}
                  </p>
                )}

                {/* Price & Action Row */}
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-stone-100">
                  <div className="flex flex-col gap-1">
                    <span className={`font-black ${saleInfo.isOnSale ? 'text-red-600 text-2xl' : 'text-slate-900 text-2xl'}`}>
                      R {saleInfo.displayPrice.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                    {saleInfo.isOnSale && (
                      <span className="text-xs text-stone-400 line-through">
                        R {saleInfo.originalPrice.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {saleInfo.isOnSale && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedProduct(product)
                          setShowShareModal(true)
                        }}
                        className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all duration-500 shadow-sm hover:shadow-md"
                      >
                        <Share2 size={18} />
                      </button>
                    )}
                    <div className="w-12 h-12 rounded-2xl bg-stone-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-950 group-hover:text-white transition-all duration-500 shadow-sm cursor-pointer" onClick={() => navigate(`/product/${product.id}`)}>
                      <Plus size={20} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Share Modal */}
      {selectedProduct && (
        <ShareSale
          product={selectedProduct}
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {products.length === 0 && (
        <div className="text-center py-32 bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
          <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="h-8 w-8 text-slate-300" />
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Nothing found</h3>
          <p className="text-slate-500 mt-2">Try different filters or search terms.</p>
          <Button variant="outline" className="mt-8 rounded-xl" onClick={onClearFilters}>
            Clear Filters
          </Button>
        </div>
      )}

      {hasMore && products.length > 0 && (
        <div className="flex justify-center mt-12 mb-8">
          <Button
            variant="outline"
            size="lg"
            className="rounded-full px-12 py-6 font-black uppercase tracking-widest text-xs border-2 hover:bg-slate-900 hover:text-white transition-all"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
    </>
  )
}