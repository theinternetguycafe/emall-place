import React from 'react'
import Shop from '../../pages/Shop'
import ServicesPage from '../../pages/ServicesPage'

const MarketplaceTabs = () => {
  const [activeTab, setActiveTab] = React.useState<'products' | 'services'>('products')

  return (
    <div>
      {/* Tab Bar */}
      <div className="sticky top-24 z-40 bg-white/80 backdrop-blur-xl border-b border-stone-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex gap-0">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-8 py-5 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
              activeTab === 'products'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-stone-400 hover:text-slate-900'
            }`}
          >
            Products
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`px-8 py-5 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
              activeTab === 'services'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-stone-400 hover:text-slate-900'
            }`}
          >
            Services
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="relative">
        {activeTab === 'products' && <Shop />}
        {activeTab === 'services' && <ServicesPage />}
      </div>
    </div>
  )
}

export { MarketplaceTabs }
export default MarketplaceTabs
