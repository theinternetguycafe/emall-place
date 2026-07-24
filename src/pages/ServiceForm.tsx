import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Category } from '../types'
import { Save, X, Loader2, ArrowLeft } from 'lucide-react'
import ErrorAlert from '../components/ErrorAlert'
import SuccessAlert from '../components/SuccessAlert'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { validateServicePayload } from '../lib/domainValidators'

export default function ServiceForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(!!id)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    base_rate: '',
    category_id: '',
  })

  useEffect(() => {
    fetchCategories()
    if (id) fetchService()
  }, [id])

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .in('domain_type', ['service', 'both'])
      .order('name')
    if (!error && data) setCategories(data)
  }

  const fetchService = async () => {
    try {
      const { data, error: sError } = await supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .single()

      if (sError) throw sError
      
      setFormData({
        title: data.title,
        description: data.description || '',
        base_rate: data.base_rate.toString(),
        category_id: data.category_id || '',
      })
    } catch (err: any) {
      console.error('Error fetching service:', err)
      setError('Failed to load service details.')
    } finally {
      setFetching(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const { data: sellerProfile, error: sError } = await supabase
        .from('seller_profiles')
        .select('id, latitude, longitude, seller_type')
        .eq('user_id', profile!.id)
        .single()

      if (sError || !sellerProfile) throw new Error('Could not find your seller profile. Please contact support.')

      // Phase 1.5: Strict Domain Validation
      validateServicePayload({
        title: formData.title,
        base_rate: parseFloat(formData.base_rate)
      }, sellerProfile.seller_type)

      const servicePayload = {
        seller_id: sellerProfile.id,
        title: formData.title,
        description: formData.description,
        base_rate: parseFloat(formData.base_rate),
        category_id: formData.category_id || null,
        status: 'approved',
        is_active: true,
        latitude: sellerProfile.latitude || null,
        longitude: sellerProfile.longitude || null
      }

      if (id) {
        const { error: uError } = await supabase
          .from('services')
          .update(servicePayload)
          .eq('id', id)
        if (uError) throw uError
      } else {
        const { error: iError } = await supabase
          .from('services')
          .insert(servicePayload)
        if (iError) throw iError
      }

      setSuccess(id ? 'Service updated successfully!' : 'Service published successfully!')
      
      setTimeout(() => {
        navigate('/seller')
      }, 1500)
    } catch (err: any) {
      console.error('Error saving service:', err)
      setError(err.message || 'An error occurred while saving the service.')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-slate-900" size={32} /></div>
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <div className="bg-slate-900 text-white pt-8 pb-32">
        <div className="container mx-auto px-4 max-w-3xl">
          <button onClick={() => navigate(-1)} className="flex items-center text-stone-400 hover:text-white transition-colors mb-6 text-sm font-medium">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </button>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight">{id ? 'Edit Service' : 'Add New Service'}</h1>
          <p className="text-stone-400 mt-4 text-lg">Define your service offering and pricing structure.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-3xl -mt-20 relative z-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <ErrorAlert message={error} />}
          {success && <SuccessAlert message={success} />}

          <Card className="p-8">
            <div className="space-y-6">
              <Input
                label="Service Title"
                placeholder="e.g. Professional Plumbing, House Cleaning..."
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block ml-1">
                  Description
                </label>
                <textarea
                  className="w-full px-4 py-3 rounded-2xl bg-stone-100/50 border-2 border-stone-100 focus:border-slate-900 focus:bg-white outline-none transition-all resize-y min-h-[120px]"
                  placeholder="Describe your service in detail..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Base Rate / Minimum Quote (R)"
                  type="number"
                  placeholder="0.00"
                  value={formData.base_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, base_rate: e.target.value }))}
                  required
                />

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block ml-1">
                    Service Category
                  </label>
                  <select
                    className="w-full h-12 px-4 rounded-xl bg-stone-100/50 border-2 border-stone-100 focus:border-slate-900 focus:bg-white outline-none transition-all font-medium text-slate-900 appearance-none cursor-pointer"
                    value={formData.category_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate(-1)} className="rounded-full px-8 border-stone-200">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="rounded-full px-8 shadow-xl shadow-slate-900/10">
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <><Save className="w-4 h-4 mr-2" /> Publish Service</>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
