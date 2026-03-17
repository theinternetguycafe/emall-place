import React, { useState } from 'react'
import { Mail, Bell } from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

interface NewsletterSignupProps {
  storeName: string
  onSubscribe?: (email: string) => Promise<void>
  isFollowed?: boolean
  onFollowClick?: () => void
}

export default function NewsletterSignup({
  storeName,
  onSubscribe,
  isFollowed,
  onFollowClick,
}: NewsletterSignupProps) {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !onSubscribe) return

    setIsLoading(true)
    try {
      await onSubscribe(email)
      setMessage({ type: 'success', text: 'Successfully subscribed!' })
      setEmail('')
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to subscribe. Please try again.' })
      setTimeout(() => setMessage(null), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="py-12">
      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-8 md:p-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Content */}
          <div>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mb-4 flex items-center gap-3">
              <Bell className="h-8 w-8" />
              Never Miss an Update
            </h2>
            <p className="text-stone-300 leading-relaxed mb-6">
              Get exclusive deals, new product launches, and special offers delivered to your inbox. Subscribe to{' '}
              <span className="font-bold text-white">{storeName}</span>'s newsletter today!
            </p>

            <div className="flex items-center gap-4 flex-wrap text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">✓</span>
                </div>
                <span>Weekly Deals</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">✓</span>
                </div>
                <span>Early Access</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">✓</span>
                </div>
                <span>No Spam</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {onSubscribe && (
              <form onSubmit={handleSubscribe} className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="bg-white text-slate-900 border-0"
                  />
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold whitespace-nowrap"
                  >
                    {isLoading ? 'Subscribing...' : 'Subscribe'}
                  </Button>
                </div>
                {message && (
                  <p
                    className={`text-sm font-bold ${
                      message.type === 'success'
                        ? 'text-emerald-300'
                        : 'text-red-300'
                    }`}
                  >
                    {message.text}
                  </p>
                )}
                <p className="text-xs text-stone-400">
                  We respect your privacy. Unsubscribe at any time.
                </p>
              </form>
            )}

            {onFollowClick && (
              <Button
                onClick={onFollowClick}
                variant={isFollowed ? 'outline' : 'primary'}
                className={`w-full font-bold text-base ${
                  isFollowed
                    ? 'bg-transparent border-white text-white hover:bg-white/10'
                    : 'bg-white text-slate-900 hover:bg-stone-100'
                }`}
              >
                {isFollowed ? '✓ Following This Store' : '+ Follow Store'}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </section>
  )
}
