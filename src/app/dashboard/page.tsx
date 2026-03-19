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

  const statusTabs: { label: string; value: OrderStatus; count?: number }[] = [
    { label: 'Production Queue', value: 'ORDERED' },
    { label: 'Printed / Waiting', value: 'PRINTED' },
    { label: 'Completed', value: 'COMPLETED' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Search and Filter Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-4">
            {/* Tabs */}
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

            {/* Search */}
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
        {error === 'unauthorized' && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <p className="font-bold flex items-center">
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
              Access Denied
            </p>
            <p className="text-sm opacity-90">You do not have administrative permissions for that action.</p>
          </div>
        )}

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
              {statusTabs.find(t => t.value === activeStatus)?.label}
            </h1>
            <p className="text-slate-500 mt-1 font-medium">
              {loading ? 'Refreshing...' : `${orders.length} orders found`}
            </p>
          </div>
          <button 
            onClick={fetchOrders}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Refresh"
          >
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
              <div className="h-3 w-48 bg-slate-100 rounded"></div>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-3xl border border-slate-200 shadow-sm border-dashed">
            <div className="bg-slate-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-400">No orders found here</h2>
            <p className="text-slate-400 mt-2">Try changing your search or checking another tab.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {orders.map((order) => (
              <div key={order.id} className="group bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden hover:shadow-xl hover:border-blue-200 transition-all duration-300 hover:-translate-y-1">
                {/* Print Preview Area */}
                <div className="aspect-square bg-[#fcfcfc] relative overflow-hidden">
                  <img 
                    src={getPrinterQualityImage(order.image_url)} 
                    alt={order.product_name}
                    className="w-full h-full object-contain p-6 group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-white/90 backdrop-blur shadow-sm text-slate-900 text-xs font-black px-3 py-1.5 rounded-full border border-slate-100">
                      #{order.order_number || 'MANUAL'}
                    </span>
                  </div>
                </div>

                {/* Order Details */}
                <div className="p-6 flex-grow flex flex-col bg-white">
                  <div className="mb-4">
                    <h3 className="font-extrabold text-slate-900 text-lg leading-tight mb-1 group-hover:text-blue-600 transition-colors">
                      {order.product_name}
                    </h3>
                    <p className="text-sm text-slate-500 flex items-center">
                      <svg className="h-4 w-4 mr-1.5 text-slate-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>
                      {order.customer_name}
                    </p>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6 flex-grow flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Options</span>
                      <p className="text-sm font-bold text-slate-700">{order.variant || 'Standard'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Qty</span>
                      <p className="text-lg font-black text-blue-600 leading-none">{order.quantity || 1}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {activeStatus === 'ORDERED' && (
                      <button 
                        onClick={() => updateStatus(order.id, 'PRINTED')}
                        className="w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-slate-200 hover:shadow-blue-200 active:scale-95 flex items-center justify-center gap-2"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 00-2 2h2m2 4h10a2 2 0 002-2v-3a2 2 0 00-2-2H5a2 2 0 00-2 2v3a2 2 0 002 2zm0 0v-9a2 2 0 012-2h6a2 2 0 012 2v9m-8-3h4" /></svg>
                        Mark Printed
                      </button>
                    )}
                    {activeStatus === 'PRINTED' && (
                      <button 
                        onClick={() => updateStatus(order.id, 'COMPLETED')}
                        className="w-full bg-blue-600 hover:bg-green-600 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-blue-200 hover:shadow-green-200 active:scale-95 flex items-center justify-center gap-2"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Complete Order
                      </button>
                    )}
                    {(activeStatus === 'COMPLETED' || activeStatus === 'PRINTED') && (
                      <button 
                        onClick={() => updateStatus(order.id, 'ORDERED')}
                        className="p-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-all active:scale-95"
                        title="Move to Queue"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      </button>
                    )}
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