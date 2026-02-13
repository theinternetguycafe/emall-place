import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Product, Category } from '../types'
import ProductImage from '../components/ProductImage'
import { ArrowRight, ShoppingBag, ShieldCheck, Truck, Star, Heart, ArrowUpRight } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHomeData()
  }, [])

  const fetchHomeData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        supabase
          .from('products')
          .select('*, product_images(*), seller_store:seller_store_id(store_name)')
          .eq('status', 'approved')
          .limit(8)
          .order('created_at', { ascending: false }),
        supabase
          .from('categories')
          .select('*')
          .limit(6)
      ])

      console.log('[Home] Products response:', productsRes)
      console.log('[Home] Categories response:', categoriesRes)

      if (productsRes?.data) setFeaturedProducts(productsRes.data)
      if (categoriesRes?.data) setCategories(categoriesRes.data)
      
      if (productsRes?.error) console.error('[Home] Products error:', productsRes.error)
      if (categoriesRes?.error) console.error('[Home] Categories error:', categoriesRes.error)
      
    } catch (error) {
      console.error('Error fetching home data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-32 pb-32">
      {/* Hero Section */}
      <section className="relative h-[90vh] min-h-[700px] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-slate-950">
          <img 
            src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=2070" 
            alt="Marketplace" 
            className="w-full h-full object-cover opacity-40 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10 text-white">
          <div className="max-w-4xl">
            <Badge variant="outline" className="text-white border-white/20 bg-white/10 backdrop-blur-md mb-8 py-2 px-6 rounded-full text-[10px] font-black tracking-[0.2em]">
              🏪 Shop Premium Items
            </Badge>
            <h1 className="text-7xl md:text-[9rem] font-black leading-[0.85] tracking-tighter mb-10">
              Find Your <br />
              <span className="text-stone-400 italic">Favorites.</span>
            </h1>
            <p className="text-xl text-stone-300 mb-12 leading-relaxed max-w-xl font-medium">
              Shop handmade items from independent creators across South Africa. Quality products, fair prices.
            </p>
            <div className="flex flex-wrap gap-6">
              <Link to="/shop">
                <Button size="lg" className="rounded-full px-12 py-8 text-lg font-black bg-white text-slate-950 hover:bg-stone-200">
                  Explore Marketplace <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="outline" size="lg" className="rounded-full px-12 py-8 text-lg font-black border-white/20 text-white hover:bg-white hover:text-slate-950 backdrop-blur-sm">
                  Become a Partner
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="container mx-auto px-4 -mt-48 relative z-20">
        <Card className="p-0 overflow-hidden border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] rounded-[2.5rem] bg-white">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-stone-100">
            <div className="p-12 flex flex-col items-center text-center gap-6 group">
              <div className="bg-stone-50 p-5 rounded-3xl text-slate-900 group-hover:scale-110 transition-transform duration-500">
                <ShieldCheck className="h-10 w-10" />
              </div>
              <div>
                <h3 className="font-black text-xl mb-2 text-slate-900 uppercase tracking-tight">Secure Payments</h3>
                <p className="text-stone-400 text-sm font-medium leading-relaxed">Your money is safe. We use trusted payment providers.</p>
              </div>
            </div>
            <div className="p-12 flex flex-col items-center text-center gap-6 group">
              <div className="bg-stone-50 p-5 rounded-3xl text-slate-900 group-hover:scale-110 transition-transform duration-500">
                <Truck className="h-10 w-10" />
              </div>
              <div>
                <h3 className="font-black text-xl mb-2 text-slate-900 uppercase tracking-tight">Fast Delivery</h3>
                <p className="text-stone-400 text-sm font-medium leading-relaxed">Tracked shipping straight to you.</p>
              </div>
            </div>
            <div className="p-12 flex flex-col items-center text-center gap-6 group">
              <div className="bg-stone-50 p-5 rounded-3xl text-slate-900 group-hover:scale-110 transition-transform duration-500">
                <Star className="h-10 w-10" />
              </div>
              <div>
                <h3 className="font-black text-xl mb-2 text-slate-900 uppercase tracking-tight">Quality Items</h3>
                <p className="text-stone-400 text-sm font-medium leading-relaxed">All sellers are checked. Only good stuff here.</p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8 border-b border-stone-100 pb-12">
          <div className="max-w-2xl">
            <Badge variant="outline" className="mb-4 border-stone-200 text-stone-400 rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest">Shop</Badge>
            <h2 className="text-5xl font-black tracking-tight text-slate-900 uppercase leading-none">Browse <br /><span className="text-stone-300">Categories</span></h2>
          </div>
          <Link to="/shop">
            <Button variant="outline" className="rounded-full px-8 py-6 font-black uppercase tracking-widest text-[10px] group">
              Browse All <ArrowUpRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {categories.map((category) => (
            <Link 
              key={category.id} 
              to={`/shop?category=${category.id}`}
              className="group flex flex-col items-center"
            >
              <div className="w-full aspect-[4/5] rounded-[2rem] bg-stone-100 mb-6 overflow-hidden relative">
                <div className="absolute inset-0 bg-stone-200/50 group-hover:scale-110 transition-transform duration-700"></div>
                <div className="absolute inset-0 flex items-center justify-center p-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-xl">
                    <ArrowRight size={20} className="text-slate-900" />
                  </div>
                </div>
              </div>
              <span className="font-black text-slate-900 uppercase tracking-widest text-xs group-hover:text-stone-500 transition-colors">{category.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8 border-b border-stone-100 pb-12">
          <div className="max-w-2xl">
            <Badge variant="outline" className="mb-4 border-stone-200 text-stone-400 rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest">Popular</Badge>
            <h2 className="text-5xl font-black tracking-tight text-slate-900 uppercase leading-none">Popular <br /><span className="text-stone-300">Items</span></h2>
          </div>
          <Link to="/shop">
            <Button variant="outline" className="rounded-full px-8 py-6 font-black uppercase tracking-widest text-[10px] group">
              Full Archive <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-6">
                <Skeleton className="aspect-square rounded-[2rem]" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-6 w-1/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-16">
            {featuredProducts.map((product) => (
              <Link 
                key={product.id} 
                to={`/product/${product.id}`}
                className="group flex flex-col"
              >
                <div className="aspect-square bg-white rounded-[2rem] overflow-hidden mb-8 relative shadow-sm border border-stone-100 group-hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.1)] transition-all duration-700">
                  <ProductImage 
                    src={product.product_images?.[0]?.url} 
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute top-6 right-6">
                    <button className="bg-white/90 backdrop-blur-md p-3 rounded-2xl text-stone-300 hover:text-rose-500 transition-all shadow-sm active:scale-90">
                      <Heart className="h-5 w-5" fill="currentColor" fillOpacity="0" />
                    </button>
                  </div>
                  {product.stock <= 5 && product.stock > 0 && (
                    <div className="absolute bottom-6 left-6">
                      <Badge variant="warning" className="rounded-full px-4 py-1.5 font-black uppercase tracking-widest text-[8px] shadow-xl">
                        Low Stock
                      </Badge>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
                      {(product as any).seller_store?.store_name}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-snug group-hover:text-stone-600 transition-colors">
                    {product.title}
                  </h3>
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-2xl font-black text-slate-900">
                      R {product.price.toLocaleString()}
                    </p>
                    <div className="w-12 h-12 rounded-2xl bg-stone-50 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
                      <ShoppingBag size={20} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Seller CTA */}
      <section className="container mx-auto px-4">
        <div className="relative rounded-[3rem] bg-slate-900 overflow-hidden px-8 py-24 md:p-32 text-center text-white border-8 border-stone-100 shadow-2xl">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-stone-400 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-slate-400 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3"></div>
          </div>
          
          <div className="relative z-10 max-w-3xl mx-auto">
            <Badge variant="outline" className="mb-8 border-white/10 text-stone-400 rounded-full px-6 py-2 text-[10px] font-black uppercase tracking-[0.3em] bg-white/5">Sell With Us</Badge>
            <h2 className="text-5xl md:text-7xl font-black mb-10 leading-[0.9] uppercase tracking-tighter">Want to <br /><span className="text-stone-500 italic">Sell Here?</span></h2>
            <p className="text-xl text-stone-400 mb-16 font-medium leading-relaxed max-w-2xl mx-auto">
              We help independent creators sell their work. Set your own prices. We handle the rest.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <Link to="/auth">
                <Button size="lg" className="rounded-full px-16 py-8 text-lg font-black bg-white text-slate-900 hover:bg-stone-200 border-none shadow-2xl">
                  Get Started Selling
                </Button>
              </Link>
              <Link to="/shop">
                <Button variant="outline" size="lg" className="rounded-full px-16 py-8 text-lg font-black border-white/10 text-white hover:bg-white/5 backdrop-blur-sm">
                  Browse Sellers
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
