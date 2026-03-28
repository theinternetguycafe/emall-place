import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AuthModal from "../auth/AuthModal";

export default function ServiceBroadcastForm({ userLocation, onBroadcasted }: any) {
  const { profile } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      setShowAuthModal(true);
      return;
    }
    if (!userLocation) {
      alert("We need your location to find nearby services.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      // 2 minute expiry
      const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('service_requests')
        .insert({
          buyer_id: profile.id,
          title,
          description,
          budget: budget ? parseFloat(budget) : null,
          latitude: userLocation.lat,
          longitude: userLocation.lng,
          status: 'broadcasting',
          expires_at: expiresAt
        })
        .select()
        .single();

      if (error) throw error;
      
      onBroadcasted(data);
    } catch (err) {
      console.error(err);
      alert("Failed to broadcast request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] border border-stone-100 relative overflow-hidden">
      {/* Dynamic background glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-400 rounded-full blur-[80px] opacity-20 pointer-events-none" />
      
      <h3 className="font-black text-xl text-slate-900 mb-2">Need something right now?</h3>
      <p className="text-sm text-stone-500 mb-6 font-medium">Broadcast your request to nearby professionals. The first to accept wins the job.</p>

      <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
        <div>
          <input 
            type="text" 
            placeholder="What do you need? (e.g. Plumber for leak)" 
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 placeholder:text-stone-400"
          />
        </div>
        
        <div className="flex gap-3">
          <input 
            type="text" 
            placeholder="Details (Optional)" 
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="flex-1 px-4 py-3 bg-stone-50 border-none rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 placeholder:text-stone-400"
          />
          <input 
            type="number" 
            placeholder="Budget R" 
            value={budget}
            onChange={e => setBudget(e.target.value)}
            className="w-32 px-4 py-3 bg-stone-50 border-none rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 placeholder:text-stone-400"
          />
        </div>

        <button 
          disabled={isSubmitting}
          className="w-full bg-slate-900 text-white font-black uppercase tracking-widest py-4 rounded-xl hover:bg-slate-800 transition-all flex justify-center items-center gap-2 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
             <><span>📡</span> Broadcast Locally</>
          )}
        </button>
      </form>
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />
    </div>
  );
}
