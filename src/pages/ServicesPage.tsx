import React, { useEffect, useState } from "react";
import MapboxMap from "../components/map/MapboxMap";
import ServicesListPanel from "../components/services/ServicesListPanel";
import ServiceBroadcastForm from "../components/services/ServiceBroadcastForm";
import ServiceRequestStatus from "../components/services/ServiceRequestStatus";
import QuickRequestSheet from "../components/services/QuickRequestSheet";
import { supabase } from "../lib/supabase";
import { Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useServiceStore } from "../store/useServiceStore";
import { HUB } from "../utils/hub";

export default function ServicesPage() {
  const { services: rawServices, fetchNearby, loading: storeLoading } = useServiceStore();
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{lat: number, lng: number} | null>(null);
  const [userLocation, setUserLocation] = useState<any>(null);
  const [activeRequest, setActiveRequest] = useState<any>(null);
  
  const loading = storeLoading && rawServices.length === 0;
  const { profile } = useAuth();

  // Adapt the Zustand NearbyService shape to the Product-like shape 
  // currently expected by ServicesListPanel/MapboxMap until further refactoring.
  const services = React.useMemo(() => {
    // We only show service/both types in the side list
    return rawServices
      .filter(s => s.seller_type !== 'product')
      .map(s => ({
        ...s,
        seller_store: { 
          ...s,
          logo_url: Array.isArray(s.stores) ? s.stores[0]?.logo_url : (s.stores as any)?.logo_url,
          banner_url: Array.isArray(s.stores) ? s.stores[0]?.banner_url : (s.stores as any)?.banner_url,
          // Fix rating field name mismatch: ServiceCard uses average_rating, store has rating_avg
          average_rating: s.rating_avg,
          // Pass store_slug for navigation
          store_slug: s.store_slug,
        },
        price: Number(s.min_base_rate || 0),
        // Use store name as title (this is a store-level card, not service-level)
        title: s.store_name,
        // Use store tagline as description fallback
        description: (Array.isArray(s.stores) ? s.stores[0]?.tagline : (s.stores as any)?.tagline) || 'Professional service provider in your area.',
      }));
  }, [rawServices]);

  useEffect(() => {
    // We get initial location on mount, which will trigger fetchNearby
    getLocation();
  }, []);

  const setFallbackLocation = () => {
    console.warn("⚠️ Geolocation unavailable or failed, using The Internet Guy Cafe (hub) as fallback");
    const loc = { lat: HUB.lat, lng: HUB.lng, accuracy: 100 };
    setUserLocation(loc);
    fetchNearby(loc.lat, loc.lng);
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      setFallbackLocation();
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const loc = { lat: latitude, lng: longitude, accuracy };
        setUserLocation(loc);
        fetchNearby(loc.lat, loc.lng);
      },
      (err) => {
        console.error("❌ Geolocation error:", err.message);
        setFallbackLocation();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  if (loading && services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] w-full bg-[#F9F8F6]">
        <Loader2 className="h-10 w-10 animate-spin text-slate-900 mb-4" />
        <p className="text-stone-500 font-bold tracking-tight">Loading nearby services...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] w-full bg-stone-50 overflow-y-auto">
      {/* 🗺️ MAP SECTION (Top) */}
      <section className="h-[450px] w-full relative border-b border-stone-200">
         <MapboxMap
           services={services}
           userLocation={userLocation}
           selectedServiceId={selectedServiceId}
           onMarkerClick={(id: string) => setSelectedServiceId(id)}
           onMapClick={(coords: any) => setSelectedCoords(coords)}
         />
         
         {/* Overlay context indicator */}
         <div className="absolute top-4 left-4 z-10">
           <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-sm border border-stone-100 flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Live Coverage Active</span>
           </div>
         </div>
      </section>

      {/* 🚀 SERVICES CAROUSEL (NEW FULL-WIDTH) */}
      <section className="bg-stone-50/50 py-12 border-b border-stone-200/60">
        <div className="max-w-7xl mx-auto px-4">
          <ServicesListPanel
            services={services}
            selectedServiceId={selectedServiceId}
            onSelectService={setSelectedServiceId}
            userLocation={userLocation}
          />
        </div>
      </section>

      {/* 📡 BROADCAST & REQUEST AREA */}
      <main className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column: Broadcast & Request Management */}
          <div className="lg:col-span-8 space-y-12">
            <section id="broadcast-area">
              <div className="mb-8">
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Need a Pro Fast?</h2>
                <p className="text-stone-500 font-medium">Broadcast your request to all nearby professionals instantly.</p>
              </div>
              {activeRequest ? (
                <ServiceRequestStatus 
                  request={activeRequest} 
                  userLocation={userLocation} 
                  onReset={() => setActiveRequest(null)} 
                />
              ) : (
                <div className="bg-white rounded-[3rem] p-2 shadow-xl shadow-stone-200/50 border border-stone-100">
                  <ServiceBroadcastForm 
                    userLocation={userLocation} 
                    onBroadcasted={(req: any) => setActiveRequest(req)} 
                  />
                </div>
              )}
            </section>

            {/* Quick Request Overlay */}
            {selectedCoords && !activeRequest && (
              <div className="animate-in fade-in slide-in-from-top-6 duration-500">
                <QuickRequestSheet 
                  coords={selectedCoords} 
                  onClose={() => setSelectedCoords(null)} 
                  onRequest={(req: any) => {
                    setSelectedCoords(null);
                    setActiveRequest(req);
                  }} 
                />
              </div>
            )}
          </div>

          {/* Right Column: Help & Stats */}
          <div className="lg:col-span-4">
            <div className="sticky top-8 space-y-8">
              <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-blue-600/30 transition-all duration-700" />
                <h3 className="text-xl font-black uppercase tracking-tight mb-4 relative z-10">How it works</h3>
                <ul className="space-y-4 relative z-10">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-[10px] font-black italic">01</span>
                    <p className="text-sm text-slate-300 font-medium pt-0.5">Browse the carousel above or click a map pin to find a specialist.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-[10px] font-black italic">02</span>
                    <p className="text-sm text-slate-300 font-medium pt-0.5">Can't find what you need? Use the <strong>Broadcast Form</strong> to reach everyone.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-[10px] font-black italic">03</span>
                    <p className="text-sm text-slate-300 font-medium pt-0.5">Real-time tracking and chat activate once a pro accepts your request.</p>
                  </li>
                </ul>
              </div>

              <div className="bg-emerald-50 rounded-[2.5rem] p-8 border border-emerald-100/50">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                       <span className="text-lg font-black">?</span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Need Help?</h3>
                 </div>
                 <p className="text-sm text-stone-500 font-medium leading-relaxed mb-6"> Our support team is available 24/7 for any service-related queries.</p>
                 <button className="w-full bg-white border border-emerald-200 text-emerald-600 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all duration-300">
                    Contact Support
                 </button>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
