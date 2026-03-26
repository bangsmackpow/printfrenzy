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

export default function ShippingPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/shipping');
      if (res.ok) {
        setShipments(await res.json());
      }
    } catch (err) {
      console.error("Fetch error:", err);
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
            <div className="h-3 w-3 bg-green-500 rounded-full"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">USPS Logistics Dashboard</p>
          </div>
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic uppercase">Shipments</h1>
        </div>
        <div className="bg-white px-8 py-4 rounded-2xl border border-slate-200 shadow-sm text-center">
            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Total Labels</p>
            <p className="text-3xl font-black text-slate-900 italic">{shipments.length}</p>
        </div>
      </header>

      {shipments.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-32 text-center">
          <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-300">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
          </div>
          <h3 className="text-2xl font-black text-slate-900 uppercase italic">No Shipments Found</h3>
          <p className="text-slate-400 font-bold mt-2">Generate your first USPS label from any Order Details page.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Date / Batch</th>
                <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Customer / Address</th>
                <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Tracking Number</th>
                <th className="p-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {shipments.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-8">
                    <p className="text-xs font-bold text-slate-400 mb-1">{new Date(s.created_at).toLocaleDateString()}</p>
                    <p className="text-sm font-black text-slate-900 italic">Batch #{s.order_number}</p>
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
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        <span className="text-xs font-black tracking-tight">{s.tracking_number}</span>
                    </div>
                  </td>
                  <td className="p-8">
                    <div className="flex gap-2">
                        <a 
                            href={s.label_url} 
                            target="_blank"
                            className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-blue-100"
                        >
                            Print Label
                        </a>
                        <button 
                            onClick={() => router.push(`/orders/details?order_number=${s.order_number}`)}
                            className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 rounded-2xl transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
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
