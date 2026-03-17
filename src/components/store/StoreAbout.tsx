import React from 'react'
import { SellerStore } from '../../types'
import { Card } from '../ui/Card'
import { MapPin, Phone, Mail, Clock } from 'lucide-react'

interface StoreAboutProps {
  store: SellerStore
}

export default function StoreAbout({ store }: StoreAboutProps) {
  if (!store.description && !store.seller_location && !store.seller_phone && !store.seller_email) {
    return null
  }

  return (
    <section className="py-12">
      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight mb-8">
        About This Store
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* About Text */}
        <div className="md:col-span-2">
          <Card className="p-6 md:p-8">
            {store.description ? (
              <>
                <h3 className="text-lg font-black text-slate-900 mb-4 uppercase tracking-tight">
                  Store Story
                </h3>
                <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">
                  {store.description}
                </p>
              </>
            ) : (
              <p className="text-stone-500 italic">
                Store owner hasn't added a description yet.
              </p>
            )}
          </Card>
        </div>

        {/* Contact Info */}
        <div className="space-y-4">
          {store.seller_location && (
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <MapPin className="h-5 w-5 text-slate-900 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight mb-1">
                    Location
                  </h4>
                  <p className="text-sm text-stone-600">{store.seller_location}</p>
                </div>
              </div>
            </Card>
          )}

          {store.seller_phone && (
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <Phone className="h-5 w-5 text-slate-900 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight mb-1">
                    Phone
                  </h4>
                  <a
                    href={`tel:${store.seller_phone}`}
                    className="text-sm text-blue-600 hover:text-blue-700 font-bold"
                  >
                    {store.seller_phone}
                  </a>
                </div>
              </div>
            </Card>
          )}

          {store.seller_email && (
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <Mail className="h-5 w-5 text-slate-900 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight mb-1">
                    Email
                  </h4>
                  <a
                    href={`mailto:${store.seller_email}`}
                    className="text-sm text-blue-600 hover:text-blue-700 font-bold break-all"
                  >
                    {store.seller_email}
                  </a>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-6 bg-emerald-50 border-emerald-200">
            <div className="flex items-start gap-4">
              <Clock className="h-5 w-5 text-emerald-700 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-black text-emerald-900 text-sm uppercase tracking-tight mb-1">
                  Member Since
                </h4>
                <p className="text-sm text-emerald-800 font-bold">
                  {new Date(store.created_at).toLocaleDateString('en-ZA', {
                    year: 'numeric',
                    month: 'long',
                  })}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  )
}
