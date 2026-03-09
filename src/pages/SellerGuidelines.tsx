import { Card } from '../components/ui/Card'
import { Store, Star, HeartHandshake, ShieldAlert } from 'lucide-react'

export default function SellerGuidelines() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <div className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 uppercase mb-4">
          Seller <span className="text-stone-400">Guidelines</span>
        </h1>
        <p className="text-stone-500 font-medium">Standards for creating a trusted community marketplace.</p>
      </div>

      <div className="space-y-8">
        <Card className="p-8 md:p-10 rounded-[2.5rem] border-stone-100 shadow-sm">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-slate-900 text-white rounded-2xl flex-shrink-0">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight mb-3">1. Store Presentation</h2>
              <p className="text-stone-600 leading-relaxed mb-4">
                Your store is your digital storefront. Keep it professional and inviting.
              </p>
              <ul className="list-disc pl-5 text-stone-600 space-y-2 text-sm">
                <li>Use clear, high-quality images for your products.</li>
                <li>Write accurate and honest product descriptions.</li>
                <li>Keep your inventory up to date to avoid cancelling orders.</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="p-8 md:p-10 rounded-[2.5rem] border-stone-100 shadow-sm">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl flex-shrink-0">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight mb-3">2. Customer Service</h2>
              <p className="text-stone-600 leading-relaxed mb-4">
                eMallPlace thrives on community trust. Treat your buyers with respect.
              </p>
              <ul className="list-disc pl-5 text-stone-600 space-y-2 text-sm">
                <li>Respond to customer queries promptly.</li>
                <li>Package items securely to prevent damage during transit.</li>
                <li>Dispatch orders within your stated timeframe.</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="p-8 md:p-10 rounded-[2.5rem] border-stone-100 shadow-sm">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-amber-50 text-amber-500 rounded-2xl flex-shrink-0">
              <Star className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight mb-3">3. Product Quality</h2>
              <p className="text-stone-600 leading-relaxed mb-4">
                We celebrate local craftsmanship and genuine products.
              </p>
              <ul className="list-disc pl-5 text-stone-600 space-y-2 text-sm">
                <li>Only sell items you have the right to sell.</li>
                <li>Counterfeit or fake goods are strictly prohibited.</li>
                <li>Ensure items match their description and photos exactly.</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="p-8 md:p-10 rounded-[2.5rem] border-rose-50 shadow-sm">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-rose-100 text-rose-600 rounded-2xl flex-shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight mb-3 text-rose-900">4. Prohibited Items</h2>
              <p className="text-stone-600 leading-relaxed mb-4">
                For the safety of our community, the following cannot be sold on eMallPlace:
              </p>
              <ul className="list-disc pl-5 text-stone-600 space-y-2 text-sm">
                <li>Illegal drugs or regulated substances.</li>
                <li>Weapons, firearms, or explosives.</li>
                <li>Stolen goods.</li>
                <li>Items that promote hate speech or violence.</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
