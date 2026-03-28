import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { ServiceRequest } from "../../types";

export default function ServiceRequestStatus({ request, onReset, userLocation }: any) {
  const [liveReq, setLiveReq] = useState<ServiceRequest>(request);
  const [timeLeft, setTimeLeft] = useState(120);
  const [broadcastText, setBroadcastText] = useState("Searching nearby providers...");

  useEffect(() => {
    if (liveReq.status !== 'broadcasting') return;
    const texts = ["Searching nearby providers...", "Notifying 5+ providers...", "Almost there, hold tight..."];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % texts.length;
      setBroadcastText(texts[i]);
    }, 4000);
    return () => clearInterval(interval);
  }, [liveReq.status]);

  useEffect(() => {
    // Client-side timer
    const expiresAt = new Date(liveReq.expires_at).getTime();
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeLeft(diff);
      
      if (diff === 0 && liveReq.status === 'broadcasting') {
        setLiveReq(prev => ({ ...prev, status: 'expired' }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [liveReq.expires_at, liveReq.status]);

  useEffect(() => {
    // Subscribe ONLY to this specific request ID
    const channel = supabase
      .channel(`service_request_${liveReq.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'service_requests',
          filter: `id=eq.${liveReq.id}` 
        },
        (payload) => {
          setLiveReq(payload.new as ServiceRequest);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [liveReq.id]);

  if (liveReq.status === 'expired') {
    return (
      <div className="bg-white p-6 rounded-[2rem] shadow-lg border border-rose-100 text-center relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-400 rounded-full blur-[80px] opacity-10 pointer-events-none" />
        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10">
          <span className="text-2xl">⏳</span>
        </div>
        <h3 className="font-black text-xl text-slate-900 mb-2 relative z-10">No professionals available</h3>
        <p className="text-stone-500 font-medium mb-6 relative z-10">All nearby providers are currently busy or didn't accept in time.</p>
        <button 
          onClick={onReset}
          className="bg-stone-100 text-slate-900 font-bold px-8 py-3 rounded-full hover:bg-stone-200 transition-colors relative z-10"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (liveReq.status === 'accepted') {
    return (
      <div className="bg-white p-6 rounded-[2rem] shadow-[0_8px_30px_rgba(16,185,129,0.2)] border-2 border-emerald-500 text-center relative overflow-hidden animate-in fade-in zoom-in duration-500">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-400 rounded-full blur-[80px] opacity-20 pointer-events-none" />
        
        {/* Step 4 - Confetti animation (CSS fallback) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="absolute animate-bounce" style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random()}s`,
              fontSize: '24px',
              opacity: 0.6
            }}>
              {['🎉','🎊','✨','💸'][Math.floor(Math.random()*4)]}
            </div>
          ))}
        </div>

        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10">
          <span className="text-3xl">🎉</span>
        </div>
        <h3 className="font-black text-xl text-slate-900 mb-1 relative z-10">Job Accepted!</h3>
        <p className="text-emerald-700 font-bold mb-6 relative z-10 tracking-tight">Accepted by a professional provider.</p>
        <button 
          onClick={() => window.location.href = `/store/${liveReq.assigned_seller_id}?tab=services`}
          className="bg-emerald-500 text-white font-black px-8 py-3 rounded-xl hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/30 relative z-10 w-full"
        >
          View Provider Profile
        </button>
      </div>
    );
  }

  // STATUS: Broadcasting
  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-[0_-8px_40px_rgba(37,99,235,0.15)] border-2 border-blue-500 text-center relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-400 rounded-full blur-[80px] opacity-20 pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div className="text-left">
            <div className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1 flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
              </span>
              Broadcasting LIVE
            </div>
            <h3 className="font-bold text-lg text-slate-900 max-w-[200px] truncate">{liveReq.title}</h3>
          </div>
          <div className="w-14 h-14 bg-slate-900 rounded-2xl flex flex-col items-center justify-center shadow-md">
            <span className="text-white font-black text-lg leading-none">{timeLeft}</span>
            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Sec</span>
          </div>
        </div>

        {/* Pulse effect rings */}
        <div className="relative w-full h-24 flex items-center justify-center mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-blue-100 animate-ping opacity-20" style={{ animationDuration: '2s' }} />
          <div className="absolute inset-4 rounded-full border-4 border-blue-200 animate-ping opacity-40 delay-300" style={{ animationDuration: '2s' }} />
          <div className="absolute inset-8 rounded-full border-4 border-blue-300 animate-ping opacity-60 delay-700" style={{ animationDuration: '2s' }} />
          <div className="absolute inset-10 rounded-full bg-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.8)] flex items-center justify-center z-10">
            <span className="text-2xl animate-pulse">📡</span>
          </div>
        </div>

        <p className="text-sm font-bold text-stone-600 animate-pulse">{broadcastText}</p>
        <p className="text-xs font-medium text-stone-400 mt-1">First to accept wins the job.</p>
        
        <button 
          onClick={onReset}
          className="mt-6 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-rose-500 transition-colors"
        >
          Cancel Request
        </button>
      </div>
    </div>
  );
}
