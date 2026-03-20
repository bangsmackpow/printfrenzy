"use client";

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getPrinterQualityImage } from '@/utils/wixUtils';
import Image from 'next/image';

import { useSession } from "next-auth/react";

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  product_name: string;
  variant: string;
  quantity: number;
  image_url: string;
  status: string;
  created_at: string;
  notes?: string;
  print_name?: string;
}

type OrderStatus = 'RECEIVED' | 'ORDERING' | 'PRINTING' | 'PRODUCTION' | 'COMPLETED' | 'ARCHIVED';

function DetailContent() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === 'ADMIN' || (session?.user as { role?: string })?.role === 'MANAGER';
  const [items, setItems] = useState<Order[]>([]);
  
  const updateStatus = async (orderId: string, currentStatus: OrderStatus, targetStatus?: OrderStatus) => {
    const nextStatuses: Record<OrderStatus, OrderStatus | null> = {
      'RECEIVED': 'ORDERING',
      'ORDERING': 'PRINTING',
      'PRINTING': 'PRODUCTION',
      'PRODUCTION': 'COMPLETED',
      'COMPLETED': 'ARCHIVED',
      'ARCHIVED': null
    };

    const newStatus = targetStatus || nextStatuses[currentStatus];
    if (!newStatus) return;

    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setItems(prev => prev.map(item => item.id === orderId ? { ...item, status: newStatus } : item));
      } else {
        const data = await res.json();
        alert(`Failed to update status: ${data.error || 'Server error'}`);
      }
    } catch (err) {
      console.error("Status update error:", err);
    }
  };
  const [batchNote, setBatchNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderNumber = searchParams.get('order_number');

  const fetchDetails = useCallback(async () => {
    if (!orderNumber) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/details?order_number=${encodeURIComponent(orderNumber)}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
        if (data.length > 0) {
            setBatchNote(data[0].notes || "");
        }
      }
    } catch (err) {
      console.error("Detail fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [orderNumber]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const saveBatchNote = async () => {
    if (!orderNumber) return;
    setSavingNote(true);
    try {
        const res = await fetch('/api/orders/update-notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_number: orderNumber, notes: batchNote })
        });
        if (res.ok) {
            // Update local state to match
            setItems(prev => prev.map(i => ({ ...i, notes: batchNote })));
        }
    } catch (err) {
        console.error("Note save failed", err);
    } finally {
        setSavingNote(false);
    }
  };

  const deleteItem = async (id: string, name: string) => {
    if (!window.confirm(`Delete ${name}?`)) return;
    try {
      const res = await fetch(`/api/orders/delete?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems(prev => prev.filter(i => i.id !== id));
      } else {
        const data = await res.json();
        alert(`Delete failed: ${data.error}`);
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // Grouping items by Customer Name for categorization
  const groupedByCustomer = items.reduce((acc, item) => {
    const name = item.customer_name || 'Generic Batch Item';
    if (!acc[name]) acc[name] = [];
    acc[name].push(item);
    return acc;
  }, {} as Record<string, Order[]>);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-black animate-pulse">Scanning Batch Details...</div>;
  if (!items.length) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Order not found.</div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between border-b border-slate-200 pb-10 gap-8">
          <div className="flex-grow">
            <button onClick={() => router.back()} className="mb-4 text-xs font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-2">
                <span>←</span> Back to Queue
            </button>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic">Batch: {orderNumber}</h1>
            <div className="flex items-center gap-4 mt-2">
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                    <span className="h-2 w-2 bg-green-500 rounded-full animate-ping"></span>
                    Detailed Production Breakdown ({items.length} items)
                </p>
                <a 
                    href={`/orders/print?order_number=${encodeURIComponent(orderNumber || '')}`}
                    target="_blank"
                    className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2"
                >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 00-2 2h2m2 4h10a2 2 0 002-2v-3a2 2 0 00-2-2H5a2 2 0 00-2 2v3a2 2 0 002 2zm0 0v-9a2 2 0 012-2h6a2 2 0 012 2v9m-8-3h4" /></svg>
                    Print Manifest
                </a>
            </div>
          </div>

          <div className="w-full md:w-96 bg-white rounded-3xl p-6 border border-slate-200 shadow-xl shadow-slate-200/30 flex flex-col gap-3 group">
              <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Internal Batch Notes</span>
                  {savingNote && <span className="text-[8px] font-bold text-blue-600 animate-pulse uppercase">Saving...</span>}
              </div>
              <textarea 
                value={batchNote} 
                onChange={(e) => setBatchNote(e.target.value)}
                onBlur={saveBatchNote}
                placeholder="Mention special requests, rushes, or issues here..."
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24 resize-none"
              />
              <p className="text-[8px] font-bold text-slate-400 uppercase italic">Notes share across all production queues</p>
          </div>
        </div>

        <div className="space-y-16">
          {Object.entries(groupedByCustomer).map(([customer, rows]) => (
            <div key={customer} className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-1 w-12 bg-blue-600 rounded-full"></div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">{customer}</h2>
                <div className="flex-grow h-[1px] bg-slate-200"></div>
                <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest">
                    {rows.length} {rows.length === 1 ? 'part' : 'parts'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {rows.map((row) => (
                  <div key={row.id} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50 hover:shadow-2xl transition-all border-b-[6px] border-b-blue-600 flex flex-col">
                    <div className="aspect-square relative rounded-[1.5rem] overflow-hidden bg-slate-50 border border-slate-100 group">
                      <Image 
                        src={getPrinterQualityImage(row.image_url, true)} 
                        alt={row.product_name} 
                        fill 
                        className="object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                        unoptimized
                      />
                      <a 
                        href={getPrinterQualityImage(row.image_url, true)} 
                        target="_blank" 
                        className="absolute inset-0 bg-slate-900/0 hover:bg-slate-900/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-all cursor-zoom-in"
                      >
                         <div className="bg-white/90 p-4 rounded-full shadow-2xl font-black text-xs uppercase text-slate-900">
                             Full Resolution ↗
                         </div>
                      </a>
                    </div>
                    
                    <div className="mt-8 space-y-4 flex-grow flex flex-col">
                        <div>
                            <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-1">Product Description</p>
                            <h3 className="text-lg font-black text-slate-900 leading-tight">{row.product_name}</h3>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Variant / Size</p>
                                <p className="font-bold text-slate-800 uppercase text-xs italic leading-relaxed whitespace-pre-wrap">{row.variant || 'N/A'}</p>
                            </div>

                            <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100 flex flex-col gap-1">
                                <p className="text-[9px] font-black uppercase text-amber-600 tracking-widest">Prints Name</p>
                                <input 
                                    type="text" 
                                    placeholder="Add Name to Print..."
                                    defaultValue={row.print_name || ""}
                                    className="bg-transparent border-none p-0 text-sm font-black text-slate-800 placeholder:text-amber-300 outline-none w-full"
                                    onBlur={async (e) => {
                                        const val = e.target.value;
                                        await fetch(`/api/orders/${row.id}/update`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ print_name: val })
                                        });
                                        setItems(prev => prev.map(item => item.id === row.id ? { ...item, print_name: val } : item));
                                    }}
                                />
                            </div>

                            <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 flex justify-between items-center">
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Master Qty</p>
                                <p className="font-black text-white text-md uppercase">x{row.quantity}</p>
                            </div>
                        </div>
                        
                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                            <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                                row.status === 'RECEIVED' ? 'bg-slate-50 text-slate-600 border border-slate-100' :
                                row.status === 'ORDERING' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                                row.status === 'PRINTING' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                row.status === 'PRODUCTION' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                row.status === 'COMPLETED' ? 'bg-green-50 text-green-600 border border-green-100' :
                                'bg-slate-200 text-slate-500'
                            }`}>
                                {row.status === 'RECEIVED' ? 'NEW' : row.status}
                            </span>
                            <div className="flex gap-1">
                                <button 
                                  onClick={() => deleteItem(row.id, row.product_name)}
                                  className="h-9 w-9 bg-red-50 text-red-500 rounded-xl flex items-center justify-center border border-red-100 hover:bg-red-500 hover:text-white transition-all"
                                  title="Delete Item"
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                                <div className="flex gap-1">
                                {row.status !== 'ARCHIVED' && (
                                    <button 
                                        onClick={() => updateStatus(row.id, row.status as OrderStatus)}
                                        className="h-9 px-4 bg-slate-900 text-white rounded-l-xl rounded-r-md text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2"
                                    >
                                        Push ➔
                                    </button>
                                )}

                                {isAdmin && (
                                    <div className="relative group/status">
                                        <button className="h-9 px-3 bg-slate-800 text-white rounded-r-xl rounded-l-md hover:bg-slate-700 flex items-center justify-center font-black">
                                            ^
                                        </button>
                                        <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 opacity-0 invisible group-hover/status:opacity-100 group-hover/status:visible transition-all z-30 overflow-hidden">
                                            <div className="p-2 border-b border-slate-50 text-[10px] font-black uppercase text-slate-400 text-center tracking-widest">Jump to Stage</div>
                                            {(['RECEIVED', 'ORDERING', 'PRINTING', 'PRODUCTION', 'COMPLETED', 'ARCHIVED'] as OrderStatus[]).map(st => (
                                                <button 
                                                    key={st}
                                                    onClick={() => updateStatus(row.id, row.status as OrderStatus, st)}
                                                    className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors uppercase"
                                                >
                                                    {st}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                </div>
                            </div>
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>}>
      <DetailContent />
    </Suspense>
  );
}
