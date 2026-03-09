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

export default function Shop() {
  const { profile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryThumbnails, setCategoryThumbnails] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const categoryScrollRef = useRef<HTMLDivElement>(null)
  
  const searchTerm = searchParams.get('q') || ''
  const selectedCategory = searchParams.get('category') || 'all'
  const selectedStore = searchParams.get('store') || 'all'
  const sortBy = searchParams.get('sort') || 'newest'

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [selectedCategory, selectedStore, sortBy])

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

  const fetchProducts = async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('products')
        .select('*, product_images(*)')
        .eq('status', 'approved')

      if (selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory)
      }

      if (selectedStore !== 'all') {
        query = query.eq('seller_store_id', selectedStore)
      }

      if (sortBy === 'price_asc') {
        query = query.order('price', { ascending: true })
      } else if (sortBy === 'price_desc') {
        query = query.order('price', { ascending: false })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      const { data, error: pError } = await query
      if (pError) throw pError
      setProducts(data || [])
    } catch (err: any) {
      console.error('Error fetching products:', err)
      setError('Failed to load products. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchParams(prev => {
      if (value) prev.set('q', value)
      else prev.delete('q')
      return prev
    })
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

  const filteredProducts = products.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
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
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative group min-w-[300px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 group-focus-within:text-slate-900 transition-colors" />
              <input
                type="text"
                placeholder="Search items..."
                className="pl-12 pr-4 py-3 w-full bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all shadow-sm"
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
            
            <div className="relative">
              <select
                className="pl-12 pr-10 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all appearance-none font-semibold text-slate-700 shadow-sm cursor-pointer"
                value={sortBy}
                onChange={handleSortChange}
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
              <SlidersHorizontal className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 pointer-events-none" />
            </div>
          </div>
        </div>

        {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

        {/* Category Scrollable Bar */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-slate-900" />
            <h3 className="font-black uppercase tracking-tight text-slate-900">Filter by Category</h3>
          </div>
          
          {/* Horizontal Scrollable Categories with Arrows */}
          <div className="relative group">
            {/* Left Arrow - Desktop only */}
            <button
              onClick={() => scrollCategories('left')}
              className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-slate-200 rounded-full items-center justify-center hover:bg-slate-50 transition-all shadow-md"
              aria-label="Scroll categories left"
            >
              <ChevronLeft className="h-5 w-5 text-slate-600" />
            </button>

            {/* Categories Scroll Container */}
            <div ref={categoryScrollRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-12">
              <button
                onClick={() => handleCategoryChange('all')}
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
                    onClick={() => handleCategoryChange(cat.id)}
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

            {/* Right Arrow - Desktop only */}
            <button
              onClick={() => scrollCategories('right')}
              className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-slate-200 rounded-full items-center justify-center hover:bg-slate-50 transition-all shadow-md"
              aria-label="Scroll categories right"
            >
              <ChevronRight className="h-5 w-5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Product Grid Area */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6 sm:gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-square rounded-2xl" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-6 w-1/3" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
               <Badge variant="outline" className="py-1 px-3 border-slate-200 text-slate-500 font-bold">
                {filteredProducts.length} Products Found
              </Badge>
              <div className="flex gap-2">
                <button className="p-2 bg-white rounded-lg border border-slate-200 text-slate-900 shadow-sm"><LayoutGrid size={18} /></button>
              </div>
            </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                  {filteredProducts.map(product => (
                    <Link
                      key={product.id}
                      to={`/product/${product.id}`}
                      className="group"
                    >
                      <Card className="h-full overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col bg-white">
                        {/* Image */}
                        <div className="relative aspect-square bg-stone-100 overflow-hidden flex-shrink-0">
                          {product.product_images?.[0] ? (
                            <ProductImage
                              src={product.product_images[0].url}
                              alt={product.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-300">
                              <Package size={40} />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
                        </div>

                        {/* Content */}
                        <div className="p-4 flex flex-col flex-1">
                          {/* Store Name */}
                          {(product as any).seller_store?.store_name && (
                            <Link
                              to={`/store/${(product as any).seller_store?.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900 transition-colors mb-2 block"
                            >
                              {(product as any).seller_store?.store_name}
                            </Link>
                          )}

                          {/* Title */}
                          <h3 className="font-bold text-sm leading-tight text-slate-900 line-clamp-2 mb-auto">
                            {product.title}
                          </h3>

                          {/* Description */}
                          {product.description && (
                            <p className="text-xs text-stone-500 line-clamp-1 mt-2 mb-3">
                              {product.description}
                            </p>
                          )}

                          {/* Price */}
                          <div className="pt-3 border-t border-stone-100 mt-3">
                            <span className="text-lg font-black text-slate-900">
                              R {product.price.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>

                {filteredProducts.length === 0 && (
                  <div className="text-center py-32 bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Search className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Nothing found</h3>
                    <p className="text-slate-500 mt-2">Try different filters or search terms.</p>
                    <Button variant="outline" className="mt-8 rounded-xl" onClick={() => handleCategoryChange('all')}>
                      Clear Filters
                    </Button>
                  </div>
                )}
              </>
            )}
      </div>
    </div>
  )
}
