import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useSearchParams } from 'react-router-dom'
import { fetchUnifiedFeed, UnifiedFeedItem } from '../lib/unifiedSearch'
import UnifiedProductCard from '../components/UnifiedProductCard'
import UnifiedServiceCard from '../components/UnifiedServiceCard'
import { Input } from '../components/ui/Input'
import { Search, Loader2 } from 'lucide-react'
import { useDebounce } from '../hooks/useDebounce'

export default function Marketplace() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [feed, setFeed] = useState<UnifiedFeedItem[]>([])
  const [loading, setLoading] = useState(true)
  
  const initialQuery = searchParams.get('q') || ''
  const [searchInput, setSearchInput] = useState(initialQuery)
  const debouncedSearchTerm = useDebounce(searchInput, 300)

  useEffect(() => {
    setSearchParams(prev => {
      if (debouncedSearchTerm) prev.set('q', debouncedSearchTerm)
      else prev.delete('q')
      return prev
    })
  }, [debouncedSearchTerm, setSearchParams])

  useEffect(() => {
    async function loadFeed() {
      setLoading(true)
      try {
        const items = await fetchUnifiedFeed({
          query: debouncedSearchTerm,
          limit: 100
        })
        setFeed(items)
      } catch (err) {
        console.error('Error loading unified feed:', err)
      } finally {
        setLoading(false)
      }
    }
    loadFeed()
  }, [debouncedSearchTerm])

  return (
    <div className="min-h-screen bg-[#F9F8F6] pb-24">
      <Helmet>
        <title>Marketplace | eMall Place Collective</title>
        <meta name="description" content="Discover products and services from independent South African creators." />
      </Helmet>

      {/* Header Area */}
      <div className="bg-slate-900 pt-8 pb-32">
        <div className="container mx-auto px-4 max-w-7xl">
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white mb-4">
            The Marketplace
          </h1>
          <p className="text-stone-400 text-lg mb-8 max-w-2xl">
            A unified feed of premium products and professional services from our top creators.
          </p>
          
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
            <Input 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search anything..." 
              className="w-full pl-12 h-14 bg-white/10 border-white/20 text-white placeholder-stone-400 rounded-2xl focus:bg-white focus:text-slate-900 transition-all text-lg"
            />
          </div>
        </div>
      </div>

      {/* Feed Area */}
      <div className="container mx-auto px-4 max-w-7xl -mt-20 relative z-10">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-900" />
          </div>
        ) : feed.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {feed.map((item, idx) => {
              if (item.type === 'product') {
                return <UnifiedProductCard key={`prod-${item.data.id}-${idx}`} product={item.data} />
              } else {
                return <UnifiedServiceCard key={`svc-${item.data.id}-${idx}`} service={item.data} />
              }
            })}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-2">No results found</h3>
            <p className="text-stone-500">Try adjusting your search terms.</p>
          </div>
        )}
      </div>
    </div>
  )
}
