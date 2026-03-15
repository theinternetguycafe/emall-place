import React from 'react'
import { Edit2 } from 'lucide-react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { SellerStore } from '../../types'

interface StoreSetupFormProps {
  store: SellerStore
  isStoreComplete: boolean
  storeCompletion: number
  editingStore: boolean
  setEditingStore: (val: boolean) => void
  storeForm: { store_name: string; description: string }
  setStoreForm: (form: { store_name: string; description: string }) => void
  updateStore: (e: React.FormEvent) => void
}

export function StoreSetupForm({
  store,
  isStoreComplete,
  storeCompletion,
  editingStore,
  setEditingStore,
  storeForm,
  setStoreForm,
  updateStore
}: StoreSetupFormProps) {
  return (
    <div className="mb-12">
      {!isStoreComplete && (
        <Card className="p-6 mb-8 bg-amber-50 border border-amber-200 rounded-3xl">
          <div className="flex items-start gap-4">
            <div className="text-2xl flex-shrink-0">⚠️</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-amber-900 mb-2">Store Details Incomplete</h3>
              <p className="text-sm text-amber-800 mb-4">Complete your store profile to build trust with customers and improve your visibility.</p>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-900">Progress</span>
                  <span className="text-xs font-bold text-amber-900">{storeCompletion}%</span>
                </div>
                <div className="w-full h-2 bg-amber-200 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 transition-all" style={{ width: `${storeCompletion}%` }} />
                </div>
              </div>
            </div>
            {!editingStore && (
              <button
                data-tour="store-edit"
                onClick={() => setEditingStore(true)}
                className="flex-shrink-0 p-2 hover:bg-amber-100 rounded-lg transition-colors"
              >
                <Edit2 className="h-5 w-5 text-amber-700" />
              </button>
            )}
          </div>
        </Card>
      )}

      <Card data-tour="store-section" className="p-8 rounded-3xl border-stone-100 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Store Details</h2>
          {!editingStore && (
            <button
              data-tour="store-edit"
              onClick={() => setEditingStore(true)}
              className="p-2 hover:bg-stone-50 rounded-lg transition-colors"
            >
              <Edit2 className="h-5 w-5 text-slate-600" />
            </button>
          )}
        </div>

        {!editingStore ? (
          <div className="space-y-6">
            <div>
              <span className="text-xs text-stone-400 font-bold uppercase tracking-wider">Store Name</span>
              <p className="font-bold text-slate-900 text-lg mt-1">{store.store_name}</p>
            </div>
            <div>
              <span className="text-xs text-stone-400 font-bold uppercase tracking-wider">Description</span>
              {store.description ? (
                <p className="text-slate-600 mt-1">{store.description}</p>
              ) : (
                <p className="text-stone-400 italic mt-1">No description provided yet</p>
              )}
            </div>
            <div>
              <span className="text-xs text-stone-400 font-bold uppercase tracking-wider">Store Status</span>
              <Badge
                variant={store.status === 'active' ? 'success' : store.status === 'pending' ? 'warning' : 'error'}
                className="mt-1 text-xs font-black uppercase"
              >
                {store.status}
              </Badge>
            </div>
          </div>
        ) : (
          <form onSubmit={updateStore} className="space-y-6">
            <div>
              <label className="text-xs text-stone-400 font-bold uppercase tracking-wider block mb-2">Store Name</label>
              <input
                data-tour="store-name-input"
                data-onboarding="store-name"
                type="text"
                value={storeForm.store_name}
                onChange={(e) => setStoreForm({ ...storeForm, store_name: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all font-bold text-slate-900"
                required
              />
            </div>
            <div>
              <label className="text-xs text-stone-400 font-bold uppercase tracking-wider block mb-2">Store Description</label>
              <textarea
                data-tour="store-description-input"
                value={storeForm.description}
                onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })}
                placeholder="Tell customers about your store, what you offer, and what makes you unique..."
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all text-slate-900"
                rows={4}
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" data-tour="store-save-button" className="flex-1 rounded-xl py-3 font-black shadow-lg shadow-slate-200">
                Save Changes
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingStore(false)
                  setStoreForm({
                    store_name: store.store_name || '',
                    description: store.description || ''
                  })
                }}
                className="flex-1 rounded-xl py-3 font-black"
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}