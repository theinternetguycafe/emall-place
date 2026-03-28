import React, { useEffect, useState } from "react";
import MapboxMap from "../components/map/MapboxMap";
import ServicesListPanel from "../components/services/ServicesListPanel";
import ServiceBroadcastForm from "../components/services/ServiceBroadcastForm";
import ServiceRequestStatus from "../components/services/ServiceRequestStatus";
import QuickRequestSheet from "../components/services/QuickRequestSheet";
import { supabase } from "../lib/supabase";
import { Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{lat: number, lng: number} | null>(null);
  const [userLocation, setUserLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const { profile } = useAuth();

  useEffect(() => {
    fetchServices();
    getLocation();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*, seller_store:seller_stores!inner(*)")
        .eq("status", "approved")
        .or("seller_type.eq.service,seller_type.eq.both", { foreignTable: "seller_stores" });
        
      if (error) throw error;
      setServices(data || []);
    } catch (err) {
      console.error("❌ [ServicesPage] fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const setFallbackLocation = () => {
    console.warn("⚠️ Geolocation unavailable or failed, using Hebron Mall fallback");
    setUserLocation({ lat: -25.5585, lng: 28.0183, accuracy: 100 });
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      setFallbackLocation();
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;

        if (accuracy <= 100) {
          setUserLocation({ lat: latitude, lng: longitude, accuracy });
        } else {
          // Still use it but maybe it's a bit fuzzy
          setUserLocation({ lat: latitude, lng: longitude, accuracy });
        }
      },
      (err) => {
        console.error("❌ Geolocation error:", err.message);
        setFallbackLocation();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
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

      {/* 🚀 ACTION & LIST AREA (Below Map) */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left/Main Column: Broadcast & Request Management */}
          <div className="lg:col-span-8 space-y-8">
            <section id="broadcast-area">
              {activeRequest ? (
                <ServiceRequestStatus 
                  request={activeRequest} 
                  userLocation={userLocation} 
                  onReset={() => setActiveRequest(null)} 
                />
              ) : (
                <div className="bg-white rounded-3xl p-1 shadow-sm border border-stone-100">
                  <ServiceBroadcastForm 
                    userLocation={userLocation} 
                    onBroadcasted={(req: any) => setActiveRequest(req)} 
                  />
                </div>
              )}
            </section>

            {/* Quick Request Overlay (transformed to inline if coords selected) */}
            {selectedCoords && !activeRequest && (
              <div className="animate-in fade-in slide-in-from-top-4">
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

          {/* Right/Side Column: Nearby Services Discovery */}
          <div className="lg:col-span-4">
            <div className="sticky top-8">
              <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <span className="bg-blue-600 text-white p-1 rounded">📍</span> Nearby Services
              </h2>
              <ServicesListPanel
                services={services}
                selectedServiceId={selectedServiceId}
                onSelectService={setSelectedServiceId}
                userLocation={userLocation}
              />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
