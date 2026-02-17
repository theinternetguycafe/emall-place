import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Orders from './Orders';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function Account() {
  const { user, profile } = useAuth();
  const [orders, setOrders] = useState([]);
  const [paidCount, setPaidCount] = useState(0);
  const [processingCount, setProcessingCount] = useState(0);
  const [lastOrder, setLastOrder] = useState(null);
  const [tab, setTab] = useState('profile');

  useEffect(() => {
    if (user) fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
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

  // Profile fields
  const [editProfile, setEditProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
  });

  const handleProfileChange = e => {
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  };

  const saveProfile = async () => {
    await supabase
      .from('profiles')
      .update(profileForm)
      .eq('id', user.id);
    setEditProfile(false);
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
          <Button variant={tab === 'purchases' ? 'primary' : 'outline'} onClick={() => setTab('purchases')}>Previous Purchases</Button>
          <Button variant={tab === 'orders' ? 'primary' : 'outline'} onClick={() => setTab('orders')}>My Orders</Button>
          <Button variant={tab === 'support' ? 'primary' : 'outline'} onClick={() => setTab('support')}>Support</Button>
          {profile?.role === 'seller' && (
            <Button variant="outline" onClick={() => window.location.href = (import.meta.env.BASE_URL || '/') + 'seller'}>Seller Hub</Button>
          )}
        </div>
        <div className="sm:hidden flex flex-col gap-2">
          <button className={`w-full text-left rounded-xl px-4 py-4 font-bold text-base ${tab === 'profile' ? 'bg-slate-900 text-white' : 'bg-stone-50 text-slate-900'}`} onClick={() => setTab('profile')}>Profile</button>
          <button className={`w-full text-left rounded-xl px-4 py-4 font-bold text-base ${tab === 'purchases' ? 'bg-slate-900 text-white' : 'bg-stone-50 text-slate-900'}`} onClick={() => setTab('purchases')}>Previous Purchases</button>
          <button className={`w-full text-left rounded-xl px-4 py-4 font-bold text-base ${tab === 'orders' ? 'bg-slate-900 text-white' : 'bg-stone-50 text-slate-900'}`} onClick={() => setTab('orders')}>My Orders</button>
          <button className={`w-full text-left rounded-xl px-4 py-4 font-bold text-base ${tab === 'support' ? 'bg-slate-900 text-white' : 'bg-stone-50 text-slate-900'}`} onClick={() => setTab('support')}>Support</button>
          {profile?.role === 'seller' && (
            <button className="w-full text-left rounded-xl px-4 py-4 font-bold text-base bg-blue-50 text-blue-900 border border-blue-100" onClick={() => window.location.href = (import.meta.env.BASE_URL || '/') + 'seller'}>Seller Hub</button>
          )}
        </div>
      </div>
      {/* Tab Content */}
      {tab === 'profile' && (
        <Card className="p-8 mb-8">
          {!editProfile ? (
            <div>
              <div className="mb-4">
                <span className="text-xs text-stone-400">Name:</span> <span className="font-bold">{profile?.full_name}</span>
              </div>
              <div className="mb-4">
                <span className="text-xs text-stone-400">Phone:</span> <span className="font-bold">{profile?.phone}</span>
              </div>
              <Button variant="outline" onClick={() => setEditProfile(true)}>Edit Profile</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <input name="full_name" value={profileForm.full_name} onChange={handleProfileChange} className="border p-2 rounded w-full" placeholder="Full Name" />
              <input name="phone" value={profileForm.phone} onChange={handleProfileChange} className="border p-2 rounded w-full" placeholder="Phone" />
              <Button variant="primary" onClick={saveProfile}>Save</Button>
              <Button variant="ghost" onClick={() => setEditProfile(false)}>Cancel</Button>
            </div>
          )}
        </Card>
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
