import { Store as StoreIcon } from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

interface CreateStoreCardProps {
  showStoreForm: boolean
  setShowStoreForm: (val: boolean) => void
  storeName: string
  setStoreName: (name: string) => void
  createStore: (e: React.FormEvent) => Promise<void>
  creatingStore: boolean
  error: string | null
  setError: (err: string | null) => void
}

export function CreateStoreCard({
  showStoreForm,
  setShowStoreForm,
  storeName,
  setStoreName,
  createStore,
  creatingStore,
  error,
  setError
}: CreateStoreCardProps) {
  if (!showStoreForm) {
    return (
      <Card className="max-w-md w-full text-center p-12 rounded-[2.5rem] border-stone-100 shadow-2xl bg-white">
        <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-8">
          <StoreIcon className="h-8 w-8 text-stone-300" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-4">Open Your Store</h2>
        <p className="text-stone-500 mb-10 font-medium">You haven't established your digital storefront yet. Set up your store to start selling to the community.</p>
        <Button
          size="lg"
          data-tour="store-create-cta"
          onClick={() => {
            setShowStoreForm(true)
            window.dispatchEvent(new CustomEvent('store-form-opened'))
          }}
          className="w-full rounded-2xl shadow-xl shadow-slate-200 uppercase tracking-widest font-black text-xs py-8"
        >
          Start Selling
        </Button>
      </Card>
    )
  }

  return (
    <Card className="max-w-md w-full p-12 rounded-[2.5rem] border-stone-100 shadow-2xl bg-white">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <StoreIcon className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">Create Your Store</h2>
        <p className="text-stone-500 font-medium">Enter your store name to get started</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <p className="text-sm text-rose-600 font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={createStore} className="space-y-6" id="store-form-section">
        <Input
          label="Store Name"
          placeholder="My Artisan Shop"
          required
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          disabled={creatingStore}
          data-tour="store-name-input"
          data-onboarding="store-name"
        />

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setShowStoreForm(false)
              setStoreName('')
              setError(null)
            }}
            disabled={creatingStore}
            className="flex-1 rounded-full py-6 font-black"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            data-tour="store-submit"
            disabled={creatingStore}
            className="flex-1 rounded-full py-6 font-black shadow-xl shadow-slate-200"
          >
            {creatingStore ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Creating...</span>
              </div>
            ) : (
              'Create Store'
            )}
          </Button>
        </div>
      </form>
    </Card>
  )
}
