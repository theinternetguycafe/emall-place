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
    <div className="mb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
      <div className="flex items-center gap-4 mb-10 overflow-hidden">
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-slate-900" />
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-900">Archive Categories</h3>
        </div>
        <div className="h-px flex-1 bg-stone-100" />
      </div>
      
      <div className="relative group">
        <button
          onClick={() => scrollCategories('left')}
          className="hidden md:flex absolute -left-5 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/90 backdrop-blur-md border border-stone-100 rounded-full items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-xl shadow-stone-200/50 group-hover:scale-110"
          aria-label="Scroll categories left"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div ref={categoryScrollRef} className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide px-4">
          <button
            onClick={() => onSelectCategory('all')}
            className={`flex-shrink-0 flex items-center gap-4 p-2 pr-6 rounded-full transition-all duration-500 border-2 ${
              selectedCategory === 'all' 
                ? 'border-slate-900 bg-white shadow-xl shadow-stone-200' 
                : 'border-transparent bg-white hover:border-stone-200 shadow-sm'
            }`}
          >
            <div className="w-14 h-14 bg-gradient-to-br from-slate-900 to-slate-700 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-slate-200">
              <LayoutGrid size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Everything</span>
          </button>

          {categories.map(cat => {
            const thumbUrl = categoryThumbnails[cat.id] || getPlaceholderImage()
            const isActive = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex-shrink-0 flex items-center gap-4 p-2 pr-6 rounded-full transition-all duration-500 border-2 ${
                  isActive 
                    ? 'border-slate-900 bg-white shadow-xl shadow-stone-200' 
                    : 'border-transparent bg-white hover:border-stone-200 shadow-sm'
                }`}
                title={cat.name}
              >
                <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border border-stone-100 shadow-inner">
                  <img
                    src={thumbUrl}
                    alt={cat.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getPlaceholderImage()
                    }}
                  />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">{cat.name}</span>
              </button>
            )
          })}
        </div>

        <button
          onClick={() => scrollCategories('right')}
          className="hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/90 backdrop-blur-md border border-stone-100 rounded-full items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-xl shadow-stone-200/50 group-hover:scale-110"
          aria-label="Scroll categories right"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}