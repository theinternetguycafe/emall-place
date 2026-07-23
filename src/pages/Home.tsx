import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useOnboarding } from '../contexts/OnboardingContext'
import { fetchCategoryThumbnails, getPlaceholderImage } from '../lib/categories'
import { Product, Category } from '../types'
import MarketplaceImage from '../components/MarketplaceImage'
import { ArrowRight, ShoppingBag, ShieldCheck, Truck, Star, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../components/ui/Button'
import LikeButton from '../components/ui/LikeButton'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { OnboardingModal } from '../components/onboarding/OnboardingModal'
import { Helmet } from 'react-helmet-async'
import ServicesSlider from '../components/home/ServicesSlider'
import OnSaleSlider from '../components/home/OnSaleSlider'
import { SellerCautionNote } from '../components/seller/SellerCautionNote'
import UnifiedProductCard from '../components/UnifiedProductCard'

export default function Home() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { isStepDone, completeStep } = useOnboarding()
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [featuredServices, setFeaturedServices] = useState<any[]>([])
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
        // Fetch more products to allow randomization & diversity
        const { data: products, error: pError } = await supabase
          .from('products')
          .select(
            `
            id,
            seller_id,
            category_id,
            title,
            description,
            price,
            stock,
            status,
            created_at,
            seller_store:seller_profiles!seller_id!inner (
              id,
              store_name,
              rating_avg,
              onboarding_completed,
              kyc_status,
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
          .eq('seller_store.onboarding_completed', true)
          .eq('seller_store.kyc_status', 'approved')
          .order('created_at', { ascending: false })
          .limit(50)  // Fetch 50 to allow randomization & diversity

        if (pError) throw pError

        let fetchedItems = Array.isArray(products)
          ? products.map((p: any) => ({
              ...p,
              seller_store: Array.isArray(p.seller_store) ? p.seller_store[0] : p.seller_store,
            }))
          : [];

        // ✨ TRUE RANDOMIZATION: Fisher-Yates shuffle for genuine randomness
        if (fetchedItems.length > 0) {
          const shuffled = [...fetchedItems]
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
          }
          fetchedItems = shuffled
        }

        // Take top 8 after randomization
        const safeProducts: Product[] = fetchedItems.slice(0, 8);
        setFeaturedProducts(safeProducts)

        // -------- CATEGORIES --------
        const { data: activeProductCats } = await supabase
          .from('products')
          .select('category_id')
          .eq('status', 'approved')
          .lt('stock', 999)
          
        const validCategoryIds = new Set(activeProductCats?.map(p => p.category_id).filter(Boolean))
        
        let cats: any[] = []
        if (validCategoryIds.size > 0) {
          const { data, error: cError } = await supabase
            .from('categories')
            .select('*')
            .in('id', Array.from(validCategoryIds))
            .order('name', { ascending: true })
            .limit(6)
  
          if (cError) throw cError
          cats = data || []
        }

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

        // -------- SERVICES --------
        const { data: services, error: sError } = await supabase
          .from('services')
          .select(`
            id,
            title,
            description,
            base_rate,
            seller_store:seller_profiles!seller_id!inner(
              id,
              store_name,
              store_slug,
              is_online,
              rating_avg,
              seller_type,
              onboarding_completed,
              kyc_status,
              stores ( logo_url, banner_url )
            )
          `)
          .eq('status', 'approved')
          .eq('is_active', true)
          .eq('seller_store.onboarding_completed', true)
          .eq('seller_store.kyc_status', 'approved')
          .order('created_at', { ascending: false })
          .limit(6)

        if (!sError && services) {
          // Calculate lowest price per provider for "Prices From" labels
          const sellerIds = Array.from(new Set(services.map((s: any) => s.seller_store?.id).filter(Boolean)));
          
          let minPrices: Record<string, number> = {};
          if (sellerIds.length > 0) {
            const { data: allSvcRates } = await supabase
              .from('services')
              .select('seller_id, base_rate')
              .in('seller_id', sellerIds)
              .eq('status', 'approved')
              .eq('is_active', true);
            
            if (allSvcRates) {
              allSvcRates.forEach((rate: any) => {
                const sid = rate.seller_id;
                const val = Number(rate.base_rate);
                if (!minPrices[sid] || val < minPrices[sid]) {
                  minPrices[sid] = val;
                }
              });
            }
          }

          const formattedServices = services.map((s: any) => {
            const storeRow = Array.isArray(s.seller_store?.stores) ? s.seller_store.stores[0] : s.seller_store?.stores;
            const sellerId = s.seller_store?.id;
            return {
              ...s,
              price: minPrices[sellerId] || s.base_rate,
              seller_store: {
                ...s.seller_store,
                logo_url: storeRow?.logo_url,
                banner_url: storeRow?.banner_url,
              }
            };
          });
          console.log('[Home] Real Services Fetched with Min Rates:', formattedServices.length, formattedServices);
          setFeaturedServices(formattedServices)
        } else if (sError) {
          console.error('[Home] Services Fetch Error:', sError);
        }
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
      <div className="space-y-20 pb-32">
      <SellerCautionNote />
      {/* HERO */}
      <section className="relative min-h-[60vh] md:min-h-[70vh] flex items-center overflow-hidden py-24">
        <div className="absolute inset-0 bg-slate-950">
          <img
            src="https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&q=80&w=2070"
            alt="Premium South African Marketplace"
            className="w-full h-full object-cover opacity-60 scale-105"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10 text-white">
          <div className="max-w-5xl">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 px-4 py-2 rounded-full mb-8">
              <img src="https://flagcdn.com/w20/za.png" alt="RSA" className="h-3 w-auto" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Proudly South African</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-black leading-tight tracking-tight mb-8 text-white">
              Shop Local. <br />
              <span className="font-display italic text-emerald-400 font-normal">Discover Mzansi's Best.</span>
            </h1>

            <p className="text-lg md:text-xl text-stone-300 mb-12 leading-relaxed max-w-2xl font-medium">
              Discover handpicked treasures from local creators. 
              Fresh finds, honest prices, and safe payments for everyone.
            </p>

            <div className="flex flex-wrap gap-6">
              <Link to="/marketplace">
                <Button size="lg" className="rounded-full px-12 py-9 text-xl font-black bg-white text-slate-950 hover:bg-emerald-50 transition-all shadow-[0_20px_40px_-15px_rgba(255,255,255,0.3)]">
                  Explore Now <ArrowRight className="ml-3 h-6 w-6" />
                </Button>
              </Link>

              {!profile ? (
                <Link to="/auth?signup=true">
                  <Button
                    variant="outline"
                    size="lg"
                    className="rounded-full px-12 py-9 text-xl font-black border-white/20 text-white hover:bg-white hover:text-slate-950 backdrop-blur-md transition-all"
                  >
                    Join the Fam
                  </Button>
                </Link>
              ) : profile.role === 'seller' ? (
                <Link to="/seller">
                  <Button
                    variant="outline"
                    size="lg"
                    className="rounded-full px-12 py-9 text-xl font-black border-white/20 text-white hover:bg-white hover:text-slate-950 backdrop-blur-md transition-all"
                  >
                    Seller Hub
                  </Button>
                </Link>
              ) : (
                <Link to="/account">
                  <Button
                    variant="outline"
                    size="lg"
                    className="rounded-full px-12 py-9 text-xl font-black border-white/20 text-white hover:bg-white hover:text-slate-950 backdrop-blur-md transition-all"
                  >
                    My Account
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="container mx-auto px-4 -mt-32 relative z-20">
        <div className="bg-white/80 backdrop-blur-2xl rounded-[3rem] p-4 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] border border-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-10 flex flex-col items-center text-center gap-6 group rounded-[2.5rem] hover:bg-white transition-all duration-500">
              <div className="bg-emerald-50 text-emerald-600 p-6 rounded-3xl group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500">
                <ShieldCheck className="h-10 w-10" />
              </div>
              <div>
                <h3 className="font-black text-xl mb-3 text-slate-900 uppercase tracking-tight">Safe as Houses</h3>
                <p className="text-stone-500 text-sm font-medium leading-relaxed">Secure Yoco payments. We keep your hard-earned money safe.</p>
              </div>
            </div>

            <div className="p-10 flex flex-col items-center text-center gap-6 group rounded-[2.5rem] hover:bg-white transition-all duration-500">
              <div className="bg-blue-50 text-blue-600 p-6 rounded-3xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                <Truck className="h-10 w-10" />
              </div>
              <div>
                <h3 className="font-black text-xl mb-3 text-slate-900 uppercase tracking-tight">Lekker Delivery</h3>
                <p className="text-stone-500 text-sm font-medium leading-relaxed">Fast, tracked, and reliable. From their hands to your doorstep.</p>
              </div>
            </div>

            <div className="p-10 flex flex-col items-center text-center gap-6 group rounded-[2.5rem] hover:bg-white transition-all duration-500">
              <div className="bg-amber-50 text-amber-500 p-6 rounded-3xl group-hover:bg-amber-500 group-hover:text-white transition-all duration-500">
                <Star className="h-10 w-10" />
              </div>
              <div>
                <h3 className="font-black text-xl mb-3 text-slate-900 uppercase tracking-tight">Certified Quality</h3>
                <p className="text-stone-500 text-sm font-medium leading-relaxed">We vet every seller. Only the best craft makes it to the collective.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8 border-b border-stone-100 pb-12">
          <div className="max-w-2xl">
            <Badge variant="outline" className="mb-4 border-emerald-200 text-emerald-600 bg-emerald-50 rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest">
              Browse
            </Badge>
            <h2 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 uppercase leading-[0.9]">
              Explore <br />
              <span className="text-stone-300">Categories</span>
            </h2>
          </div>

          <Link to="/marketplace">
            <Button variant="outline" className="rounded-full px-8 py-6 font-black uppercase tracking-widest text-[10px] group border-stone-200">
              See Everything <ArrowUpRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
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
                <Link key={category.id} to={`/marketplace?category=${category.id}`} className="group flex flex-col items-center flex-shrink-0 w-32 sm:w-40">
                  <div className="w-full aspect-[4/5] rounded-[2.5rem] bg-[#FAFAF8] border border-stone-100 shadow-sm transition-all duration-300 overflow-hidden relative mb-6">
                    <MarketplaceImage
                      src={thumbUrl}
                      alt={category.name}
                      className="w-full h-full group-hover:scale-105 transition-transform duration-700"
                      imgClassName="object-contain"
                      transformOptions={{ width: 300, quality: 80, format: 'webp' }}
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
            <Badge variant="outline" className="mb-4 border-blue-200 text-blue-600 bg-blue-50 rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest">
              Local Favorites
            </Badge>
            <h2 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 uppercase leading-[0.9]">
              Handpicked <br />
              <span className="text-stone-300">For You</span>
            </h2>
          </div>

          <Link to="/marketplace">
            <Button variant="outline" className="rounded-full px-8 py-6 font-black uppercase tracking-widest text-[10px] group border-stone-200">
              The Full Stack <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
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
                <Skeleton className="aspect-square rounded-[2.5rem]" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-6 w-1/3" />
              </div>
            ))}
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="p-10 rounded-3xl bg-stone-50 text-stone-500 border border-stone-100">No products to show yet.</div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {featuredProducts.map((product) => (
              <UnifiedProductCard key={product.id} product={product} variant="grid" showAddToCart={true} showSeller={true} />
            ))}
          </div>
        )}
      </section>

      {/* SERVICES SLIDER */}
      <ServicesSlider services={featuredServices} />

      {/* ON SALE SLIDER */}
      <OnSaleSlider />
    </div>

    {/* Buyer Welcome Modal */}
    <OnboardingModal
      isOpen={showWelcomeModal}
      title="Howzit! Welcome to eMall Place."
      body="Discover one-of-a-kind treasures from local makers right here in Mzansi. Support the fam and find something special today."
      ctaLabel="Start Browsing"
      onClose={handleWelcomeModalClose}
    />
    </>
  )
}
