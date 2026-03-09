import { Card } from '../components/ui/Card'
import { RefreshCcw, ShieldCheck, AlertCircle } from 'lucide-react'

export default function ReturnsPolicy() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <div className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 uppercase mb-4">
          Returns <span className="text-stone-400">Policy</span>
        </h1>
        <p className="text-stone-500 font-medium">Shop with confidence with our straightforward returns process.</p>
      </div>

      <div className="space-y-8">
        <Card className="p-8 md:p-12 rounded-[2.5rem] border-stone-100 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <RefreshCcw className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Standard Returns</h2>
          </div>
          <p className="text-stone-600 leading-relaxed mb-4">
            If you are not entirely satisfied with your purchase, you may return the item within <strong>7 days</strong> of delivery. The item must be unused, in its original packaging, and in the same condition that you received it.
          </p>
          <ul className="list-disc pl-5 text-stone-600 space-y-2 mb-4">
            <li>Clothing must have tags attached and be unworn.</li>
            <li>Electronics must remain sealed in original packaging unless defective.</li>
            <li>Custom-made or personalized items are generally non-returnable unless defective.</li>
          </ul>
        </Card>

        <Card className="p-8 md:p-12 rounded-[2.5rem] border-stone-100 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Defective Items</h2>
          </div>
          <p className="text-stone-600 leading-relaxed">
            We vet our sellers to ensure high quality, but if you receive a defective or incorrect item, please contact our Help Centre within 48 hours of delivery. We will facilitate a replacement or full refund at no additional shipping cost to you.
          </p>
        </Card>

        <Card className="p-8 md:p-12 rounded-[2.5rem] border-rose-50 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-rose-900">How to initiate a return</h2>
          </div>
          <ol className="list-decimal pl-5 text-rose-800 space-y-3 font-medium">
            <li>Log into your eMallPlace account.</li>
            <li>Go to "Account" then "Orders".</li>
            <li>Select the order containing the item you wish to return.</li>
            <li>Click "Request Return" and follow the prompts.</li>
            <li>Our support team will contact you to arrange collection.</li>
          </ol>
        </Card>
      </div>
    </div>
  )
}
