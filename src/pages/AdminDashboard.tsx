import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { 
  BarChart3, Users, ShoppingBag, DollarSign, Check, X, ShieldAlert, Eye, 
  Edit3, Trash2, Search, RefreshCw, Tag, Bell, TrendingUp, Store, 
  ChevronDown, Upload, Save, XCircle, Package, AlertTriangle, 
  CheckCircle, Clock, Star, Zap, Filter, Activity, EyeOff, Ban, MoreVertical
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { Input } from '../components/ui/Input'
import { uploadProductImage } from '../lib/storage'
import { useAdminStore } from '../store/useAdminStore'

// ─── Types ────────────────────────────────────────────────────────────────────
interface AdminProduct {
  id: string; title: string; description: string | null; price: number; stock: number
  status: string; is_on_sale?: boolean; sale_price?: number | null; sale_label?: string | null
  sale_starts_at?: string | null; sale_ends_at?: string | null; created_at: string
  seller_store?: { id: string; store_name: string; owner_id: string } | null
  product_images?: { id: string; url: string; sort_order: number }[]
  category?: { name: string } | null
}

interface AdminSeller {
  id: string; store_name: string; status: string; created_at: string; kyc_status?: string
  seller_type?: string; category?: string; latitude?: number; longitude?: number
  seller_email?: string; description?: string
  profiles?: { full_name: string; email?: string } | null
}

interface AdminKYC {
  id: string; user_id: string; id_number: string; document_url: string; selfie_url: string
  status: string; created_at: string
  profiles?: { full_name: string; email?: string } | null
}

// ─── Mini components ──────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = 'bg-slate-900' }: any) {
  return (
    <Card className="p-6 border-stone-100 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-2xl ${color} text-white group-hover:scale-110 transition-transform`}>{icon}</div>
        <TrendingUp className="h-4 w-4 text-stone-300" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-1">{label}</p>
      <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-1 font-medium">{sub}</p>}
    </Card>
  )
}

