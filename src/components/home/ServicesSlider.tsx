import React from 'react'
import { Link } from 'react-router-dom'
import { Store, ArrowRight, User, Star } from 'lucide-react'
import ProductImage from '../ProductImage'
import { Button } from '../ui/Button'

interface ServicesSliderProps {
  services: any[]
}

export default function ServicesSlider({ services }: ServicesSliderProps) {
  const isEmpty = !services || services.length === 0

  return (
    <section className="container mx-auto px-4 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8 border-b border-stone-100 pb-12">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-blue-100">
             <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> Professional Services
          </div>
          <h2 className="text-5xl font-black tracking-tight text-slate-900 uppercase leading-none">
            Expert <br />
            <span className="text-stone-300">Talent Nearby</span>
          </h2>
          <p className="mt-6 text-stone-500 font-medium text-lg leading-relaxed max-w-lg">
            From technical repairs to artisanal skills, find trusted professionals ready to assist you right now.
          </p>
        </div>

        <Link to="/marketplace?tab=services">
          <Button variant="outline" className="rounded-full px-8 py-6 font-black uppercase tracking-widest text-[10px] group h-auto">
            Explore All Services <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </Link>
      </div>

      {isEmpty ? (
        <div className="bg-stone-50 rounded-[3rem] p-12 text-center border-2 border-dashed border-stone-200">
           <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
             <Store className="w-10 h-10 text-stone-200" />
           </div>
           <h3 className="text-2xl font-black text-slate-900 mb-2">Service Discovery is Active</h3>
           <p className="text-stone-500 max-w-sm mx-auto mb-8">We're currently looking for professional service providers in your area. Check back soon or become our first partner!</p>
           <Link to="/auth?mode=seller">
             <Button className="rounded-full px-10 py-6 font-black uppercase tracking-widest text-[10px]">Start Selling Services</Button>
           </Link>
        </div>
      ) : (
        <div className="flex gap-8 overflow-x-auto pb-12 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">

        {services.map((service) => {
          const isOnline = service.seller_store?.is_online === true
          const lastSeen = service.seller_store?.last_seen_at
          const isLive = isOnline && lastSeen && (Date.now() - new Date(lastSeen).getTime()) < 30000

          return (
            <div 
              key={service.id} 
              className="flex-shrink-0 w-[320px] sm:w-[400px] group"
            >
              <Link to={`/product/${service.id}`}>
                <div className="bg-white rounded-[2.5rem] p-6 border border-stone-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 flex flex-col h-full relative overflow-hidden">
                  
                  {/* Decorative Background Element */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-stone-50 rounded-bl-[4rem] -z-10 group-hover:bg-blue-50 transition-colors" />

                  <div className="flex justify-between items-start mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-stone-50 overflow-hidden border border-stone-100 flex items-center justify-center group-hover:bg-white transition-colors">
                      {service.product_images?.[0] ? (
                        <ProductImage src={service.product_images[0].url} alt={service.title} className="w-full h-full object-cover" />
                      ) : (
                        <User className="text-stone-300 w-8 h-8" />
                      )}
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-sm font-black tracking-tighter shadow-lg">
                        R{service.price}
                      </div>
                      {isLive && (
                        <div className="flex items-center gap-1.5 mt-2 me-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Available Now</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="text-xl font-black text-slate-900 mb-2 truncate group-hover:text-blue-600 transition-colors">{service.title}</h3>
                  <div className="flex items-center gap-2 mb-4">
                    <Store className="w-3.5 h-3.5 text-stone-400" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 truncate">
                      {service.seller_store?.store_name}
                    </span>
                  </div>

                  <p className="text-sm text-stone-500 font-medium line-clamp-2 leading-relaxed mb-6">
                    {service.description}
                  </p>

                  <div className="mt-auto flex items-center justify-between pt-6 border-t border-stone-50">
                    <div className="flex items-center gap-2">
                       <div className="flex">
                         {[1,2,3,4,5].map(i => <Star key={i} className={`w-3 h-3 ${i <= (service.seller_store?.average_rating || 5) ? 'text-amber-400 fill-amber-400' : 'text-stone-200'}`} />)}
                       </div>
                       <span className="text-[10px] font-black text-slate-400">{service.reviews_count || 0} Reviews</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )
        })}
      </div>
    )}
  </section>
)
}

