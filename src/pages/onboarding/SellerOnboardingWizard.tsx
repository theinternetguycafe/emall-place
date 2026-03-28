import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Loader2, Store, MapPin, ShieldCheck, CheckCircle, Upload, ArrowRight, Search } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import ErrorAlert from '../../components/ErrorAlert'
import 'mapbox-gl/dist/mapbox-gl.css'

type Step = 'type' | 'store' | 'location' | 'service_config' | 'kyc' | 'terms' | 'completion'

const STEPS = ['type', 'store', 'location', 'service_config', 'kyc', 'terms', 'completion']

export default function SellerOnboardingWizard() {
  const { user, profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  
  const [currentStep, setCurrentStep] = useState<Step>('type')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form State
  const [sellerType, setSellerType] = useState<string>('both')
  const [storeName, setStoreName] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [sellerEmail, setSellerEmail] = useState(profile?.email || '')
  const [sellerPhone, setSellerPhone] = useState(profile?.phone || '')
  const [location, setLocation] = useState<{lat: number, lng: number, address: string} | null>(null)
  
  // Set initial store name when profile loads
  useEffect(() => {
    if (profile?.full_name && !storeName) {
      setStoreName(`${profile.full_name}'s ${sellerType === 'service' ? 'Service Shop' : 'Store'}`)
    }
  }, [profile, sellerType])
  const [serviceMode, setServiceMode] = useState('both')
  const [radiusKm, setRadiusKm] = useState(10)
  
  // KYC State
  const [idType, setIdType] = useState('rsa_id')
  const [idNumber, setIdNumber] = useState('')
  const [docFile, setDocFile] = useState<File | null>(null)
  const [selfieFile, setSelfieFile] = useState<File | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markerInstance = useRef<any>(null)
  const mapboxglRef = useRef<any>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])

  const stepIndex = STEPS.indexOf(currentStep)
  const progress = Math.min(100, Math.round(((stepIndex + 1) / (STEPS.length - 1)) * 100))

  useEffect(() => {
    // Basic navigation skipping check
  }, [sellerType, currentStep])

  // Initialize Mapbox when step is location
  useEffect(() => {
    if (currentStep !== 'location' || !mapContainerRef.current) return

    const P1 = import.meta.env.VITE_MAPBOX_TOKEN_P1;
    const P2 = import.meta.env.VITE_MAPBOX_TOKEN_P2;
    const MAPBOX_TOKEN = [P1, P2].filter(Boolean).join('');
    const isPlaceholder = !MAPBOX_TOKEN || MAPBOX_TOKEN === 'your_real_key' || !P1 || !P2;
    
    // Auto-detect current location if not set yet
    if (!location && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setLocation({ lat, lng, address: 'Current Location (approx)' })
      }, (err) => {
        console.warn("Geolocation denied or failed", err)
      })
    }

    if (isPlaceholder) {
      console.warn("Mapbox token missing or placeholder used for onboarding map")
      return
    }

    import('mapbox-gl').then((mapboxgl) => {
      mapboxgl.default.accessToken = MAPBOX_TOKEN
      mapboxglRef.current = mapboxgl.default
      
      const map = new mapboxgl.default.Map({
        container: mapContainerRef.current!,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: location ? [location.lng, location.lat] : [28.0473, -26.2041], // Johannesburg default
        zoom: location ? 14 : 10,
        pitch: 0,
        bearing: 0,
        antialias: true
      })
      mapInstance.current = map

      map.addControl(new mapboxgl.default.NavigationControl(), 'top-right')

      // Add existing marker if user comes back to this step
      if (location) {
        const el = document.createElement('div')
        el.className = 'w-6 h-6 rounded-full bg-blue-600 border-[3px] border-white shadow-[0_4px_12px_rgba(37,99,235,0.4)]'
        markerInstance.current = new mapboxgl.default.Marker(el)
          .setLngLat([location.lng, location.lat])
          .addTo(map)
      }

      // Handle map click
      map.on('click', async (e: any) => {
        const { lng, lat } = e.lngLat
        
        // Ensure marker exists or create it
        if (!markerInstance.current) {
          const el = document.createElement('div')
          el.className = 'w-6 h-6 rounded-full bg-blue-600 border-[3px] border-white shadow-[0_4px_12px_rgba(37,99,235,0.4)] relative mt-[-12px] animate-bounce'
          
          markerInstance.current = new mapboxgl.default.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([lng, lat])
            .addTo(map)
            
          // Remove bounce after drop
          setTimeout(() => el.classList.remove('animate-bounce'), 1000)
        } else {
          markerInstance.current.setLngLat([lng, lat])
        }

        map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 14) })
        
        try {
          // Simple reverse geocoding via Mapbox API
          const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`)
          const data = await response.json()
          const placeName = data.features?.[0]?.place_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
          
          setLocation({ lat, lng, address: placeName })
        } catch (err) {
          setLocation({ lat, lng, address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` })
        }
      })
    })

    return () => {
      if (markerInstance.current) markerInstance.current.remove()
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [currentStep])

  const goNext = (overrideStep?: Step) => {
    setError(null)
    if (overrideStep) {
      setCurrentStep(overrideStep)
      return
    }
    let nextIndex = stepIndex + 1
    if (sellerType === 'product' && STEPS[nextIndex] === 'service_config') {
      nextIndex++
    }
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex] as Step)
    }
  }

  const goBack = () => {
    setError(null)
    let prevIndex = stepIndex - 1
    if (sellerType === 'product' && STEPS[prevIndex] === 'service_config') {
      prevIndex--
    }
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex] as Step)
    }
  }

  const handleLocationSave = () => {
    if (!location) {
      setError('Please tap the map to drop a pin at your location.')
      return
    }
    goNext()
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 3) {
      setSearchResults([])
      return
    }
    
    setIsSearching(true)
    try {
      const P1 = import.meta.env.VITE_MAPBOX_TOKEN_P1;
      const P2 = import.meta.env.VITE_MAPBOX_TOKEN_P2;
      const MAPBOX_TOKEN = [P1, P2].filter(Boolean).join('');
      if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'your_real_key' || !P1 || !P2) {
        setIsSearching(false)
        return
      }
      
      const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=5&country=za`)
      const data = await response.json()
      setSearchResults(data.features || [])
    } catch (err) {
      console.error(err)
    } finally {
      setIsSearching(false)
    }
  }

  const selectSearchResult = (feature: any) => {
    const [lng, lat] = feature.center
    setLocation({ lat, lng, address: feature.place_name })
    setSearchQuery('')
    setSearchResults([])
    
    if (mapInstance.current && mapboxglRef.current) {
      mapInstance.current.flyTo({ center: [lng, lat], zoom: 15, essential: true })
      
      if (!markerInstance.current) {
        const el = document.createElement('div')
        el.className = 'w-6 h-6 rounded-full bg-blue-600 border-[3px] border-white shadow-[0_4px_12px_rgba(37,99,235,0.4)] relative mt-[-12px]'
        markerInstance.current = new mapboxglRef.current.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([lng, lat])
          .addTo(mapInstance.current)
      } else {
        markerInstance.current.setLngLat([lng, lat])
      }
    }
  }

  const validateKYC = (): boolean => {
    if (idType === 'rsa_id') {
      if (!idNumber || idNumber.length !== 13 || !/^\d+$/.test(idNumber)) {
        setError('RSA ID must be exactly 13 digits.')
        return false
      }
    } else {
      if (!idNumber || idNumber.length < 5) {
        setError('Please enter a valid Passport Number.')
        return false
      }
    }
    if (!docFile || !selfieFile) {
      setError('Please upload both an ID document and a selfie.')
      return false
    }
    return true
  }

  const handleFinish = async () => {
    if (!termsAccepted) {
      setError('You must accept the Terms & Conditions to proceed.')
      return
    }

    if (!user || (!docFile && currentStep === 'terms') || !selfieFile) {
      setError('Missing information.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      // 1. Upload files
      const docPath = `${user.id}/${Date.now()}_id_doc`
      const selfiePath = `${user.id}/${Date.now()}_selfie`

      const { error: docError } = await supabase.storage.from('kyc-documents').upload(docPath, docFile!)
      if (docError) throw new Error("Failed to upload ID Doc: " + docError.message)

      const { error: selfieError } = await supabase.storage.from('kyc-documents').upload(selfiePath, selfieFile!)
      if (selfieError) throw new Error("Failed to upload selfie: " + selfieError.message)

      const docUrl = supabase.storage.from('kyc-documents').getPublicUrl(docPath).data.publicUrl
      const selfieUrl = supabase.storage.from('kyc-documents').getPublicUrl(selfiePath).data.publicUrl

      // 2. Create KYC submission
      const { error: kycError } = await supabase.from('kyc_submissions').insert({
        user_id: user.id,
        id_number: idNumber,
        document_url: docUrl,
        selfie_url: selfieUrl,
        status: 'pending'
      })
      if (kycError) throw new Error("Failed to submit KYC data")

      // 3. Update Seller Store
      const { error: storeError } = await supabase.from('seller_stores').upsert({
        owner_id: user.id,
        store_name: storeName,
        description: description,
        tagline: tagline,
        seller_email: sellerEmail,
        seller_phone: sellerPhone,
        category: category,
        seller_type: sellerType,
        latitude: location?.lat || 0,
        longitude: location?.lng || 0,
        address: location?.address || '',
        service_mode: sellerType !== 'product' ? serviceMode : null,
        radius_km: sellerType !== 'product' ? radiusKm : null,
        status: 'active',
        is_verified: true, // For demo purposes, auto-verify. Real world: false.
        kyc_status: 'pending',
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString()
      }, { onConflict: 'owner_id' })

      if (storeError) throw new Error("Failed to save store profile")

      // Success
      setCurrentStep('completion')
      
      // Auto redirect after a few seconds
      setTimeout(() => {
         window.location.href = '/#/seller'
         window.location.reload()
      }, 3000)

    } catch (err: any) {
      console.error(err)
      let msg = err.message || 'An error occurred while saving your profile.'
      if (msg.includes('Bucket not found')) {
        msg = 'ID Storage Bucket not found. Please run the setup_kyc_bucket.sql script in your Supabase SQL Editor to create it.'
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        
        {/* Progress Bar */}
        {currentStep !== 'completion' && (
          <div className="mb-12">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight text-center mb-6">Seller Onboarding</h1>
            <div className="h-3 w-full bg-stone-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-slate-900 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-xs font-bold uppercase tracking-widest text-stone-400 mt-4">
              Step {stepIndex + 1} of {STEPS.length - 1}
            </p>
          </div>
        )}

        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-900/5 border border-stone-100 relative">
          {error && <ErrorAlert message={error} onClose={() => setError(null)} className="mb-6" />}

          {currentStep === 'type' && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-2xl font-black text-slate-900 mb-2 text-center">What will you sell?</h2>
              <p className="text-stone-500 mb-8 text-center">Select your primary business model.</p>
              
              <div className="space-y-4">
                {[
                  { id: 'product', title: 'Products Only', desc: 'Ship or deliver physical goods to buyers.' },
                  { id: 'service', title: 'Services Only', desc: 'Offer professional skills, repairs, or labor.' },
                  { id: 'both', title: 'Products & Services', desc: 'The best of both worlds.' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setSellerType(opt.id)}
                    className={`w-full p-6 text-left rounded-2xl border-2 transition-all ${
                      sellerType === opt.id ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-500/10' : 'border-stone-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        sellerType === opt.id ? 'border-blue-600' : 'border-stone-300'
                      }`}>
                        {sellerType === opt.id && <div className="w-3 h-3 bg-blue-600 rounded-full" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-900">{opt.title}</h3>
                        <p className="text-sm text-stone-500">{opt.desc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-8 flex justify-end">
                <Button onClick={() => goNext()}>Continue <ArrowRight /></Button>
              </div>
            </div>
          )}

          {currentStep === 'store' && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3"><Store className="text-blue-600"/> {sellerType === 'service' ? 'Service Shop' : 'Store'} Details</h2>
              <div className="space-y-5">
                <Input 
                  label={`${sellerType === 'service' ? 'Service Shop' : 'Store'} Name`} 
                  required 
                  value={storeName} 
                  onChange={(e) => setStoreName(e.target.value)} 
                  placeholder={sellerType === 'service' ? "e.g. Acme Plumbing & Repair" : "e.g. Acme Artisan Goods"} 
                />
                <Input 
                  label="Category" 
                  required 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)} 
                  placeholder={sellerType === 'service' ? "e.g. Plumbing, Electrical, Cleaning" : "e.g. Electronics, Clothing, Art"} 
                />
                <Input 
                  label="Tagline (Optional)" 
                  value={tagline} 
                  onChange={(e) => setTagline(e.target.value)} 
                  placeholder="A short punchy hook for your business" 
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="Business Email" 
                    value={sellerEmail} 
                    onChange={(e) => setSellerEmail(e.target.value)} 
                    placeholder="support@example.com" 
                  />
                  <Input 
                    label="Business Phone" 
                    value={sellerPhone} 
                    onChange={(e) => setSellerPhone(e.target.value)} 
                    placeholder="+27..." 
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-stone-400 mb-2">Description</label>
                  <textarea 
                    className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-stone-50 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    placeholder={sellerType === 'service' ? "Tell buyers about the services you offer..." : "Tell buyers about your products and business..."}
                  />
                </div>
              </div>
              <div className="mt-8 flex justify-between">
                <Button variant="outline" onClick={goBack}>Back</Button>
                <Button onClick={() => { if(storeName && description && category) goNext(); else setError('Fill all fields') }}>Continue</Button>
              </div>
            </div>
          )}

          {currentStep === 'location' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col h-full">
              <h2 className="text-2xl font-black text-slate-900 mb-2 flex items-center gap-3"><MapPin className="text-rose-500"/> Operating Area</h2>
              <p className="text-stone-500 mb-4">Search your address or tap the map to set your location.</p>
              
              <div className="relative z-10 mb-4">
                <Search className="absolute left-4 top-3.5 text-stone-400 w-5 h-5 pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="Search address or area..." 
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 rounded-xl border-2 border-stone-200 bg-white focus:border-blue-600 outline-none font-medium text-slate-900"
                />
                {isSearching && <Loader2 className="absolute right-4 top-3.5 animate-spin text-stone-400 w-5 h-5" />}
                
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-stone-100 max-h-48 overflow-y-auto overflow-x-hidden z-20">
                    {searchResults.map((result: any, idx) => (
                      <button 
                        key={idx}
                        onClick={() => selectSearchResult(result)}
                        className="w-full text-left px-4 py-3 hover:bg-stone-50 border-b border-stone-100 last:border-0 truncate flex flex-col items-start"
                      >
                        <span className="font-bold text-slate-900 truncate w-full">{result.text}</span>
                        <span className="text-xs text-stone-500 truncate w-full">{result.place_name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Location Feedback Bar (Always Visible if location set) */}
              {location && (
                <div className="mb-4 bg-white p-4 rounded-xl border border-stone-200 shadow-sm animate-in fade-in slide-in-from-top-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Selected Hub</p>
                      <p className="font-bold text-slate-900 leading-tight">{location.address}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Coordinates</p>
                    <p className="text-xs font-mono font-bold text-slate-600 tracking-tighter">{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</p>
                  </div>
                </div>
              )}

              {/* Interaction Area */}
              <div className="bg-stone-50 rounded-2xl h-80 relative overflow-hidden border border-stone-100 shadow-inner group">
                {(!import.meta.env.VITE_MAPBOX_TOKEN_P1 || !import.meta.env.VITE_MAPBOX_TOKEN_P2 || import.meta.env.VITE_MAPBOX_TOKEN_P1 === 'your_real_key') ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-400 font-bold p-8 text-center bg-stone-50 transition-colors">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-stone-100 group-hover:scale-110 transition-transform duration-500">
                      <Search className="h-8 w-8 text-stone-200" />
                    </div>
                    <p className="text-sm">Interactive map offline</p>
                    <p className="text-[10px] font-normal mt-1 text-stone-300 max-w-[200px]">Providing a Mapbox token in .env will enable full interactive pin-dropping.</p>
                  </div>
                ) : (
                  <>
                    <div ref={mapContainerRef} className="h-full w-full absolute inset-0" style={{ pointerEvents: 'auto' }} />
                    {!location && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-white/10 backdrop-blur-[1px]">
                        <div className="bg-slate-900/90 backdrop-blur-md text-white px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-2xl animate-bounce pointer-events-auto border border-white/20">
                          Tap Map to Set Hub
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Fallback & Capture Controls (Prominent when map offline) */}
              {(!import.meta.env.VITE_MAPBOX_TOKEN_P1 || !import.meta.env.VITE_MAPBOX_TOKEN_P2 || import.meta.env.VITE_MAPBOX_TOKEN_P1 === 'your_real_key') && (
                <div className="mt-4 bg-white border-2 border-dashed border-stone-200 rounded-2xl p-6 transition-all hover:border-blue-200">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="flex-1 text-center sm:text-left">
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 border border-slate-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" /> Geolocation Fallback
                      </div>
                      <p className="text-xs text-stone-500 leading-relaxed font-medium">Map services are unavailable. We can use your browser's location to set your shop's coordinates.</p>
                    </div>
                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                      <Button 
                        size="sm" 
                        variant={location ? "outline" : "primary"} 
                        className="rounded-xl px-8 h-12 min-w-[180px] shadow-lg hover:shadow-xl transition-all font-black uppercase tracking-widest text-[11px]"
                        onClick={() => {
                          if (navigator.geolocation) {
                            setLoading(true);
                            navigator.geolocation.getCurrentPosition((pos) => {
                              setLocation({ 
                                lat: pos.coords.latitude, 
                                lng: pos.coords.longitude, 
                                address: 'System Geolocation' 
                              });
                              setLoading(false);
                            }, () => setLoading(false));
                          }
                        }}
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : location ? "Re-detect Position" : "Detect My Position"}
                      </Button>
                      <p className="text-[9px] text-center text-stone-300 font-bold uppercase tracking-widest">RSA Geo-Detect Active</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8 flex justify-between">
                <Button variant="outline" onClick={goBack}>Back</Button>
                <Button onClick={handleLocationSave} disabled={!location}>Set Location</Button>
              </div>
            </div>
          )}

          {currentStep === 'service_config' && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-2xl font-black text-slate-900 mb-6">Service Settings</h2>
              
              <div className="space-y-6">
                <div>
                   <label className="block text-xs font-black uppercase tracking-widest text-stone-400 mb-3">Service Mode</label>
                   <select 
                     value={serviceMode} 
                     onChange={e => setServiceMode(e.target.value)}
                     className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 bg-stone-50 focus:bg-white outline-none font-bold text-slate-900"
                   >
                     <option value="on_site">I travel to the buyer (On-Site)</option>
                     <option value="in_house">Buyers come to me (In-House)</option>
                     <option value="both">I do both</option>
                   </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-stone-400 mb-3">Service Radius (km)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="1" 
                      max="100" 
                      value={radiusKm} 
                      onChange={e => setRadiusKm(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="font-black text-xl text-slate-900 w-16 text-right">{radiusKm} km</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <Button variant="outline" onClick={goBack}>Back</Button>
                <Button onClick={() => goNext()}>Continue</Button>
              </div>
            </div>
          )}

          {currentStep === 'kyc' && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-2xl font-black text-slate-900 mb-2 flex items-center gap-3"><ShieldCheck className="text-emerald-500"/> Official Verification</h2>
              <p className="text-stone-500 mb-6 font-medium text-sm">To protect buyers, all sellers must be legally verified. Your data is encrypted and secure.</p>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                   <select value={idType} onChange={e => setIdType(e.target.value)} className="w-1/3 px-4 py-3 rounded-xl border-2 border-stone-200 font-bold">
                     <option value="rsa_id">RSA ID</option>
                     <option value="passport">Passport</option>
                   </select>
                   <input 
                     type="text" 
                     placeholder={idType === 'rsa_id' ? "13-digit ID Number" : "Passport Number"}
                     value={idNumber}
                     onChange={e => setIdNumber(e.target.value)}
                     className="flex-1 px-4 py-3 rounded-xl border-2 border-stone-200 font-bold focus:border-slate-900 outline-none"
                   />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="border-2 border-dashed border-stone-300 rounded-2xl p-6 text-center hover:bg-stone-50 transition-colors relative">
                    <input type="file" accept="image/*" onChange={e => setDocFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <Upload className="mx-auto text-stone-400 mb-2" />
                    <p className="font-bold text-sm text-slate-900">{docFile ? docFile.name : 'Upload ID Document'}</p>
                    <p className="text-xs text-stone-500 mt-1">Clear photo of the front</p>
                  </div>
                  <div className="border-2 border-dashed border-stone-300 rounded-2xl p-6 text-center hover:bg-stone-50 transition-colors relative">
                    <input type="file" accept="image/*" onChange={e => setSelfieFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <Upload className="mx-auto text-stone-400 mb-2" />
                    <p className="font-bold text-sm text-slate-900">{selfieFile ? selfieFile.name : 'Upload Selfie'}</p>
                    <p className="text-xs text-stone-500 mt-1">Holding your ID</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <Button variant="outline" onClick={goBack}>Back</Button>
                <Button onClick={() => { if(validateKYC()) goNext() }}>Verify Identity</Button>
              </div>
            </div>
          )}

          {currentStep === 'terms' && (
            <div className="animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-2xl font-black text-slate-900 mb-6">Terms & Conditions</h2>
              
              <div className="bg-stone-50 p-6 rounded-2xl h-48 overflow-y-auto border border-stone-200 mb-6 text-sm text-stone-600 space-y-4">
                <p><strong>1. Seller Obligations:</strong> You agree to fulfill all accepted service requests and product orders professionally and promptly.</p>
                <p><strong>2. Commission:</strong> A platform fee is automatically deducted from payouts as per the current tiered fee structure.</p>
                <p><strong>3. Liability:</strong> You are solely responsible for the quality of services and products delivered.</p>
                <p><strong>4. Dispute Resolution:</strong> All buyer-seller disputes are subject to binding arbitration via our platform support center.</p>
              </div>

              <label className="flex items-start gap-4 cursor-pointer group">
                <div className="mt-1">
                  <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className="w-5 h-5 rounded border-stone-300 text-slate-900 focus:ring-slate-900" />
                </div>
                <div className="text-sm font-medium text-slate-900 leading-relaxed">
                  I accept the platform's Terms of Service, Seller Agreement, and Privacy Policy. I confirm all provided verification data is accurate.
                </div>
              </label>

              <div className="mt-8 flex justify-between">
                <Button variant="outline" onClick={goBack} disabled={loading}>Back</Button>
                <Button onClick={handleFinish} disabled={loading || !termsAccepted} className="w-48">
                  {loading ? <Loader2 className="animate-spin text-white mx-auto" /> : 'Complete Setup'}
                </Button>
              </div>
            </div>
          )}

          {currentStep === 'completion' && (
            <div className="animate-in fade-in zoom-in duration-500 text-center py-8">
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-emerald-600" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">You're All Set!</h2>
              <p className="text-stone-500 font-medium mb-8 max-w-md mx-auto">
                Your profile is being verified. You can now access your dashboard. We'll redirect you in a moment...
              </p>
              <Loader2 className="animate-spin text-slate-900 mx-auto" />
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

