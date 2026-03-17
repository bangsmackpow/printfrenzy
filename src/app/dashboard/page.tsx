"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getPrinterQualityImage } from '@/utils/wixUtils';
import { signOut } from "@auth/nextjs/react";

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  product_name: string;
  variant: string;
  image_url: string;
  status: string;
  created_at: string;
}

function DashboardContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders?status=ORDERED');
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

  const markAsPrinted = async (orderId: string) => {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PRINTED' }),
    });

    if (res.ok) {
      // Remove from local state immediately for a snappy UI
      setOrders(orders.filter(o => o.id !== orderId));
    } else {
      alert("Failed to update status.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-slate-600 font-medium">Loading Production Queue...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      {/* Error Alert from Middleware */}
      {error === 'unauthorized' && (
        <div className="max-w-7xl mx-auto mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 shadow-sm" role="alert">
          <p className="font-bold">Access Denied</p>
          <p>You do not have administrative permissions to access that section.</p>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">DTF Print Queue</h1>
            <p className="text-slate-500">Showing {orders.length} pending prints</p>
          </div>
          <button 
            onClick={fetchOrders}
            className="text-sm bg-white border border-slate-300 px-4 py-2 rounded shadow-sm hover:bg-slate-50"
          >
            Refresh List
          </button>
        </header>

        {orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-slate-200">
            <h2 className="text-xl text-slate-400">The queue is empty. Go take a break! ☕</h2>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                {/* Print Preview Area */}
                <div className="aspect-square bg-slate-100 relative group">
                  <img 
                    src={getPrinterQualityImage(order.image_url)} 
                    alt={order.product_name}
                    className="w-full h-full object-contain p-2"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
                </div>

                {/* Order Details */}
                <div className="p-4 flex-grow flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-blue-100">
                      Order #{order.order_number || 'MANUAL'}
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-800 leading-tight mb-1">
                    {order.product_name}
                  </h3>
                  
                  <p className="text-sm text-slate-600 mb-1">
                    <span className="font-semibold">Customer:</span> {order.customer_name}
                  </p>
                  
                  <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-100 flex-grow">
                    <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Variant/Size</p>
                    <p className="text-sm font-medium text-slate-700">{order.variant || 'No options selected'}</p>
                  </div>

                  <button 
                    onClick={() => markAsPrinted(order.id)}
                    className="mt-4 w-full bg-slate-900 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-all transform active:scale-[0.98]"
                  >
                    Mark as Printed
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Next.js App Router requires Suspense when using useSearchParams
export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}