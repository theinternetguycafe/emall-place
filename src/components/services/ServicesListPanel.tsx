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
      className="w-full bg-transparent scroll-smooth mb-12"
    >
      <div className="bg-white/95 backdrop-blur px-6 py-8 rounded-[3rem] border border-stone-100 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase mb-2">Nearby Services</h2>
            <div className="bg-slate-900 text-white text-[10px] py-1.5 px-3 rounded-full flex items-center gap-2 w-max shadow-lg mb-4">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="font-bold tracking-widest uppercase">{onlineCount} Providers Online</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-4">
            {/* Radius selector */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {[5, 10, 20, 'All'].map(rad => (
                <button
                  key={rad}
                  onClick={() => setSelectedRadius(rad as number | 'All')}
                  className={`whitespace-nowrap px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                    selectedRadius === rad 
                      ? 'bg-blue-600 text-white shadow-xl scale-105' 
                      : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                  }`}
                >
                  {rad === 'All' ? 'Everywhere' : `Within ${rad}km`}
                </button>
              ))}
            </div>

            {/* Availability Toggle */}
            <label className="flex items-center gap-3 cursor-pointer group w-max">
              <div className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors duration-300 ${availableOnly ? 'bg-emerald-500' : 'bg-stone-200'}`}>
                <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-300 ${availableOnly ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${availableOnly ? 'text-slate-900' : 'text-stone-400 group-hover:text-slate-900'}`}>
                🟢 Available now
              </span>
            </label>
          </div>
        </div>
      </div>

      {processedServices.length === 0 ? (
        <div className="bg-white rounded-[3rem] p-16 text-center border border-stone-100 shadow-sm max-w-2xl mx-auto">
          <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">🏜️</span>
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">No services found</h3>
          <p className="text-stone-500 mt-2 font-medium">Try expanding your search radius or filters.</p>
        </div>
      ) : (
        <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide px-4 -mx-4">
          {processedServices.map((service: any) => (
            <div 
              key={service.id} 
              className="flex-shrink-0 w-[300px] sm:w-[350px] snap-center"
            >
              <ServiceCard
                service={service}
                isSelected={selectedServiceId === service.id}
                onSelect={() => onSelectService(service.id)}
                userLocation={userLocation}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
