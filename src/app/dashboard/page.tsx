"use client";
import { useEffect, useState } from 'react';
import { getPrinterQualityImage } from '@/utils/wixUtils';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  product_name: string;
  variant: string;
  image_url: string;
  status: string;
}

export default function PrinterDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const res = await fetch('/api/orders?status=ORDERED');
    const data = await res.json();
    setOrders(data);
    setLoading(false);
  };

  const markAsPrinted = async (orderId: string) => {
    await fetch(`/api/orders/${orderId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status: 'PRINTED' }),
    });
    // Refresh the list
    fetchOrders();
  };

  if (loading) return <div className="p-10 text-center">Loading Orders...</div>;

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-slate-800">DTF Print Queue</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orders.map((order) => (
          <div key={order.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-200">
            <div className="aspect-square relative bg-slate-200">
              <img 
                src={getPrinterQualityImage(order.image_url)} 
                alt={order.product_name}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg leading-tight">{order.product_name}</h3>
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-mono">
                  #{order.order_number}
                </span>
              </div>
              <p className="text-slate-600 text-sm mb-1"><strong>Customer:</strong> {order.customer_name}</p>
              <p className="text-slate-600 text-sm mb-4"><strong>Variant:</strong> {order.variant}</p>
              
              <button 
                onClick={() => markAsPrinted(order.id)}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors"
              >
                Mark as Printed
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {orders.length === 0 && (
        <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-slate-300">
          <p className="text-slate-500 text-xl">No orders ready to print! ☕</p>
        </div>
      )}
    </div>
  );
}