import React, { useEffect, useState, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { fetchCategoryThumbnails, getPlaceholderImage } from '../lib/categories'
import { Product, Category } from '../types'
import { Search, Filter, SlidersHorizontal, ChevronRight, ChevronLeft, X, LayoutGrid, Package } from 'lucide-react'
import ProductImage from '../components/ProductImage'
import ErrorAlert from '../components/ErrorAlert'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Skeleton } from '../components/ui/Skeleton'
import { useDebounce } from '../hooks/useDebounce'
import { Helmet } from 'react-helmet-async'
import { ProductGrid } from '../components/shop/ProductGrid'
import { CategoryFilterBar } from '../components/shop/CategoryFilterBar'
import { ShopFilters } from '../components/shop/ShopFilters'

export default function Shop() {
  const { profile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryThumbnails, setCategoryThumbnails] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
        .select('*, product_images(*)', { count: 'exact' })
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
      <div className="bg-[#F9F8F6] min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Area */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div className="max-w-xl">
            <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
              <Link to="/" className="hover:text-slate-900 transition-colors">Home</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-slate-900">Marketplace</span>
            </nav>
            <h1 className="text-5xl font-black tracking-tighter text-slate-900 uppercase">Shop</h1>
            <p className="text-slate-500 mt-2">Browse items from independent creators.</p>
          </div>
          
          <ShopFilters
            searchInput={searchInput}
            onSearchChange={handleSearchChange}
            sortBy={sortBy}
            onSortChange={handleSortChange}
          />
        </div>

        {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

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
      </div>
    </div>
    </>
  )
}
