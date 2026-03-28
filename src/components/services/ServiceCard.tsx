import { useNavigate } from "react-router-dom";
import { Store, ChevronRight } from "lucide-react";
import { getDistance } from "../../utils/distance";

export default function ServiceCard({ service, userLocation, isSelected, onSelect }: any) {
  const navigate = useNavigate();

  const distance = getDistance(userLocation, service?.seller_store);
  const minutes = distance !== null ? Math.round((distance / 40) * 60) : 0;

  return (
    <div
      id={`service-${service.id}`}
      onClick={onSelect}
      className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 ${
        isSelected 
          ? "border-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.12)] bg-slate-50 scale-[1.02] ring-1 ring-slate-900" 
          : "border-stone-200 bg-white hover:border-stone-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:scale-[1.02]"
      }`}
    >
      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="font-bold text-lg text-slate-900 leading-tight">{service.title}</h3>
          {service.seller_store?.store_name && (
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-1">
              {service.seller_store.store_name}
            </p>
          )}
        </div>
        <p className="font-black text-slate-900 bg-stone-100 px-3 py-1 rounded-full text-sm">
          R{service.price || service.base_price || 0}
        </p>
      </div>

      <p className="text-sm text-stone-500 mt-3 line-clamp-2 leading-relaxed">
        {service.description}
      </p>

      <div className="mt-5 flex items-center justify-between">
        {/* 🔥 DISTANCE */}
        {distance !== null ? (
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-stone-50 text-stone-500'}`}>
              <span className="text-sm border-b-2 border-transparent">📍</span>
            </div>
            <div className="flex flex-col">
              <p className={`text-xs font-bold leading-tight ${isSelected ? 'text-blue-600' : 'text-stone-500'}`}>
                {distance.toFixed(1)} km away
              </p>
              {minutes > 0 && (
                <p className="text-[10px] font-black text-emerald-500 tracking-wide mt-0.5 animate-pulse">
                  ⚡ ~{minutes} min away
                </p>
              )}
            </div>
          </div>
        ) : <div />}

        <button 
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/store/${service.seller_store?.id}?tab=services`);
          }}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${
            isSelected ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-stone-100 text-slate-900 hover:bg-stone-200'
          }`}
        >
          <Store className="w-3.5 h-3.5" /> 
          {service.seller_store?.seller_type === 'service' ? 'Service Shop' : 'Store'} <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
