import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { Lock, Mail, User, Store, ArrowRight, Loader2, ShieldCheck } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import ErrorAlert from '../components/ErrorAlert'

type AuthMode = 'signin' | 'signup'
type UserRole = 'buyer' | 'seller'

export default function Auth() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const { addToast } = useToast()
  const [mode, setMode] = useState<AuthMode>(searchParams.get('signup') === 'true' ? 'signup' : 'signin')
  const [role, setRole] = useState<UserRole>('buyer')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null)
  const isSubmitting = useRef(false)

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      console.log('[Auth] User already logged in, redirecting to home')
      navigate('/')
    }
  }, [user, authLoading, navigate])

  // Clear cooldown when it expires
  useEffect(() => {
    if (cooldownUntil) {
      const remaining = cooldownUntil - Date.now()
      if (remaining > 0) {
        const timer = setTimeout(() => setCooldownUntil(null), remaining)
        return () => clearTimeout(timer)
      } else {
        setCooldownUntil(null)
      }
    }
  }, [cooldownUntil])

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    storeName: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Prevent double submit - use ref for synchronous check
    if (isSubmitting.current) return

    // Check cooldown period
    if (cooldownUntil && Date.now() < cooldownUntil) {
      const remainingSeconds = Math.ceil((cooldownUntil - Date.now()) / 1000)
      setError(`Wait ${remainingSeconds}s before trying again.`)
      return
    }

    // Set submitting flag immediately
    isSubmitting.current = true
    setLoading(true)
    setError(null)

    try {
      console.log('Starting auth submission:', mode, role)
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              role: role,
              store_name: role === 'seller' ? formData.storeName : null
            }
          }
        })

        console.log('SignUp response:', { hasData: !!data, hasUser: !!data?.user, hasSession: !!data?.session, error: signUpError })

        if (signUpError) {
          if (signUpError.status === 429) {
            const cooldownTime = 60 * 1000 
            setCooldownUntil(Date.now() + cooldownTime)
            throw new Error('Too many attempts. Please wait a moment.')
          }
          throw signUpError
        }

        if (data.session) {
          console.log('Registration successful, waiting for AuthContext...')
          // For signup, we need to wait for AuthContext to complete loading
          // This ensures the profile (especially role) is loaded before redirect
          let waitCount = 0
          const maxWaits = 30 // 15 seconds max
          while (authLoading && waitCount < maxWaits) {
            console.log(`Waiting for AuthContext... (${waitCount}/${maxWaits})`)
            await new Promise(resolve => setTimeout(resolve, 500))
            waitCount++
          }
          console.log('Registration successful, redirecting...')
          addToast('Account created! Welcome! 🎉', 'success')
          navigate('/')
        } else {
          console.log('Registration successful, verification required.')
          setError('Verification email sent! Please check your inbox.')
        }
      } else {
        console.log('Starting sign in...')
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        })
        if (signInError) {
          // Handle rate limit (429) errors for sign in too
          if (signInError.status === 429) {
            const cooldownTime = 30 * 1000 // 30 seconds cooldown
            setCooldownUntil(Date.now() + cooldownTime)
            throw new Error('Too many attempts. Please wait a moment.')
          }
          throw signInError
        }
        addToast('Welcome back! 👋', 'success')
        navigate('/')
      }
    } catch (err: any) {
      console.error('Auth error:', err)
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
      isSubmitting.current = false
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-20 bg-[#F9F8F6]">
      <div className="w-full max-w-xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-slate-900 text-white rounded-2xl mb-6">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </h1>
          <p className="text-stone-500 font-medium">
            {mode === 'signin' 
              ? 'Access your account and shop.' 
              : 'Join as a buyer or seller.'}
          </p>
        </div>

        <Card className="p-8 border-none shadow-2xl shadow-slate-900/5 bg-white rounded-3xl">
          <div className="flex p-1 bg-stone-100 rounded-2xl mb-8">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-3 text-sm font-black uppercase tracking-widest rounded-xl transition-all ${
                mode === 'signin' ? 'bg-white text-slate-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-3 text-sm font-black uppercase tracking-widest rounded-xl transition-all ${
                mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              Register
            </button>
          </div>

          {error && <ErrorAlert message={error} onClose={() => setError(null)} className="mb-6" />}

          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === 'signup' && (
              <>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    type="button"
                    onClick={() => setRole('buyer')}
                    className={`p-4 rounded-2xl border-2 transition-all text-left ${
                      role === 'buyer' ? 'border-slate-900 bg-slate-50' : 'border-stone-100 bg-white hover:border-stone-200'
                    }`}
                  >
                    <User size={20} className={role === 'buyer' ? 'text-slate-900' : 'text-stone-400'} />
                    <p className={`text-xs font-black uppercase tracking-widest mt-3 ${role === 'buyer' ? 'text-slate-900' : 'text-stone-400'}`}>Buyer</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('seller')}
                    className={`p-4 rounded-2xl border-2 transition-all text-left ${
                      role === 'seller' ? 'border-slate-900 bg-slate-50' : 'border-stone-100 bg-white hover:border-stone-200'
                    }`}
                  >
                    <Store size={20} className={role === 'seller' ? 'text-slate-900' : 'text-stone-400'} />
                    <p className={`text-xs font-black uppercase tracking-widest mt-3 ${role === 'seller' ? 'text-slate-900' : 'text-stone-400'}`}>Seller</p>
                  </button>
                </div>

                <Input
                  label="Name"
                  placeholder="John Doe"
                  required
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                />

                {role === 'seller' && (
                  <Input
                    label="Store Name"
                    placeholder="My Artisan Shop"
                    required
                    value={formData.storeName}
                    onChange={e => setFormData({ ...formData, storeName: e.target.value })}
                  />
                )}
              </>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="name@example.com"
              required
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              required
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />

            <Button
              type="submit"
              disabled={loading || isSubmitting.current || (cooldownUntil !== null && Date.now() < cooldownUntil)}
              className="w-full rounded-full py-8 text-lg font-black group shadow-xl shadow-slate-900/10 mt-4"
            >
              {loading || isSubmitting.current ? (
                <Loader2 className="animate-spin h-6 w-6" />
              ) : cooldownUntil && Date.now() < cooldownUntil ? (
                <span>Wait {Math.ceil((cooldownUntil - Date.now()) / 1000)}s</span>
              ) : (
                <div className="flex items-center gap-3">
                  <span>{mode === 'signin' ? 'Sign In' : 'Create'}</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-stone-400 mt-8 font-medium">
            {mode === 'signin' 
              ? "Don't have an account? Click register above." 
              : "Already have an account? Click sign in above."}
          </p>
        </Card>
      </div>
    </div>
  )
}