function TabBtn({ active, onClick, label, count }: any) {
  return (
    <button onClick={onClick} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all relative ${active ? 'text-slate-900' : 'text-stone-400 hover:text-stone-600'}`}>
      <div className="flex items-center gap-2">{label}{count > 0 && <span className={`px-2 py-0.5 rounded-full text-[10px] ${active ? 'bg-slate-900 text-white' : 'bg-stone-100 text-stone-500'}`}>{count}</span>}</div>
      {active && <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900 rounded-full" />}
    </button>
  )
}

// ─── Product Edit Modal ────────────────────────────────────────────────────────
function ProductEditModal({ product, onClose, onSave }: { product: AdminProduct; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    title: product.title,
    description: product.description || '',
    price: String(product.price),
    stock: String(product.stock),
    status: product.status,
    is_on_sale: product.is_on_sale || false,
    sale_price: String(product.sale_price || ''),
    sale_label: product.sale_label || '',
    sale_starts_at: product.sale_starts_at ? product.sale_starts_at.slice(0, 16) : '',
    sale_ends_at: product.sale_ends_at ? product.sale_ends_at.slice(0, 16) : '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [images, setImages] = useState(product.product_images || [])

  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      const payload: any = {
        title: form.title.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        stock: parseInt(form.stock),
        status: form.status,
        is_on_sale: form.is_on_sale,
        sale_label: form.sale_label || null,
        sale_price: form.is_on_sale && form.sale_price ? parseFloat(form.sale_price) : null,
        sale_starts_at: form.is_on_sale && form.sale_starts_at ? new Date(form.sale_starts_at).toISOString() : null,
        sale_ends_at: form.is_on_sale && form.sale_ends_at ? new Date(form.sale_ends_at).toISOString() : null,
      }
      const { error } = await supabase.from('products').update(payload).eq('id', product.id)
      if (error) throw error
      onSave()
      onClose()
    } catch (err: any) { setError(err.message) } finally { setSaving(false) }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploadingImage(true)
    try {
      const url = await uploadProductImage(file)
      if (!url) throw new Error('Upload failed. Check storage bucket setup.')
      const { data: newImg } = await supabase.from('product_images').insert({ product_id: product.id, url, sort_order: images.length }).select().single()
      if (newImg) setImages(prev => [...prev, newImg])
    } catch (err: any) { setError(err.message) } finally { setUploadingImage(false) }
  }

  const handleDeleteImage = async (imgId: string) => {
    await supabase.from('product_images').delete().eq('id', imgId)
    setImages(prev => prev.filter(i => i.id !== imgId))
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-stone-100 px-8 py-6 flex items-center justify-between rounded-t-3xl">
          <h2 className="text-xl font-black text-slate-900">Edit Product</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-stone-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-8 space-y-6">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm font-medium">{error}</div>}

          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-stone-400">Basic Info</h3>
            <Input label="Title" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} />
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-stone-400 mb-2">Description</label>
              <textarea rows={4} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-stone-50 focus:bg-white focus:border-slate-900 outline-none transition-all text-sm" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Price (R)" type="number" value={form.price} onChange={e => setForm(p => ({...p, price: e.target.value}))} />
              <Input label="Stock" type="number" value={form.stock} onChange={e => setForm(p => ({...p, stock: e.target.value}))} />
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-stone-400 mb-2">Status</label>
                <select value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))} className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-stone-50 font-bold text-sm outline-none">
                  <option value="pending">Pending</option><option value="approved">Approved</option><option value="hidden">Hidden</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sale Settings */}
          <div className="space-y-4 border-t border-stone-100 pt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-stone-400">Sale / Discount</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <div className={`relative w-12 h-6 rounded-full transition-colors ${form.is_on_sale ? 'bg-emerald-500' : 'bg-stone-200'}`} onClick={() => setForm(p => ({...p, is_on_sale: !p.is_on_sale}))}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.is_on_sale ? 'left-7' : 'left-1'}`} />
                </div>
                <span className="text-xs font-bold text-slate-900">{form.is_on_sale ? 'On Sale' : 'Off'}</span>
              </label>
            </div>
            {form.is_on_sale && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                <Input label="Sale Price (R)" type="number" value={form.sale_price} onChange={e => setForm(p => ({...p, sale_price: e.target.value}))} />
                <Input label="Sale Label" value={form.sale_label} placeholder="e.g. FLASH SALE" onChange={e => setForm(p => ({...p, sale_label: e.target.value}))} />
                <Input label="Sale Starts" type="datetime-local" value={form.sale_starts_at} onChange={e => setForm(p => ({...p, sale_starts_at: e.target.value}))} />
                <Input label="Sale Ends" type="datetime-local" value={form.sale_ends_at} onChange={e => setForm(p => ({...p, sale_ends_at: e.target.value}))} />
              </div>
            )}
          </div>

          {/* Images */}
          <div className="space-y-4 border-t border-stone-100 pt-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-stone-400">Product Images</h3>
            <div className="flex flex-wrap gap-3">
              {images.map(img => (
                <div key={img.id} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-stone-200">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => handleDeleteImage(img.id)} className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="h-4 w-4 text-white" />
                  </button>
                </div>
              ))}
              <label className={`w-20 h-20 border-2 border-dashed border-stone-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-slate-900 hover:bg-stone-50 transition-all ${uploadingImage ? 'opacity-50' : ''}`}>
                {uploadingImage ? <RefreshCw className="h-5 w-5 text-stone-400 animate-spin" /> : <Upload className="h-5 w-5 text-stone-400" />}
                <span className="text-[10px] text-stone-400 mt-1">Add</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
              </label>
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white border-t border-stone-100 px-8 py-5 flex justify-end gap-3 rounded-b-3xl">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="px-8">
            {saving ? <RefreshCw className="animate-spin h-4 w-4" /> : <><Save className="h-4 w-4 mr-2" />Save Changes</>}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── KYC Review Modal ──────────────────────────────────────────────────────────
