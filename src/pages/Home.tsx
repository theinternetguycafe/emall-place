import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useOnboarding } from '../contexts/OnboardingContext'
import { fetchCategoryThumbnails, getPlaceholderImage } from '../lib/categories'
import { Product, Category } from '../types'
import ProductImage from '../components/ProductImage'
import { ArrowRight, ShoppingBag, ShieldCheck, Truck, Star, Heart, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { OnboardingModal } from '../components/onboarding/OnboardingModal'
import { Helmet } from 'react-helmet-async'

export default function Home() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { isStepDone, completeStep } = useOnboarding()
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryThumbnails, setCategoryThumbnails] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)

  // Prevent double-fetch noise in React 18 StrictMode (dev)
  const didFetch = useRef(false)
  const categoryScrollRef = useRef<HTMLDivElement>(null)

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = 240
      categoryScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  useEffect(() => {
    if (didFetch.current) return
    didFetch.current = true

    const fetchHomeData = async () => {
      try {
        setLoading(true)
        setErrorMsg(null)

        // -------- PRODUCTS (match Product type shape) --------
        const { data: products, error: pError } = await supabase
          .from('products')
          .select(
            `
            id,
            seller_store_id,
            category_id,
            title,
            description,
            price,
            stock,
            status,
            created_at,
            seller_store:seller_stores (
              id,
              owner_id,
              store_name,
              description,
              status,
              created_at
            ),
            product_images:product_images (
              id,
              product_id,
              url,
              sort_order
            )
          `
          )
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(8)

        if (pError) throw pError

        const safeProducts: Product[] = Array.isArray(products)
          ? products.map((p: any) => ({
              ...p,
              seller_store: Array.isArray(p.seller_store) ? p.seller_store[0] : p.seller_store,
            }))
          : [];
        setFeaturedProducts(safeProducts)

        // -------- CATEGORIES --------
        const { data: cats, error: cError } = await supabase
          .from('categories')
          .select('*')
          .order('name', { ascending: true })
          .limit(6)

        if (cError) throw cError

        // Fetch category thumbnails
        const thumbs = await fetchCategoryThumbnails()
        
        // Sort: categories with images first, then alphabetically
        const hasImage = (cat: any) => thumbs[cat.id]
        const sorted = (cats || []).sort((a, b) => {
          const aHasImg = hasImage(a)
          const bHasImg = hasImage(b)
          if (aHasImg !== bHasImg) return aHasImg ? -1 : 1
          return a.name.localeCompare(b.name)
        })
        
        setCategories(sorted)
        setCategoryThumbnails(thumbs)
      } catch (err: any) {
        // Ignore aborts (React 18 StrictMode / navigation / unmount)
        if (err?.name === "AbortError" || String(err?.message || "").toLowerCase().includes("aborted")) {
          return;
        }

        console.error("[Home] fetchHomeData error:", err);

        const msg = err?.message || "Failed to load home data.";
        setErrorMsg(msg);
        setFeaturedProducts([]);
        setCategories([]);
      } finally {
        setLoading(false)
      }
    }

    void fetchHomeData()
  }, [])

  // Check if buyer welcome modal should be shown
  useEffect(() => {
    const checkWelcomeStatus = async () => {
      if (!profile || profile.role !== 'buyer') {
        setShowWelcomeModal(false)
        return
      }

      try {
        const isDone = await isStepDone('welcome_seen')
        if (!isDone) {
          setShowWelcomeModal(true)
        }
      } catch (err) {
        console.error('Error checking welcome status:', err)
      }
    }

    checkWelcomeStatus()
  }, [profile, isStepDone])

  const handleWelcomeModalClose = async () => {
    setShowWelcomeModal(false)
    try {
      await completeStep('welcome_seen')
    } catch (err) {
      console.error('Error completing welcome step:', err)
    }
  }

  return (
    <>
      <Helmet>
        <title>eMall Place Collective | South African Marketplace</title>
        <meta name="description" content="Shop directly from independent creators across Mzansi. Quality goods, fair prices, secure payments." />
      </Helmet>
      <div className="space-y-32 pb-32">
      {/* HERO */}
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

            <Badge
              variant="outline"
              className="text-white border-white/20 bg-white/10 backdrop-blur-md mb-8 py-2 px-6 rounded-full text-[10px] font-black tracking-[0.2em] flex items-center gap-2 w-max"
            >
              <img src="https://flagcdn.com/w20/za.png" alt="South Africa Flag" className="h-3 w-auto object-contain" /> Support Local Business
            </Badge>

            <h1 className="text-6xl md:text-[7rem] pb-4 font-black leading-[0.85] tracking-tighter mb-10 text-white">
              Discover amazing <br />
              products from <br />
              <span className="inline-block pt-2 text-stone-400 italic">LOCAL SELLERS.</span>
            </h1>

            <p className="text-xl text-stone-300 mb-12 leading-relaxed max-w-xl font-medium">
              Shop directly from independent creators across Mzansi. Quality goods, fair prices, secure payments powered by Yoco.
            </p>

            <div className="flex flex-wrap gap-6">
              <Link to="/shop">
                <Button size="lg" className="rounded-full px-12 py-8 text-lg font-black bg-white text-slate-950 hover:bg-stone-200">
                  Explore Marketplace <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
              </Link>

              <Link to="/auth">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full px-12 py-8 text-lg font-black border-white/20 text-white hover:bg-white hover:text-slate-950 backdrop-blur-sm"
                >
                  Become a Partner
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="container mx-auto px-4 -mt-48 relative z-20">
        <Card className="p-0 overflow-hidden border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] rounded-[2.5rem] bg-white">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-stone-100">
            <div className="p-12 flex flex-col items-center text-center gap-6 group">
              <div className="bg-emerald-50 text-emerald-600 p-5 rounded-3xl group-hover:scale-110 group-hover:bg-emerald-100 transition-all duration-500">
                <ShieldCheck className="h-10 w-10" />
              </div>
              <div>
                <h3 className="font-black text-xl mb-2 text-slate-900 uppercase tracking-tight">Secure Payments</h3>
                <p className="text-stone-500 text-sm font-medium leading-relaxed">
                  Secure payments powered by <span className="font-bold text-blue-600">Yoco</span>. Only confirm payments you started.
                </p>
              </div>
            </div>

            <div className="p-12 flex flex-col items-center text-center gap-6 group">
              <div className="bg-blue-50 text-blue-600 p-5 rounded-3xl group-hover:scale-110 group-hover:bg-blue-100 transition-all duration-500">
                <Truck className="h-10 w-10" />
              </div>
              <div>
                <h3 className="font-black text-xl mb-2 text-slate-900 uppercase tracking-tight">Safe Delivery</h3>
                <p className="text-stone-500 text-sm font-medium leading-relaxed">Reliable and fast tracked delivery across South Africa. Your goods, safely to your door.</p>
              </div>
            </div>

            <div className="p-12 flex flex-col items-center text-center gap-6 group">
              <div className="bg-amber-50 text-amber-500 p-5 rounded-3xl group-hover:scale-110 group-hover:bg-amber-100 transition-all duration-500">
                <Star className="h-10 w-10" />
              </div>
              <div>
                <h3 className="font-black text-xl mb-2 text-slate-900 uppercase tracking-tight">Quality Items</h3>
                <p className="text-stone-500 text-sm font-medium leading-relaxed">Every seller is vetted to ensure you get exactly what you ordered.</p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* CATEGORIES */}
      <section className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8 border-b border-stone-100 pb-12">
          <div className="max-w-2xl">
            <Badge variant="outline" className="mb-4 border-stone-200 text-stone-400 rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest">
              Shop
            </Badge>
            <h2 className="text-5xl font-black tracking-tight text-slate-900 uppercase leading-none">
              Browse <br />
              <span className="text-stone-300">Categories</span>
            </h2>
          </div>

          <Link to="/shop">
            <Button variant="outline" className="rounded-full px-8 py-6 font-black uppercase tracking-widest text-[10px] group">
              Browse All <ArrowUpRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </Button>
          </Link>
        </div>

        <div className="relative group">
          {/* Left Arrow */}
          <button
            onClick={() => scrollCategories('left')}
            className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-slate-200 rounded-full items-center justify-center hover:bg-slate-50 transition-all shadow-md"
            aria-label="Scroll categories left"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </button>

          {/* Categories Scroll Container */}
          <div ref={categoryScrollRef} className="flex gap-8 overflow-x-auto scroll-smooth pb-2 scrollbar-hide px-4 sm:px-12">
            {categories.map((category) => {
              const thumbUrl = categoryThumbnails[category.id] || getPlaceholderImage()
              return (
                <Link key={category.id} to={`/shop?category=${category.id}`} className="group flex flex-col items-center flex-shrink-0 w-32 sm:w-40">
                  <div className="w-full aspect-[4/5] rounded-[2rem] bg-stone-100 mb-6 overflow-hidden relative border border-stone-200 shadow-sm group-hover:shadow-lg transition-all duration-300">
                    <img
                      src={thumbUrl}
                      alt={category.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getPlaceholderImage()
                      }}
                    />
                  </div>
                  <span className="font-black text-slate-900 uppercase tracking-widest text-xs group-hover:text-stone-500 transition-colors text-center line-clamp-2">
                    {category.name}
                  </span>
                </Link>
              )
            })}
          </div>

          {/* Right Arrow */}
          <button
            onClick={() => scrollCategories('right')}
            className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-slate-200 rounded-full items-center justify-center hover:bg-slate-50 transition-all shadow-md"
            aria-label="Scroll categories right"
          >
            <ChevronRight className="h-5 w-5 text-slate-600" />
          </button>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8 border-b border-stone-100 pb-12">
          <div className="max-w-2xl">
            <Badge variant="outline" className="mb-4 border-stone-200 text-stone-400 rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest">
              Popular
            </Badge>
            <h2 className="text-5xl font-black tracking-tight text-slate-900 uppercase leading-none">
              Popular <br />
              <span className="text-stone-300">Items</span>
            </h2>
          </div>

          <Link to="/shop">
            <Button variant="outline" className="rounded-full px-8 py-6 font-black uppercase tracking-widest text-[10px] group">
              Full Archive <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>

        {errorMsg && (
          <div className="mb-8 p-4 rounded-2xl bg-rose-50 text-rose-700 border border-rose-100">{errorMsg}</div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-6">
                <Skeleton className="aspect-square rounded-[2rem]" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-6 w-1/3" />
              </div>
            ))}
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="p-10 rounded-3xl bg-stone-50 text-stone-500 border border-stone-100">No products to show yet.</div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-16">
            {featuredProducts.map((product) => {
              const price = Number(product.price ?? 0)
              const stock = Number(product.stock ?? 0)
              const imageUrl = product.product_images?.[0]?.url
              const storeName = product.seller_store?.store_name

              return (
                <Link key={product.id} to={`/product/${product.id}`} className="group flex flex-col">
                  <div className="aspect-square bg-white rounded-[2rem] overflow-hidden mb-8 relative shadow-sm border border-stone-100 group-hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.1)] transition-all duration-700">
                    <ProductImage
                      src={imageUrl}
                      alt={product.title || 'Product'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />

                    <div className="absolute top-6 right-6">
                      <button
                        type="button"
                        onClick={(e) => e.preventDefault()}
                        className="bg-white/90 backdrop-blur-md p-3 rounded-2xl text-stone-300 hover:text-rose-500 transition-all shadow-sm active:scale-90"
                      >
                        <Heart className="h-5 w-5" fill="currentColor" fillOpacity="0" />
                      </button>
                    </div>

                    {stock <= 5 && stock > 0 && (
                      <div className="absolute bottom-6 left-6">
                        <Badge variant="warning" className="rounded-full px-4 py-1.5 font-black uppercase tracking-widest text-[8px] shadow-xl">
                          Low Stock
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">{storeName || 'Local Seller'}</span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-snug group-hover:text-stone-600 transition-colors">
                      {product.title}
                    </h3>

                    <div className="flex items-center justify-between pt-2">
                      <p className="text-2xl font-black text-slate-900">R {price.toLocaleString()}</p>
                      <div className="w-12 h-12 rounded-2xl bg-stone-50 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
                        <ShoppingBag size={20} />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>

    {/* Buyer Welcome Modal */}
    <OnboardingModal
      isOpen={showWelcomeModal}
      title="Welcome to the Marketplace!"
      body="Discover unique handcrafted products from talented artisans. Browse our collection and support local makers."
      ctaLabel="Start Exploring"
      onClose={handleWelcomeModalClose}
    />
    </>
  )
}