import React, { useRef } from 'react'
import { Category } from '../../types'
import { ChevronLeft, ChevronRight, Tag } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

interface CategoryCarouselProps {
  categories: Category[]
  selectedCategoryId?: string
  onCategorySelect?: (category: Category) => void
  isLoading?: boolean
}

export default function CategoryCarousel({
  categories,
  selectedCategoryId = 'all',
  onCategorySelect,
  isLoading,
}: CategoryCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -300 : 300,
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
            <div key={index} className="h-32 w-40 flex-shrink-0 animate-pulse rounded-xl bg-stone-100" />
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="mb-2 flex items-center gap-3 text-2xl font-black uppercase tracking-tight text-slate-900 sm:text-3xl">
            <Tag className="h-6 w-6" />
            Shop by Category
          </h2>
          <p className="text-stone-600">Browse this store&apos;s collections</p>
        </div>

        <div className="hidden gap-2 sm:flex">
          <Button
            variant="outline"
            size="sm"
            onClick={() => scroll('left')}
            className="rounded-full p-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => scroll('right')}
            className="rounded-full p-2"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-4 scroll-smooth scrollbar-hide"
        >
          {categories.map(category => {
            const isSelected = selectedCategoryId === category.id

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onCategorySelect?.(category)}
                className="flex-shrink-0 focus:outline-none"
              >
                <Card
                  className={`h-32 w-40 cursor-pointer overflow-hidden transition-all duration-300 group ${
                    isSelected
                      ? 'border-slate-900 shadow-lg shadow-slate-200'
                      : 'hover:shadow-lg'
                  }`}
                >
                  <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-stone-100 to-stone-200">
                    {category.image_url ? (
                      <img
                        src={category.image_url}
                        alt={category.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <Tag className="h-8 w-8 text-stone-400" />
                    )}
                    <div
                      className={`absolute inset-0 flex items-center justify-center px-3 text-center text-sm font-bold text-white transition-colors ${
                        isSelected ? 'bg-slate-900/55' : 'bg-black/25 group-hover:bg-black/40'
                      }`}
                    >
                      {category.name}
                    </div>
                  </div>
                </Card>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
