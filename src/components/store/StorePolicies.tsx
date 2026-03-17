import React, { useState } from 'react'
import { StorePolicies as StorePoliciesType } from '../../types'
import { Card } from '../ui/Card'
import { ChevronDown, Truck, RotateCcw, Shield } from 'lucide-react'

interface StorePoliciesProps {
  policies?: StorePoliciesType | null
}

export default function StorePolicies({ policies }: StorePoliciesProps) {
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>('shipping')

  if (!policies || (!policies.shipping && !policies.returns && !policies.warranty)) {
    return null
  }

  const policyItems = [
    {
      id: 'shipping',
      label: 'Shipping Policy',
      icon: Truck,
      content: policies.shipping,
    },
    {
      id: 'returns',
      label: 'Returns & Refunds',
      icon: RotateCcw,
      content: policies.returns,
    },
    {
      id: 'warranty',
      label: 'Warranty',
      icon: Shield,
      content: policies.warranty,
    },
  ].filter(item => item.content)

  if (policyItems.length === 0) {
    return null
  }

  return (
    <section className="py-12">
      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight mb-8">
        Policies & Information
      </h2>

      <div className="space-y-4">
        {policyItems.map(item => {
          const Icon = item.icon
          const isExpanded = expandedPolicy === item.id

          return (
            <Card key={item.id} className="overflow-hidden">
              <button
                onClick={() =>
                  setExpandedPolicy(isExpanded ? null : item.id)
                }
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-slate-900 flex-shrink-0" />
                  <span className="font-black text-slate-900 uppercase tracking-tight">
                    {item.label}
                  </span>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-stone-600 transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isExpanded && (
                <div className="px-6 py-4 border-t border-stone-200 bg-stone-50">
                  <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">
                    {item.content}
                  </p>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </section>
  )
}
