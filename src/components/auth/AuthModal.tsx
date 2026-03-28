import React, { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../contexts/ToastContext'
import { Loader2, ArrowRight, X } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import ErrorAlert from '../ErrorAlert'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

type AuthMode = 'signin' | 'signup'

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { addToast } = useToast()
  const [mode, setMode] = useState<AuthMode>('signin')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isSubmitting = useRef(false)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: ''
  })

  if (!isOpen) return null

  const handleGoogleAuth = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google'
      })
      if (error) throw error
      // Page will redirect to oauth provider
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting.current) return
    isSubmitting.current = true
    setLoading(true)
    setError(null)

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              phone: formData.phone,
              role: 'buyer'
            }
          }
        })

        if (signUpError) throw signUpError

        if (data.session) {
          addToast('Account created! Welcome!', 'success')
          onSuccess?.()
          onClose()
        } else {
          setError('Verification email sent! Please check your inbox.')
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        })
        if (signInError) throw signInError
        
        if (data.session) {
          addToast('Welcome back!', 'success')
          onSuccess?.()
          onClose()
        }
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-stone-100 hover:bg-stone-200 rounded-full text-stone-500 transition-colors z-10"
        >
          <X size={20} />
        </button>

        <div className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {mode === 'signin' ? 'Welcome Back' : 'Join the Marketplace'}
            </h2>
            <p className="text-sm text-stone-500 mt-1 font-medium">
              {mode === 'signin' ? 'Sign in to continue.' : 'Create an account to browse and buy.'}
            </p>
          </div>

          <div className="flex p-1 bg-stone-100 rounded-2xl mb-6">
            <button
              onClick={() => { setMode('signin'); setError(null); }}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                mode === 'signin' ? 'bg-white text-slate-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              Register
            </button>
          </div>

          {error && <ErrorAlert message={error} onClose={() => setError(null)} className="mb-4" />}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <Input
                  label="Full Name"
                  placeholder="John Doe"
                  required
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                />
                <Input
                  label="Phone (optional)"
                  placeholder="+27..."
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
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
              minLength={6}
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />

            <Button
              type="submit"
              disabled={loading || isSubmitting.current}
              className="w-full rounded-2xl py-4 text-base font-black shadow-lg shadow-slate-900/10 mt-2 flex items-center justify-center gap-2"
            >
              {loading || isSubmitting.current ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                <>
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-stone-400 uppercase tracking-widest font-bold">Or continue with</span>
              </div>
            </div>

            <button
              onClick={handleGoogleAuth}
              type="button"
              className="mt-4 w-full flex items-center justify-center gap-3 bg-white border-2 border-stone-200 hover:border-slate-900 hover:bg-stone-50 text-slate-900 font-bold py-3.5 px-4 rounded-2xl transition-all"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.67 15.63 16.86 16.79 15.65 17.6V20.34H19.22C21.3 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
                <path d="M12 23C14.97 23 17.46 22.02 19.22 20.34L15.65 17.6C14.7 18.24 13.45 18.63 12 18.63C9.21 18.63 6.85 16.75 6 14.23H2.33V17.07C4.11 20.6 7.76 23 12 23Z" fill="#34A853"/>
                <path d="M6 14.23C5.78 13.58 5.66 12.89 5.66 12C5.66 11.11 5.78 10.42 6 9.77V6.93H2.33C1.6 8.39 1.18 10.13 1.18 12C1.18 13.87 1.6 15.61 2.33 17.07L6 14.23Z" fill="#FBBC05"/>
                <path d="M12 5.38C13.62 5.38 15.06 5.94 16.2 7.03L19.3 3.93C17.45 2.18 14.97 1.18 12 1.18C7.76 1.18 4.11 3.56 2.33 7.08L6 9.93C6.85 7.4 9.21 5.38 12 5.38Z" fill="#EA4335"/>
              </svg>
              Google
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
