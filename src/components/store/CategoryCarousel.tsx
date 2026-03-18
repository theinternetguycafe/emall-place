import React, { useRef } from 'react'
import { Category } from '../../types'
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react'
import { getPlaceholderImage } from '../../lib/categories'

interface CategoryCarouselProps {
  categories: Category[]
  categoryThumbnails: Record<string, string>
  selectedCategoryId?: string
  onCategorySelect?: (categoryId: string) => void
  isLoading?: boolean
}

export default function CategoryCarousel({
  categories,
  categoryThumbnails,
  selectedCategoryId = 'all',
  onCategorySelect,
  isLoading,
}: CategoryCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 240
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 sm:text-3xl">
          Shop by Category
        </h2>
        <div className="flex gap-4">
          {[1, 2, 3, 4, 5].map(index => (
            <div key={index} className="h-24 w-20 flex-shrink-0 animate-pulse rounded-lg bg-stone-100" />
          ))}
        </div>
      </div>
    )
  }

  if (!categories || categories.length === 0) {
    return null
  }

  return (
    <section className="py-12">
      <div className="relative group">
        {/* Left Arrow */}
        <button
          onClick={() => scroll('left')}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-slate-200 rounded-full items-center justify-center hover:bg-slate-50 transition-all shadow-md"
          aria-label="Scroll categories left"
        >
          <ChevronLeft className="h-5 w-5 text-slate-600" />
        </button>

        {/* Categories Scroll Container */}
        <div ref={scrollContainerRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-12">
          <button
            onClick={() => onCategorySelect?.('all')}
            className={`flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-lg transition-all border-2 ${
              selectedCategoryId === 'all' 
                ? 'border-slate-900 bg-slate-50' 
                : 'border-slate-200 hover:border-slate-400 bg-white'
            }`}
          >
            <div className="w-20 h-20 bg-gradient-to-br from-slate-900 to-slate-700 rounded-md flex items-center justify-center text-white text-lg flex-shrink-0">
              <LayoutGrid size={28} />
            </div>
            <span className="text-xs font-bold whitespace-normal text-center line-clamp-2 max-w-[80px]">All</span>
          </button>

          {categories.map(cat => {
            const thumbUrl = categoryThumbnails[cat.id] || getPlaceholderImage()
            return (
              <button
                key={cat.id}
                onClick={() => onCategorySelect?.(cat.id)}
                className={`flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-lg transition-all border-2 ${
                  selectedCategoryId === cat.id 
                    ? 'border-slate-900 bg-slate-50' 
                    : 'border-slate-200 hover:border-slate-400 bg-white'
                }`}
                title={cat.name}
              >
                <img
                  src={thumbUrl}
                  alt={cat.name}
                  className="w-20 h-20 rounded-md object-cover flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getPlaceholderImage()
                  }}
                />
                <span className="text-xs font-bold text-center line-clamp-2 max-w-[80px]">{cat.name}</span>
              </button>
            )
          })}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scroll('right')}
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-slate-200 rounded-full items-center justify-center hover:bg-slate-50 transition-all shadow-md"
          aria-label="Scroll categories right"
        >
          <ChevronRight className="h-5 w-5 text-slate-600" />
        </button>
      </div>
    </section>
  )
}
