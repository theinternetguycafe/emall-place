import React, { useEffect, useRef } from "react";

export default function MapboxMap({ services, userLocation, onMarkerClick, selectedServiceId, onMapClick }: any) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // 1. Initialize Map (Once)
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
        style: "mapbox://styles/mapbox/streets-v12", // More stable, no incident errors
        center: [28.0183, -25.5585], 
        zoom: 12,
        pitch: 45,
        bearing: -17.6,
        antialias: true
      });

      mapInstance.current = map;
      map.addControl(new mapboxgl.default.NavigationControl(), 'top-right');
      
      map.on('load', () => {
        // Source for heatmap
        map.addSource('services', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });

        map.addLayer({
          id: 'services-heat',
          type: 'heatmap',
          source: 'services',
          paint: {
            'heatmap-weight': 1,
            'heatmap-intensity': 1,
            'heatmap-color': [
              'interpolate', ['linear'], ['heatmap-density'],
              0, 'rgba(0,0,255,0)',
              0.5, 'orange',
              1, 'red'
            ],
            'heatmap-radius': 30,
            'heatmap-opacity': 0.6
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

  // 2. Manage Markers & Data (Sync with Props)
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Helper to add data to heatmap source
    const updateHeatmap = () => {
      const source: any = map.getSource('services');
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features: services?.map((s: any) => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [s.seller_store?.longitude, s.seller_store?.latitude]
            }
          })).filter((f: any) => f.geometry.coordinates[0] && f.geometry.coordinates[1]) || []
        });
      }
    };

    if (map.loaded()) {
      updateHeatmap();
    } else {
      map.on('load', updateHeatmap);
    }

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    import("mapbox-gl").then((mapboxgl: any) => {
      const bounds = new mapboxgl.default.LngLatBounds();
      let hasPoints = false;
      const addedStores = new Set();

      // Seller Markers
      services?.forEach((s: any) => {
        if (s.seller_store?.longitude && s.seller_store?.latitude) {
          if (addedStores.has(s.seller_store.id)) return;
          addedStores.add(s.seller_store.id);
          hasPoints = true;
          
          let lon = s.seller_store.longitude;
          let lat = s.seller_store.latitude;
          bounds.extend([lon, lat]);

          const isOnline = s.seller_store.is_online === true;
          const lastSeen = s.seller_store.last_seen_at;
          const isLive = isOnline && lastSeen && (Date.now() - new Date(lastSeen).getTime()) < 30000;
          
          const el = document.createElement('div');
          const isSelected = selectedServiceId === s.id;
          
          if (isLive) {
            el.className = `w-4 h-4 rounded-full bg-green-500 border-2 border-white cursor-pointer relative shadow-[0_0_15px_rgba(34,197,94,0.6)] ${isSelected ? 'scale-150 z-50' : ''}`;
            el.innerHTML = '<div class="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" style="animation-duration: 2s;"></div>';
          } else {
            el.className = `w-5 h-5 rounded-full border-[3px] border-white cursor-pointer transition-all duration-300
              ${isSelected ? 'bg-blue-600 scale-150 z-50 shadow-[0_4px_24px_rgba(37,99,235,0.6)]' : 'bg-slate-900 shadow-[0_4px_12px_rgba(0,0,0,0.2)] hover:scale-125'}`;
          }
          
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            if (onMarkerClick) onMarkerClick(s.id);
          });
          
          const marker = new mapboxgl.default.Marker(el).setLngLat([lon, lat]).addTo(map);
          markersRef.current.push(marker);
        }
      });

      // User Location Marker
      if (userLocation?.lng && userLocation?.lat) {
        hasPoints = true;
        bounds.extend([userLocation.lng, userLocation.lat]);
        
        const el = document.createElement('div');
        el.className = 'w-5 h-5 rounded-full bg-blue-500 border-[3px] border-white shadow-[0_4px_12px_rgba(59,130,246,0.4)] relative';
        el.innerHTML = '<div class="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-75"></div>';
        
        const userMarker = new mapboxgl.default.Marker(el).setLngLat([userLocation.lng, userLocation.lat]).addTo(map);
        markersRef.current.push(userMarker);
      }

      if (hasPoints && !selectedServiceId) {
        map.fitBounds(bounds, { padding: { top: 80, bottom: 380, left: 80, right: 80 }, maxZoom: 14 });
      }
    });
  }, [services, userLocation, selectedServiceId]);

  // 3. Sync Selection focus
  useEffect(() => {
    if (selectedServiceId && mapInstance.current && services?.length) {
      const s = services.find((x: any) => x.id === selectedServiceId);
      if (s?.seller_store?.longitude && s?.seller_store?.latitude) {
        mapInstance.current?.flyTo({
          center: [s.seller_store.longitude, s.seller_store.latitude],
          zoom: 15,
          essential: true,
          speed: 0.8,
          pitch: 60
        });
      }
    }
  }, [selectedServiceId]);

  const P1 = import.meta.env.VITE_MAPBOX_TOKEN_P1;
  const P2 = import.meta.env.VITE_MAPBOX_TOKEN_P2;
  const MAPBOX_TOKEN = [P1, P2].filter(Boolean).join('');
  const isPlaceholder = !MAPBOX_TOKEN || MAPBOX_TOKEN === 'your_real_key' || !P1 || !P2;

  if (isPlaceholder) {
    return (
      <div className="h-full w-full bg-stone-100 flex flex-col items-center justify-center text-stone-500 font-bold p-8 text-center rounded-2xl">
        <span className="text-4xl mb-4">🗺️</span>
        Map unavailable
        <span className="text-xs font-normal mt-2 text-stone-400">Set Mapbox tokens in your .env to enable the map view.</span>
      </div>
    );
  }

  return <div ref={mapContainerRef} id="mapbox-root-container" className="h-full w-full absolute inset-0" style={{ pointerEvents: 'auto' }} />;
}
