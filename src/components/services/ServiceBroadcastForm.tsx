import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AuthModal from "../auth/AuthModal";
import { MapPin, AlertCircle } from "lucide-react";

export default function ServiceBroadcastForm({ userLocation, onBroadcasted }: any) {
  const { profile } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!profile) {
      setShowAuthModal(true);
      return;
    }
    if (!userLocation) {
      setError("We need your location to find nearby services. Please allow location access.");
      return;
    }

    setIsSubmitting(true);
    try {
      const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();

      const { data, error: insertError } = await supabase
        .from('service_requests')
        .insert({
          buyer_id: profile.id,
          title,
          description: description.trim() || null,
          budget: budget ? parseFloat(budget) : null,
          latitude: userLocation.lat,
          longitude: userLocation.lng,
          status: 'broadcasting',
          expires_at: expiresAt
        })
        .select()
        .single();

      if (insertError) throw insertError;

      onBroadcasted(data);
    } catch (err: any) {
      setError(err?.message || "Failed to broadcast request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] border border-stone-100 relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-400 rounded-full blur-[80px] opacity-20 pointer-events-none" />

      <h3 className="font-black text-xl text-slate-900 mb-2">Need something right now?</h3>
      <p className="text-sm text-stone-500 mb-4 font-medium">Broadcast your request to nearby professionals. Choose the best bid.</p>

      {/* Location indicator */}
      <div className={`flex items-center gap-2 text-xs font-bold mb-5 px-3 py-2 rounded-full w-fit ${
        userLocation
          ? 'bg-emerald-50 text-emerald-600'
          : 'bg-amber-50 text-amber-600'
      }`}>
        <MapPin className="w-3.5 h-3.5" />
        {userLocation ? 'Location detected' : 'Waiting for location...'}
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 mb-4 text-sm font-medium animate-in slide-in-from-top-2 duration-200">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
        <input
          type="text"
          placeholder="What do you need? (e.g. Plumber for leak)"
          required
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={120}
          className="w-full px-4 py-3 bg-stone-50 border-none rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 placeholder:text-stone-400 outline-none"
        />

        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Details (Optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={300}
            className="flex-1 px-4 py-3 bg-stone-50 border-none rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 placeholder:text-stone-400 outline-none"
          />
          <input
            type="number"
            placeholder="Budget R"
            value={budget}
            onChange={e => setBudget(e.target.value)}
            min={0}
            className="w-32 px-4 py-3 bg-stone-50 border-none rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 placeholder:text-stone-400 outline-none"
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
