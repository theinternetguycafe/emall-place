import React from 'react'
import { Star, MessageCircle } from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'

interface Review {
  id: string
  author: string
  rating: number
  text: string
  date: string
  verified?: boolean
}

interface StoreReviewsProps {
  productCount?: number
  averageRating?: number
  reviewCount?: number
  recentReviews?: Review[]
  onViewAllClick?: () => void
}

export default function StoreReviews({
  productCount = 0,
  averageRating = 4.5,
  reviewCount = 0,
  recentReviews = [],
  onViewAllClick,
}: StoreReviewsProps) {
  return (
    <section className="py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3 mb-2">
            <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
            Customer Reviews
          </h2>
          <p className="text-stone-600">See what our customers say</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Rating Summary */}
        <Card className="p-6 md:col-span-1">
          <div className="text-center">
            <div className="mb-4">
              <div className="text-5xl font-black text-slate-900">
                {averageRating.toFixed(1)}
              </div>
              <div className="flex items-center justify-center gap-1 my-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.round(averageRating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-stone-300'
                    }`}
                  />
                ))}
              </div>
              {reviewCount > 0 && (
                <p className="text-sm text-stone-600 font-bold">
                  Based on {reviewCount} review{reviewCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {reviewCount === 0 && (
              <p className="text-stone-500 text-sm py-8">
                No reviews yet. Be the first to review!
              </p>
            )}
          </div>
        </Card>

        {/* Stats Cards */}
        <Card className="p-6 bg-emerald-50 border-emerald-200">
          <div className="text-center">
            <div className="text-4xl font-black text-emerald-700 mb-2">
              {productCount}
            </div>
            <p className="text-sm font-bold text-emerald-900">Products Available</p>
          </div>
        </Card>

        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="text-center">
            <div className="text-4xl font-black text-blue-700 mb-2">
              {reviewCount}
            </div>
            <p className="text-sm font-bold text-blue-900">Customer Reviews</p>
          </div>
        </Card>
      </div>

      {/* Recent Reviews */}
      {recentReviews.length > 0 && (
        <div className="space-y-4 mb-8">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
            Recent Reviews
          </h3>

          {recentReviews.map(review => (
            <Card key={review.id} className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-black text-slate-900">
                    {review.author.charAt(0).toUpperCase()}
                  </span>
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                    <div>
                      <h4 className="font-bold text-slate-900">{review.author}</h4>
                      {review.verified && (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block">
                          ✓ Verified Purchase
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-stone-600">{review.date}</span>
                  </div>

                  <div className="flex gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < review.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-stone-300'
                        }`}
                      />
                    ))}
                  </div>

                  <p className="text-sm text-slate-900">{review.text}</p>
                </div>
              </div>
            </Card>
          ))}

          {onViewAllClick && (
            <Button
              variant="outline"
              onClick={onViewAllClick}
              className="w-full justify-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              View All Reviews
            </Button>
          )}
        </div>
      )}

      {recentReviews.length === 0 && reviewCount === 0 && (
        <Card className="p-12 text-center">
          <MessageCircle className="h-12 w-12 text-stone-300 mx-auto mb-4" />
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">
            No reviews yet
          </h3>
          <p className="text-stone-600">
            Be the first to share your experience with this store
          </p>
        </Card>
      )}
    </section>
  )
}
