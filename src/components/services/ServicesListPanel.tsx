import React, { useRef, useState, useMemo, useEffect } from "react";
import ServiceCard from "./ServiceCard";
import { getDistance } from "../../utils/distance";

export default function ServicesListPanel({
  services,
  selectedServiceId,
  onSelectService,
  userLocation,
}: any) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [selectedRadius, setSelectedRadius] = useState<number | 'All'>('All');
  const [availableOnly, setAvailableOnly] = useState(false);

  // 🧠 Filter and sort services
  const processedServices = useMemo(() => {
    let result = [...(services || [])];

    // 1. Available Now filter
    if (availableOnly) {
      result = result.filter(s => s.seller_store?.is_online === true);
    }

    // 2. Radius Filter
    if (selectedRadius !== 'All' && userLocation) {
      result = result.filter(s => {
        const storeLoc = s.seller_store;
        if (!storeLoc?.latitude || !storeLoc?.longitude) return false;
        
        const dist = getDistance(userLocation, storeLoc);
        return dist !== null && dist <= selectedRadius;
      });
    }

    // 3. Smart Hybrid Sorting
    // Score heavily favors proximity, rewards high ratings, subtly breaks ties with price
    if (userLocation) {
      result.sort((a, b) => {
        const distA = getDistance(userLocation, a.seller_store) ?? Infinity;
        const distB = getDistance(userLocation, b.seller_store) ?? Infinity;
        
        const ratingA = a.seller_store?.average_rating || 0;
        const ratingB = b.seller_store?.average_rating || 0;
        
        const priceA = a.price || a.base_price || 0;
        const priceB = b.price || b.base_price || 0;

        // Lower score is better
        const scoreA = (distA * 0.5) - (ratingA * 0.6) + (priceA * 0.001);
        const scoreB = (distB * 0.5) - (ratingB * 0.6) + (priceB * 0.001);
        
        return scoreA - scoreB;
      });
    }

    return result;
  }, [services, selectedRadius, availableOnly, userLocation]);

  // Heat Zones feature check
  const isHighDemand = processedServices.length >= 3 && selectedRadius !== 'All';
  const onlineCount = processedServices.filter(s => s.seller_store?.is_online).length;

  useEffect(() => {
    if (!selectedServiceId) return;

    const timeout = setTimeout(() => {
      const el = document.getElementById(`service-${selectedServiceId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
    
    return () => clearTimeout(timeout);
  }, [selectedServiceId]);

  return (
    <div
      ref={panelRef}
      className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-[0_-16px_60px_rgba(0,0,0,0.1)] max-h-[65vh] sm:max-h-[80vh] overflow-y-auto w-full border border-stone-100/50 backdrop-blur-3xl scroll-smooth"
    >
      <div className="flex justify-center py-4 sm:hidden sticky top-0 bg-white z-10 rounded-t-[2.5rem]">
        <div className="w-12 h-1.5 bg-stone-200 rounded-full" />
      </div>

      <div className="sticky top-0 sm:top-0 bg-white/95 backdrop-blur z-20 px-6 py-5 border-b border-stone-50 sm:rounded-t-[2.5rem]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Nearby Services</h2>
        </div>
        
        {/* Step 6 - Smart Status Bar */}
        <div className="bg-slate-900 text-white text-xs py-2.5 px-4 rounded-xl flex items-center justify-between shadow-lg mb-4 animate-in fade-in duration-500">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-bold tracking-wide">{onlineCount} Providers Online</span>
          </div>
          {isHighDemand ? (
            <span className="text-rose-400 font-bold flex items-center gap-1.5 tracking-wide">
              <span>🔥</span> High demand
            </span>
          ) : (
            <span className="text-blue-300 font-bold flex items-center gap-1.5 tracking-wide">
              <span>⚡</span> Fast response expected
            </span>
          )}
        </div>
        
        <div className="space-y-5">
          {/* Radius selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {[5, 10, 20, 'All'].map(rad => (
              <button
                key={rad}
                onClick={() => setSelectedRadius(rad as number | 'All')}
                className={`whitespace-nowrap px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                  selectedRadius === rad 
                    ? 'bg-slate-900 text-white shadow-md' 
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                }`}
              >
                {rad === 'All' ? 'Everywhere' : `Within ${rad}km`}
              </button>
            ))}
          </div>

          {/* Availability Toggle */}
          <label className="flex items-center gap-3 cursor-pointer group w-max">
            <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${availableOnly ? 'bg-emerald-500' : 'bg-stone-200'}`}>
              <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-300 ${availableOnly ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <span className={`text-sm font-bold transition-colors ${availableOnly ? 'text-slate-900' : 'text-stone-500 group-hover:text-slate-900'}`}>
              🟢 Available now
            </span>
          </label>
        </div>
      </div>

      <div className="space-y-4 px-6 py-6 bg-stone-50/30">
        {processedServices.length === 0 && (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-stone-100 shadow-sm">
              <span className="text-2xl">🔥</span>
            </div>
            <p className="text-slate-900 font-bold text-lg leading-tight">No services match your filters.</p>
            <p className="text-stone-500 font-medium text-sm mt-2">Try expanding the radius or turning off 'Available now'.</p>
          </div>
        )}

        {processedServices.map((service: any) => (
          <ServiceCard
            key={service.id}
            service={service}
            isSelected={selectedServiceId === service.id}
            onSelect={() => onSelectService(service.id)}
            userLocation={userLocation}
          />
        ))}
      </div>
    </div>
  );
}
