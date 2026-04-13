import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface LikeButtonProps {
  productId: string;
  className?: string;
  size?: number;
}

export default function LikeButton({ productId, className = '', size = 20 }: LikeButtonProps) {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || (!productId)) return;
    
    // Check initial status
    const checkLike = async () => {
      const { data } = await supabase
        .from('product_likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();
      
      setIsLiked(!!data);
    };
    checkLike();
  }, [user, productId]);

  const toggleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      alert("Please sign in to like products.");
      return;
    }
    
    if (loading) return;
    setLoading(true);
    
    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from('product_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId);
        setIsLiked(false);
      } else {
        // Like
        await supabase
          .from('product_likes')
          .insert({ user_id: user.id, product_id: productId });
        setIsLiked(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleLike}
      disabled={loading}
      className={`bg-white/90 backdrop-blur-md p-3 rounded-2xl transition-all shadow-sm active:scale-90 ${
        isLiked ? 'text-rose-500' : 'text-stone-300 hover:text-rose-400'
      } ${loading ? 'opacity-70' : ''} ${className}`}
    >
      <Heart 
        size={size} 
        className={isLiked ? "fill-rose-500 text-rose-500 scale-110" : "fill-current fill-opacity-0"} 
        strokeWidth={isLiked ? 2.5 : 2}
      />
    </button>
  );
}
