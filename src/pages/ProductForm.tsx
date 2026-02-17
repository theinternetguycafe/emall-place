import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Category } from '../types'
import { uploadProductImage } from '../lib/storage'
import { Save, X, Upload, Loader2, ArrowLeft, Image as ImageIcon, Trash2 } from 'lucide-react'
import ErrorAlert from '../components/ErrorAlert'
import SuccessAlert from '../components/SuccessAlert'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function ProductForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(!!id)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [images, setImages] = useState<File[]>([])
  const [imagePreview, setImagePreview] = useState<string[]>([])
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    stock: '',
    category_id: '',
  })

  useEffect(() => {
    fetchCategories()
    if (id) fetchProduct()
  }, [id])

  const fetchCategories = async () => {
    const { data, error } = await supabase.from('categories').select('*').order('name')
    if (!error && data) setCategories(data)
  }

  const fetchProduct = async () => {
    try {
      const { data, error: pError } = await supabase
        .from('products')
        .select('*, product_images(*)')
        .eq('id', id)
        .single()

      if (pError) throw pError
      
      setFormData({
        title: data.title,
        description: data.description || '',
        price: data.price.toString(),
        stock: data.stock.toString(),
        category_id: data.category_id || '',
      })
      
      if (data.product_images) {
        setImagePreview(data.product_images.map((img: any) => img.url))
      }
    } catch (err: any) {
      console.error('Error fetching product:', err)
      setError('Failed to load product details.')
    } finally {
      setFetching(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setImages(prev => [...prev, ...newFiles])
      
      const newPreviews = newFiles.map(file => URL.createObjectURL(file))
      setImagePreview(prev => [...prev, ...newPreviews])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const DEBUG = import.meta.env.DEV
    if (DEBUG) console.log('[ProductForm] handleSubmit START', { userId: profile?.id, isEditing: !!id })

    try {
      const { data: store, error: sError } = await supabase
        .from('seller_stores')
        .select('id')
        .eq('owner_id', profile!.id)
        .single()

      if (sError || !store) throw new Error('Could not find your store. Please contact support.')

      const productData = {
        seller_store_id: store.id,
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        category_id: formData.category_id || null,
        status: 'pending' 
      }

      let productId = id
      if (id) {
        const { error: uError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', id)
        if (uError) throw uError
        if (DEBUG) console.log('[ProductForm] Product updated', { productId })
      } else {
        const { data: product, error: iError } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single()
        if (iError) throw iError
        productId = product.id
        if (DEBUG) console.log('[ProductForm] Product created', { productId, userId: profile!.id, storeId: (productData as any).seller_store_id })
      }

      for (const file of images) {
        const url = await uploadProductImage(file)
        if (DEBUG) console.log('[ProductForm] Upload result', { fileName: file.name, url, hasUrl: !!url })
        
        if (url) {
          if (DEBUG) console.log('[ProductForm] product_images INSERT attempt', { product_id: productId, url: url.substring(0, 50) + '...' })
          
          const { error: imgError } = await supabase.from('product_images').insert({
            product_id: productId,
            url
          })
          
          if (imgError) {
            console.error('[ProductForm] ERROR saving image metadata:', { error: imgError, product_id: productId, url: url.substring(0, 50) + '...' })
            if (DEBUG) console.log('[ProductForm] product_images INSERT failed', { imgError: imgError.message, code: imgError.code })
          } else {
            if (DEBUG) console.log('[ProductForm] product_images INSERT succeeded')
          }
        }
      }

      // Show success message
      setSuccess(id ? 'Product updated successfully!' : 'Product published successfully!')
      
      // Navigate after a short delay to show the success message
      setTimeout(() => {
        navigate('/seller')
      }, 1500)
    } catch (err: any) {
      console.error('Error saving product:', err)
      setError(err.message || 'Failed to save product. Please check all fields.')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Loader2 className="animate-spin h-10 w-10 text-stone-300 mx-auto mb-4" />
        <p className="text-stone-400 font-medium">Retrieving product details...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="mb-8 -ml-2 text-stone-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Discard & Exit
      </Button>

      <div className="mb-12">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">{id ? 'Refine Product' : 'Create Masterpiece'}</h1>
        <p className="text-stone-500 mt-2">Provide the details that will make your product stand out.</p>
      </div>

      {error && <ErrorAlert message={error} onClose={() => setError(null)} />}
      {success && <SuccessAlert message={success} onClose={() => setSuccess(null)} />}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7 space-y-8">
          <Card className="p-8 space-y-6">
            <h2 className="text-xl font-bold border-b border-stone-100 pb-4">General Information</h2>
            
            <Input
              id="product-title-input"
              label="Product Title"
              placeholder="e.g. Handcrafted Leather Satchel"
              required
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-6">
              <Input
                label="Price (ZAR)"
                type="number"
                step="0.01"
                required
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
              />
              <Input
                label="Stock Level"
                type="number"
                required
                value={formData.stock}
                onChange={e => setFormData({ ...formData, stock: e.target.value })}
              />
            </div>

            <div className="w-full space-y-1.5">
              <label className="text-sm font-medium text-slate-700 ml-0.5">Category</label>
              <select
                id="product-category-select"
                className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_1rem_center] bg-no-repeat"
                value={formData.category_id}
                onChange={e => setFormData({ ...formData, category_id: e.target.value })}
              >
                <option value="">Choose a category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="w-full space-y-1.5">
              <label className="text-sm font-medium text-slate-700 ml-0.5">Full Description</label>
              <textarea
                rows={6}
                required
                placeholder="Describe the soul of your product..."
                className="flex w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm transition-all placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-8">
          <Card className="p-8">
            <h2 className="text-xl font-bold border-b border-stone-100 pb-4 mb-6">Visuals</h2>
            
            <div id="image-upload-section" className="grid grid-cols-2 gap-4">
              {imagePreview.map((url, i) => (
                <div key={i} className="aspect-square bg-stone-50 rounded-2xl overflow-hidden relative group border border-stone-100">
                  <img src={url} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="ghost" size="icon" className="text-white hover:bg-rose-500/20">
                      <Trash2 size={20} />
                    </Button>
                  </div>
                </div>
              ))}
              
              <label className="aspect-square border-2 border-dashed border-stone-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-slate-900 hover:bg-stone-50 transition-all text-stone-400 hover:text-slate-900">
                <Upload size={24} />
                <span className="text-[10px] font-black uppercase tracking-widest mt-2">Add Photo</span>
                <input type="file" className="hidden" multiple onChange={handleImageChange} accept="image/*" />
              </label>
            </div>

            <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
              <ImageIcon className="text-blue-600 mt-0.5" size={18} />
              <div className="space-y-1">
                <p className="text-[11px] text-blue-900 leading-relaxed font-bold">
                  💡 Clear photos build trust
                </p>
                <p className="text-[10px] text-blue-700 leading-relaxed">
                  Use at least 2 images. Natural lighting, different angles. This is your sales lekker.
                </p>
              </div>
            </div>
          </Card>

          <Button
            id="publish-button"
            type="submit"
            disabled={loading}
            className="w-full rounded-full py-8 text-xl group shadow-2xl shadow-slate-900/10"
          >
            {loading ? (
              <div className="flex items-center gap-3">
                <Loader2 className="animate-spin" size={20} />
                <span>Synchronizing</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Save size={20} />
                <span>{id ? 'Apply Refinements' : 'Publish Product'}</span>
              </div>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
