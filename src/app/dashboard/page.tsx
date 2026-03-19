"use client";

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getPrinterQualityImage } from '@/utils/wixUtils';
import { signOut } from "next-auth/react";
import Image from 'next/image';

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
}

type OrderStatus = 'ORDERED' | 'PRINTED' | 'COMPLETED';

function DashboardContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<OrderStatus>('ORDERED');
  const [searchQuery, setSearchQuery] = useState('');
  
  const router = useRouter();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL('/api/orders', window.location.origin);
      url.searchParams.set('status', activeStatus);
      if (searchQuery) url.searchParams.set('q', searchQuery);
      
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  }, [activeStatus, searchQuery]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setOrders(orders.filter(o => o.id !== orderId));
      } else {
        alert("Failed to update status.");
      }
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  const bulkUpdateStatus = async (orderNumber: string, newStatus: OrderStatus) => {
    try {
      const res = await fetch(`/api/orders/bulk-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          order_number: orderNumber, 
          status: newStatus 
        }),
      });

      if (res.ok) {
        setOrders(orders.filter(o => o.order_number !== orderNumber));
        // Simple refresh to reflect changes accurately
        await fetchOrders();
      } else {
        alert("Failed to update group status.");
      }
    } catch (err) {
      console.error("Bulk status update error:", err);
    }
  };

  // Grouping logic for rendering
  const groupedOrders = orders.reduce((acc, order) => {
    const key = order.order_number || order.id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(order);
    return acc;
  }, {} as Record<string, Order[]>);

  const statusTabs: { label: string; value: OrderStatus; count?: number }[] = [
    { label: 'Production Queue', value: 'ORDERED' },
    { label: 'Printed / Waiting', value: 'PRINTED' },
    { label: 'Completed', value: 'COMPLETED' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Navigation Header */}
      <div className="bg-slate-900 text-white py-4 shadow-lg shadow-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <h2 className="text-xl font-black italic tracking-tighter">PrintFrenzy</h2>
            <nav className="hidden md:flex gap-6 text-sm font-bold">
              <a href="/dashboard" className="text-blue-400">Queue</a>
              <a href="/admin/users" className="hover:text-blue-400 transition-colors">Staff</a>
              <a href="/admin/audit" className="hover:text-blue-400 transition-colors">Audit</a>
              <a href="/admin/reports" className="hover:text-blue-400 transition-colors">Reports</a>
              <a href="/import" className="hover:text-blue-400 transition-colors">Wix Import</a>
              <a href="/orders/new" className="hover:text-blue-400 transition-colors">Manual Order</a>
            </nav>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => router.push('/settings')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
            >
              Settings
            </button>
            <button 
              onClick={() => signOut()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-4">
            <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
              {statusTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActiveStatus(tab.value)}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                    activeStatus === tab.value
                       ? 'bg-white text-blue-600 shadow-sm'
                       : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-96">
              <input
                type="text"
                placeholder="Search orders, customers..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <svg className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              {statusTabs.find(t => t.value === activeStatus)?.label}
            </h1>
            <p className="text-slate-500 mt-1 font-medium">
              {loading ? 'Refreshing...' : `${Object.keys(groupedOrders).length} unique orders`}
            </p>
          </div>
          <button onClick={fetchOrders} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <svg className={`h-6 w-6 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {loading && orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-12 w-12 bg-blue-100 rounded-full mb-4"></div>
              <div className="h-4 w-32 bg-slate-200 rounded mb-2"></div>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-3xl border border-dashed text-slate-400">
            No orders found.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {Object.entries(groupedOrders).map(([groupKey, items]) => (
              <div key={groupKey} className="group bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden hover:shadow-xl transition-all duration-300">
                <div 
                    className="aspect-square bg-slate-50 relative cursor-pointer group/cardimg"
                    onClick={() => items[0].order_number && router.push(`/orders/details?order_number=${encodeURIComponent(items[0].order_number)}`)}
                >
                  <Image 
                    src={getPrinterQualityImage(items[0].image_url)} 
                    alt="Order Thumb"
                    fill
                    className="object-contain p-4 group-hover/cardimg:scale-105 transition-transform"
                    unoptimized
                  />
                  <div className="absolute top-4 left-4 bg-white/90 px-3 py-1 rounded-full text-xs font-black border">
                    #{items[0].order_number || 'MANUAL'}
                  </div>
                  {items.length > 1 && (
                    <div className="absolute bottom-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase">
                      {items.length} Items in Order
                    </div>
                  )}
                  {/* View Details Overlay */}
                  <div className="absolute inset-0 bg-slate-900/0 group-hover/cardimg:bg-slate-900/10 flex items-center justify-center transition-all">
                      <span className="bg-white px-4 py-2 rounded-xl text-[10px] font-black uppercase scale-0 group-hover/cardimg:scale-100 transition-all shadow-xl">View Details</span>
                  </div>
                </div>

                <div className="p-6 flex-grow flex flex-col">
                  <div className="mb-4">
                    <h3 
                        className="font-extrabold text-slate-800 truncate cursor-pointer hover:text-blue-600"
                        onClick={() => items[0].order_number && router.push(`/orders/details?order_number=${encodeURIComponent(items[0].order_number)}`)}
                    >
                        {items[0].order_number || 'Manual Order'}
                    </h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">Production Batch</p>
                  </div>

                  <div className="space-y-4 mb-6 flex-grow">
                    {items.slice(0, 4).map((item) => (
                      <div key={item.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 relative group/item hover:bg-white hover:shadow-md transition-all duration-200">
                        <div className="flex gap-3">
                          {/* Image Thumbnail with individual click */}
                          <div className="h-16 w-16 flex-shrink-0 bg-white rounded-xl border border-slate-100 overflow-hidden relative group/img z-10">
                            <Image 
                                src={getPrinterQualityImage(item.image_url)} 
                                alt={item.product_name}
                                fill
                                className="object-contain p-1"
                                unoptimized
                            />
                            {/* Hover Preview Overlay */}
                            <div className="absolute inset-0 z-20 opacity-0 group-hover/img:opacity-100 transition-opacity">
                                <a 
                                    href={getPrinterQualityImage(item.image_url, true)} 
                                    target="_blank" 
                                    className="absolute inset-0 bg-slate-900/40 flex items-center justify-center"
                                >
                                    <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" /></svg>
                                </a>
                                <div className="hidden group-hover/img:block absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-[500px] h-[500px] bg-white rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200 overflow-hidden z-[9999] pointer-events-none p-4 origin-bottom scale-90 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="absolute top-4 left-6 right-6 flex items-center justify-between text-[10px] font-black uppercase text-slate-400">
                                        <span>High-Res Master</span>
                                        <span>Click to Download Full</span>
                                    </div>
                                    <div className="relative w-full h-full">
                                        <Image 
                                            src={getPrinterQualityImage(item.image_url, true)} 
                                            alt="Preview" 
                                            fill
                                            className="object-contain"
                                            unoptimized
                                        />
                                    </div>
                                </div>
                            </div>
                          </div>

                          <div className="flex-grow min-w-0">
                            <div className="flex justify-between items-start">
                                <h4 className="text-[11px] font-black text-slate-800 leading-tight truncate pr-1">{item.product_name}</h4>
                                <span className="bg-white px-2 py-0.5 rounded-lg border text-blue-600 text-[9px] font-black">x{item.quantity}</span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase italic truncate">{item.customer_name}</p>
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold truncate max-w-[120px]">{item.variant}</span>
                                
                                {/* Individual status update */}
                                <button 
                                  onClick={() => updateStatus(item.id, activeStatus === 'ORDERED' ? 'PRINTED' : 'COMPLETED')}
                                  className="h-6 w-6 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all ml-2"
                                  title="Push to Next Stage"
                                >
                                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {items.length > 4 && (
                        <button 
                            onClick={() => items[0].order_number && router.push(`/orders/details?order_number=${encodeURIComponent(items[0].order_number)}`)}
                            className="w-full py-2 bg-slate-100 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-blue-50 hover:text-blue-600 transition-all"
                        >
                            + {items.length - 4} more items...
                        </button>
                    )}
                  </div>

                  <div className="flex gap-2 mt-auto">
                    {activeStatus === 'ORDERED' && (
                      <button 
                        onClick={() => items[0].order_number ? bulkUpdateStatus(items[0].order_number, 'PRINTED') : updateStatus(items[0].id, 'PRINTED')}
                        className="w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm"
                      >
                         <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 00-2 2h2m2 4h10a2 2 0 002-2v-3a2 2 0 00-2-2H5a2 2 0 00-2 2v3a2 2 0 002 2zm0 0v-9a2 2 0 012-2h6a2 2 0 012 2v9m-8-3h4" /></svg>
                        Move Batch
                      </button>
                    )}
                    
                    {activeStatus === 'PRINTED' && (
                      <button 
                        onClick={() => items[0].order_number ? bulkUpdateStatus(items[0].order_number, 'COMPLETED') : updateStatus(items[0].id, 'COMPLETED')}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm"
                      >
                         <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Complete
                      </button>
                    )}
                    <button 
                      onClick={async () => {
                        const label = items[0].order_number || items[0].customer_name;
                        if (window.confirm(`Delete items for ${label}?`)) {
                          const query = items[0].order_number 
                            ? `order_number=${items[0].order_number}` 
                            : `id=${items[0].id}`;
                          try {
                            const res = await fetch(`/api/orders/delete?${query}`, { method: 'DELETE' });
                            if (res.ok) {
                                fetchOrders();
                            } else {
                                const data = await res.json();
                                alert(`Delete failed: ${data.error || "Unknown server error"}`);
                            }
                          } catch (err: unknown) { 
                            const e = err as Error;
                            alert("An error occurred: " + e.message); 
                          }
                        }
                      }}
                      className="p-3.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-2xl transition-all active:scale-95"
                      title="Delete Order"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading Queue...</div>}>
      <DashboardContent />
    </Suspense>
  );
}