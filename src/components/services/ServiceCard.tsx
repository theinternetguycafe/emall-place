import { useNavigate } from "react-router-dom";
import { Store, ChevronRight, MapPin } from "lucide-react";
import { getDistance } from "../../utils/distance";
import { getStoreLogo } from "../../lib/storeUtils";
import { SERVICE_DELIVERY_RATE_PER_KM } from "../../utils/hub";
import LikeButton from "../ui/LikeButton";
import ProductImage from "../ProductImage";
import { User, Star } from "lucide-react";
import { WhatsAppButton } from "../ui/WhatsAppButton";

export default function ServiceCard({ service, userLocation, isSelected, onSelect }: any) {
  const navigate = useNavigate();

  const distance = getDistance(userLocation, service?.seller_store);
  const minutes = distance !== null ? Math.round((distance / 40) * 60) : 0;
  const estimatedServiceFee = distance !== null ? Math.max(10, Math.ceil(distance * SERVICE_DELIVERY_RATE_PER_KM)) : null;

  return (
    <div
      id={`service-${service.id}`}
      onClick={onSelect}
      className={`rounded-[2.5rem] border cursor-pointer transition-all duration-500 overflow-hidden group flex flex-col justify-between ${
        isSelected 
          ? "border-slate-900 shadow-xl bg-slate-50 ring-1 ring-slate-900 scale-[1.02] z-10 relative" 
          : "border-stone-100 bg-white hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:border-stone-200"
      }`}
    >
      {/* 🖼️ Image Banner */}
      <div className="relative aspect-[16/10] bg-stone-100 overflow-hidden">
        <ProductImage 
           src={service.seller_store?.banner_url || getStoreLogo(service.seller_store?.store_name, service.seller_store?.logo_url)}
           alt={service.title} 
           className="w-full h-full group-hover:scale-105 transition-transform duration-700"
           imgClassName="object-cover"
           transformOptions={{ width: 600, quality: 80, format: 'webp' }}
        />
        
        {/* Like Button */}
        <div className="absolute top-4 right-4 z-10">
          <LikeButton productId={service.id} size={18} />
        </div>

        {/* Floating Price */}
        <div className="absolute bottom-4 left-4">
          <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-white/50">
             <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">Starting From</p>
             <p className="text-base font-black text-slate-900 leading-none">
               {(service.price || service.base_price || 0) > 0 ? `R${service.price || service.base_price}` : 'Contact for quote'}
             </p>
          </div>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        {/* Header Info */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-6 h-6 rounded-full overflow-hidden border border-stone-100 bg-stone-50 flex-shrink-0">
            <ProductImage 
              src={getStoreLogo(service.seller_store?.store_name, service.seller_store?.logo_url)} 
              alt="" 
              className="w-full h-full" 
              imgClassName="object-cover"
            />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 group-hover:text-emerald-600 transition-colors">
            {service.seller_store?.store_name || 'Verified Pro'}
          </span>
        </div>
        
        <h3 className="font-bold text-xl text-slate-900 leading-tight mb-2 group-hover:text-blue-600 transition-colors">
          {service.title}
        </h3>

      <p className="text-sm text-stone-500 line-clamp-2 leading-relaxed flex-1">
        {service.description}
      </p>

      {/* Ratings & Metadata */}
      <div className="mt-4 pt-4 border-t border-stone-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            {service.seller_store?.average_rating > 0 ? (
              <>
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="text-sm font-bold text-slate-900">
                  {Number(service.seller_store.average_rating).toFixed(1)}
                </span>
              </>
            ) : (
              <>
                <Star className="w-3.5 h-3.5 text-stone-300" />
                <span className="text-[9px] font-black uppercase tracking-widest leading-normal">No ratings yet - Buy & be the first to rate</span>
              </>
            )}
          </div>
          
          {distance !== null && (
            <div className="flex items-center gap-1">
               <MapPin size={12} className="text-emerald-500" />
               <span className="text-xs font-bold text-emerald-600">{distance.toFixed(1)} km</span>
            </div>
          )}
        </div>

        {/* Action Button & Dist/Fee Line */}
        <div className="flex items-center justify-between">
           {estimatedServiceFee !== null ? (
              <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest leading-tight">
                Est. Travel<br /><span className="text-slate-900">R{estimatedServiceFee}</span>
              </p>
           ) : <div />}

          <div className="flex gap-2">
            <WhatsAppButton
              sellerId={service.seller_store?.id || service.seller_id}
              sellerPhone={service.seller_store?.whatsapp_number || service.seller_store?.seller_phone}
              productId={service.id}
              productName={service.title}
              price={service.price || service.base_price}
              intent="service"
              variant="outline"
              label="WhatsApp"
              className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex-1"
            />
            <button 
              onClick={(e) => {
                e.stopPropagation();
                const slug = service.seller_store?.store_slug || service.seller_store?.id;
                navigate(`/store/${slug}?tab=services`);
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                isSelected ? 'bg-slate-900 text-white shadow-md hover:bg-slate-800' : 'bg-stone-50 text-slate-900 hover:bg-stone-100'
              }`}
            >
              {service.seller_store?.seller_type === 'service' ? 'Book Pro' : 'View Store'} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
