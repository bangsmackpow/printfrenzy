"use client";

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Shipment {
  id: string;
  order_number: string;
  customer_name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  tracking_number: string;
  label_url: string;
  created_at: string;
}

interface Rate {
  object_id: string;
  provider: string;
  servicelevel: { name: string };
  amount: string;
  currency: string;
  duration_terms: string;
}

export default function ShippingPage() {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New Shipment Form State
  const [showForm, setShowForm] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formError, setFormError] = useState("");
  const [rates, setRates] = useState<Rate[]>([]);
  const [selectedRateId, setSelectedRateId] = useState<string>("");
  const [formData, setFormData] = useState({
    order_number: '',
    customer_name: '',
    street: '',
    city: '',
    state: '',
    zip: ''
  });

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/shipping');
      if (res.ok) {
        setShipments(await res.json());
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Fetch error:", error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    } else if (authStatus === 'authenticated') {
      fetchShipments();
    }
  }, [authStatus, router, fetchShipments]);

  const handleGetRates = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setFormError("");
    setRates([]);

    try {
        const res = await fetch('/api/shipping/rates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (res.ok) {
            setRates(data.rates || []);
            if (data.rates?.length > 0) setSelectedRateId(data.rates[0].object_id);
        } else {
            setFormError(data.error || "Failed to fetch rates");
        }
    } catch (err: unknown) {
        const error = err as Error;
        setFormError(error.message);
    } finally {
        setIsGenerating(false);
    }
  };

  const handlePurchaseRate = async () => {
    if (!selectedRateId) return;
    setIsGenerating(true);
    setFormError("");

    try {
        const res = await fetch('/api/shipping/purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData, rate_id: selectedRateId })
        });
        const data = await res.json();
        if (res.ok) {
            setShowForm(false);
            setFormData({ order_number: '', customer_name: '', street: '', city: '', state: '', zip: '' });
            setRates([]);
            fetchShipments();
            if (data.label_url) window.open(data.label_url, '_blank');
        } else {
            setFormError(data.error || "Purchase failed");
        }
    } catch (err: unknown) {
        const error = err as Error;
        setFormError(error.message);
    } finally {
        setIsGenerating(false);
    }
  };

  if (authStatus === 'loading' || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-[10px] uppercase tracking-widest text-slate-400">Loading Shipments</p>
      </div>
    );
  }

  return (
    <div className="p-8 md:p-16 max-w-7xl mx-auto min-h-screen">
      <header className="mb-12 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-3 w-3 bg-blue-600 rounded-full animate-pulse"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Standalone Logistics Tool</p>
          </div>
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic uppercase">Shipping Tool</h1>
        </div>
        <div className="flex gap-4">
            <button 
                onClick={() => {
                    setShowForm(!showForm);
                    setRates([]);
                    setFormError("");
                }}
                className={`px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg flex items-center gap-3 ${
                    showForm ? 'bg-white border border-slate-200 text-slate-900 hover:bg-slate-50' : 'bg-slate-900 text-white hover:bg-blue-600 shadow-blue-100'
                }`}
            >
                {showForm ? (
                    <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        Minimize Form
                    </>
                ) : (
                    <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        New Label
                    </>
                )}
            </button>
            <div className="bg-white px-8 py-4 rounded-2xl border border-slate-200 shadow-sm text-center">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Session Total</p>
                <p className="text-3xl font-black text-slate-900 italic">{shipments.length}</p>
            </div>
        </div>
      </header>

      {showForm && (
          <div className="mb-16 bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-3">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                  USPS Label Generator
              </h2>
              <form onSubmit={handleGetRates} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Reference / Order # (Optional)</label>
                          <input type="text" value={formData.order_number} onChange={e => setFormData({...formData, order_number: e.target.value})} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase" placeholder="e.g. EXTERNAL-01" />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Recipient Name</label>
                          <input type="text" required value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase" placeholder="e.g. JOHN DOE" />
                      </div>
                  </div>
                  <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Street Address</label>
                      <input type="text" required value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase" placeholder="123 MAIN ST" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">City</label>
                          <input type="text" required value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase" placeholder="CITY" />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">State (ST)</label>
                          <input type="text" required maxLength={2} value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all text-center uppercase" placeholder="IA" />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">ZIP Code</label>
                          <input type="text" required value={formData.zip} onChange={e => setFormData({...formData, zip: e.target.value})} className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all text-center" placeholder="50801" />
                      </div>
                  </div>
                  
                  {rates.length > 0 && (
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 animate-in slide-in-from-top-2">
                          <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest ml-1 mb-4 block">Select USPS Shipping Method</label>
                          <div className="space-y-3">
                              {rates.map(rate => (
                                  <label key={rate.object_id} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedRateId === rate.object_id ? 'bg-white border-blue-600 shadow-md' : 'bg-transparent border-transparent hover:border-slate-200'}`}>
                                      <div className="flex items-center gap-4">
                                          <input type="radio" name="rate" checked={selectedRateId === rate.object_id} onChange={() => setSelectedRateId(rate.object_id)} className="w-4 h-4 text-blue-600" />
                                          <div>
                                              <p className="font-black text-sm text-slate-900 italic uppercase">{rate.servicelevel.name}</p>
                                              <p className="text-[10px] font-bold text-slate-400 uppercase">{rate.duration_terms}</p>
                                          </div>
                                      </div>
                                      <p className="text-xl font-black text-slate-900">${rate.amount}</p>
                                  </label>
                              ))}
                          </div>
                          <button 
                            type="button"
                            onClick={handlePurchaseRate}
                            disabled={isGenerating || !selectedRateId}
                            className="w-full mt-6 py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-3"
                          >
                                {isGenerating ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Processing Purchase...
                                    </>
                                ) : 'Purchase Selected Label'}
                          </button>
                      </div>
                  )}

                  {formError && <p className="text-red-500 text-[10px] font-black uppercase px-2">{formError}</p>}
                  
                  {!rates.length && (
                    <button 
                        type="submit" 
                        disabled={isGenerating}
                        className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                        {isGenerating ? (
                            <>
                                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Fetching Rates...
                            </>
                        ) : 'Get USPS Shipping Rates'}
                    </button>
                  )}
              </form>
          </div>
      )}

      {shipments.length === 0 && !showForm ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-32 text-center">
          <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-300">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
          </div>
          <h3 className="text-2xl font-black text-slate-900 uppercase italic">No Shipment History</h3>
          <p className="text-slate-400 font-bold mt-2">Generate a standalone USPS label above for any external package.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Date / Reference</th>
                <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Recipient / Destination</th>
                <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Tracking Info</th>
                <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {shipments.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-8">
                    <p className="text-xs font-bold text-slate-400 mb-1">{new Date(s.created_at).toLocaleDateString()}</p>
                    <p className="text-sm font-black text-slate-900 italic uppercase">REF: {s.order_number}</p>
                  </td>
                  <td className="p-8">
                    <p className="text-sm font-black text-slate-900 uppercase mb-1">{s.customer_name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">
                        {s.street}<br/>
                        {s.city}, {s.state} {s.zip}
                    </p>
                  </td>
                  <td className="p-8">
                    <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl border border-blue-100">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        <span className="text-xs font-black tracking-tight uppercase">{s.tracking_number}</span>
                    </div>
                  </td>
                  <td className="p-8 text-right">
                    <div className="flex gap-2 justify-end">
                        <a 
                            href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${s.tracking_number}`}
                            target="_blank"
                            className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 rounded-2xl transition-all group"
                            title="Track Package"
                        >
                            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </a>
                        <a 
                            href={s.label_url} 
                            target="_blank"
                            className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-blue-100"
                        >
                            Print Label
                        </a>
                        {s.order_number && s.order_number !== 'MANUAL' && (
                            <button 
                                onClick={() => router.push(`/orders/details?order_number=${s.order_number}`)}
                                className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 rounded-2xl transition-all group"
                                title="View Associated Order"
                            >
                                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
