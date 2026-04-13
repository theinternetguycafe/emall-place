import React, { useState } from 'react';
import { MessageCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';

// ============================================================
// BOT NUMBER — All WhatsApp traffic routes here
// Set VITE_BOT_PHONE in .env.local (no +, no spaces)
// Example: VITE_BOT_PHONE=27721234567
// ============================================================
const BOT_PHONE = (import.meta.env.VITE_BOT_PHONE as string | undefined)
  ?.replace(/\D/g, '') ?? '';

interface WhatsAppButtonProps {
  sellerId: string;
  sellerPhone?: string | null;
  productId?: string;
  productName?: string;
  price?: number;
  intent?: 'buy' | 'enquire' | 'service';
  source?: string;
  className?: string;
  variant?: 'solid' | 'outline' | 'ghost';
  label?: string;
}

export function WhatsAppButton({
  sellerId,
  sellerPhone,
  productId,
  productName,
  price,
  intent = 'buy',
  source = 'product_page',
  className = '',
  variant = 'solid',
  label = 'Buy on WhatsApp'
}: WhatsAppButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!BOT_PHONE) {
      console.warn('[WhatsAppButton] VITE_BOT_PHONE not set in .env.local');
      alert('WhatsApp bot is not configured yet. Please contact support.');
      return;
    }

    setLoading(true);

    // Track the lead (seller + product data still recorded)
    let sessionId = localStorage.getItem('guest_session_id');
    if (!sessionId) {
      sessionId = `guest_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('guest_session_id', sessionId);
    }

    try {
      await supabase.from('whatsapp_leads').insert({
        seller_id: sellerId,
        product_id: productId || null,
        intent: intent,
        source: source,
        buyer_session_id: sessionId,
      });
    } catch (err) {
      console.warn('Failed to track lead:', err);
    } finally {
      setLoading(false);

      // Route to BOT — not seller number
      // Format: Hi (ID:product-uuid) so the bot can identify the product
      const idTag = productId ? `(ID:${productId})` : '';
      const text = `Hi ${idTag}`.trim();
      const waUrl = `https://wa.me/${BOT_PHONE}?text=${encodeURIComponent(text)}`;

      window.open(waUrl, '_blank');
    }
  };

  if (variant === 'solid') {
    return (
      <Button
        onClick={handleClick}
        disabled={loading}
        className={`bg-[#25D366] hover:bg-[#1DA851] text-white flex items-center justify-center gap-2 border-0 shadow-lg shadow-[#25D366]/20 transition-all ${className}`}
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5 fill-current" />}
        <span className="font-bold">{label}</span>
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      onClick={handleClick}
      disabled={loading}
      className={`border-[#25D366] text-[#25D366] hover:bg-[#25D366]/5 flex items-center justify-center gap-2 ${className}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
      <span className="font-bold">{label}</span>
    </Button>
  );
}
