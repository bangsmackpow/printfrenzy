"use client";

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getPrinterQualityImage } from '@/utils/wixUtils';
import { useSession, signOut } from "next-auth/react";
import Image from 'next/image';

type OrderStatus = 'RECEIVED' | 'ORDERING' | 'PRINTING' | 'PRODUCTION' | 'COMPLETED' | 'ARCHIVED';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  product_name: string;
  variant: string;
  image_url: string;
  status: OrderStatus;
  quantity: number;
  created_at: string;
  notes?: string;
  print_name?: string;
}

function DashboardContent() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<OrderStatus | 'ALL'>('RECEIVED');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        setItems(await res.json());
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);
  
  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/orders/sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(`Sync Complete!\nAdded: ${data.added}\nAlready exists: ${data.skipped}`);
        fetchItems();
      } else {
        alert("Sync Failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Sync error:", err);
      alert("Sync failed to execute.");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    } else if (authStatus === 'authenticated') {
      fetchItems();
    }
  }, [authStatus, router, fetchItems]);

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const res = await fetch(`/api/orders/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      });

      if (res.ok) {
        setItems(prev => prev.map(item => item.id === orderId ? { ...item, status: newStatus } : item));
      }
    } catch (err) {
      console.error("Update error:", err);
    }
  };

  const bulkUpdateStatus = async (newStatus: OrderStatus) => {
    if (selectedIds.length === 0) return;
    try {
      const res = await fetch(`/api/orders/bulk-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: selectedIds, status: newStatus }),
      });

      if (res.ok) {
        setItems(prev => prev.map(item => selectedIds.includes(item.id) ? { ...item, status: newStatus } : item));
        setSelectedIds([]);
      }
    } catch (err) {
      console.error("Bulk update error:", err);
    }
  };

  const deleteGroup = async (orderNumber: string) => {
    if (!confirm(`Are you sure you want to delete Batch #${orderNumber}?`)) return;
    try {
      const res = await fetch(`/api/orders/delete?order_number=${orderNumber}`, { method: 'DELETE' });
      if (res.ok) {
        setItems(prev => prev.filter(item => item.order_number !== orderNumber));
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  if (authStatus === 'loading' || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-[10px] uppercase tracking-widest text-slate-400">Syncing Production Queue</p>
      </div>
    );
  }

  const filteredItems = filter === 'ALL' ? items : items.filter(i => i.status === filter);

  // Group by order_number
  const grouped = filteredItems.reduce((acc, item) => {
    if (!acc[item.order_number]) acc[item.order_number] = [];
    acc[item.order_number].push(item);
    return acc;
  }, {} as Record<string, Order[]>);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleGroup = (ids: string[]) => {
    const allSelected = ids.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...ids])));
    }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen">
      <header className="flex justify-between items-end mb-12">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-3 w-3 bg-blue-600 rounded-full animate-pulse"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Live Production System</p>
          </div>
          <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic uppercase">Print Queue</h1>
        </div>
        
        <div className="flex gap-4 items-center">
            <button 
                onClick={handleSync} 
                disabled={syncing}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
            >
                {syncing ? (
                    <>
                        <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Syncing...
                    </>
                ) : (
                    <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.582m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        Sync Wix
                    </>
                )}
            </button>
            <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 flex gap-1">
                {(['RECEIVED', 'ORDERING', 'PRINTING', 'PRODUCTION', 'COMPLETED', 'ALL'] as const).map((s) => (
                    <button
                        key={s}
                        onClick={() => setFilter(s)}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            filter === s ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        {s === 'RECEIVED' ? 'New' : s}
                    </button>
                ))}
            </div>
            <button onClick={() => signOut()} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-red-500 hover:border-red-100 transition-all shadow-sm group">
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
        </div>
      </header>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-8 py-5 rounded-[2.5rem] shadow-2xl flex items-center gap-8 border border-white/10 backdrop-blur-xl animate-in slide-in-from-bottom-10">
          <div className="flex items-center gap-3 border-r border-white/10 pr-8">
            <span className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center font-black text-xs">{selectedIds.length}</span>
            <p className="text-[10px] font-black uppercase tracking-widest">Selected Items</p>
          </div>
          <div className="flex gap-2">
            {(['ORDERING', 'PRINTING', 'PRODUCTION', 'COMPLETED'] as OrderStatus[]).map(status => (
              <button 
                key={status}
                onClick={() => bulkUpdateStatus(status)}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-white/5"
              >
                Move to {status}
              </button>
            ))}
          </div>
          <button onClick={() => setSelectedIds([])} className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white ml-4">Cancel</button>
        </div>
      )}

      {Object.keys(grouped).length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-32 text-center">
          <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
            <svg className="h-10 w-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H4a2 2 0 00-2 2v7m18 0a2 2 0 01-2 2H4a2 2 0 01-2-2m18 0l-2 2H4l-2-2m18-5l-8 8-4-4-6 6" /></svg>
          </div>
          <h3 className="text-2xl font-black text-slate-900 uppercase italic">Queue is Empty</h3>
          <p className="text-slate-400 font-bold mt-2">No items found for the current filter.</p>
          <div className="mt-8 flex justify-center gap-4">
              <a href="/import" className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 transition-all">Import Wix Orders</a>
              <a href="/orders/new" className="px-8 py-3 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all">Manual Order</a>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-16">
          {Object.entries(grouped).map(([orderNum, items]) => {
            const groupIds = items.map(i => i.id);
            const isGroupSelected = groupIds.every(id => selectedIds.includes(id));
            
            return (
              <section key={orderNum} className="group/section">
                <div className="flex items-center gap-6 mb-8 px-4">
                  <button 
                    onClick={() => toggleGroup(groupIds)}
                    className={`h-10 w-10 rounded-2xl flex items-center justify-center transition-all ${
                        isGroupSelected ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-300 hover:border-blue-200 hover:text-blue-400'
                    }`}
                  >
                    {isGroupSelected ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                        <div className="h-2 w-2 rounded-full bg-current"></div>
                    )}
                  </button>
                  
                  <div className="flex flex-col">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Batch Identifier</p>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase flex items-center gap-4">
                        Batch: {orderNum}
                        <span className="text-slate-200 font-normal">/</span>
                        <span className="text-blue-600 text-2xl">#{items.length} Items</span>
                    </h2>
                  </div>

                  <div className="flex-grow h-[1px] bg-slate-100 group-hover/section:bg-blue-100 transition-colors"></div>

                  <div className="flex gap-2">
                    <button 
                        onClick={() => router.push(`/orders/details?order_number=${orderNum}`)}
                        className="px-6 py-3 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm"
                    >
                        View Full Details
                    </button>
                    {(session?.user as { role?: string })?.role === 'ADMIN' || (session?.user as { role?: string })?.role === 'MANAGER' ? (
                        <button 
                            onClick={() => deleteGroup(orderNum)}
                            className="p-3 bg-white border border-slate-200 text-slate-300 rounded-2xl hover:text-red-500 hover:border-red-100 transition-all shadow-sm"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h14" /></svg>
                        </button>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                  {items.map((item) => (
                    <div 
                      key={item.id} 
                      className={`group relative bg-white rounded-[2rem] border-2 transition-all duration-500 flex flex-col overflow-hidden ${
                        selectedIds.includes(item.id) 
                          ? 'border-blue-600 shadow-2xl shadow-blue-100 scale-[1.02]' 
                          : 'border-slate-100 hover:border-blue-200 shadow-xl shadow-slate-200/50'
                      }`}
                    >
                      {/* Checkbox Overlay */}
                      <button 
                        onClick={() => toggleSelect(item.id)}
                        className={`absolute top-4 left-4 z-10 h-8 w-8 rounded-xl flex items-center justify-center transition-all ${
                            selectedIds.includes(item.id) ? 'bg-blue-600 text-white rotate-0' : 'bg-white/90 backdrop-blur shadow-md text-slate-300 opacity-0 group-hover:opacity-100 -rotate-12 group-hover:rotate-0'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      </button>

                      {/* Image Container */}
                      <div className="aspect-square relative overflow-hidden bg-slate-50 group-hover:bg-blue-50 transition-colors">
                        <Image 
                          src={getPrinterQualityImage(item.image_url)} 
                          alt={item.product_name} 
                          fill 
                          className="object-contain p-6 group-hover:scale-110 transition-transform duration-700 ease-out"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>

                      {/* Content */}
                      <div className="p-6 flex-grow flex flex-col">
                        <div className="mb-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">{item.customer_name}</p>
                            <h3 className="text-lg font-black text-slate-900 leading-tight uppercase italic truncate">{item.product_name}</h3>
                        </div>

                        <div className="flex gap-2 mb-6">
                            <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest italic">
                                x{item.quantity}
                            </span>
                            <span className="bg-slate-50 border border-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest truncate">
                                {item.variant || 'Standard'}
                            </span>
                        </div>

                        <div className="mt-auto space-y-2">
                            <div className="flex justify-between items-end mb-1 px-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Quick Move</label>
                                <button 
                                    onClick={() => router.push(`/orders/${item.id}/edit`)}
                                    className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:text-slate-900 transition-colors flex items-center gap-1"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    Modify
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {(['PRINTING', 'PRODUCTION', 'COMPLETED'] as const).map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => updateStatus(item.id, s)}
                                        className={`py-2 rounded-xl text-[8px] font-black uppercase tracking-[0.15em] transition-all border ${
                                            item.status === s 
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' 
                                                : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200 hover:text-blue-600'
                                        }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-[10px] uppercase tracking-widest text-slate-400 italic">Accessing Printer Vault</p>
    </div>}>
      <DashboardContent />
    </Suspense>
  );
}