function KYCModal({ sub, onClose, onReview, approveKYC, rejectKYC }: { sub: AdminKYC; onClose: () => void; onReview: () => void; approveKYC: any; rejectKYC: any }) {
  const [processing, setProcessing] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const [urls, setUrls] = useState({ doc: sub.document_url, selfie: sub.selfie_url })

  useEffect(() => {
    const sign = async () => {
      try {
        const getPath = (url: string) => {
          if (!url) return null
          // Plain path (no http) — use directly as storage path
          if (!url.startsWith('http')) return url
          // Legacy full URL — extract path after bucket name
          if (url.includes('kyc-documents/')) return url.split('kyc-documents/')[1]
          return url
        }

        const docPath = getPath(sub.document_url)
        const selfiePath = getPath(sub.selfie_url)

        const [docRes, selfieRes] = await Promise.all([
          docPath ? supabase.storage.from('kyc-documents').createSignedUrl(docPath, 3600) : null,
          selfiePath ? supabase.storage.from('kyc-documents').createSignedUrl(selfiePath, 3600) : null
        ])

        setUrls({
          doc: docRes?.data?.signedUrl || sub.document_url,
          selfie: selfieRes?.data?.signedUrl || sub.selfie_url
        })
      } catch (err) {
        console.error('Error signing KYC URLs:', err)
      }
    }
    sign()
  }, [sub])

  const handle = async (status: 'approved' | 'rejected') => {
    setProcessing(true)
    try {
      if (status === 'approved') {
        await approveKYC(sub.id, sub.user_id)
      } else {
        await rejectKYC(sub.id, sub.user_id)
      }
    } catch (err) {
      console.error('Error reviewing KYC:', err)
    } finally {
      setProcessing(false)
      onReview()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-8 py-6 border-b border-stone-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-amber-50 text-amber-600 p-2 rounded-xl">
              <ShieldAlert size={20} />
            </div>
            <h2 className="text-xl font-black text-slate-900">KYC Verification</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-stone-100 text-stone-400 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-5 p-5 bg-stone-50 rounded-3xl border border-stone-100">
            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-slate-900/20">
              {sub.profiles?.full_name?.charAt(0) || '?'}
            </div>
            <div className="flex-1">
              <p className="font-black text-slate-900 text-lg leading-tight">{sub.profiles?.full_name || 'Unknown User'}</p>
              <p className="text-sm text-stone-500 font-medium">{sub.profiles?.email || 'No email provided'}</p>
              <div className="flex items-center gap-2 mt-2">
                <Clock size={12} className="text-stone-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                  {new Date(sub.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
            <Badge variant={sub.status === 'approved' ? 'success' : sub.status === 'rejected' ? 'error' : 'warning'} className="rounded-xl px-4 py-1.5 border-2">
              {sub.status.toUpperCase()}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-5 bg-blue-50/50 rounded-3xl border border-blue-100/50">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">Government ID Number</p>
              <p className="font-black text-xl text-slate-900 tracking-wider">
                {sub.id_number || 'STILL_NOT_SET'}
              </p>
            </div>
            <div className="p-5 bg-stone-50 rounded-3xl border border-stone-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Internal Identity ID</p>
              <p className="font-mono text-[10px] text-stone-500 truncate">{sub.user_id}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {urls.doc && (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 px-1">ID Document Scan</p>
                <a href={urls.doc} target="_blank" rel="noopener noreferrer" className="relative block rounded-3xl overflow-hidden border-2 border-stone-100 hover:border-slate-900 transition-all group aspect-video bg-stone-100">
                  <img src={urls.doc} alt="ID" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Document+Not+Available' }} />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="bg-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-900">Inspect Full Size</span>
                  </div>
                </a>
              </div>
            )}
            {urls.selfie && (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 px-1">Identity Selfie</p>
                <a href={urls.selfie} target="_blank" rel="noopener noreferrer" className="relative block rounded-3xl overflow-hidden border-2 border-stone-100 hover:border-slate-900 transition-all group aspect-video bg-stone-100">
                  <img src={urls.selfie} alt="Selfie" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Selfie+Not+Available' }} />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="bg-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-900">Inspect Full Size</span>
                  </div>
                </a>
              </div>
            )}
          </div>

          {sub.status === 'pending' && (
            <div className="pt-4 border-t border-stone-100">
              <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3 ml-1">Rejection Feedback (Required if rejecting)</label>
              <textarea rows={3} value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} className="w-full px-5 py-4 rounded-[1.5rem] border-2 border-stone-100 bg-stone-50 focus:bg-white focus:border-slate-900 outline-none transition-all text-sm font-medium" placeholder="E.g. Address mismatch or blurry image..." />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-stone-50 border-t border-stone-100 flex items-center justify-end gap-4 sticky bottom-0 z-10">
          <Button variant="outline" className="rounded-2xl px-6 py-2 border-stone-200" onClick={onClose}>
            Dismiss
          </Button>
          
          {sub.status === 'pending' && (
            <>
              <Button variant="outline" className="rounded-2xl px-6 py-2 text-red-600 border-red-100 hover:bg-red-50 hover:border-red-200" onClick={() => handle('rejected')} disabled={processing || !rejectionReason.trim()}>
                {processing ? <RefreshCw className="animate-spin h-4 w-4" /> : <><ShieldAlert className="h-4 w-4 mr-2" />Reject</>}
              </Button>
              <Button className="rounded-2xl px-8 py-2 bg-slate-900 text-white shadow-xl shadow-slate-900/20 hover:bg-black transition-all" onClick={() => handle('approved')} disabled={processing}>
                {processing ? <RefreshCw className="animate-spin h-4 w-4" /> : <><CheckCircle className="h-4 w-4 mr-2" />Approve Candidate</>}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Store Actions Modal ───────────────────────────────────────────────────────
function StoreActionModal({ seller, onClose, onDone, deleteStore, toggleSellerStatus }: {
  seller: AdminSeller
  onClose: () => void
  onDone: () => void
  deleteStore: (id: string) => Promise<{ error: string | null }>
  toggleSellerStatus: (id: string, current: string) => Promise<void>
}) {
  const [confirmStep, setConfirmStep] = useState<0 | 1 | 2>(0)
  const [deleting, setDeleting] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState('')

  const handleToggle = async () => {
    setToggling(true)
    await toggleSellerStatus(seller.id, seller.status)
    setToggling(false)
    onDone()
    onClose()
  }

  const handleDelete = async () => {
    if (confirmText.trim().toUpperCase() !== 'DELETE') return
    setDeleting(true)
    setDeleteError(null)
    const { error } = await deleteStore(seller.id)
    setDeleting(false)
    if (error) { setDeleteError(error); return }
    onDone()
    onClose()
  }

  const isActive = seller.status === 'active'
  const isSuspended = seller.status === 'suspended'

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-8 py-6 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-lg flex-shrink-0">
              {(seller.store_name || 'U').charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 leading-tight">{seller.store_name || 'Unnamed Store'}</h2>
              <p className="text-xs text-stone-400 font-medium">{seller.profiles?.email || seller.profiles?.full_name || 'Unknown owner'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-stone-100 text-stone-400 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Store Info */}
        <div className="px-8 py-5 grid grid-cols-2 gap-3">
          <div className="bg-stone-50 rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Status</p>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
              seller.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
              seller.status === 'pending' ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                seller.status === 'active' ? 'bg-emerald-500' :
                seller.status === 'pending' ? 'bg-amber-500' : 'bg-red-500'
              }`} />
              {seller.status.toUpperCase()}
            </div>
          </div>
          <div className="bg-stone-50 rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">KYC</p>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
              seller.kyc_status === 'approved' || seller.kyc_status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
              seller.kyc_status === 'rejected' ? 'bg-red-100 text-red-700' :
              'bg-amber-100 text-amber-700'
            }`}>
              {(seller.kyc_status || 'pending').toUpperCase()}
            </div>
          </div>
          <div className="bg-stone-50 rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Type</p>
            <p className="text-sm font-bold text-slate-900 capitalize">{seller.seller_type || 'product'}</p>
          </div>
          <div className="bg-stone-50 rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Joined</p>
            <p className="text-sm font-bold text-slate-900">{new Date(seller.created_at).toLocaleDateString('en-ZA')}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 space-y-3">
          {/* Approve / Suspend / Reactivate */}
          {confirmStep === 0 && (
            <>
              {seller.status === 'pending' && (
                <button
                  onClick={handleToggle}
                  disabled={toggling}
                  className="w-full flex items-center gap-4 p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl text-left transition-all group"
                >
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                    {toggling ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-black text-emerald-900 text-sm">Approve Store</p>
                    <p className="text-xs text-emerald-700">Activate this store so it goes live on the marketplace</p>
                  </div>
                </button>
              )}
              {isActive && (
                <button
                  onClick={handleToggle}
                  disabled={toggling}
                  className="w-full flex items-center gap-4 p-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-2xl text-left transition-all group"
                >
                  <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                    {toggling ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-black text-amber-900 text-sm">Suspend Store</p>
                    <p className="text-xs text-amber-700">Temporarily hide this store and its products from buyers</p>
                  </div>
                </button>
              )}
              {isSuspended && (
                <button
                  onClick={handleToggle}
                  disabled={toggling}
                  className="w-full flex items-center gap-4 p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-2xl text-left transition-all group"
                >
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                    {toggling ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-black text-emerald-900 text-sm">Reactivate Store</p>
                    <p className="text-xs text-emerald-700">Restore this store to active status on the marketplace</p>
                  </div>
                </button>
              )}

              {/* Divider */}
              <div className="border-t border-stone-100 my-2" />

              {/* Delete (danger zone) */}
              <button
                onClick={() => setConfirmStep(1)}
                className="w-full flex items-center gap-4 p-4 bg-red-50 hover:bg-red-100 border border-red-200 rounded-2xl text-left transition-all group"
              >
                <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                  <Trash2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-black text-red-900 text-sm">Delete Store Permanently</p>
                  <p className="text-xs text-red-700">Remove store, all products, images and KYC data — irreversible</p>
                </div>
              </button>
            </>
          )}

          {/* Confirm Step 1 — Warning */}
          {confirmStep === 1 && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-red-900 text-sm mb-1">This action is permanent and cannot be undone.</p>
                    <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
                      <li>All products and their images will be deleted</li>
                      <li>All product likes will be removed</li>
                      <li>KYC submissions will be erased</li>
                      <li>The store profile will be permanently removed</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-stone-400">
                  Type <span className="text-red-600 font-mono">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-4 py-3 rounded-xl border-2 border-red-200 bg-red-50 focus:bg-white focus:border-red-500 outline-none transition-all text-sm font-mono font-bold text-red-900 placeholder:text-red-200"
                  autoFocus
                />
              </div>
              {deleteError && (
                <div className="bg-red-100 border border-red-300 text-red-800 rounded-xl p-3 text-xs font-medium">
                  {deleteError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => { setConfirmStep(0); setConfirmText(''); setDeleteError(null) }}
                  className="flex-1 py-3 rounded-2xl border-2 border-stone-200 text-stone-600 font-black text-sm hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting || confirmText.trim().toUpperCase() !== 'DELETE'}
                  className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-black text-sm hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {deleting ? <><RefreshCw className="h-4 w-4 animate-spin" /> Deleting...</> : <><Trash2 className="h-4 w-4" /> Delete Forever</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Admin Dashboard ──────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { stats, sellers: rawSellers, products: rawProducts, kycList: rawKyc, fetchDashboard, fetchProducts, fetchKYC, approveKYC, rejectKYC, toggleSellerStatus, deleteStore, loadingStats, loadingKyc } = useAdminStore()
  
  const loading = loadingStats || loadingKyc
  const sellers = rawSellers as AdminSeller[]
  const products = rawProducts as AdminProduct[]
  const kyc = rawKyc as AdminKYC[]

  const [tab, setTab] = useState<'overview' | 'sellers' | 'products' | 'kyc'>('overview')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null)
  const [reviewingKYC, setReviewingKYC] = useState<AdminKYC | null>(null)
  const [managingSeller, setManagingSeller] = useState<AdminSeller | null>(null)

  useEffect(() => { 
    window.scrollTo(0, 0)
    loadAll() 
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab])

  const loadAll = async () => {
    await Promise.all([
      fetchDashboard(),
      fetchProducts(),
      fetchKYC('all')
    ])
  }

  const handleApproveStore = async (id: string) => {
    await toggleSellerStatus(id, 'suspended') // 'suspended' toggles to 'active' in the store
  }

  const handleToggleStore = async (id: string, current: string) => {
    await toggleSellerStatus(id, current)
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Permanently delete this product? This cannot be undone.')) return
    await supabase.from('products').delete().eq('id', id)
    loadAll()
  }

  const handleToggleProductStatus = async (id: string, current: string) => {
    const next = current === 'approved' ? 'hidden' : 'approved'
    await supabase.from('products').update({ status: next }).eq('id', id)
    loadAll()
  }

  const handleApproveAllPending = async () => {
    const pendingCount = products.filter(p => p.status === 'pending').length
    if (pendingCount === 0) return
    if (!confirm(`Approve all ${pendingCount} pending products and publish them to the marketplace?`)) return
    await supabase.from('products').update({ status: 'approved' }).eq('status', 'pending')
    // Also activate pending stores
    await supabase.from('seller_profiles').update({ status: 'active' }).eq('status', 'pending')
    loadAll()
  }

  const filteredProducts = products.filter(p => {
    const matchSearch = !search || (p.title || '').toLowerCase().includes(search.toLowerCase()) || (p.seller_store?.store_name || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchStatus
  })
  const filteredSellers = sellers.filter(s => !search || (s.store_name || '').toLowerCase().includes(search.toLowerCase()) || (s.profiles?.full_name || '').toLowerCase().includes(search.toLowerCase()))
  const filteredKYC = kyc.filter(k => statusFilter === 'all' || k.status === statusFilter)

  const pendingSellers = sellers.filter(s => s.status === 'pending')

  if (loading) return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <Skeleton className="h-10 w-64 mb-8" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">{[...Array(7)].map((_, i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}</div>
      <Skeleton className="h-96 rounded-3xl" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F9F8F6]">
      {editingProduct && <ProductEditModal product={editingProduct} onClose={() => setEditingProduct(null)} onSave={loadAll} />}
      {reviewingKYC && <KYCModal sub={reviewingKYC} onClose={() => setReviewingKYC(null)} onReview={loadAll} approveKYC={approveKYC} rejectKYC={rejectKYC} />}
      {managingSeller && <StoreActionModal seller={managingSeller} onClose={() => setManagingSeller(null)} onDone={loadAll} deleteStore={deleteStore} toggleSellerStatus={toggleSellerStatus} />}

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-12">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-stone-400 mb-2"><Activity className="h-3 w-3" /> Command Centre</div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            {(stats?.pendingKyc ?? 0) > 0 && (
              <button onClick={() => setTab('kyc')} className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full text-amber-700 text-xs font-black hover:bg-amber-100 transition-colors">
                <Bell className="h-3.5 w-3.5 animate-pulse" />{stats?.pendingKyc} KYC pending
              </button>
            )}
            {pendingSellers.length > 0 && (
              <button onClick={() => setTab('sellers')} className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-blue-700 text-xs font-black hover:bg-blue-100 transition-colors">
                <Bell className="h-3.5 w-3.5 animate-pulse" />{pendingSellers.length} new sellers
              </button>
            )}
            <Button variant="outline" size="sm" onClick={loadAll} className="rounded-full"><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-12 max-w-full overflow-hidden">
          <StatCard icon={<Users className="h-5 w-5" />} label="Sellers" value={stats?.totalSellers ?? 0} sub={`+${stats?.newSellers7d ?? 0} this week`} />
          <StatCard icon={<ShoppingBag className="h-5 w-5" />} label="Products" value={stats?.totalProducts ?? 0} />
          <StatCard icon={<BarChart3 className="h-5 w-5" />} label="Orders" value={stats?.totalOrders ?? 0} />
          <StatCard icon={<DollarSign className="h-5 w-5" />} label="Revenue" value={`R${Math.round(stats?.totalRevenue ?? 0).toLocaleString()}`} color="bg-emerald-600" />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Commission" value={`R${Math.round(stats?.totalCommission ?? 0).toLocaleString()}`} color="bg-blue-600" />
          <StatCard icon={<ShieldAlert className="h-5 w-5" />} label="Pending KYC" value={stats?.pendingKyc ?? 0} color={(stats?.pendingKyc ?? 0) > 0 ? "bg-amber-500" : "bg-stone-400"} />
          <StatCard icon={<Package className="h-5 w-5" />} label="Pending Products" value={products.filter(p => p.status === 'pending').length} color={products.filter(p => p.status === 'pending').length > 0 ? "bg-rose-500" : "bg-stone-400"} />
        </div>

        {/* Tabs */}
        <div className="flex gap-8 border-b border-stone-200 mb-8 overflow-x-auto whitespace-nowrap scrollbar-hide">
          <TabBtn active={tab === 'overview'} onClick={() => setTab('overview')} label="Overview" count={0} />
          <TabBtn active={tab === 'sellers'} onClick={() => setTab('sellers')} label="Stores" count={pendingSellers.length} />
          <TabBtn active={tab === 'products'} onClick={() => setTab('products')} label="Products" count={products.filter(p => p.status === 'pending').length} />
          <TabBtn active={tab === 'kyc'} onClick={() => setTab('kyc')} label="KYC Reviews" count={stats?.pendingKyc ?? 0} />
        </div>

        {/* Search & Filter */}
        {tab !== 'overview' && (
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${tab}...`} className="w-full pl-12 pr-4 py-3 bg-white border border-stone-200 rounded-full text-sm font-medium focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all" />
            </div>
            {(tab === 'products' || tab === 'kyc') && (
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-3 bg-white border border-stone-200 rounded-full text-sm font-bold outline-none focus:border-slate-900">
                <option value="all">All Statuses</option>
                {tab === 'products' ? <><option value="pending">Pending</option><option value="approved">Approved</option><option value="hidden">Hidden</option></> : <><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></>}
              </select>
            )}
          </div>
        )}

        {/* ── OVERVIEW ──────────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Stores */}
            <Card className="p-0 overflow-hidden border-stone-100 shadow-sm">
              <div className="px-6 py-5 border-b border-stone-50 flex items-center justify-between">
                <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">Recent Registrations</h3>
                <button onClick={() => setTab('sellers')} className="text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-slate-900">View All →</button>
              </div>
              <div className="divide-y divide-stone-50">
                {sellers.slice(0, 5).map(s => (
                  <div key={s.id} className="px-6 py-4 flex items-center gap-4 hover:bg-stone-50 transition-colors">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0">{(s.store_name || 'U').charAt(0)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 truncate">{s.store_name || 'Unnamed Store'}</p>
                      <p className="text-xs text-stone-400 truncate">{s.profiles?.full_name || 'Unknown'}</p>
                    </div>
                    <Badge variant={s.status === 'active' ? 'success' : s.status === 'pending' ? 'warning' : 'error'} className="rounded-full text-[10px] font-black flex-shrink-0">{s.status}</Badge>
                  </div>
                ))}
              </div>
            </Card>
            {/* Recent Products */}
            <Card className="p-0 overflow-hidden border-stone-100 shadow-sm">
              <div className="px-6 py-5 border-b border-stone-50 flex items-center justify-between">
                <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">Recent Products</h3>
                <button onClick={() => setTab('products')} className="text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-slate-900">View All →</button>
              </div>
              <div className="divide-y divide-stone-50">
                {products.slice(0, 5).map(p => (
                  <div key={p.id} className="px-6 py-4 flex items-center gap-4 hover:bg-stone-50 transition-colors">
                    {p.product_images?.[0] ? <img src={p.product_images[0].url} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" alt="" /> : <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center flex-shrink-0"><Package className="h-5 w-5 text-stone-300" /></div>}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 truncate">{p.title}</p>
                      <p className="text-xs text-stone-400 truncate">{p.seller_store?.store_name} · R{p.price.toLocaleString()}</p>
                    </div>
                    <Badge variant={p.status === 'approved' ? 'success' : p.status === 'pending' ? 'warning' : 'error'} className="rounded-full text-[10px] font-black flex-shrink-0">{p.status}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ── STORES ────────────────────────────────────────────────────────── */}
        {tab === 'sellers' && (
          <Card className="p-0 overflow-hidden border-stone-100 shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-stone-50 border-b border-stone-100">
                  <tr>
                    {['Store', 'Owner', 'Type', 'Status', 'KYC', 'Joined', 'Manage'].map(h => (
                      <th key={h} className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-stone-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-stone-50">
                  {filteredSellers.map(s => (
                    <tr key={s.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-sm">{(s.store_name || 'U').charAt(0)}</div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{s.store_name || 'Unnamed Store'}</p>
                            <p className="text-[10px] text-stone-400">{s.category || '–'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-700">{s.profiles?.full_name || 'N/A'}</p>
                        <p className="text-[10px] text-stone-400">{s.profiles?.email || '–'}</p>
                      </td>
                      <td className="px-6 py-4"><Badge variant="outline" className="rounded-full text-[10px] font-black capitalize">{s.seller_type || 'product'}</Badge></td>
                      <td className="px-6 py-4"><Badge variant={s.status === 'active' ? 'success' : s.status === 'pending' ? 'warning' : 'error'} className="rounded-full text-[10px] font-black">{s.status}</Badge></td>
                      <td className="px-6 py-4"><Badge variant={s.kyc_status === 'verified' || s.kyc_status === 'approved' ? 'success' : s.kyc_status === 'rejected' ? 'error' : 'warning'} className="rounded-full text-[10px] font-black">{s.kyc_status || 'pending'}</Badge></td>
                      <td className="px-6 py-4 text-xs text-stone-400 whitespace-nowrap">{new Date(s.created_at).toLocaleDateString('en-ZA')}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setManagingSeller(s)}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all hover:shadow-sm ${
                            s.status === 'pending'
                              ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                              : s.status === 'active'
                              ? 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                              : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                          }`}
                        >
                          <MoreVertical className="h-3 w-3" />
                          {s.status === 'pending' ? 'Review' : 'Manage'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredSellers.length === 0 && <tr><td colSpan={7} className="px-6 py-20 text-center text-stone-400 text-sm font-medium">No stores found.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ── PRODUCTS ──────────────────────────────────────────────────────── */}
        {tab === 'products' && (
          <div>
            {/* Bulk approve banner */}
            {products.filter(p => p.status === 'pending').length > 0 && (
              <div className="flex items-center gap-4 mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl">
                <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Package className="h-5 w-5 text-rose-600" />
                </div>
                <div className="flex-1">
                  <p className="font-black text-rose-900 text-sm">{products.filter(p => p.status === 'pending').length} products awaiting approval — hidden from marketplace</p>
                  <p className="text-xs text-rose-700">Click Approve All to publish them now, or approve individually in the table below.</p>
                </div>
                <Button onClick={handleApproveAllPending} className="bg-rose-600 hover:bg-rose-700 rounded-full px-6 shrink-0">
                  <CheckCircle className="h-4 w-4 mr-2" />Approve All Pending
                </Button>
              </div>
            )}
            <Card className="p-0 overflow-hidden border-stone-100 shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-stone-50 border-b border-stone-100">
                  <tr>
                    {['Product', 'Store', 'Price', 'Stock', 'Status', 'Sale', 'Added', 'Actions'].map(h => (
                      <th key={h} className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-stone-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-stone-50">
                  {filteredProducts.map(p => (
                    <tr key={p.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {p.product_images?.[0] ? <img src={p.product_images[0].url} className="w-10 h-10 rounded-xl object-cover flex-shrink-0" alt="" /> : <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center flex-shrink-0"><Package className="h-4 w-4 text-stone-300" /></div>}
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-sm truncate max-w-[180px]">{p.title}</p>
                            <p className="text-[10px] text-stone-400">{p.category?.name || 'No category'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium whitespace-nowrap">{p.seller_store?.store_name || '—'}</td>
                      <td className="px-6 py-4 font-black text-slate-900 text-sm whitespace-nowrap">R{p.price.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-bold ${p.stock === 0 ? 'text-red-500' : p.stock < 5 ? 'text-amber-500' : 'text-emerald-600'}`}>{p.stock}</span>
                      </td>
                      <td className="px-6 py-4"><Badge variant={p.status === 'approved' ? 'success' : p.status === 'pending' ? 'warning' : 'error'} className="rounded-full text-[10px] font-black">{p.status}</Badge></td>
                      <td className="px-6 py-4">{p.is_on_sale ? <Badge variant="warning" className="rounded-full text-[10px] font-black"><Tag className="h-2.5 w-2.5 mr-1" />ON SALE</Badge> : <span className="text-stone-300 text-[10px]">—</span>}</td>
                      <td className="px-6 py-4 text-xs text-stone-400 whitespace-nowrap">{new Date(p.created_at).toLocaleDateString('en-ZA')}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="rounded-full hover:bg-stone-100 text-slate-600" onClick={() => setEditingProduct(p)}><Edit3 className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" className={`rounded-full ${p.status === 'approved' ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`} onClick={() => handleToggleProductStatus(p.id, p.status)}>
                            {p.status === 'approved' ? <Eye className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                          </Button>
                          <Button size="sm" variant="ghost" className="rounded-full text-rose-500 hover:bg-rose-50" onClick={() => handleDeleteProduct(p.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && <tr><td colSpan={8} className="px-6 py-20 text-center text-stone-400 text-sm font-medium">No products found.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
          </div>
        )}

        {/* ── KYC ───────────────────────────────────────────────────────────── */}
        {tab === 'kyc' && (
          <div className="space-y-4">
            {filteredKYC.length === 0 && (
              <Card className="p-20 text-center border-stone-100">
                <CheckCircle className="h-12 w-12 text-stone-200 mx-auto mb-4" />
                <p className="text-stone-400 font-medium">All caught up! No matching KYC submissions.</p>
              </Card>
            )}
            {filteredKYC.map(k => (
              <Card key={k.id} className="p-6 border-stone-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-white font-black text-lg flex-shrink-0">{k.profiles?.full_name?.charAt(0) || '?'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900">{k.profiles?.full_name || 'Unknown'}</p>
                    <p className="text-sm text-stone-500">{k.profiles?.email || k.user_id.slice(0, 12)}</p>
                    <p className="text-xs text-stone-400 mt-1">Submitted {new Date(k.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={k.status === 'approved' ? 'success' : k.status === 'rejected' ? 'error' : 'warning'} className="rounded-full font-black capitalize">{k.status}</Badge>
                    <Button size="sm" className="rounded-full" onClick={() => setReviewingKYC(k)}>
                      <Eye className="h-4 w-4 mr-2" />Review
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
