import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { SellerStore } from '../../types';
import { CheckCircle, XCircle, Eye, Loader2, ShieldCheck, User as UserIcon, Calendar, MapPin } from 'lucide-react';

interface KYCSubmission {
  id: string;
  user_id: string;
  id_number: string;
  document_url: string;
  selfie_url: string;
  status: 'pending' | 'verified' | 'rejected';
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

export default function AdminKYCDashboard() {
  const [submissions, setSubmissions] = useState<KYCSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<KYCSubmission | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      // Fetch submissions with profile data joined
      const { data, error } = await supabase
        .from('kyc_submissions')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (err) {
      console.error('Error fetching KYC:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (submission: KYCSubmission, status: 'verified' | 'rejected') => {
    try {
      setProcessingId(submission.id);
      
      // 1. Update KYC submission status
      const { error: kycError } = await supabase
        .from('kyc_submissions')
        .update({ status })
        .eq('id', submission.id);

      if (kycError) throw kycError;

      // 2. Update Seller Store status if verified
      const isVerified = status === 'verified';
      const { error: storeError } = await supabase
        .from('seller_stores')
        .update({ 
          is_verified: isVerified,
          kyc_status: status,
          status: isVerified ? 'active' : 'suspended'
        })
        .eq('owner_id', submission.user_id);

      if (storeError) throw storeError;

      // 3. Update Profile status? Usually store is the one that matters for permissions.
      
      // Refresh list
      await fetchSubmissions();
      setSelectedSub(null);
    } catch (err) {
      console.error('Error updating KYC status:', err);
      alert('Failed to update status');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-slate-900" />
          <p className="text-stone-500 font-bold uppercase tracking-widest text-xs">Loading KYC Queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-slate-900 text-white p-2 rounded-xl">
                <ShieldCheck size={28} />
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">KYC Command Center</h1>
            </div>
            <p className="text-stone-500 font-medium">Review and verify seller identities to maintain marketplace integrity.</p>
          </div>
          
          <div className="flex items-center gap-8 bg-white px-6 py-4 rounded-3xl shadow-sm border border-stone-100">
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Pending</p>
              <p className="text-2xl font-black text-amber-500">{submissions.filter(s => s.status === 'pending').length}</p>
            </div>
            <div className="w-px h-8 bg-stone-100" />
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Verified</p>
              <p className="text-2xl font-black text-green-500">{submissions.filter(s => s.status === 'verified').length}</p>
            </div>
          </div>
        </div>

        {/* Submissions Grid/Table */}
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-900/5 overflow-hidden border border-stone-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50/50 border-b border-stone-100">
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-stone-500">Applicant</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-stone-500">ID Number</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-stone-500">Submitted</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-stone-500">Status</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-stone-500 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {submissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-stone-50/30 transition-colors group">
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                        <UserIcon size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 leading-tight">{sub.profiles?.full_name || 'Unknown User'}</p>
                        <p className="text-xs text-stone-400 font-medium">{sub.profiles?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 font-mono text-sm text-slate-600">{sub.id_number}</td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-2 text-stone-400">
                      <Calendar size={14} />
                      <span className="text-xs font-bold">{new Date(sub.created_at).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border
                      ${sub.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                        sub.status === 'verified' ? 'bg-green-50 text-green-600 border-green-100' : 
                        'bg-red-50 text-red-600 border-red-100'}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-6 text-right">
                    <button 
                      onClick={() => setSelectedSub(sub)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-black transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-900/10"
                    >
                      <Eye size={14} /> Inspect
                    </button>
                  </td>
                </tr>
              ))}
              {submissions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-3xl bg-stone-50 flex items-center justify-center text-stone-200">
                        <ShieldCheck size={32} />
                      </div>
                      <p className="text-stone-400 font-bold uppercase tracking-widest text-xs">No pending applications</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Inspection Modal */}
        {selectedSub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
              
              {/* Modal Header */}
              <div className="p-8 border-b border-stone-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                    <ShieldCheck size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Identity Verification</h2>
                    <p className="text-stone-500 font-medium">Applicant: {selectedSub.profiles?.full_name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedSub(null)}
                  className="p-3 rounded-2xl hover:bg-stone-100 text-stone-400 transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="overflow-y-auto p-8 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  
                  {/* ID Document Visual */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Government ID Document
                    </p>
                    <div className="aspect-[3/2] rounded-3xl overflow-hidden bg-stone-100 border border-stone-100 relative group">
                      <img 
                        src={selectedSub.document_url} 
                        alt="ID Doc" 
                        className="w-full h-full object-contain"
                      />
                      <a 
                        href={selectedSub.document_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="bg-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-slate-900">View Full Size</span>
                      </a>
                    </div>
                  </div>

                  {/* Selfie Visual */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Verification Selfie
                    </p>
                    <div className="aspect-[3/2] rounded-3xl overflow-hidden bg-stone-100 border border-stone-100 relative group">
                      <img 
                        src={selectedSub.selfie_url} 
                        alt="Selfie" 
                        className="w-full h-full object-contain"
                      />
                      <a 
                        href={selectedSub.selfie_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="bg-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-slate-900">View Full Size</span>
                      </a>
                    </div>
                  </div>

                </div>

                {/* Additional Details */}
                <div className="mt-12 p-8 rounded-[2rem] bg-stone-50 flex flex-wrap gap-12 border border-stone-100">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Full Legal Name</p>
                    <p className="text-xl font-black text-slate-900">{selectedSub.profiles?.full_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">ID/Passport Number</p>
                    <p className="text-xl font-mono font-bold text-slate-900">{selectedSub.id_number}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Submission Date</p>
                    <p className="text-xl font-black text-slate-900">{new Date(selectedSub.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Modal Footer (Controls) */}
              <div className="p-8 bg-stone-50 flex items-center justify-end gap-4 border-t border-stone-100 shrink-0">
                <button 
                  disabled={processingId !== null}
                  onClick={() => handleReview(selectedSub, 'rejected')}
                  className="px-8 py-4 rounded-2xl bg-white text-red-600 text-sm font-black uppercase tracking-widest border border-red-100 hover:bg-red-50 transition-all active:scale-95 disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    {processingId === selectedSub.id ? <Loader2 className="animate-spin w-4 h-4" /> : <XCircle size={18} />}
                    Reject Profile
                  </div>
                </button>
                <button 
                  disabled={processingId !== null}
                  onClick={() => handleReview(selectedSub, 'verified')}
                  className="px-8 py-4 rounded-2xl bg-slate-900 text-white text-sm font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-xl shadow-slate-900/20 disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    {processingId === selectedSub.id ? <Loader2 className="animate-spin w-4 h-4" /> : <CheckCircle size={18} />}
                    Approve Seller
                  </div>
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
