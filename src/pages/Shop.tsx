import React, { useEffect, useState, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { fetchCategoryThumbnails, getPlaceholderImage } from '../lib/categories'
import { Product, Category } from '../types'
import { Search, Filter, SlidersHorizontal, ChevronRight, ChevronLeft, X, LayoutGrid, Package, Map as MapIcon } from 'lucide-react'
import ProductImage from '../components/ProductImage'
import ErrorAlert from '../components/ErrorAlert'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Skeleton } from '../components/ui/Skeleton'
import { useDebounce } from '../hooks/useDebounce'
import { Helmet } from 'react-helmet-async'
import { ShopMap, ProductGrid, CategoryFilterBar, ShopFilters } from '../components/shop'

export default function Shop() {
  const { profile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryThumbnails, setCategoryThumbnails] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid')
  const [userLocation, setUserLocation] = useState<any>(null)
  const categoryScrollRef = useRef<HTMLDivElement>(null)
  
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '')
  const debouncedSearchTerm = useDebounce(searchInput, 300)
  
  const selectedCategory = searchParams.get('category') || 'all'
  const selectedStore = searchParams.get('store') || 'all'
  const sortBy = searchParams.get('sort') || 'newest'

  const PAGE_SIZE = 24
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const filtersKey = `${selectedCategory}-${selectedStore}-${sortBy}-${debouncedSearchTerm}`
  const [currentFiltersKey, setCurrentFiltersKey] = useState(filtersKey)

  // Update URL params when debounced search term changes
  useEffect(() => {
    setSearchParams(prev => {
      if (debouncedSearchTerm) prev.set('q', debouncedSearchTerm)
      else prev.delete('q')
      return prev
    })
  }, [debouncedSearchTerm, setSearchParams])

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    if (filtersKey !== currentFiltersKey) {
      setCurrentFiltersKey(filtersKey)
      setPage(0)
    }
  }, [filtersKey, currentFiltersKey])

  useEffect(() => {
    if (filtersKey === currentFiltersKey) {
      fetchProducts(page)
    }
  }, [page, filtersKey, currentFiltersKey])

  useEffect(() => {
    if (viewMode === 'map' && !userLocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      }, (err) => {
        console.error("Geolocation failed:", err)
        setUserLocation({ lat: -25.5585, lng: 28.0183 }) // Hebron Mall Northwest fallback
      })
    }
  }, [viewMode])

  const fetchCategories = async () => {
    const { data, error } = await supabase.from('categories').select('*').order('name')
    if (error) {
      console.error('Error fetching categories:', error)
    } else {
      // Fetch thumbnail images for each category
      const thumbs = await fetchCategoryThumbnails()
      setCategoryThumbnails(thumbs)
      
      // Sort: categories with images first, then alphabetically
      const hasImage = (cat: any) => thumbs[cat.id]
      const sorted = (data || []).sort((a, b) => {
        const aHasImg = hasImage(a)
        const bHasImg = hasImage(b)
        if (aHasImg !== bHasImg) return aHasImg ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      setCategories(sorted)
    }
  }

  const fetchProducts = async (currentPage: number) => {
    const isReset = currentPage === 0
    if (isReset) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }
    setError(null)
    try {
      let query = supabase
        .from('products')
        .select('*, product_images(*), seller_store:seller_stores(*)', { count: 'exact' })
        .eq('status', 'approved')

      if (selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory)
      }

      if (selectedStore !== 'all') {
        query = query.eq('seller_store_id', selectedStore)
      }

      if (debouncedSearchTerm) {
        query = query.or(`title.ilike.%${debouncedSearchTerm}%,description.ilike.%${debouncedSearchTerm}%`)
      }

      if (sortBy === 'price_asc') {
        query = query.order('price', { ascending: true })
      } else if (sortBy === 'price_desc') {
        query = query.order('price', { ascending: false })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      const from = currentPage * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      query = query.range(from, to)

      const { data, count, error: pError } = await query
      if (pError) throw pError
      
      if (isReset) {
        setProducts(data || [])
      } else {
        setProducts(prev => {
          // Avoid duplicates by filtering out items already in the list
          const existingIds = new Set(prev.map(p => p.id))
          const newItems = (data || []).filter(p => !existingIds.has(p.id))
          return [...prev, ...newItems]
        })
      }
      
      if (count !== null) {
        setHasMore(from + PAGE_SIZE < count)
      } else {
        setHasMore((data || []).length === PAGE_SIZE)
      }
    } catch (err: any) {
      console.error('Error fetching products:', err)
      setError('Failed to load products. Please check your connection.')
    } finally {
      if (isReset) setLoading(false)
      setLoadingMore(false)
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value)
  }

  const handleCategoryChange = (catId: string) => {
    setSearchParams(prev => {
      if (catId !== 'all') prev.set('category', catId)
      else prev.delete('category')
      return prev
    })
  }

  const handleStoreChange = (storeId: string) => {
    setSearchParams(prev => {
      if (storeId !== 'all') prev.set('store', storeId)
      else prev.delete('store')
      return prev
    })
  }

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setSearchParams(prev => {
      if (value !== 'newest') prev.set('sort', value)
      else prev.delete('sort')
      return prev
    })
  }

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
    <>
      <Helmet>
        <title>Marketplace | eMall Place Collective</title>
        <meta name="description" content="Browse authentic local products from independent South African creators." />
      </Helmet>
      <div className="bg-[#FAF9F6] min-h-screen relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-stone-100/50 to-transparent pointer-events-none" />
        <div className="absolute top-[10%] -right-20 w-96 h-96 bg-emerald-50/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-[20%] -left-20 w-72 h-72 bg-amber-50/20 rounded-full blur-3xl pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        {/* Header Area */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 mb-20 animate-in fade-in slide-in-from-top-8 duration-1000">
          <div className="max-w-2xl">
            <nav className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-stone-400 mb-8">
              <Link to="/" className="hover:text-slate-900 transition-colors">Digital Home</Link>
              <div className="w-1 h-1 rounded-full bg-stone-300" />
              <span className="text-slate-900">Collective Market</span>
            </nav>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-slate-900 uppercase leading-[0.85] mb-6">
              The <br />
              <span className="text-stone-300 italic">Collective.</span>
            </h1>
            <p className="text-lg text-stone-500 font-medium max-w-md leading-relaxed">
              Curated essentials and unique creations from the finest independent artisans across South Africa.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex bg-white/50 backdrop-blur-xl rounded-full p-1.5 border border-white shadow-2xl shadow-stone-200/50">
              <button 
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${viewMode === 'grid' ? 'bg-slate-900 text-white shadow-lg' : 'text-stone-400 hover:text-slate-900'}`}
              >
                <LayoutGrid size={14} /> Gallery
              </button>
              <button 
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${viewMode === 'map' ? 'bg-slate-900 text-white shadow-lg' : 'text-stone-400 hover:text-slate-900'}`}
              >
                <MapIcon size={14} /> Proximity
              </button>
            </div>
            
            <div className="h-10 w-px bg-stone-200 hidden md:block" />

            <ShopFilters
              searchInput={searchInput}
              onSearchChange={handleSearchChange}
              sortBy={sortBy}
              onSortChange={handleSortChange}
            />
          </div>
        </div>

        {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

        {viewMode === 'map' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 mb-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Discovery Map</h2>
                <p className="text-stone-500 font-medium lowercase">find independent stores in your immediate vicinity</p>
              </div>
            </div>
            <div className="bg-white rounded-[40px] overflow-hidden h-[650px] border border-stone-100 shadow-2xl shadow-slate-200/50 relative">
               <ShopMap 
                 products={products} 
                 userLocation={userLocation}
               />
               <div className="absolute top-6 left-6 z-10">
                 <div className="bg-white/95 backdrop-blur-md px-5 py-2.5 rounded-full shadow-lg border border-stone-100 flex items-center gap-3">
                   <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Real-Time Distribution Active</span>
                 </div>
               </div>
            </div>
          </div>
        ) : (
          <>
            <CategoryFilterBar
              categories={categories}
              categoryThumbnails={categoryThumbnails}
              selectedCategory={selectedCategory}
              onSelectCategory={handleCategoryChange}
              getPlaceholderImage={getPlaceholderImage}
            />

            <ProductGrid
              products={products}
              loading={loading}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={() => setPage(p => p + 1)}
              onClearFilters={() => handleCategoryChange('all')}
            />
          </>
        )}
      </div>
    </div>
    </>
  )
}
