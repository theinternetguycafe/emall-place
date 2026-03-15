import React from 'react'
import { Link } from 'react-router-dom'
import { Product } from '../../types'
import { LayoutGrid, Package, Search } from 'lucide-react'
import ProductImage from '../ProductImage'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Skeleton } from '../ui/Skeleton'

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
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6 sm:gap-8">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="space-y-4">
            <Skeleton className="aspect-square rounded-2xl" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-6 w-1/3" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
         <Badge variant="outline" className="py-1 px-3 border-slate-200 text-slate-500 font-bold">
          {products.length} Products Found
        </Badge>
        <div className="flex gap-2">
          <button className="p-2 bg-white rounded-lg border border-slate-200 text-slate-900 shadow-sm"><LayoutGrid size={18} /></button>
        </div>
      </div>

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
                    transformOptions={{ width: 400, quality: 75, format: 'webp' }}
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
                {/* Store Name */}
                {(product as any).seller_store?.store_name && (
                  <Link
                    to={`/store/${(product as any).seller_store?.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900 transition-colors mb-2 block"
                  >
                    {(product as any).seller_store?.store_name}
                  </Link>
                )}

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
                <div className="pt-3 border-t border-stone-100 mt-3">
                  <span className="text-lg font-black text-slate-900">
                    R {product.price.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

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