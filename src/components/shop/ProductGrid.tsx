import React from 'react'
import { Product } from '../../types'
import { Search } from 'lucide-react'
import { Button } from '../ui/Button'
import { Skeleton } from '../ui/Skeleton'
import UnifiedProductCard from '../UnifiedProductCard'
import ShareSale from '../ShareSale'

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
  onClearFilters,
}: ProductGridProps) {

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="space-y-4">
            <Skeleton className="aspect-[4/5] rounded-[20px]" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-5 w-1/3" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      {/* Results header */}
      <div className="flex items-center justify-between mb-8 border-b border-stone-100 pb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse motion-reduce:animate-none" />
          <span className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
            {products.length} {products.length === 1 ? 'Product' : 'Products'}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
        {products.map(product => (
          <UnifiedProductCard
            key={product.id}
            product={product}
            variant="grid"
            showAddToCart={true}
            showSeller={true}
          />
        ))}
      </div>

      {/* Empty state */}
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

      {/* Load more */}
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