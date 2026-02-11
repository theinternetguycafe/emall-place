import React, { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Product, Category } from '../types'
import { Search, Filter, SlidersHorizontal, ChevronRight, X, LayoutGrid } from 'lucide-react'
import ProductImage from '../components/ProductImage'
import ErrorAlert from '../components/ErrorAlert'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Skeleton } from '../components/ui/Skeleton'

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const searchTerm = searchParams.get('q') || ''
  const selectedCategory = searchParams.get('category') || 'all'
  const sortBy = searchParams.get('sort') || 'newest'

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [selectedCategory, sortBy])

  const fetchCategories = async () => {
    const { data, error } = await supabase.from('categories').select('*').order('name')
    if (error) {
      console.error('Error fetching categories:', error)
    } else {
      setCategories(data || [])
    }
  }

  const fetchProducts = async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('products')
        .select('*, product_images(*), seller_store:seller_store_id(store_name)')
        .eq('status', 'approved')

      if (selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory)
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

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setSearchParams(prev => {
      if (value !== 'newest') prev.set('sort', value)
      else prev.delete('sort')
      return prev
    })
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
            <h1 className="text-5xl font-black tracking-tighter text-slate-900 uppercase">The Collection</h1>
            <p className="text-slate-500 mt-2">Discover unique items from South Africa's finest creators.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative group min-w-[300px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 group-focus-within:text-slate-900 transition-colors" />
              <input
                type="text"
                placeholder="Search the marketplace..."
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
                <option value="newest">Latest Arrivals</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
              <SlidersHorizontal className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 pointer-events-none" />
            </div>
          </div>
        </div>

        {error && <ErrorAlert message={error} onClose={() => setError(null)} />}

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Sidebar Filters */}
          <aside className="lg:w-64 space-y-10 flex-shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Filter className="h-5 w-5 text-slate-900" />
                <h3 className="font-black uppercase tracking-tight text-slate-900">Categories</h3>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => handleCategoryChange('all')}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    selectedCategory === 'all' 
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
                      : 'text-slate-500 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  All Categories
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                      selectedCategory === cat.id 
                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
                        : 'text-slate-500 hover:bg-white hover:text-slate-900'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <Card className="bg-slate-900 border-none p-8 text-white">
              <h4 className="font-black text-xl mb-4 leading-tight uppercase">Support Local Heart</h4>
              <p className="text-slate-400 text-xs leading-relaxed mb-6 italic">
                "By shopping here, you directly support South African artisans and small business owners."
              </p>
              <div className="h-1 w-12 bg-stone-400"></div>
            </Card>
          </aside>

          {/* Product Grid Area */}
          <div className="flex-grow">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
                  {filteredProducts.map(product => (
                    <Link
                      key={product.id}
                      to={`/product/${product.id}`}
                      className="group"
                    >
                      <div className="aspect-square bg-white rounded-2xl overflow-hidden mb-6 relative border border-slate-100 shadow-sm group-hover:shadow-xl transition-all duration-500">
                        <ProductImage
                          src={product.product_images?.[0]?.url}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
                        
                        <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                           <Button className="w-full shadow-2xl">Quick View</Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                            {(product as any).seller_store?.store_name}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 group-hover:text-stone-600 transition-colors truncate text-lg">
                          {product.title}
                        </h3>
                        <p className="text-xl font-black text-slate-900">
                          R {product.price.toFixed(2)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>

                {filteredProducts.length === 0 && (
                  <div className="text-center py-32 bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Search className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">No results matched</h3>
                    <p className="text-slate-500 mt-2">Try adjusting your filters or search term.</p>
                    <Button variant="outline" className="mt-8 rounded-xl" onClick={() => handleCategoryChange('all')}>
                      Clear All Filters
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
