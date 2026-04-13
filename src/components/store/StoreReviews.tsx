import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { StoreReview } from '../../types'
import { Star, MessageSquare, Send, Loader2, ShieldCheck, AlertCircle, Trash2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

interface StoreReviewsProps {
  sellerId: string
  storeOwnerId: string
}

function StarRating({ rating, size = 16, interactive = false, onChange }: { rating: number; size?: number; interactive?: boolean; onChange?: (r: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          className={`transition-all duration-150 ${interactive ? 'cursor-pointer hover:scale-125 active:scale-90' : 'cursor-default'}`}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onChange?.(star)}
        >
          <Star
            size={size}
            className={`transition-colors ${
              star <= (hover || rating)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-stone-200 text-stone-200'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

export default function StoreReviews({ sellerId, storeOwnerId }: StoreReviewsProps) {
  const { user } = useAuth()
  const [reviews, setReviews] = useState<StoreReview[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [hasPurchased, setHasPurchased] = useState(false)
  const [checkingEligibility, setCheckingEligibility] = useState(true)
  const [userReview, setUserReview] = useState<StoreReview | null>(null)
  const [newRating, setNewRating] = useState(0)
  const [newComment, setNewComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isOwner = user?.id === storeOwnerId

  useEffect(() => {
    fetchReviews()
    if (user && !isOwner) checkBuyerEligibility()
    else setCheckingEligibility(false)
  }, [sellerId, user?.id])

  const fetchReviews = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('store_reviews')
        .select('*, profiles:reviewer_id(full_name)')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setReviews(data || [])

      // Check if current user already left a review
      if (user) {
        const existing = (data || []).find(r => r.reviewer_id === user.id)
        if (existing) setUserReview(existing)
      }
    } catch (err) {
      console.error('[StoreReviews] Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const checkBuyerEligibility = async () => {
    if (!user) { setCheckingEligibility(false); return }
    try {
      // Check if user has any delivered order items from this store
      const { data, error } = await supabase
        .from('order_items')
        .select('id, orders!inner(buyer_id)')
        .eq('seller_id', sellerId)
        .eq('orders.buyer_id', user.id)
        .eq('item_status', 'delivered')
        .limit(1)

      if (error) {
        console.error('[StoreReviews] Eligibility check error:', error)
        // Fallback: check if user has ANY order from this store
        const { data: fallback } = await supabase
          .from('order_items')
          .select('id, orders!inner(buyer_id)')
          .eq('seller_id', sellerId)
          .eq('orders.buyer_id', user.id)
          .limit(1)
        setHasPurchased(!!(fallback && fallback.length > 0))
      } else {
        setHasPurchased(!!(data && data.length > 0))
      }
    } catch (err) {
      console.error('[StoreReviews] Eligibility error:', err)
    } finally {
      setCheckingEligibility(false)
    }
  }

  const handleSubmit = async () => {
    if (!user || !newRating) {
      setError('Please select a star rating.')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const { data, error } = await supabase
        .from('store_reviews')
        .insert({
          seller_id: sellerId,
          reviewer_id: user.id,
          rating: newRating,
          comment: newComment.trim() || null
        })
        .select('*, profiles:reviewer_id(full_name)')
        .single()

      if (error) {
        if (error.code === '23505') {
          setError('You have already reviewed this store.')
        } else {
          throw error
        }
        return
      }

      setUserReview(data)
      setReviews(prev => [data, ...prev])
      setNewRating(0)
      setNewComment('')
      setSuccess('Review submitted! Thank you for your feedback.')
      setTimeout(() => setSuccess(null), 4000)
    } catch (err: any) {
      console.error('[StoreReviews] Submit error:', err)
      setError(err.message || 'Failed to submit review.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!userReview || !confirm('Delete your review?')) return

    try {
      await supabase.from('store_reviews').delete().eq('id', userReview.id)
      setUserReview(null)
      setReviews(prev => prev.filter(r => r.id !== userReview.id))
      setNewRating(0)
      setNewComment('')
    } catch (err) {
      console.error('[StoreReviews] Delete error:', err)
    }
  }

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null

  const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: reviews.length > 0 ? Math.round((reviews.filter(r => r.rating === star).length / reviews.length) * 100) : 0
  }))

  return (
    <div className="mt-16">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center">
          <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Customer Reviews</h2>
          <p className="text-sm text-stone-500 font-medium">{reviews.length} review{reviews.length !== 1 ? 's' : ''} from verified buyers</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Rating Summary */}
        <Card className="p-8 border-stone-100 shadow-sm lg:col-span-1">
          {avgRating ? (
            <div className="text-center mb-6">
              <div className="text-5xl font-black text-slate-900 mb-2">{avgRating}</div>
              <StarRating rating={Math.round(Number(avgRating))} size={24} />
              <p className="text-xs text-stone-400 font-bold mt-2 uppercase tracking-widest">{reviews.length} Rating{reviews.length !== 1 ? 's' : ''}</p>
            </div>
          ) : (
            <div className="text-center py-6">
              <Star className="w-10 h-10 text-stone-200 mx-auto mb-3" />
              <p className="text-sm text-stone-400 font-medium">No reviews yet</p>
            </div>
          )}

          {/* Distribution Bars */}
          {reviews.length > 0 && (
            <div className="space-y-2">
              {ratingDistribution.map(({ star, count, pct }) => (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-stone-500 w-4 text-right">{star}</span>
                  <Star size={12} className="fill-amber-400 text-amber-400 flex-shrink-0" />
                  <div className="flex-1 h-2.5 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-stone-400 w-8">{count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Reviews List + Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Review Form */}
          {user && !isOwner && !checkingEligibility && (
            <>
              {userReview ? (
                <Card className="p-6 bg-emerald-50 border-emerald-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      <div>
                        <p className="font-bold text-emerald-900 text-sm">Your Review</p>
                        <div className="flex items-center gap-2 mt-1">
                          <StarRating rating={userReview.rating} size={14} />
                          <span className="text-xs text-emerald-700 font-medium">
                            {new Date(userReview.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {userReview.comment && (
                          <p className="text-sm text-emerald-800 mt-2">{userReview.comment}</p>
                        )}
                      </div>
                    </div>
                    <button onClick={handleDelete} className="p-2 text-emerald-600 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              ) : hasPurchased ? (
                <Card className="p-6 border-stone-100 shadow-sm">
                  <h3 className="font-black text-slate-900 text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Leave a Review
                  </h3>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700 font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                    </div>
                  )}
                  {success && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 text-sm text-emerald-700 font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                      <ShieldCheck className="w-4 h-4 flex-shrink-0" /> {success}
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-widest block mb-2">Your Rating</label>
                    <StarRating rating={newRating} size={32} interactive onChange={setNewRating} />
                  </div>

                  <div className="mb-4">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-widest block mb-2">Comment (Optional)</label>
                    <textarea
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      placeholder="Share your experience with this store..."
                      className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-stone-50 focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 outline-none transition-all text-sm resize-none"
                      rows={3}
                      maxLength={500}
                    />
                    <p className="text-[10px] text-stone-300 mt-1 text-right">{newComment.length}/500</p>
                  </div>

                  <Button onClick={handleSubmit} disabled={submitting || !newRating} className="w-full rounded-xl">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Submit Review</>}
                  </Button>
                </Card>
              ) : (
                <Card className="p-6 bg-stone-50 border-stone-200 text-center">
                  <ShieldCheck className="w-8 h-8 text-stone-300 mx-auto mb-3" />
                  <p className="text-sm text-stone-500 font-medium">Only verified buyers can review this store.</p>
                  <p className="text-xs text-stone-400 mt-1">Purchase a product to unlock reviews.</p>
                </Card>
              )}
            </>
          )}

          {!user && (
            <Card className="p-6 bg-stone-50 border-stone-200 text-center">
              <p className="text-sm text-stone-500 font-medium">Sign in to leave a review.</p>
            </Card>
          )}

          {/* Review Cards */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl p-6 border border-stone-100 animate-pulse">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-stone-200" />
                    <div className="space-y-2"><div className="h-3 w-24 bg-stone-200 rounded" /><div className="h-2 w-16 bg-stone-100 rounded" /></div>
                  </div>
                  <div className="h-3 w-full bg-stone-100 rounded mt-4" />
                  <div className="h-3 w-3/4 bg-stone-100 rounded mt-2" />
                </div>
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <Card className="p-12 text-center border-stone-100">
              <MessageSquare className="w-10 h-10 text-stone-200 mx-auto mb-3" />
              <p className="text-stone-400 font-bold uppercase tracking-widest text-xs">No reviews yet</p>
              <p className="text-sm text-stone-400 mt-1">Be the first to share your experience!</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {reviews.map(review => (
                <Card key={review.id} className="p-6 border-stone-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                      {(review.profiles?.full_name || 'A')[0].toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <div>
                          <span className="font-bold text-slate-900 text-sm">{review.profiles?.full_name || 'Anonymous'}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <StarRating rating={review.rating} size={12} />
                            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-500" /> Verified Buyer
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-stone-400 font-bold flex-shrink-0">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {review.comment && (
                        <p className="text-sm text-stone-600 leading-relaxed mt-2">{review.comment}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
