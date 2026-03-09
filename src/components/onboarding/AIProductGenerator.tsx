/**
 * AI Product Generator
 * 
 * Uses AI to generate product details from user description.
 * Renders at top of ProductForm, collapsed by default.
 */

import React, { useState } from 'react'
import { Wand2, ChevronDown, ChevronUp } from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'

interface GeneratedProduct {
  title?: string
  description?: string
  suggested_price?: number
  suggested_stock?: number
  suggested_category?: string
}

interface AIProductGeneratorProps {
  onGenerate: (product: GeneratedProduct) => void
}

export function AIProductGenerator({ onGenerate }: AIProductGeneratorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError('Please describe your product')
      return
    }

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
          max_tokens: 500,
          messages: [
            {
              role: 'user',
              content: `Generate a product listing for: ${description.trim()}. Return ONLY this JSON: { "title": "", "description": "", "suggested_price": 0, "suggested_stock": 0 }`
            }
          ],
          system: 'You are a product listing assistant. Return only raw JSON, no markdown.'
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || 'Failed to generate product details')
      }

      const data = await response.json()
      const generated = JSON.parse(data.content[0].text)

      onGenerate(generated)
      setDescription('')
      setIsExpanded(false)
    } catch (err: any) {
      setError(err.message || 'AI generation failed. Create manually instead.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="mb-8 border-amber-100 bg-amber-50/30 rounded-2xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-amber-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Wand2 className="h-5 w-5 text-amber-600" />
          <span className="font-black text-slate-900 uppercase tracking-tight text-sm">
            ✨ Generate with AI
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-stone-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-stone-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 border-t border-amber-100 pt-4">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <p className="text-xs text-rose-600 font-medium">{error}</p>
            </div>
          )}

          <div>
            <label className="text-xs font-black uppercase tracking-tight text-slate-900 block mb-2">
              Describe Your Product
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Example: Lavender soy candle 200g, relaxing scent, handmade with natural ingredients"
              className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all font-medium text-slate-900 bg-white"
              rows={3}
              disabled={isLoading}
            />
          </div>

          <div className="mt-4 flex gap-3">
            <Button
              onClick={handleGenerate}
              disabled={isLoading}
              className="flex-1 rounded-lg font-black bg-amber-600 hover:bg-amber-700 text-white text-sm"
            >
              {isLoading ? 'Generating...' : 'Generate'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsExpanded(false)
                setDescription('')
                setError(null)
              }}
              disabled={isLoading}
              className="flex-1 rounded-lg font-black text-sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
