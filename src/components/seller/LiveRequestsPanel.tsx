import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { getDistance } from "../../utils/distance";
import { ServiceRequest } from "../../types";
import { Loader2, Send, CheckCircle } from "lucide-react";

export default function LiveRequestsPanel({ sellerStore }: { sellerStore: any }) {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile || !sellerStore || profile.role !== 'seller') return;

    const loadActive = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('service_requests')
        .select('*')
        .eq('status', 'broadcasting')
        .gt('expires_at', new Date().toISOString());

      if (data) {
        const nearby = data.filter(req => {
          const dist = getDistance(
            { lat: sellerStore.latitude, lng: sellerStore.longitude },
            { latitude: req.latitude, longitude: req.longitude }
          );
          return dist !== null && dist <= 20;
        });
        setRequests(nearby);
      }
      setIsLoading(false);
    };
    loadActive();

    const channel = supabase
      .channel('service_requests_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_requests' },
        (payload: any) => {
          const newReq = payload.new as ServiceRequest;

          if (payload.eventType === 'INSERT' && newReq.status === 'broadcasting') {
            const dist = getDistance(
              { lat: sellerStore.latitude, lng: sellerStore.longitude },
              { latitude: newReq.latitude, longitude: newReq.longitude }
            );
            if (dist !== null && dist <= 20) {
              setRequests(prev => [newReq, ...prev]);
              try {
                const audio = new Audio('/ping.mp3');
                audio.play().catch(() => {});
              } catch (e) {}
            }
          } else if (payload.eventType === 'UPDATE') {
            if (newReq.status !== 'broadcasting') {
              setRequests(prev => prev.filter(r => r.id !== newReq.id));
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile, sellerStore]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6 flex flex-col items-center justify-center text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
        <p className="text-sm font-bold text-stone-500">Checking for nearby requests...</p>
      </div>
    );
  }

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
        LIVE DISPATCH — Submit Your Bid
      </h3>
      {requests.map(req => (
        <BroadcastCard
          key={req.id}
          request={req}
          sellerStore={sellerStore}
          onExpired={() => setRequests(prev => prev.filter(r => r.id !== req.id))}
        />
      ))}
    </div>
  );
}

// ─── Per-request card with inline bid form ───────────────────────────────────
type BidState = 'idle' | 'open' | 'submitting' | 'sent' | 'error';

function BroadcastCard({ request, sellerStore, onExpired }: {
  request: ServiceRequest;
  sellerStore: any;
  onExpired: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(120);
  const [bidState, setBidState] = useState<BidState>('idle');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const dist = getDistance(
    { lat: sellerStore.latitude, lng: sellerStore.longitude },
    { latitude: request.latitude, longitude: request.longitude }
  );

  useEffect(() => {
    const expiresAt = new Date(request.expires_at).getTime();

    const audioTimeout = setTimeout(() => {
      try { new Audio('/ping.mp3').play().catch(() => {}); } catch (e) {}
    }, 10000);

    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(diff);
      if (diff === 0) { clearInterval(interval); onExpired(); }
    }, 1000);

    return () => { clearInterval(interval); clearTimeout(audioTimeout); };
  }, [request.expires_at]);

  const handleSubmitBid = async () => {
    setBidState('submitting');
    setErrorMsg('');
    try {
      const { error } = await supabase
        .from('service_bids')
        .insert({
          request_id: request.id,
          seller_id: sellerStore.id,
          amount: amount ? parseFloat(amount) : null,
          message: message.trim() || null,
          status: 'pending',
        });

      if (error) {
        if (error.code === '23505') {
          // Already bid — treat as success
          setBidState('sent');
          return;
        }
        throw error;
      }
      setBidState('sent');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit bid. Try again.');
      setBidState('error');
    }
  };

  if (timeLeft === 0) return null;

  const isUrgent = timeLeft < 30;

  // ── Sent state ─────────────────────────────────────────────────────────────
  if (bidState === 'sent') {
    return (
      <div className="p-5 rounded-2xl border-2 border-emerald-400 bg-emerald-50 flex items-center gap-4 animate-in fade-in duration-300">
        <CheckCircle className="w-8 h-8 text-emerald-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-black text-emerald-900">Bid Submitted!</p>
          <p className="text-sm text-emerald-700 font-medium">{request.title} — waiting for buyer to choose.</p>
        </div>
        <div className={`font-black text-lg tabular-nums ${isUrgent ? 'text-rose-500' : 'text-emerald-600'}`}>
          {timeLeft}s
        </div>
      </div>
    );
  }

  // ── Main card ──────────────────────────────────────────────────────────────
  return (
    <div className={`p-5 rounded-2xl border-2 transition-all animate-in slide-in-from-top-4 duration-500 ${
      isUrgent
        ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse'
        : 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.4)]'
    } bg-white relative overflow-hidden`}>

      {/* Header row */}
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-lg text-slate-900 flex-1 mr-4">{request.title}</h4>
        <div className={`font-black text-xl tabular-nums flex-shrink-0 ${isUrgent ? 'text-rose-600' : 'text-blue-600'}`}>
          {timeLeft}s
        </div>
      </div>

      {request.description && (
        <p className="text-sm text-stone-600 mb-3">{request.description}</p>
      )}

      <div className="flex items-center gap-4 mb-4">
        {dist !== null && (
          <span className="text-xs font-bold text-stone-500 flex items-center gap-1">
            📍 {dist.toFixed(1)} km away
          </span>
        )}
        {request.budget && (
          <span className="text-sm font-black text-emerald-600">
            Budget: R{request.budget}
          </span>
        )}
      </div>

      {/* Bid form */}
      {(bidState === 'open' || bidState === 'error' || bidState === 'submitting') ? (
        <div className="space-y-3 border-t border-stone-100 pt-4 animate-in slide-in-from-bottom-2 duration-200">
          {bidState === 'error' && (
            <p className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{errorMsg}</p>
          )}
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Your price (R) — optional"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-40 flex-shrink-0 px-3 py-2 bg-stone-50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none border-none"
            />
            <input
              type="text"
              placeholder="Short message to buyer..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="flex-1 px-3 py-2 bg-stone-50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none border-none"
              maxLength={200}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSubmitBid}
              disabled={bidState === 'submitting'}
              className="flex-1 bg-slate-900 text-white font-black py-3 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {bidState === 'submitting'
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                : <><Send className="w-4 h-4" /> Send Bid</>
              }
            </button>
            <button
              onClick={() => setBidState('idle')}
              className="px-4 py-3 rounded-xl text-stone-500 hover:bg-stone-100 font-bold text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setBidState('open')}
          className="w-full bg-slate-900 text-white font-black px-6 py-3 rounded-xl hover:bg-slate-800 transition-colors transform hover:scale-[1.02] active:scale-95 shadow-lg"
        >
          Place Bid
        </button>
      )}
    </div>
  );
}
