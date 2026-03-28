import React from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'

interface ShopFiltersProps {
  searchInput: string
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  sortBy: string
  onSortChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
}

export function ShopFilters({
  searchInput,
  onSearchChange,
  sortBy,
  onSortChange
}: ShopFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative group min-w-[320px]">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-400 h-4 w-4 group-focus-within:text-slate-900 transition-colors duration-300" />
        <input
          type="text"
          placeholder="I'm looking for..."
          className="pl-14 pr-6 py-4 w-full bg-white/70 backdrop-blur-md border border-stone-100 rounded-full focus:ring-8 focus:ring-slate-900/5 focus:border-slate-900 focus:bg-white outline-none transition-all duration-300 shadow-sm hover:shadow-md text-sm font-medium placeholder:text-stone-400"
          value={searchInput}
          onChange={onSearchChange}
        />
      </div>
      
      <div className="relative group">
        <select
          className="pl-14 pr-12 py-4 bg-white/70 backdrop-blur-md border border-stone-100 rounded-full focus:ring-8 focus:ring-slate-900/5 focus:border-slate-900 focus:bg-white outline-none transition-all appearance-none text-[11px] font-black uppercase tracking-widest text-slate-700 shadow-sm cursor-pointer hover:shadow-md"
          value={sortBy}
          onChange={onSortChange}
        >
          <option value="newest">Latest Arrivals</option>
          <option value="price_asc">Price: Low - High</option>
          <option value="price_desc">Price: High - Low</option>
        </select>
        <SlidersHorizontal className="absolute left-6 top-1/2 -translate-y-1/2 text-stone-400 h-4 w-4 pointer-events-none group-focus-within:text-slate-900 transition-colors" />
      </div>
    </div>
  )
}