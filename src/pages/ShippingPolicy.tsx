import { Card } from '../components/ui/Card'
import { Truck, MapPin, Clock } from 'lucide-react'

export default function ShippingPolicy() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <div className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 uppercase mb-4">
          Shipping <span className="text-stone-400">& Delivery</span>
        </h1>
        <p className="text-stone-500 font-medium">Everything you need to know about getting your items.</p>
      </div>

      <div className="prose prose-stone max-w-none">
        <Card className="p-8 md:p-12 rounded-[2.5rem] border-stone-100 shadow-sm mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Truck className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight m-0">In-House Delivery System</h2>
          </div>
          <p className="text-stone-600 leading-relaxed">
            At eMallPlace, we are developing an <strong>in-house delivery system</strong> tailored specifically for our community. This allows us to offer more affordable, reliable, and localized delivery solutions that traditional couriers might miss. We understand the township economy and are building logistics that work for you.
          </p>
        </Card>

        <Card className="p-8 md:p-12 rounded-[2.5rem] border-stone-100 shadow-sm mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <MapPin className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight m-0">Partner Couriers</h2>
          </div>
          <p className="text-stone-600 leading-relaxed mb-4">
            While we scale our in-house fleet, we are also actively looking into working with existing, locally recognized shipping courier providers like <strong>Delivery Ka Speed</strong> when demand requires it. This ensures that no matter where you are in South Africa, your goods reach you safely and promptly.
          </p>
          <p className="text-stone-600 leading-relaxed">
            Sellers may also choose to fulfill orders using their preferred local delivery methods depending on your area.
          </p>
        </Card>

        <Card className="p-8 md:p-12 rounded-[2.5rem] border-stone-100 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight m-0">Delivery Timeframes</h2>
          </div>
          <p className="text-stone-600 leading-relaxed">
            Standard delivery typically takes <strong>2-5 business days</strong> depending on your location and the seller's location. Custom or handmade items may require additional processing time as specified by the seller on the product page.
          </p>
        </Card>
      </div>
    </div>
  )
}
