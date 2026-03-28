import React, { useEffect, useRef, useState } from "react";
import { X, ShoppingBag, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function ShopMap({ products, userLocation }: any) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<any>(null);

  // Group products by store
  const stores = React.useMemo(() => {
    const storeMap = new Map();
    products?.forEach((p: any) => {
      if (!p.seller_store) return;
      if (!storeMap.has(p.seller_store.id)) {
        storeMap.set(p.seller_store.id, {
          ...p.seller_store,
          products: []
        });
      }
      storeMap.get(p.seller_store.id).products.push(p);
    });
    return Array.from(storeMap.values());
  }, [products]);

  useEffect(() => {
    const P1 = import.meta.env.VITE_MAPBOX_TOKEN_P1;
    const P2 = import.meta.env.VITE_MAPBOX_TOKEN_P2;
    const MAPBOX_TOKEN = [P1, P2].filter(Boolean).join('');
    const isPlaceholder = !MAPBOX_TOKEN || MAPBOX_TOKEN === 'your_real_key' || !P1 || !P2;
    
    if (isPlaceholder || !mapContainerRef.current || mapInstance.current) return;

    import("mapbox-gl").then((mapboxgl: any) => {
      mapboxgl.default.accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.default.Map({
        container: mapContainerRef.current!,
        style: "mapbox://styles/mapbox/light-v11",
        center: [28.0183, -25.5585], 
        zoom: 12,
        pitch: 0,
        antialias: true
      });

      map.on('load', () => {
        map.addSource('stores', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });

        map.addLayer({
          id: 'stores-heat',
          type: 'heatmap',
          source: 'stores',
          paint: {
            'heatmap-weight': 1,
            'heatmap-intensity': 1,
            'heatmap-color': [
              'interpolate', ['linear'], ['heatmap-density'],
              0, 'rgba(0,0,255,0)',
              0.5, 'purple',
              1, 'red'
            ],
            'heatmap-radius': 40,
            'heatmap-opacity': 0.4
          }
        });
      });
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Heatmap update logic
    const updateHeatmap = () => {
      const source: any = map.getSource('stores');
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features: stores.map((s: any) => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [s.longitude, s.latitude]
            }
          })).filter((f: any) => f.geometry.coordinates[0] && f.geometry.coordinates[1])
        });
      }
    };

    if (map.loaded()) updateHeatmap();
    else map.on('load', updateHeatmap);

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    import("mapbox-gl").then((mapboxgl: any) => {
      const bounds = new mapboxgl.default.LngLatBounds();
      let hasPoints = false;

      stores.forEach((store: any) => {
        if (store.longitude && store.latitude) {
          hasPoints = true;
          bounds.extend([store.longitude, store.latitude]);

          const isOnline = store.is_online === true;
          const lastSeen = store.last_seen_at;
          const isLive = isOnline && lastSeen && (Date.now() - new Date(lastSeen).getTime()) < 30000;

          const el = document.createElement('div');
          const isSelected = selectedStore?.id === store.id;
          
          el.className = `w-12 h-12 rounded-full bg-white border-2 flex items-center justify-center cursor-pointer transition-all duration-300 shadow-xl relative
            ${isSelected ? 'border-slate-900 scale-125 z-50' : 'border-stone-100 hover:scale-110'}`;
          
          el.innerHTML = `
            <div class="w-10 h-10 rounded-full overflow-hidden bg-stone-50 flex items-center justify-center relative">
              ${store.logo_url 
                ? `<img src="${store.logo_url}" class="w-full h-full object-cover" />`
                : `<span class="text-[10px] font-black text-slate-400">${store.store_name.substring(0,2).toUpperCase()}</span>`
              }
              <div class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isLive ? 'bg-green-500 animate-pulse' : 'bg-stone-300'}"></div>
            </div>
            ${isLive ? '<div class="absolute -inset-1 rounded-full border-2 border-green-500/20 animate-ping" style="animation-duration: 3s;"></div>' : ''}
          `;
          
          el.onclick = () => {
            setSelectedStore(store);
            map.flyTo({ center: [store.longitude, store.latitude], zoom: 14 });
          };
          
          const marker = new mapboxgl.default.Marker(el).setLngLat([store.longitude, store.latitude]).addTo(map);
          markersRef.current.push(marker);
        }
      });

      if (userLocation?.lng && userLocation?.lat) {
        hasPoints = true;
        bounds.extend([userLocation.lng, userLocation.lat]);
        const el = document.createElement('div');
        el.className = 'w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg relative';
        el.innerHTML = '<div class="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-40"></div>';
        new mapboxgl.default.Marker(el).setLngLat([userLocation.lng, userLocation.lat]).addTo(map);
      }

      if (hasPoints && !selectedStore) {
        map.fitBounds(bounds, { padding: 80, maxZoom: 14 });
      }
    });
  }, [stores, userLocation, selectedStore]);

  return (
    <div className="h-full w-full relative">
      <div ref={mapContainerRef} className="h-full w-full" />
      
      {selectedStore && (
        <div className="absolute bottom-6 left-6 right-6 z-20 animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-white rounded-3xl shadow-2xl shadow-slate-900/20 border border-stone-100 p-6 max-w-2xl mx-auto overflow-hidden">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-stone-50 overflow-hidden border border-stone-100 flex items-center justify-center">
                  {selectedStore.logo_url ? (
                    <img src={selectedStore.logo_url} className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingBag className="text-stone-300" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none mb-1">{selectedStore.store_name}</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
                    {selectedStore.products.length} Curated Essentials Nearby
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStore(null)}
                className="p-2 hover:bg-stone-50 rounded-full text-stone-400 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {selectedStore.products.map((p: any) => (
                <Link 
                  key={p.id} 
                  to={`/product/${p.id}`}
                  className="flex-shrink-0 w-48 group"
                >
                  <div className="aspect-square rounded-2xl bg-stone-50 overflow-hidden border border-stone-100 mb-3 relative">
                    {p.product_images?.[0] ? (
                      <img src={p.product_images[0].url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-300">No Image</div>
                    )}
                    <div className="absolute bottom-3 right-3 px-3 py-1.5 bg-white/90 backdrop-blur rounded-full text-[10px] font-black text-slate-900 border border-stone-100 shadow-sm">
                      R {p.price.toLocaleString('en-ZA')}
                    </div>
                  </div>
                  <h4 className="font-bold text-slate-900 tracking-tight text-sm truncate">{p.title}</h4>
                </Link>
              ))}
              <Link 
                to={`/shop?store=${selectedStore.id}`}
                className="flex-shrink-0 w-48 rounded-2xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-2 hover:border-slate-900 transition-all text-stone-400 hover:text-slate-900"
              >
                <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center">
                  <ArrowRight className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">View All</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
