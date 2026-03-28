import React, { useEffect, useState } from 'react'
import { SellerStore, StorePolicies, Product } from '../../types'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { Upload, Save, Star } from 'lucide-react'
import SuccessAlert from '../SuccessAlert'
import ErrorAlert from '../ErrorAlert'

interface StoreSettingsFormProps {
  store: SellerStore | null
  onSaved?: (updatedStore: SellerStore) => void
}

export default function StoreSettingsForm({ store, onSaved }: StoreSettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])

  const [formData, setFormData] = useState({
    store_name: '',
    tagline: '',
    description: '',
    seller_phone: '',
    seller_email: '',
    seller_location: '',
    announcement_text: '',
    theme_color: '#10b981',
  })

  const [policies, setPolicies] = useState<StorePolicies>({
    shipping: '',
    returns: '',
    warranty: '',
  })

  const [featuredProductIds, setFeaturedProductIds] = useState<string[]>([])
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [bannerPreview, setBannerPreview] = useState<string>('')

  useEffect(() => {
    if (!store) {
      return
    }

    setFormData({
      store_name: store.store_name || '',
      tagline: store.tagline || '',
      description: store.description || '',
      seller_phone: store.seller_phone || '',
      seller_email: store.seller_email || '',
      seller_location: store.seller_location || '',
      announcement_text: store.announcement_text || '',
      theme_color: store.theme_color || '#10b981',
    })

    setPolicies(
      store.store_policies || {
        shipping: '',
        returns: '',
        warranty: '',
      }
    )
    setFeaturedProductIds(store.featured_product_ids || [])
    setLogoPreview(store.logo_url || '')
    setBannerPreview(store.banner_url || '')
  }, [store])

  useEffect(() => {
    const fetchProducts = async () => {
      if (!store?.id) {
        setAvailableProducts([])
        return
      }

      setIsLoadingProducts(true)
      const { data, error } = await supabase
        .from('products')
        .select('*, product_images(*)')
        .eq('seller_store_id', store.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching store products:', error)
        setAvailableProducts([])
      } else {
        setAvailableProducts(data || [])
      }
      setIsLoadingProducts(false)
    }

    fetchProducts()
  }, [store?.id])

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target
    setFormData(previous => ({
      ...previous,
      [name]: value,
    }))
  }

  const handlePolicyChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = event.target
    setPolicies(previous => ({
      ...previous,
      [name]: value,
    }))
  }

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    setFile: (file: File | null) => void,
    setPreview: (preview: string) => void
  ) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const uploadFile = async (file: File, bucket: string): Promise<string | null> => {
    const fileName = `${store?.id}/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from(bucket).upload(fileName, file)

    if (error) {
      if (error.message?.includes('bucket not found')) {
        throw new Error(`Storage bucket "${bucket}" not found. Please run the initialize_storage_buckets.sql script in your Supabase SQL Editor.`)
      }
      throw new Error(`Failed to upload file: ${error.message}`)
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(fileName)

    return publicUrl
  }

  const toggleFeaturedProduct = (productId: string) => {
    setFeaturedProductIds(previous => {
      if (previous.includes(productId)) {
        return previous.filter(id => id !== productId)
      }

      if (previous.length >= 4) {
        return previous
      }

      return [...previous, productId]
    })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      if (!store) {
        throw new Error('Store not found')
      }

      let logoUrl = store.logo_url
      let bannerUrl = store.banner_url

      if (logoFile) {
        logoUrl = await uploadFile(logoFile, 'store-logos')
      }

      if (bannerFile) {
        bannerUrl = await uploadFile(bannerFile, 'store-banners')
      }

      const { data, error } = await supabase
        .from('seller_stores')
        .update({
          store_name: formData.store_name,
          tagline: formData.tagline,
          description: formData.description,
          seller_phone: formData.seller_phone,
          seller_email: formData.seller_email,
          seller_location: formData.seller_location,
          announcement_text: formData.announcement_text,
          theme_color: formData.theme_color,
          logo_url: logoUrl,
          banner_url: bannerUrl,
          store_policies: policies,
          featured_product_ids: featuredProductIds,
        })
        .eq('id', store.id)
        .select()
        .single()

      if (error) {
        throw error
      }

      setSuccessMessage('Store settings updated successfully!')
      setLogoFile(null)
      setBannerFile(null)
      onSaved?.(data)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      console.error('Error saving settings:', err)
      setErrorMessage(err.message || 'Failed to save store settings')
    } finally {
      setIsLoading(false)
    }
  }

  if (!store) {
    return null
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {successMessage && (
        <SuccessAlert
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
        />
      )}

      {errorMessage && (
        <ErrorAlert message={errorMessage} onClose={() => setErrorMessage(null)} />
      )}

      <Card className="space-y-6 p-6">
        <div>
          <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">
            Basic Information
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Manage the public identity customers see on your storefront.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-900">
              Store Name
            </label>
            <Input
              type="text"
              name="store_name"
              value={formData.store_name}
              onChange={handleInputChange}
              required
              placeholder="Your Store Name"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-900">
              Tagline
            </label>
            <Input
              type="text"
              name="tagline"
              value={formData.tagline}
              onChange={handleInputChange}
              placeholder="Premium quality, delivered locally"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-slate-900">
            Store Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Tell customers about your store..."
            rows={4}
            className="w-full rounded-lg border border-stone-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </Card>

      <Card className="space-y-6 p-6">
        <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">
          Contact Information
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-900">
              Phone Number
            </label>
            <Input
              type="tel"
              name="seller_phone"
              value={formData.seller_phone}
              onChange={handleInputChange}
              placeholder="+27 123 456 7890"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-900">
              Email Address
            </label>
            <Input
              type="email"
              name="seller_email"
              value={formData.seller_email}
              onChange={handleInputChange}
              placeholder="shop@example.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-900">
              Location
            </label>
            <Input
              type="text"
              name="seller_location"
              value={formData.seller_location}
              onChange={handleInputChange}
              placeholder="City, Province"
            />
          </div>
        </div>
      </Card>

      <Card className="space-y-6 p-6">
        <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">
          Branding
        </h2>

        <div>
          <label className="mb-3 block text-sm font-bold text-slate-900">
            Store Logo
          </label>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-3">
              {logoPreview && (
                <div className="h-32 w-32 overflow-hidden rounded-lg border-2 border-stone-300 bg-stone-100">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="h-full w-full object-contain p-2"
                  />
                </div>
              )}
              <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 font-bold text-slate-900 transition-colors hover:bg-slate-200">
                <Upload className="h-4 w-4" />
                Choose Logo
                <input
                  type="file"
                  accept="image/*"
                  onChange={event => handleFileChange(event, setLogoFile, setLogoPreview)}
                  className="hidden"
                />
              </label>
            </div>
            <div className="text-sm text-stone-600">
              <p className="mb-2 font-bold">Logo Requirements:</p>
              <ul className="list-inside list-disc space-y-1">
                <li>Square format (1:1)</li>
                <li>Minimum 512x512px</li>
                <li>PNG, JPG, or WebP</li>
                <li>Max 5MB</li>
              </ul>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-3 block text-sm font-bold text-slate-900">
            Store Banner
          </label>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-3">
              {bannerPreview && (
                <div className="aspect-video w-full overflow-hidden rounded-lg border-2 border-stone-300 bg-stone-100">
                  <img
                    src={bannerPreview}
                    alt="Banner preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 font-bold text-slate-900 transition-colors hover:bg-slate-200">
                <Upload className="h-4 w-4" />
                Choose Banner
                <input
                  type="file"
                  accept="image/*"
                  onChange={event => handleFileChange(event, setBannerFile, setBannerPreview)}
                  className="hidden"
                />
              </label>
            </div>
            <div className="text-sm text-stone-600">
              <p className="mb-2 font-bold">Banner Requirements:</p>
              <ul className="list-inside list-disc space-y-1">
                <li>Landscape format (16:9 or wider)</li>
                <li>Minimum 1400x600px</li>
                <li>PNG, JPG, or WebP</li>
                <li>Max 10MB</li>
              </ul>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-slate-900">
            Theme Color
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              name="theme_color"
              value={formData.theme_color}
              onChange={handleInputChange}
              className="h-10 w-16 cursor-pointer rounded"
            />
            <span className="text-sm text-stone-600">
              Used as the storefront fallback tone when no banner is uploaded.
            </span>
          </div>
        </div>
      </Card>

      <Card className="space-y-6 p-6">
        <div>
          <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">
            Featured Products
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Select up to 4 products to highlight at the top of your storefront.
          </p>
        </div>

        {isLoadingProducts ? (
          <p className="text-sm text-stone-500">Loading products...</p>
        ) : availableProducts.length === 0 ? (
          <p className="text-sm text-stone-500">
            Add products to your store first to choose featured items.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {availableProducts.map(product => {
              const isSelected = featuredProductIds.includes(product.id)

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => toggleFeaturedProduct(product.id)}
                  disabled={!isSelected && featuredProductIds.length >= 4}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-200'
                      : 'border-stone-200 bg-white hover:border-slate-900'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold">{product.title}</p>
                      <p className={`mt-1 text-sm ${isSelected ? 'text-white/75' : 'text-stone-500'}`}>
                        R {product.price.toLocaleString('en-ZA', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                    <span
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${
                        isSelected ? 'bg-white/15 text-white' : 'bg-stone-100 text-slate-900'
                      }`}
                    >
                      <Star className={`h-4 w-4 ${isSelected ? 'fill-current' : ''}`} />
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
          {featuredProductIds.length}/4 selected
        </p>
      </Card>

      <Card className="space-y-6 p-6">
        <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">
          Announcement
        </h2>

        <div>
          <label className="mb-2 block text-sm font-bold text-slate-900">
            Announcement Text
          </label>
          <Input
            type="text"
            name="announcement_text"
            value={formData.announcement_text}
            onChange={handleInputChange}
            placeholder="Free shipping over R500"
            maxLength={100}
          />
          <p className="mt-1 text-xs text-stone-600">
            {formData.announcement_text.length}/100 characters
          </p>
        </div>
      </Card>

      <Card className="space-y-6 p-6">
        <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">
          Store Policies
        </h2>

        <div>
          <label className="mb-2 block text-sm font-bold text-slate-900">
            Shipping Policy
          </label>
          <textarea
            name="shipping"
            value={policies.shipping || ''}
            onChange={handlePolicyChange}
            placeholder="Describe your shipping policy..."
            rows={3}
            className="w-full rounded-lg border border-stone-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-slate-900">
            Returns & Refunds Policy
          </label>
          <textarea
            name="returns"
            value={policies.returns || ''}
            onChange={handlePolicyChange}
            placeholder="Describe your returns policy..."
            rows={3}
            className="w-full rounded-lg border border-stone-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-slate-900">
            Warranty Information
          </label>
          <textarea
            name="warranty"
            value={policies.warranty || ''}
            onChange={handlePolicyChange}
            placeholder="Describe any warranty coverage..."
            rows={3}
            className="w-full rounded-lg border border-stone-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </Card>

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={isLoading}
          className="flex-1 items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {isLoading ? 'Saving...' : 'Save Store Settings'}
        </Button>
      </div>
    </form>
  )
}
