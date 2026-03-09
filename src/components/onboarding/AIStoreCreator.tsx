/**
 * AI Store Creator
 * 
 * Offers two paths: manual store creation or AI-generated store setup.
 * Shows only when store_created step is incomplete.
 */

import React, { useState } from 'react'
import { Wand2, Zap } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useOnboarding } from '../../contexts/OnboardingContext'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'

interface AIStoreCreatorProps {
  onStoreCreated?: () => void
}

type Mode = 'choose' | 'manual' | 'ai'

export function AIStoreCreator({ onStoreCreated }: AIStoreCreatorProps) {
  const { profile } = useAuth()
  const { completedSteps, completeStep } = useOnboarding()
  const [mode, setMode] = useState<Mode>('choose')
  const [storeName, setStoreName] = useState('')
  const [storeDescription, setStoreDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Hide if store is already created
  if (completedSteps.includes('store_created')) {
    return null
  }

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!storeName.trim()) {
      setError('Please enter a store name')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { error: storeError } = await supabase
        .from('seller_stores')
        .insert({
          owner_id: profile!.id,
          store_name: storeName.trim(),
          description: storeDescription.trim(),
          status: 'pending'
        })

      if (storeError) {
        throw new Error(`Failed to create store: ${storeError.message}`)
      }

      // Mark step as complete
      try {
        await completeStep('store_created')
      } catch (err) {
        console.error('Error completing store_created step:', err)
      }

      // Reset form
      setStoreName('')
      setStoreDescription('')
      setMode('choose')

      // Callback
      onStoreCreated?.()
    } catch (err: any) {
      setError(err.message || 'Failed to create store')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAIGenerate = async () => {
    const userDescription = (
      window.prompt(
        'Describe your store and what you sell.\n\nExample: I make handmade candles and home decor items.'
      ) || ''
    ).trim()

    if (!userDescription) return

    setIsLoading(true)
    setError(null)

    try {
      // Call Anthropic API directly
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY || ''
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: `Generate a marketplace store profile for a seller who sells: ${userDescription}. Return ONLY this JSON, no markdown: { "store_name": "", "description": "" }`
            }
          ],
          system: 'You are a store setup assistant. Return only raw JSON, no explanation, no markdown backticks.'
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || 'Failed to generate store details')
      }

      const data = await response.json()
      const generated = JSON.parse(data.content[0].text)

      setStoreName(generated.store_name || '')
      setStoreDescription(generated.description || '')
      setMode('manual')
    } catch (err: any) {
      setError(err.message || 'AI generation failed. Please create manually.')
      setMode('manual')
    } finally {
      setIsLoading(false)
    }
  }

  // Mode: Choose between manual or AI
  if (mode === 'choose') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Manual Path */}
        <Card className="p-8 rounded-2xl border-stone-100 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer"
          onClick={() => setMode('manual')}
        >
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Zap className="h-6 w-6 text-slate-900" />
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">
              Create Manually
            </h3>
            <p className="text-sm text-stone-500 font-medium mb-6">
              Fill in your store details yourself
            </p>
            <Button className="w-full rounded-lg font-black text-sm">
              Get Started
            </Button>
          </div>
        </Card>

        {/* AI Path */}
        <Card className="p-8 rounded-2xl border border-amber-200 bg-amber-50/50 shadow-sm hover:shadow-md transition-all cursor-pointer relative"
          onClick={handleAIGenerate}
        >
          <div className="absolute top-3 right-3 px-2 py-1 bg-amber-200 text-amber-900 text-[10px] font-black rounded-full">
            NEW
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Wand2 className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">
              Create With AI ✨
            </h3>
            <p className="text-sm text-stone-500 font-medium mb-6">
              Describe your store, AI generates details
            </p>
            <Button 
              variant="outline"
              className="w-full rounded-lg font-black text-sm border-amber-200 bg-white"
              disabled={isLoading}
            >
              {isLoading ? 'Generating...' : 'Try AI'}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Mode: Manual or AI-generated form
  return (
    <Card className="p-8 rounded-2xl border-stone-100 bg-white shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">
          Create Your Store
        </h2>
        {mode === 'ai' && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ✨ AI generated — please review and update before saving
          </p>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <p className="text-sm text-rose-600 font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleCreateStore} className="space-y-6">
        <Input
          label="Store Name"
          placeholder="My Artisan Shop"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          disabled={isLoading}
          required
        />

        <div>
          <label className="text-sm font-bold text-slate-900 uppercase tracking-tight block mb-2">
            Store Description
          </label>
          <textarea
            value={storeDescription}
            onChange={(e) => setStoreDescription(e.target.value)}
            placeholder="Tell customers about your store..."
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all font-medium text-slate-900"
            rows={4}
            disabled={isLoading}
          />
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={isLoading}
            className="flex-1 rounded-lg font-black shadow-lg shadow-slate-200"
          >
            {isLoading ? 'Creating...' : 'Create Store'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setMode('choose')
              setStoreName('')
              setStoreDescription('')
              setError(null)
            }}
            disabled={isLoading}
            className="flex-1 rounded-lg font-black"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  )
}
