import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import Orders from './Orders';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { CheckCircle, Store as StoreIcon, ShieldCheck, MapPin, Phone, Mail, Tag } from 'lucide-react';

interface Order {
  id: string;
  status: string;
  payment_status: string;
  created_at: string;
}

interface SellerStoreInfo {
  id: string;
  store_name: string;
  description: string;
  tagline: string;
  category: string;
  seller_email: string;
  seller_phone: string;
  address: string;
  seller_type: string;
  kyc_status: string;
  is_verified: boolean;
  is_online: boolean;
  status: string;
  latitude: number | null;
  longitude: number | null;
  service_mode: string | null;
  radius_km: number | null;
}

export default function Account() {
  const { user, profile } = useAuth();
  const { addToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [paidCount, setPaidCount] = useState(0);
  const [processingCount, setProcessingCount] = useState(0);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [tab, setTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [sellerStore, setSellerStore] = useState<SellerStoreInfo | null>(null);
  const [showProfileSuccess, setShowProfileSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      fetchOrders();
      if (profile?.role === 'seller') fetchSellerStore();
    }
  }, [user, profile?.role]);

  const fetchOrders = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: false });
    if (error) return;
    setOrders(data || []);
    setPaidCount((data || []).filter(o => o.payment_status === 'paid').length);
    setProcessingCount((data || []).filter(o => o.status === 'processing').length);
    setLastOrder((data || [])[0] || null);
  };

  const fetchSellerStore = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('seller_profiles')
      .select('*, stores(*)')
      .eq('user_id', user.id)
      .maybeSingle();
      
    if (data) {
      const storeData = Array.isArray(data.stores) ? data.stores[0] : data.stores;
      setSellerStore({
        ...data,
        description: storeData?.description || '',
        tagline: storeData?.tagline || '',
        is_verified: storeData?.is_verified || false,
      } as any);
    }
  };

  // Profile fields
  const [editProfile, setEditProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    date_of_birth: (profile as any)?.date_of_birth || '',
    gender: (profile as any)?.gender || '',
    municipality: (profile as any)?.municipality || '',
    province: (profile as any)?.province || '',
  });

  // Sync form when profile loads asynchronously from AuthContext
  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        date_of_birth: (profile as any).date_of_birth || '',
        gender: (profile as any).gender || '',
        municipality: (profile as any).municipality || '',
        province: (profile as any).province || '',
      });
    }
  }, [profile?.id]);

  // Calculate profile completion
  const getProfileCompletion = () => {
    const fields = [profile?.full_name, profile?.phone, profile?.date_of_birth, profile?.gender, profile?.municipality, profile?.province];
    const completed = fields.filter(f => f && f.toString().trim() !== '').length;
    return Math.round((completed / fields.length) * 100);
  };

  const profileCompletion = getProfileCompletion();
  const isProfileComplete = profileCompletion === 100;

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    
    // Save all editable profile fields
    const ALLOWED_PROFILE_KEYS = ['full_name', 'phone', 'date_of_birth', 'gender', 'municipality', 'province'] as const;
    
    const raw = profileForm;
    const payload = Object.fromEntries(
      Object.entries(raw)
        .filter(([_, v]) => v !== undefined && v !== '')
        .filter(([k]) => (ALLOWED_PROFILE_KEYS as readonly string[]).includes(k))
    );
    
    const DEBUG = import.meta.env.DEV;
    if (DEBUG) {
      console.log('[Account] profile update payload:', payload);
      console.log('[Account] allowed keys:', ALLOWED_PROFILE_KEYS);
    }
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', user.id)
        .select()
        .single();
      
      if (error) {
        console.error('[Account] Save error (400?):', error);
        alert(`Save failed: ${error.message}`);
        setSaving(false);
        return;
      }
      
      if (DEBUG) console.log('[Account] Profile saved:', data);
      setEditProfile(false);
      setSaving(false);
      // Refresh page to update profile context
      window.location.reload();
    } catch (err: any) {
      console.error('[Account] Unexpected error:', err);
      alert('Failed to save profile');
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <div className="mb-12">
        <h1 className="text-4xl font-black text-slate-900 mb-2">Personal Space</h1>
        <p className="text-stone-500">Welcome, {profile?.full_name || 'mate'}!</p>
      </div>
      {/* DB Snapshots */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
        <Card className="p-6 text-center">
          <div className="text-xs text-stone-400 mb-2">Total Orders</div>
          <div className="text-2xl font-black">{orders.length}</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-xs text-stone-400 mb-2">Paid Orders</div>
          <div className="text-2xl font-black">{paidCount}</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-xs text-stone-400 mb-2">Processing</div>
          <div className="text-2xl font-black">{processingCount}</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-xs text-stone-400 mb-2">Last Order</div>
          <div className="text-xs font-bold text-slate-900">{lastOrder ? lastOrder.status : 'None'}</div>
        </Card>
      </div>
      {/* Responsive Tabs/List */}
      <div className="mb-8">
        <div className="hidden sm:flex gap-4">
          <Button variant={tab === 'profile' ? 'primary' : 'outline'} onClick={() => setTab('profile')}>Profile</Button>
          {profile?.role === 'seller' && (
            <Button variant={tab === 'seller' ? 'primary' : 'outline'} onClick={() => setTab('seller')}>Seller Details</Button>
          )}
          <Button variant={tab === 'purchases' ? 'primary' : 'outline'} onClick={() => setTab('purchases')}>Previous Purchases</Button>
          <Button variant={tab === 'orders' ? 'primary' : 'outline'} onClick={() => setTab('orders')}>My Orders</Button>
          <Button variant={tab === 'support' ? 'primary' : 'outline'} onClick={() => setTab('support')}>Support</Button>
          {profile?.role === 'seller' && (
            <Button variant="outline" onClick={() => window.location.href = '#/seller'}>Seller Hub</Button>
          )}
        </div>
        <div className="sm:hidden flex flex-col gap-2">
          <button className={`w-full text-left rounded-xl px-4 py-4 font-bold text-base ${tab === 'profile' ? 'bg-slate-900 text-white' : 'bg-stone-50 text-slate-900'}`} onClick={() => setTab('profile')}>Profile</button>
          {profile?.role === 'seller' && (
            <button className={`w-full text-left rounded-xl px-4 py-4 font-bold text-base ${tab === 'seller' ? 'bg-slate-900 text-white' : 'bg-stone-50 text-slate-900'}`} onClick={() => setTab('seller')}>Seller Details</button>
          )}
          <button className={`w-full text-left rounded-xl px-4 py-4 font-bold text-base ${tab === 'purchases' ? 'bg-slate-900 text-white' : 'bg-stone-50 text-slate-900'}`} onClick={() => setTab('purchases')}>Previous Purchases</button>
          <button className={`w-full text-left rounded-xl px-4 py-4 font-bold text-base ${tab === 'orders' ? 'bg-slate-900 text-white' : 'bg-stone-50 text-slate-900'}`} onClick={() => setTab('orders')}>My Orders</button>
          <button className={`w-full text-left rounded-xl px-4 py-4 font-bold text-base ${tab === 'support' ? 'bg-slate-900 text-white' : 'bg-stone-50 text-slate-900'}`} onClick={() => setTab('support')}>Support</button>
          {profile?.role === 'seller' && (
            <button className="w-full text-left rounded-xl px-4 py-4 font-bold text-base bg-blue-50 text-blue-900 border border-blue-100" onClick={() => window.location.href = '#/seller'}>Seller Hub</button>
          )}
        </div>
      </div>
      {/* Tab Content */}
      {tab === 'profile' && (
        <>
          {/* Progress Bar: shows amber warning when incomplete, green success when 100% */}
          {isProfileComplete ? (
            <Card className="p-6 mb-8 bg-emerald-50 border-emerald-200 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-emerald-900">Profile Complete</h3>
                  <p className="text-sm text-emerald-700">All your personal details are up to date.</p>
                </div>
                <div className="w-16 h-16">
                  <svg viewBox="0 0 36 36" className="w-full h-full">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#d1fae5" strokeWidth="3" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="100, 100" strokeLinecap="round" className="transition-all duration-1000" />
                  </svg>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-6 mb-8 bg-amber-50 border-amber-200">
              <div className="flex items-start gap-4">
                <div className="text-2xl">⚠️</div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-amber-900 mb-2">Profile Incomplete</h3>
                  <p className="text-sm text-amber-800 mb-4">Complete your profile to unlock full access to features and better recommendations.</p>
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-amber-900">Progress</span>
                      <span className="text-xs font-bold text-amber-900">{profileCompletion}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-amber-200 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${profileCompletion}%` }} />
                    </div>
                  </div>
                  {!editProfile && (
                    <Button variant="outline" size="sm" onClick={() => setEditProfile(true)} className="mt-2 border-amber-300 text-amber-900 hover:bg-amber-100">
                      Complete Now
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}
          <Card className="p-8 mb-8">
            {!editProfile ? (
              <div>
                <div className="mb-4">
                  <span className="text-xs text-stone-400">Name:</span> <span className="font-bold">{profile?.full_name || '—'}</span>
                </div>
                <div className="mb-4">
                  <span className="text-xs text-stone-400">Email:</span> <span className="font-bold">{user?.email || '—'}</span>
                </div>
                <div className="mb-4">
                  <span className="text-xs text-stone-400">Phone:</span> <span className="font-bold">{profile?.phone || '—'}</span>
                </div>
                <div className="mb-4">
                  <span className="text-xs text-stone-400">Date of Birth:</span> <span className="font-bold">{profile?.date_of_birth || '—'}</span>
                </div>
                <div className="mb-4">
                  <span className="text-xs text-stone-400">Gender:</span> <span className="font-bold">{profile?.gender || '—'}</span>
                </div>
                <div className="mb-4">
                  <span className="text-xs text-stone-400">Municipality:</span> <span className="font-bold">{profile?.municipality || '—'}</span>
                </div>
                <div className="mb-4">
                  <span className="text-xs text-stone-400">Province:</span> <span className="font-bold">{profile?.province || '—'}</span>
                </div>
                <Button variant="outline" onClick={() => setEditProfile(true)}>Edit Profile</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-stone-400 font-bold block mb-1">Full Name</label>
                  <input name="full_name" value={profileForm.full_name} onChange={handleProfileChange} className="border p-3 rounded-lg w-full" placeholder="Full Name" />
                </div>
                <div>
                  <label className="text-xs text-stone-400 font-bold block mb-1">Email (Read-only)</label>
                  <div className="border p-3 rounded-lg w-full bg-stone-50 text-slate-600 font-medium">{user?.email || '—'}</div>
                </div>
                <div>
                  <label className="text-xs text-stone-400 font-bold block mb-1">Phone</label>
                  <input name="phone" type="tel" value={profileForm.phone} onChange={handleProfileChange} className="border p-3 rounded-lg w-full" placeholder="Phone" />
                </div>
                <div>
                  <label className="text-xs text-stone-400 font-bold block mb-1">Date of Birth</label>
                  <input name="date_of_birth" type="date" value={profileForm.date_of_birth} onChange={handleProfileChange} className="border p-3 rounded-lg w-full" />
                </div>
                <div>
                  <label className="text-xs text-stone-400 font-bold block mb-1">Gender</label>
                  <select name="gender" value={profileForm.gender} onChange={handleProfileChange} className="border p-3 rounded-lg w-full">
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-stone-400 font-bold block mb-1">Municipality</label>
                  <input name="municipality" value={profileForm.municipality} onChange={handleProfileChange} className="border p-3 rounded-lg w-full" placeholder="Municipality" />
                </div>
                <div>
                  <label className="text-xs text-stone-400 font-bold block mb-1">Province</label>
                  <input name="province" value={profileForm.province} onChange={handleProfileChange} className="border p-3 rounded-lg w-full" placeholder="Province" />
                </div>
                <div className="flex gap-3">
                  <Button variant="primary" onClick={saveProfile} disabled={saving} className="flex-1">{saving ? 'Saving...' : 'Save'}</Button>
                  <Button variant="ghost" onClick={() => setEditProfile(false)} disabled={saving} className="flex-1">Cancel</Button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Seller Details Tab */}
      {tab === 'seller' && profile?.role === 'seller' && (
        <>
          {sellerStore ? (
            <Card className="p-8 mb-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                  <StoreIcon className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{sellerStore.store_name}</h2>
                  <p className="text-sm text-stone-500 font-medium">{sellerStore.tagline || 'No tagline set'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-5">
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-1">Description</span>
                    <p className="text-sm font-medium text-slate-700">{sellerStore.description || 'No description set'}</p>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                    <Tag className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block">Category</span>
                      <span className="text-sm font-bold text-slate-900">{sellerStore.category || 'Not set'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block">Seller Type</span>
                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-blue-50 text-blue-700 border border-blue-100">
                      {sellerStore.seller_type === 'both' ? 'Products & Services' : sellerStore.seller_type === 'service' ? 'Services Only' : 'Products Only'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                    <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block">KYC Status</span>
                      <span className={`text-sm font-bold capitalize ${sellerStore.kyc_status === 'verified' ? 'text-emerald-600' : sellerStore.kyc_status === 'rejected' ? 'text-red-600' : 'text-amber-600'}`}>
                        {sellerStore.kyc_status || 'pending'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-5">
                  <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                    <Mail className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block">Business Email</span>
                      <span className="text-sm font-bold text-slate-900">{sellerStore.seller_email || 'Not provided'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                    <Phone className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block">Business Phone</span>
                      <span className="text-sm font-bold text-slate-900">{sellerStore.seller_phone || 'Not provided'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                    <MapPin className="w-5 h-5 text-rose-500 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block">Address</span>
                      <span className="text-sm font-bold text-slate-900">{sellerStore.address || 'Not set'}</span>
                    </div>
                  </div>

                  {sellerStore.seller_type !== 'product' && (
                    <div className="p-5 bg-slate-900 rounded-2xl text-white">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Service Mode</span>
                        <span className="text-xs font-black uppercase bg-white/10 px-3 py-1 rounded-full">
                          {sellerStore.service_mode?.replace('_', ' ') || 'not set'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dispatch Radius</span>
                        <span className="text-lg font-black italic">{sellerStore.radius_km || 10} KM</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${sellerStore.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'}`} />
                    <span className="text-xs font-bold text-stone-500">{sellerStore.is_online ? 'Online — Accepting Orders' : 'Offline'}</span>
                    <span className={`ml-auto px-3 py-1 rounded-full text-[10px] font-black uppercase ${sellerStore.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                      {sellerStore.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-stone-100 flex gap-3">
                <Button variant="primary" onClick={() => window.location.href = '#/seller'}>Go to Seller Hub</Button>
              </div>
            </Card>
          ) : (
            <Card className="p-8 mb-8 text-center">
              <div className="w-16 h-16 bg-stone-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <StoreIcon className="w-8 h-8 text-stone-300" />
              </div>
              <p className="text-stone-500 font-medium mb-4">No seller store found. Complete seller onboarding to set up your store.</p>
              <Button variant="primary" onClick={() => window.location.href = '#/seller/onboarding'}>Start Onboarding</Button>
            </Card>
          )}
        </>
      )}

      {tab === 'purchases' && (
        <Card className="p-8 mb-8">
          <div className="mb-4 text-lg font-bold">Previous Purchases</div>
          <ul className="space-y-2">
            {orders.filter(o => o.payment_status === 'paid').map(o => (
              <li key={o.id} className="text-sm text-slate-900">Order #{o.id.slice(0,8)} - {o.status}</li>
            ))}
          </ul>
        </Card>
      )}
      {tab === 'orders' && (
        <Orders />
      )}
      {tab === 'support' && (
        <Card className="p-8 mb-8">
          <div className="mb-4 text-lg font-bold">Support / Help</div>
          <p className="text-sm text-stone-500">For help, contact us at <a href="mailto:support@emallplace.co.za" className="text-blue-600 underline">support@emallplace.co.za</a></p>
        </Card>
      )}
    </div>
  );
}

