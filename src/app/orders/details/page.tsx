"use client";

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getPrinterQualityImage } from '@/utils/wixUtils';
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

function DetailContent() {
  const [items, setItems] = useState<Order[]>([]);
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
        <div className="mb-10 flex items-end justify-between border-b border-slate-200 pb-10">
          <div>
            <button onClick={() => router.back()} className="mb-4 text-xs font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-2">
                <span>←</span> Back to Queue
            </button>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic">Batch: {orderNumber}</h1>
            <p className="text-slate-500 mt-2 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                <span className="h-2 w-2 bg-green-500 rounded-full animate-ping"></span>
                Detailed Production Breakdown ({items.length} items)
            </p>
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
                  <div key={row.id} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50 hover:shadow-2xl transition-all border-b-[6px] border-b-blue-600">
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
                    
                    <div className="mt-8 space-y-4">
                        <div>
                            <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-1">Product Description</p>
                            <h3 className="text-lg font-black text-slate-900 leading-tight">{row.product_name}</h3>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Variant / Size</p>
                                <p className="font-bold text-slate-800 uppercase text-xs truncate italic">{row.variant || 'N/A'}</p>
                            </div>
                            <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Batch Qty</p>
                                <p className="font-black text-white text-md uppercase">x{row.quantity}</p>
                            </div>
                        </div>
                        
                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                            <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                                row.status === 'ORDERED' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                row.status === 'PRINTED' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                'bg-green-50 text-green-600 border border-green-100'
                            }`}>
                                {row.status}
                            </span>
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
