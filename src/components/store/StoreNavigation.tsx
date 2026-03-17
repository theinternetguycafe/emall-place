import React, { useState } from 'react'
import { Home, Package, Tag, Star, Info } from 'lucide-react'

interface StoreNavigationProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const tabs = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'categories', label: 'Categories', icon: Tag },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'about', label: 'About', icon: Info },
]

export default function StoreNavigation({ activeTab, onTabChange }: StoreNavigationProps) {
  return (
    <div className="sticky top-20 bg-white border-b border-stone-200 z-30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="flex overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 sm:px-6 py-4 text-sm sm:text-base font-bold uppercase tracking-wide border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-stone-600 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
