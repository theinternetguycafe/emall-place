import React from 'react'
import { Link } from 'react-router-dom'
import { Service } from '../types'
import { Wrench, MapPin, Calendar, Clock, BadgeCheck } from 'lucide-react'
import { Badge } from './ui/Badge'
import LikeButton from './ui/LikeButton'
import MarketplaceImage from './MarketplaceImage'

interface UnifiedServiceCardProps {
  service: Service & {
    seller_store?: {
      store_name?: string
      kyc_status?: string
      rating_avg?: number
      rating_count?: number
      logo_url?: string
    }
  }
}

export default function UnifiedServiceCard({
  service,
}: UnifiedServiceCardProps) {
  const storeName = service.seller_store?.store_name || 'Professional Service'
  const isVerified = (service.seller_store?.kyc_status === 'verified' || (service.seller_store as any)?.kyc_status === 'approved')
  const rating = service.seller_store?.rating_avg
  const ratingCount = service.seller_store?.rating_count
  const imageUrl = service.seller_store?.logo_url

  return (
    <div className="group relative bg-white border border-stone-200 rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-slate-900/5 hover:-translate-y-1 flex flex-col h-full">
      <Link to={`/service/${service.id}`} className="block relative aspect-[4/3] bg-stone-100 overflow-hidden">
        {imageUrl ? (
          <MarketplaceImage
            src={imageUrl}
            alt={service.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-stone-100">
            <Wrench className="w-12 h-12 text-stone-300" />
          </div>
        )}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
          <LikeButton itemId={service.id} itemType="service" />
        </div>
      </Link>

      <div className="p-5 md:p-6 flex flex-col flex-grow">
        <Link to={`/service/${service.id}`} className="block group/title flex-grow">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {storeName}
            </span>
            {isVerified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
          </div>
          <h3 className="font-bold text-lg leading-tight text-slate-900 line-clamp-2 group-hover/title:text-blue-600 transition-colors mb-2">
            {service.title}
          </h3>
          <p className="text-sm text-stone-500 line-clamp-2 mb-4">
            {service.description || 'Professional service offering.'}
          </p>
        </Link>

        <div className="mt-auto pt-4 border-t border-stone-100 flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-0.5">Base Rate</div>
            <div className="font-black text-slate-900 text-lg">R {service.base_rate?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <Link
            to={`/service/${service.id}`}
            className="h-11 px-6 rounded-full bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center flex-shrink-0"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Book
          </Link>
        </div>
      </div>
    </div>
  )
}