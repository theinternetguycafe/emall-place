import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { getDistance } from "../../utils/distance";
import { ServiceRequest } from "../../types";

export default function LiveRequestsPanel({ sellerStore }: { sellerStore: any }) {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);

  useEffect(() => {
    if (!profile || !sellerStore || profile.role !== 'seller') return;

    // Load active broadcasting requests immediately
    const loadActive = async () => {
      const { data } = await supabase
        .from('service_requests')
        .select('*')
        .eq('status', 'broadcasting')
        .gt('expires_at', new Date().toISOString());

      if (data) {
        // Filter by radius (say 20km)
        const nearby = data.filter(req => {
          const dist = getDistance(
            { lat: sellerStore.latitude, lng: sellerStore.longitude },
            { latitude: req.latitude, longitude: req.longitude }
          );
          return dist !== null && dist <= 20;
        });
        setRequests(nearby);
      }
    };
    loadActive();

    // Subscribe to NEW or UPDATED requests
    const channel = supabase
      .channel('service_requests_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_requests' },
        (payload: any) => {
          const newReq = payload.new as ServiceRequest;
          
          if (payload.eventType === 'INSERT' && newReq.status === 'broadcasting') {
            // Distance check
            const dist = getDistance(
              { lat: sellerStore.latitude, lng: sellerStore.longitude },
              { latitude: newReq.latitude, longitude: newReq.longitude }
            );
            
            if (dist !== null && dist <= 20) {
              setRequests(prev => [newReq, ...prev]);
              
              // Play Audio alert
              try {
                const audio = new Audio('/ping.mp3');
                audio.play().catch(() => {});
              } catch (e) {}
            }
          } 
          else if (payload.eventType === 'UPDATE') {
            // If it was accepted/expired by someone else, remove it
            if (newReq.status !== 'broadcasting') {
              setRequests(prev => prev.filter(r => r.id !== newReq.id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, sellerStore]);

  const handleAccept = async (reqId: string) => {
    try {
      // Attempt race-condition lock atomic update
      const { data, error } = await supabase
        .from('service_requests')
        .update({
          status: 'accepted',
          assigned_seller_id: sellerStore.id
        })
        .eq('id', reqId)
        .eq('status', 'broadcasting')
        .select()
        .single();

      if (error || !data) {
        alert("❌ Job already taken or expired!");
        setRequests(prev => prev.filter(r => r.id !== reqId));
        return;
      }

      // Success!
      alert("✅ Job secured! Contacting buyer...");
      setRequests(prev => prev.filter(r => r.id !== reqId));
      
    } catch (err) {
      console.error(err);
    }
  };

  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
          </span>
        </div>
        <h3 className="font-bold text-slate-900">Listening for nearby requests</h3>
        <p className="text-sm text-stone-500 mt-1">Make sure you are marked as "Available Now" to receive higher priority.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
        </span>
        LIVE DISPATCH (Act Fast)
      </h3>
      {requests.map(req => (
        <BroadcastCard 
          key={req.id} 
          request={req} 
          sellerStore={sellerStore} 
          onAccept={() => handleAccept(req.id)} 
        />
      ))}
    </div>
  );
}

function BroadcastCard({ request, sellerStore, onAccept }: any) {
  const [timeLeft, setTimeLeft] = useState(120);
  const dist = getDistance(
    { lat: sellerStore.latitude, lng: sellerStore.longitude },
    { latitude: request.latitude, longitude: request.longitude }
  );

  useEffect(() => {
    const expiresAt = new Date(request.expires_at).getTime();
    
    // Step 5 - Replay sound if not accepted after 10s
    const audioTimeout = setTimeout(() => {
      try {
        const audio = new Audio('/ping.mp3');
        audio.play().catch(() => {});
      } catch (e) {}
    }, 10000);

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeLeft(diff);
      
      if (diff === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(audioTimeout);
    };
  }, [request.expires_at]);

  if (timeLeft === 0) return null; // hides locally if expired

  // Dynamic urgency styling
  const isUrgent = timeLeft < 30;

  return (
    <div className={`p-5 rounded-2xl border-2 transition-all animate-in slide-in-from-top-4 duration-500 ${
      isUrgent ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse' : 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] view-pulse'
    } bg-white relative overflow-hidden`}>
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-lg text-slate-900">{request.title}</h4>
        <div className={`font-black text-xl tabular-nums ${isUrgent ? 'text-rose-600' : 'text-blue-600'}`}>
          {timeLeft}s
        </div>
      </div>
      
      {request.description && (
        <p className="text-sm text-stone-600 mb-4">{request.description}</p>
      )}

      <div className="flex items-center justify-between mt-4">
        <div className="space-y-1">
          {dist !== null && (
            <div className="text-xs font-bold text-stone-500 flex items-center gap-1">
              <span>📍</span> {dist.toFixed(1)} km away
            </div>
          )}
          {request.budget && (
            <div className="text-sm font-black text-emerald-600">
              Budget: R{request.budget}
            </div>
          )}
        </div>
        
        <button 
          onClick={onAccept}
          className="bg-slate-900 text-white font-black px-6 py-3 rounded-xl hover:bg-slate-800 transition-colors transform hover:scale-105 active:scale-95 shadow-lg"
        >
          ACCEPT JOB
        </button>
      </div>
    </div>
  );
}
