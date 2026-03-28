import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Loader2 } from "lucide-react";
import AuthModal from "../auth/AuthModal";

export default function QuickRequestSheet({ coords, onClose, onRequest }: any) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Fallback to coordinates if reverse geocoding is skipped or fails
  const locationLabel = `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;

  const handleRequest = async () => {
    if (!profile) {
      setShowAuthModal(true);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("service_requests")
        .insert({
          buyer_id: profile.id,
          title: "Quick map request",
          description: "User needs immediate assistance at this location.",
          latitude: coords.lat,
          longitude: coords.lng,
          status: "broadcasting",
          expires_at: new Date(Date.now() + 120000).toISOString() // 2 minutes
        })
        .select()
        .single();
        
      if (error) throw error;
      onRequest(data);
    } catch (err: any) {
      console.error(err);
      alert("Failed to broadcast request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-6 shadow-[0_-16px_60px_rgba(0,0,0,0.1)] w-full max-w-md mx-auto relative overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-colors"
      >
        ✕
      </button>
      
      <div className="flex flex-col items-center text-center mt-2">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 relative">
           <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20 duration-1000"></div>
           <span className="text-3xl relative z-10">📍</span>
        </div>
        
        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Need help here?</h2>
        <p className="text-stone-500 font-medium mb-6">
          Request a professional to your selected location:<br/>
          <span className="font-bold text-slate-900">{locationLabel}</span>
        </p>

        <button 
          onClick={handleRequest}
          disabled={loading}
          className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-colors shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center justify-center disabled:opacity-70"
        >
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Request Service"}
        </button>
      </div>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />
    </div>
  );
}
