import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { ServiceRequest, ServiceBid } from "../../types";
import { Star, Loader2, CheckCircle, PhoneCall, ExternalLink, Send } from "lucide-react";

// ─── Star rating widget ───────────────────────────────────────────────────────
function StarRating({ rating, onChange }: { rating: number; onChange?: (r: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={!onChange}
          className={`transition-all duration-150 ${onChange ? 'cursor-pointer hover:scale-125 active:scale-90' : 'cursor-default'}`}
          onMouseEnter={() => onChange && setHover(star)}
          onMouseLeave={() => onChange && setHover(0)}
          onClick={() => onChange?.(star)}
        >
          <Star
            size={32}
            className={`transition-colors ${
              star <= (hover || rating) ? 'fill-amber-400 text-amber-400' : 'fill-stone-200 text-stone-200'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ServiceRequestStatus({ request, onReset, userLocation }: {
  request: ServiceRequest;
  onReset: () => void;
  userLocation?: any;
}) {
  const [liveReq, setLiveReq] = useState<ServiceRequest>(request);
  const [timeLeft, setTimeLeft] = useState(120);
  const [broadcastText, setBroadcastText] = useState("Searching nearby providers...");

  // Bids state
  const [bids, setBids] = useState<ServiceBid[]>([]);
  const [loadingBids, setLoadingBids] = useState(true);
  const [acceptingBidId, setAcceptingBidId] = useState<string | null>(null);

  // Accepted / in-progress state — pre-populate if request is already in_progress on mount
  const [acceptedBid, setAcceptedBid] = useState<{
    seller_id: string; store_slug: string | null; store_name: string | null;
    seller_phone: string | null; amount: number | null; message: string | null;
  } | null>(null);

  // On mount: if request is already in_progress, fetch the accepted bid info
  useEffect(() => {
    if (liveReq.status !== 'in_progress' || acceptedBid) return;
    const fetchAccepted = async () => {
      const { data } = await supabase
        .from('service_bids')
        .select(`
          amount, message, seller_id,
          seller_profile:seller_profiles ( seller_phone, store_name,
            stores:seller_stores ( store_name, store_slug )
          )
        `)
        .eq('request_id', liveReq.id)
        .eq('status', 'accepted')
        .single();
      if (data) {
        const sp = (data as any).seller_profile;
        const storeRow = Array.isArray(sp?.stores) ? sp.stores[0] : sp?.stores;
        setAcceptedBid({
          seller_id: data.seller_id,
          store_slug: storeRow?.store_slug || null,
          store_name: storeRow?.store_name || sp?.store_name || null,
          seller_phone: sp?.seller_phone || null,
          amount: data.amount,
          message: data.message,
        });
      }
    };
    fetchAccepted();
  }, [liveReq.id, liveReq.status]);

  // Review state
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);

  // ── Broadcast text rotation ─────────────────────────────────────────────────
  useEffect(() => {
    if (liveReq.status !== 'broadcasting') return;
    const texts = [
      "Searching nearby providers...",
      "Notifying 5+ providers...",
      "Waiting for bids to come in...",
      "Almost there, hold tight...",
    ];
    let i = 0;
    const iv = setInterval(() => {
      i = (i + 1) % texts.length;
      setBroadcastText(texts[i]);
    }, 4000);
    return () => clearInterval(iv);
  }, [liveReq.status]);

  // ── Countdown timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    const expiresAt = new Date(liveReq.expires_at).getTime();
    const iv = setInterval(() => {
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(diff);
      if (diff === 0 && liveReq.status === 'broadcasting') {
        setLiveReq(prev => ({ ...prev, status: 'expired' }));
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [liveReq.expires_at, liveReq.status]);

  // ── Realtime subscription on THIS request ──────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`service_request_${liveReq.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'service_requests',
        filter: `id=eq.${liveReq.id}`,
      }, (payload) => {
        setLiveReq(payload.new as ServiceRequest);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [liveReq.id]);

  // ── Load initial bids + realtime bid feed ──────────────────────────────────
  useEffect(() => {
    if (liveReq.status !== 'broadcasting' && liveReq.status !== 'in_progress') return;

    // Load existing bids with seller info
    const loadBids = async () => {
      setLoadingBids(true);
      const { data } = await supabase
        .from('service_bids')
        .select(`
          *,
          seller_profile:seller_profiles (
            id, store_name, seller_phone, rating_avg, rating_count,
            stores:seller_stores ( store_name, logo_url, store_slug )
          )
        `)
        .eq('request_id', liveReq.id)
        .order('created_at', { ascending: true });

      if (data) setBids(data as ServiceBid[]);
      setLoadingBids(false);
    };
    loadBids();

    // Realtime: new bids arrive
    const bidChannel = supabase
      .channel(`service_bids_${liveReq.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'service_bids',
        filter: `request_id=eq.${liveReq.id}`,
      }, async (payload) => {
        // Enrich with seller profile
        const { data } = await supabase
          .from('service_bids')
          .select(`
            *,
            seller_profile:seller_profiles (
              id, store_name, seller_phone, rating_avg, rating_count,
              stores:seller_stores ( store_name, logo_url, store_slug )
            )
          `)
          .eq('id', payload.new.id)
          .single();

        if (data) {
          setBids(prev => {
            const exists = prev.find(b => b.id === data.id);
            return exists ? prev : [data as ServiceBid, ...prev];
          });
          // Gentle audio cue for new bid
          try { new Audio('/ping.mp3').play().catch(() => {}); } catch (e) {}
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'service_bids',
        filter: `request_id=eq.${liveReq.id}`,
      }, (payload) => {
        setBids(prev => prev.map(b =>
          b.id === payload.new.id ? { ...b, ...(payload.new as ServiceBid) } : b
        ));
      })
      .subscribe();

    return () => { supabase.removeChannel(bidChannel); };
  }, [liveReq.id, liveReq.status]);

  // ── Accept bid ──────────────────────────────────────────────────────────────
  const handleAcceptBid = async (bidId: string) => {
    setAcceptingBidId(bidId);
    try {
      const { data, error } = await supabase.rpc('accept_service_bid', { p_bid_id: bidId });
      if (error) throw error;
      setAcceptedBid(data);
      // liveReq will update via realtime subscription to in_progress
    } catch (err: any) {
      alert(`Could not accept bid: ${err.message}`);
    } finally {
      setAcceptingBidId(null);
    }
  };

  // ── Complete job + submit review ────────────────────────────────────────────
  const handleCompleteJob = async () => {
    if (!rating) { alert('Please give a star rating first.'); return; }
    setSubmittingReview(true);
    try {
      const { error } = await supabase.rpc('complete_service_job', {
        p_request_id: liveReq.id,
        p_rating: rating,
        p_comment: comment.trim() || null,
      });
      if (error) throw error;
      setReviewDone(true);
      setTimeout(() => onReset(), 3000);
    } catch (err: any) {
      alert(`Failed to complete job: ${err.message}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER STATES
  // ════════════════════════════════════════════════════════════════════════════

  // ── Expired ─────────────────────────────────────────────────────────────────
  if (liveReq.status === 'expired') {
    return (
      <div className="bg-white p-6 rounded-[2rem] shadow-lg border border-rose-100 text-center relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-400 rounded-full blur-[80px] opacity-10 pointer-events-none" />
        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10">
          <span className="text-2xl">⏳</span>
        </div>
        <h3 className="font-black text-xl text-slate-900 mb-2 relative z-10">
          {bids.length === 0 ? 'No professionals available' : 'Request expired'}
        </h3>
        <p className="text-stone-500 font-medium mb-6 relative z-10">
          {bids.length === 0
            ? 'All nearby providers are currently busy or didn\'t respond in time.'
            : 'The window closed before you selected a bid.'}
        </p>
        <button
          onClick={onReset}
          className="bg-stone-100 text-slate-900 font-bold px-8 py-3 rounded-full hover:bg-stone-200 transition-colors relative z-10"
        >
          Try Again
        </button>
      </div>
    );
  }

  // ── Review done ─────────────────────────────────────────────────────────────
  if (reviewDone) {
    return (
      <div className="bg-white p-8 rounded-[2rem] shadow-lg border-2 border-emerald-400 text-center animate-in zoom-in duration-400">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-emerald-500" />
        </div>
        <h3 className="font-black text-2xl text-slate-900 mb-2">All done!</h3>
        <p className="text-stone-500 font-medium">Your review has been submitted. Thank you!</p>
      </div>
    );
  }

  // ── In-progress / complete review ───────────────────────────────────────────
  if (liveReq.status === 'in_progress' || liveReq.status === 'completed') {
    const info = acceptedBid;
    const sellerName = info?.store_name || 'Your Provider';
    const storeSlug = info?.store_slug;

    return (
      <div className="bg-white rounded-[2rem] shadow-xl border-2 border-emerald-400 overflow-hidden animate-in fade-in zoom-in duration-400">
        {/* Status banner */}
        <div className="bg-emerald-500 px-6 py-4 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-white flex-shrink-0" />
          <div>
            <p className="text-white font-black text-sm uppercase tracking-widest">Job In Progress</p>
            <p className="text-emerald-100 text-xs font-medium">{liveReq.title}</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Seller info */}
          <div className="flex items-center gap-4 bg-stone-50 rounded-2xl p-4">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-lg flex-shrink-0">
              {(sellerName?.[0] || '?')}
            </div>
            <div className="flex-1">
              <p className="font-black text-slate-900">{sellerName}</p>
              {info?.seller_phone && (
                <a
                  href={`tel:${info.seller_phone}`}
                  className="flex items-center gap-1 text-sm text-emerald-600 font-bold mt-0.5 hover:text-emerald-700"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  {info.seller_phone}
                </a>
              )}
            </div>
            {storeSlug && (
              <a
                href={`#/store/${storeSlug}`}
                className="flex items-center gap-1 text-xs font-black uppercase tracking-widest text-stone-500 hover:text-slate-900 transition-colors"
              >
                Profile <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {info?.amount && (
            <div className="flex items-center justify-between bg-emerald-50 rounded-2xl px-5 py-3">
              <span className="text-sm font-bold text-stone-600">Agreed Price</span>
              <span className="font-black text-emerald-700 text-lg">R{info.amount}</span>
            </div>
          )}

          {info?.message && (
            <div className="bg-stone-50 rounded-2xl px-5 py-4">
              <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-1">Provider Note</p>
              <p className="text-sm text-stone-700 font-medium">{info.message}</p>
            </div>
          )}

          {/* Review / Complete section */}
          {!showReview ? (
            <button
              onClick={() => setShowReview(true)}
              className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-lg active:scale-95"
            >
              ✅ Mark Job Complete & Leave Review
            </button>
          ) : (
            <div className="space-y-4 border-t border-stone-100 pt-5 animate-in slide-in-from-bottom-3 duration-300">
              <p className="font-black text-slate-900 text-sm uppercase tracking-widest">Leave a Review</p>
              <div>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Your Rating *</p>
                <StarRating rating={rating} onChange={setRating} />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Comment (Optional)</p>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="How did the job go? Share your experience..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-stone-50 focus:bg-white focus:border-slate-900 outline-none transition-all text-sm resize-none"
                />
                <p className="text-[10px] text-stone-300 text-right">{comment.length}/500</p>
              </div>
              <button
                onClick={handleCompleteJob}
                disabled={submittingReview || !rating}
                className="w-full bg-emerald-500 text-white font-black py-4 rounded-2xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submittingReview
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                  : <><Send className="w-4 h-4" /> Submit &amp; Complete Job</>
                }
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Broadcasting — live bid feed ────────────────────────────────────────────
  return (
    <div className="bg-white rounded-[2rem] shadow-[0_-8px_40px_rgba(37,99,235,0.15)] border-2 border-blue-500 overflow-hidden">
      {/* Top strip */}
      <div className="bg-blue-500 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
          </span>
          <span className="text-white font-black text-xs uppercase tracking-widest">Broadcasting LIVE</span>
        </div>
        <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1">
          <span className="text-white font-black text-sm tabular-nums">{timeLeft}</span>
          <span className="text-white/70 text-[10px] font-bold">SEC</span>
        </div>
      </div>

      <div className="p-6">
        <h3 className="font-bold text-lg text-slate-900 mb-1 truncate">{liveReq.title}</h3>
        <p className="text-sm text-stone-500 font-medium animate-pulse mb-6">{broadcastText}</p>

        {/* Bids section */}
        {loadingBids ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : bids.length === 0 ? (
          <div className="text-center py-8">
            {/* Pulse radar */}
            <div className="relative w-24 h-24 flex items-center justify-center mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-blue-100 animate-ping opacity-20" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-3 rounded-full border-4 border-blue-200 animate-ping opacity-40" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
              <div className="absolute inset-6 rounded-full bg-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.8)] flex items-center justify-center">
                <span className="text-xl">📡</span>
              </div>
            </div>
            <p className="text-stone-500 font-medium text-sm">No bids yet. Providers are seeing your request now.</p>
            <p className="text-xs text-stone-400 mt-1">They'll appear here as they come in — no need to refresh.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">
              {bids.length} Bid{bids.length !== 1 ? 's' : ''} Received — Choose Your Provider
            </p>
            {bids.map(bid => {
              const sp = bid.seller_profile;
              const storeName = sp?.stores?.[0]?.store_name || sp?.store_name || 'Provider';
              const logoUrl = sp?.stores?.[0]?.logo_url;
              const isAccepting = acceptingBidId === bid.id;

              return (
                <div
                  key={bid.id}
                  className="bg-stone-50 rounded-2xl p-4 border border-stone-100 hover:border-blue-300 transition-all animate-in slide-in-from-right-3 duration-300"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-sm flex-shrink-0 overflow-hidden">
                      {logoUrl
                        ? <img src={logoUrl} alt={storeName} className="w-full h-full object-cover" />
                        : storeName[0]
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="font-black text-slate-900 text-sm truncate">{storeName}</p>
                        {bid.amount && (
                          <span className="font-black text-emerald-600 text-base flex-shrink-0">R{bid.amount}</span>
                        )}
                      </div>
                      {sp?.rating_avg && sp.rating_avg > 0 && (
                        <div className="flex items-center gap-1 mb-1">
                          <Star size={10} className="fill-amber-400 text-amber-400" />
                          <span className="text-[10px] font-bold text-stone-500">
                            {sp.rating_avg.toFixed(1)} ({sp.rating_count} reviews)
                          </span>
                        </div>
                      )}
                      {bid.message && (
                        <p className="text-xs text-stone-600 mt-1 leading-relaxed">{bid.message}</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleAcceptBid(bid.id)}
                    disabled={isAccepting || !!acceptingBidId}
                    className="mt-3 w-full bg-slate-900 text-white font-black py-3 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                  >
                    {isAccepting
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Accepting...</>
                      : '✅ Accept This Bid'
                    }
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={onReset}
          className="mt-6 w-full text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-rose-500 transition-colors"
        >
          Cancel Request
        </button>
      </div>
    </div>
  );
}
