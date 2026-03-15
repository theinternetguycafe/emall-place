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
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative group min-w-[300px]">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 group-focus-within:text-slate-900 transition-colors" />
        <input
          type="text"
          placeholder="Search items..."
          className="pl-12 pr-4 py-3 w-full bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all shadow-sm"
          value={searchInput}
          onChange={onSearchChange}
        />
      </div>
      
      <div className="relative">
        <select
          className="pl-12 pr-10 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all appearance-none font-semibold text-slate-700 shadow-sm cursor-pointer"
          value={sortBy}
          onChange={onSortChange}
        >
          <option value="newest">Newest First</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
        <SlidersHorizontal className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 pointer-events-none" />
      </div>
    </div>
  )
}