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
  storeForm: { 
    store_name: string; 
    description: string;
    tagline: string;
    seller_email: string;
    seller_phone: string;
    address: string;
    service_mode: string;
    radius_km: number;
  }
  setStoreForm: (form: any) => void
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
        <Card className="p-8 mb-8 bg-amber-50 border border-amber-200 rounded-[2rem] shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="flex items-start gap-6">
            <div className="text-3xl flex-shrink-0 bg-white p-3 rounded-2xl shadow-sm border border-amber-100">⚠️</div>
            <div className="flex-1">
              <h3 className="text-xl font-black text-amber-900 mb-1">{store.seller_type === 'service' ? 'Service Shop' : 'Store'} Details Incomplete</h3>
              <p className="text-stone-600 mb-6 font-medium">Your profile is missing key information. Professional profiles with descriptions, contact info, and branding see up to 400% more engagement.</p>
              <div className="max-w-md">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-900">Digital Identity Maturity</span>
                  <span className="text-xs font-black text-amber-900">{storeCompletion}%</span>
                </div>
                <div className="w-full h-3 bg-white/50 backdrop-blur rounded-full overflow-hidden border border-amber-200">
                  <div className="h-full bg-amber-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(245,158,11,0.4)]" style={{ width: `${storeCompletion}%` }} />
                </div>
              </div>
            </div>
            {!editingStore && (
              <Button
                onClick={() => setEditingStore(true)}
                className="rounded-2xl bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-200 border-none px-6 py-6"
              >
                Complete Now
              </Button>
            )}
          </div>
        </Card>
      )}

      <Card data-tour="store-section" className="rounded-[2.5rem] border-stone-100 bg-white shadow-xl shadow-slate-900/5 overflow-hidden">
        <div className="p-8 md:p-12">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{store.seller_type === 'service' ? 'Shop' : 'Store'} Identity</h2>
              <p className="text-stone-400 font-medium text-sm mt-1">Configure your public-facing business profile.</p>
            </div>
            {!editingStore && (
              <button
                onClick={() => setEditingStore(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-stone-50 text-slate-900 text-xs font-black uppercase tracking-widest hover:bg-stone-100 transition-all border border-stone-100"
              >
                <Edit2 className="h-4 w-4" /> Edit Profile
              </button>
            )}
          </div>

          {!editingStore ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <section>
                  <span className="text-[10px] font-black tracking-widest text-stone-300 uppercase block mb-2">Core Branding</span>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-black text-slate-900">{store.store_name}</p>
                      <p className="text-xs text-stone-500 font-medium">{store.tagline || 'No tagline set'}</p>
                    </div>
                    <div className="p-6 bg-stone-50 rounded-3xl border border-stone-100">
                       <p className="text-sm text-slate-700 leading-relaxed font-medium">
                        {store.description || 'Provide a description to help customers understand your business...'}
                       </p>
                    </div>
                  </div>
                </section>

                <section>
                  <span className="text-[10px] font-black tracking-widest text-stone-300 uppercase block mb-2">Operational Status</span>
                  <div className="flex items-center gap-3">
                    <Badge
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest
                        ${store.status === 'active' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}
                    >
                      {store.status}
                    </Badge>
                    <div className={`w-3 h-3 rounded-full ${store.is_online ? 'bg-green-500 animate-pulse' : 'bg-stone-300'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">
                      {store.is_online ? 'Currently Accepting Leads' : 'Offline'}
                    </span>
                  </div>
                </section>
              </div>

              <div className="space-y-8">
                <section>
                   <span className="text-[10px] font-black tracking-widest text-stone-300 uppercase block mb-2">Business Contact</span>
                   <div className="space-y-4">
                     <div className="flex items-center gap-3">
                       <span className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold">@</span>
                       <span className="text-sm font-bold text-slate-900">{store.seller_email || 'Not provided'}</span>
                     </div>
                     <div className="flex items-center gap-3">
                       <span className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center text-green-600 font-bold">#</span>
                       <span className="text-sm font-bold text-slate-900">{store.seller_phone || 'Not provided'}</span>
                     </div>
                   </div>
                </section>

                <section>
                   <span className="text-[10px] font-black tracking-widest text-stone-300 uppercase block mb-2">Logistics & Range</span>
                   <div className="space-y-4">
                     <div className="flex items-center gap-3">
                       <span className="text-sm font-bold text-slate-900">{store.address || 'Address not set'}</span>
                     </div>
                     {store.seller_type !== 'product' && (
                       <div className="flex items-center gap-3 bg-slate-900 p-4 rounded-2xl text-white">
                         <div className="flex-1">
                           <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Dispatch Radius</p>
                           <p className="text-lg font-black italic">{store.radius_km || 10} KM</p>
                         </div>
                         <div className="text-[8px] font-black uppercase bg-white/10 px-3 py-1 rounded-full">
                           {store.service_mode?.replace('_', ' ')}
                         </div>
                       </div>
                     )}
                   </div>
                </section>
              </div>
            </div>
          ) : (
            <form onSubmit={updateStore} className="animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                
                {/* Branding Section */}
                <div className="space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b border-stone-100 pb-2">Branding</h3>
                  <div>
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2">Store Name</label>
                    <input
                      type="text"
                      value={storeForm.store_name}
                      onChange={(e) => setStoreForm({ ...storeForm, store_name: e.target.value })}
                      className="w-full px-5 py-4 border border-stone-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all font-bold text-slate-900 bg-stone-50/30"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2">Catchy Tagline</label>
                    <input
                      type="text"
                      value={storeForm.tagline}
                      onChange={(e) => setStoreForm({ ...storeForm, tagline: e.target.value })}
                      placeholder="e.g. Best Pizza in Jozi"
                      className="w-full px-5 py-4 border border-stone-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all font-bold text-stone-600 bg-stone-50/30"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2">Description</label>
                    <textarea
                      value={storeForm.description}
                      onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })}
                      placeholder="Tell customers about your business..."
                      className="w-full px-5 py-4 border border-stone-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all text-slate-900 bg-stone-50/30 font-medium"
                      rows={4}
                    />
                  </div>
                </div>

                {/* Contact & Logistics Section */}
                <div className="space-y-6">
                   <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b border-stone-100 pb-2">Business Contact</h3>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2">Support Email</label>
                       <input
                         type="email"
                         value={storeForm.seller_email}
                         onChange={(e) => setStoreForm({ ...storeForm, seller_email: e.target.value })}
                         className="w-full px-5 py-4 border border-stone-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all font-bold text-slate-900 bg-stone-50/30"
                       />
                     </div>
                     <div>
                       <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2">Contact Phone</label>
                       <input
                         type="tel"
                         value={storeForm.seller_phone}
                         onChange={(e) => setStoreForm({ ...storeForm, seller_phone: e.target.value })}
                         className="w-full px-5 py-4 border border-stone-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all font-bold text-slate-900 bg-stone-50/30"
                       />
                     </div>
                   </div>
                   <div>
                     <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest block mb-2">Base Address</label>
                     <input
                       type="text"
                       value={storeForm.address}
                       onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                       placeholder="123 Fox Street, Johannesburg"
                       className="w-full px-5 py-4 border border-stone-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all font-bold text-slate-900 bg-stone-50/30"
                     />
                   </div>

                   {store.seller_type !== 'product' && (
                     <div className="bg-slate-900 p-8 rounded-3xl space-y-6 shadow-xl shadow-slate-200">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Service Reach (KM)</label>
                          <span className="text-white font-black italic">{storeForm.radius_km} km</span>
                        </div>
                        <input 
                          type="range" 
                          min="1" 
                          max="100" 
                          value={storeForm.radius_km}
                          onChange={(e) => setStoreForm({ ...storeForm, radius_km: parseInt(e.target.value) })}
                          className="w-full accent-white h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer"
                        />
                        <div className="grid grid-cols-2 gap-4">
                           <button 
                             type="button" 
                             onClick={() => setStoreForm({...storeForm, service_mode: 'on_site'})}
                             className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all
                               ${storeForm.service_mode === 'on_site' ? 'bg-white text-slate-900 border-white' : 'text-slate-400 border-slate-800 hover:text-white'}`}
                           >
                             On-Site
                           </button>
                           <button 
                             type="button" 
                             onClick={() => setStoreForm({...storeForm, service_mode: 'in_house'})}
                             className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all
                               ${storeForm.service_mode === 'in_house' ? 'bg-white text-slate-900 border-white' : 'text-slate-400 border-slate-800 hover:text-white'}`}
                           >
                             In-House
                           </button>
                        </div>
                     </div>
                   )}
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 pt-12 border-t border-stone-100">
                <Button type="submit" className="flex-1 rounded-[2rem] py-8 font-black uppercase tracking-widest bg-slate-900 shadow-2xl shadow-slate-900/30 hover:scale-[1.02] active:scale-[0.98]">
                  Save Professional Profile
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingStore(false)
                    setStoreForm({
                      store_name: store.store_name || '',
                      description: store.description || '',
                      tagline: store.tagline || '',
                      seller_email: store.seller_email || '',
                      seller_phone: store.seller_phone || '',
                      address: store.address || '',
                      service_mode: store.service_mode || 'on_site',
                      radius_km: store.radius_km || 10
                    })
                  }}
                  className="rounded-[2rem] py-8 px-12 font-black uppercase tracking-widest border-stone-200"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>
    </div>
  )
}