import React from 'react'
import { Link } from 'react-router-dom'
import { Store, ArrowRight, User, Star, ChevronLeft, ChevronRight } from 'lucide-react'
import ProductImage from '../ProductImage'
import { getStoreLogo } from '../../lib/storeUtils'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'

interface ServicesSliderProps {
  services: any[]
}

export default function ServicesSlider({ services }: ServicesSliderProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const isEmpty = !services || services.length === 0
  
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current
      const offset = direction === 'left' ? -clientWidth / 1.5 : clientWidth / 1.5
      scrollRef.current.scrollTo({ left: scrollLeft + offset, behavior: 'smooth' })
    }
  }

  // Premium Demo Data for the preview state
  const demoServices = [
    {
      id: 'demo-1',
      title: 'Plumbing & Maintenance',
      description: 'Expert residential and commercial plumbing. 24/7 emergency support.',
      price: '550',
      image: '/professional_plumber_service_1775307514847.png',
      category: 'Home Repair',
      proCount: 12
    },
    {
      id: 'demo-2',
      title: 'Technical Support & IT',
      description: 'Hardware repair, software configuration, and network setup by pros.',
      price: '400',
      image: '/professional_tech_service_1775307702306.png',
      category: 'Technology',
      proCount: 8
    },
    {
      id: 'demo-3',
      title: 'Electrical Installations',
      description: 'Certified electricians for safe home wiring and panel maintenance.',
      price: '600',
      image: '/professional_electrician_service_1775307803117.png',
      category: 'Artisans',
      proCount: 15
    }
  ]

  const displayList = isEmpty ? demoServices : services

  return (
    <section className="container mx-auto px-4 overflow-hidden pt-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8 border-b border-stone-100 pb-12">
        <div className="max-w-2xl">
          <Badge variant="outline" className="mb-4 border-emerald-200 text-emerald-600 bg-emerald-50 rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest">
            {isEmpty ? 'Coming Soon' : 'Verified Professionals'}
          </Badge>
          <h2 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 uppercase leading-[0.9]">
            Mzansi's <br />
            <span className="text-stone-300">Top Talent</span>
          </h2>
          <p className="mt-8 text-stone-500 font-medium text-lg leading-relaxed max-w-lg">
            {isEmpty 
              ? "We're handpicking the finest professionals across South Africa. Preview our upcoming categories below." 
              : "From technical repairs to artisanal skills, find trusted professionals ready to assist you right now."}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Link to="/marketplace?tab=services">
            <Button variant="outline" className="rounded-full px-8 py-6 font-black uppercase tracking-widest text-[10px] group h-auto border-stone-200 shadow-sm hover:shadow-lg transition-all">
              {isEmpty ? 'Get Notified' : 'Explore All Services'} <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>

          {!isEmpty && (
            <div className="hidden md:flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => scroll('left')}
                className="rounded-full w-12 h-12 border-stone-200 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
              >
                <ChevronLeft size={20} />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => scroll('right')}
                className="rounded-full w-12 h-12 border-stone-200 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
              >
                <ChevronRight size={20} />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex gap-8 overflow-x-auto pb-12 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth"
      >
        {displayList.map((service: any) => {
          const isDemo = isEmpty
          const imageUrl = isDemo 
            ? service.image 
            : (service.seller_store?.banner_url || getStoreLogo(service.seller_store?.store_name, service.seller_store?.logo_url))
          
          return (
            <div 
              key={service.id} 
              className="flex-shrink-0 w-[320px] sm:w-[450px] group"
            >
              <div className="bg-white rounded-[3rem] p-4 border border-stone-100 shadow-sm hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] transition-all duration-700 flex flex-col h-full relative overflow-hidden">
                
                {/* Image Section */}
                <div className="relative aspect-[16/10] rounded-[2.5rem] overflow-hidden mb-8 shadow-inner bg-stone-100 border border-stone-50">
                  <img 
                    src={imageUrl} 
                    alt={service.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                  />
                  {isDemo && (
                    <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px] flex items-center justify-center">
                      <div className="bg-white/90 backdrop-blur-md px-6 py-2 rounded-full border border-white/50 shadow-xl">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Preview Mode</span>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between pointer-events-none">
                    <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-white/50">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">Starting From</p>
                      <p className="text-lg font-black text-slate-900 leading-none">R {service.price}</p>
                    </div>
                    {isDemo && (
                      <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-white/10 flex items-center gap-2">
                        <User size={14} className="text-white/60" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white leading-none">{service.proCount} Active</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content Section */}
                <div className="px-4 pb-4 flex-1 flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                    {!isDemo && (
                      <div className="w-6 h-6 rounded-full overflow-hidden border border-stone-100 bg-stone-50 flex-shrink-0">
                        <img 
                          src={getStoreLogo(service.seller_store?.store_name, service.seller_store?.logo_url)} 
                          alt="" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                    )}
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 group-hover:text-emerald-600 transition-colors">
                      {isDemo ? service.category : (service.seller_store?.store_name || 'Verified Pro')}
                    </span>
                  </div>
                  
                  <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight group-hover:text-stone-600 transition-colors leading-tight">
                    {service.title}
                  </h3>
                  
                  <p className="text-sm text-stone-500 font-medium leading-relaxed line-clamp-2 mb-8">
                    {service.description}
                  </p>

                  <div className="mt-auto flex items-center justify-between pt-6 border-t border-stone-50">
                    <div className="flex items-center gap-3">
                      {service.seller_store?.rating_avg ? (
                        <div className="flex items-center gap-1.5">
                           <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                           <span className="text-sm font-bold text-slate-900">{Number(service.seller_store.rating_avg).toFixed(1)}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-stone-400">
                           <Star className="w-3.5 h-3.5 text-stone-300" />
                           <span className="text-[9px] font-black uppercase tracking-widest leading-normal">No reviews yet - Purchase and be the first to review</span>
                        </div>
                      )}
                      {(isDemo || service.seller_store?.rating_avg) && <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Mzansi Verified</span>}
                    </div>
                    
                    <Link 
                      to={isDemo ? "/auth?signup=true" : `/store/${service.seller_store?.store_slug || service.seller_store?.id}?tab=services`} 
                      className="group/btn"
                    >
                      <div className="flex items-center gap-2 bg-stone-50 px-6 py-3 rounded-2xl group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
                        <span className="text-[10px] font-black uppercase tracking-widest">{isDemo ? 'Join the waitlist' : 'Book pro'}</span>
                        <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      {isEmpty && (
        <div className="flex justify-center mt-8">
          <Link to="/auth?signup=true&role=seller" className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-300 hover:text-slate-900 transition-colors border-b-2 border-stone-100 pb-2">
            Are you a service provider? Register here &rarr;
          </Link>
        </div>
      )}
    </section>
  )
}
