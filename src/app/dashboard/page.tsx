"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getPrinterQualityImage } from '@/utils/wixUtils';
import { signOut } from "next-auth/react";

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
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get('error');

  useEffect(() => {
    fetchOrders();
  }, [activeStatus, searchQuery]);

  const fetchOrders = async () => {
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
  };

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
        body: JSON.stringify({ order_number: orderNumber, status: newStatus }),
      });

      if (res.ok) {
        setOrders(orders.filter(o => o.order_number !== orderNumber));
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
                <div className="aspect-square bg-slate-50 relative">
                  <img 
                    src={getPrinterQualityImage(items[0].image_url)} 
                    alt="Order Thumb"
                    className="w-full h-full object-contain p-4"
                  />
                  <div className="absolute top-4 left-4 bg-white/90 px-3 py-1 rounded-full text-xs font-black border">
                    #{items[0].order_number || 'MANUAL'}
                  </div>
                  {items.length > 1 && (
                    <div className="absolute bottom-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase">
                      {items.length} Items in Order
                    </div>
                  )}
                </div>

                <div className="p-6 flex-grow flex flex-col">
                  <div className="mb-4">
                    <h3 className="font-extrabold text-slate-800 truncate">{items[0].customer_name}</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">Multi-Item Shipments</p>
                  </div>

                  <div className="space-y-3 mb-6 flex-grow">
                    {items.map((item) => (
                      <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 relative group/item">
                        <p className="text-xs font-black text-slate-800 leading-tight mb-1">{item.product_name}</p>
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                          <span>{item.variant}</span>
                          <span className="bg-white px-2 py-0.5 rounded-lg border text-blue-600">x{item.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-auto">
                    {activeStatus === 'ORDERED' && (
                      <button 
                        onClick={() => items[0].order_number ? bulkUpdateStatus(items[0].order_number, 'PRINTED') : updateStatus(items[0].id, 'PRINTED')}
                        className="w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2"
                      >
                         <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 00-2 2h2m2 4h10a2 2 0 002-2v-3a2 2 0 00-2-2H5a2 2 0 00-2 2v3a2 2 0 002 2zm0 0v-9a2 2 0 012-2h6a2 2 0 012 2v9m-8-3h4" /></svg>
                        Mark All Printed
                      </button>
                    )}
                    {activeStatus === 'PRINTED' && (
                      <button 
                        onClick={() => items[0].order_number ? bulkUpdateStatus(items[0].order_number, 'COMPLETED') : updateStatus(items[0].id, 'COMPLETED')}
                        className="w-full bg-blue-600 hover:bg-green-600 text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2"
                      >
                        Complete Order
                      </button>
                    )}
                    <button 
                      onClick={async () => {
                        if (window.confirm(`Delete order #${items[0].order_number || 'Manual'}?`)) {
                          const query = items[0].order_number ? `order_number=${items[0].order_number}` : `id=${items[0].id}`;
                          try {
                            const res = await fetch(`/api/orders/delete?${query}`, { method: 'DELETE' });
                            if (res.ok) fetchOrders();
                            else alert("Delete failed.");
                          } catch (e) { alert("An error occurred."); }
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