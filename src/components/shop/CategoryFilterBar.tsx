import React, { useRef } from 'react'
import { Filter, ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react'
import { Category } from '../../types'

interface CategoryFilterBarProps {
  categories: Category[]
  categoryThumbnails: Record<string, string>
  selectedCategory: string
  onSelectCategory: (categoryId: string) => void
  getPlaceholderImage: () => string
}

export function CategoryFilterBar({
  categories,
  categoryThumbnails,
  selectedCategory,
  onSelectCategory,
  getPlaceholderImage
}: CategoryFilterBarProps) {
  const categoryScrollRef = useRef<HTMLDivElement>(null)

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = 240
      categoryScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  return (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-5 w-5 text-slate-900" />
        <h3 className="font-black uppercase tracking-tight text-slate-900">Filter by Category</h3>
      </div>
      
      <div className="relative group">
        <button
          onClick={() => scrollCategories('left')}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-slate-200 rounded-full items-center justify-center hover:bg-slate-50 transition-all shadow-md"
          aria-label="Scroll categories left"
        >
          <ChevronLeft className="h-5 w-5 text-slate-600" />
        </button>

        <div ref={categoryScrollRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-12">
          <button
            onClick={() => onSelectCategory('all')}
            className={`flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-lg transition-all border-2 ${
              selectedCategory === 'all' 
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
                onClick={() => onSelectCategory(cat.id)}
                className={`flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-lg transition-all border-2 ${
                  selectedCategory === cat.id 
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

        <button
          onClick={() => scrollCategories('right')}
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-slate-200 rounded-full items-center justify-center hover:bg-slate-50 transition-all shadow-md"
          aria-label="Scroll categories right"
        >
          <ChevronRight className="h-5 w-5 text-slate-600" />
        </button>
      </div>
    </div>
  )
}