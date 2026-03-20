"use client";

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
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
  notes?: string;
  print_name?: string;
}

function PrintContent() {
  const [items, setItems] = useState<Order[]>([]);
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('order_number');

  const fetchDetails = useCallback(async () => {
    if (!orderNumber) return;
    try {
      const res = await fetch(`/api/orders/details?order_number=${encodeURIComponent(orderNumber)}`);
      if (res.ok) {
        setItems(await res.json());
      }
    } catch (err) {
      console.error("Print fetch error:", err);
    }
  }, [orderNumber]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  if (!items.length) return <div className="p-20 text-center font-black">Loading Print Manifest...</div>;

  return (
    <div className="bg-white text-black min-h-screen p-8 print:p-0">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Manifest Header */}
        <div className="border-b-4 border-black pb-8 flex justify-between items-end">
          <div>
            <h1 className="text-6xl font-black uppercase tracking-tighter">Production Manifest</h1>
            <p className="text-2xl font-bold mt-2 flex items-center gap-4">
                <span>Batch #{orderNumber}</span>
                <span className="h-2 w-2 bg-black rounded-full"></span>
                <span>{new Date().toLocaleDateString()}</span>
            </p>
          </div>
          <div className="text-right hidden print:block">
            <p className="text-xs font-bold uppercase">Printed by PrintFrenzy Automated Queue</p>
          </div>
        </div>

        {/* Global Batch Note if exists */}
        {items[0].notes && (
            <div className="bg-slate-100 p-6 rounded-2xl border-2 border-slate-900 border-dashed">
                <p className="text-xs font-black uppercase mb-2">Internal Production Instructions</p>
                <p className="text-lg font-bold italic">"{items[0].notes}"</p>
            </div>
        )}

        <div className="space-y-10">
          {items.map((item, idx) => (
            <div key={item.id} className="border-2 border-black rounded-3xl overflow-hidden page-break-inside-avoid">
              <div className="flex bg-black text-white px-6 py-3 justify-between items-center">
                <span className="font-black text-xs uppercase tracking-widest">Part {idx + 1} of {items.length}</span>
                <span className="font-black uppercase italic">{item.customer_name}</span>
              </div>
              
              <div className="p-8 flex gap-10">
                <div className="w-64 h-64 relative bg-slate-50 border border-slate-200 rounded-2xl flex-shrink-0">
                  <Image 
                    src={getPrinterQualityImage(item.image_url, true)} 
                    alt="Artwork" 
                    fill 
                    className="object-contain p-2"
                    unoptimized
                  />
                </div>
                
                <div className="flex-grow space-y-4">
                   <div>
                        <p className="text-xs font-black uppercase text-slate-500">Product</p>
                        <h2 className="text-3xl font-black tracking-tight leading-tight">{item.product_name}</h2>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-6">
                        <div className="border-l-4 border-slate-900 pl-4">
                            <p className="text-xs font-black uppercase text-slate-500">Variant / Size</p>
                            <p className="text-xl font-black uppercase">{item.variant || 'Standard'}</p>
                        </div>
                        <div className="border-l-4 border-slate-900 pl-4">
                            <p className="text-xs font-black uppercase text-slate-500">Master Quantity</p>
                            <p className="text-3xl font-black">X {item.quantity}</p>
                        </div>
                   </div>

                   {item.print_name && (
                       <div className="bg-amber-100 p-4 rounded-xl border-2 border-amber-400">
                           <p className="text-xs font-black uppercase text-amber-600 mb-1">Personalization / Name to Print</p>
                           <p className="text-4xl font-black tracking-tighter uppercase">{item.print_name}</p>
                       </div>
                   )}
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 border-t-2 border-black flex justify-between px-8 text-[10px] font-bold uppercase">
                  <div className="flex gap-8">
                     <span className="flex items-center gap-2"><div className="h-3 w-3 border border-black"></div> QC Check</span>
                     <span className="flex items-center gap-2"><div className="h-3 w-3 border border-black"></div> Layout Ok</span>
                     <span className="flex items-center gap-2"><div className="h-3 w-3 border border-black"></div> Applied</span>
                  </div>
                  <span>Order ID: {item.id}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center pt-10 pb-20 no-print">
            <button 
                onClick={() => window.print()} 
                className="bg-black text-white px-10 py-5 rounded-full font-black uppercase tracking-widest hover:scale-105 transition-all shadow-2xl"
            >
                Start Print Job 🖨️
            </button>
        </div>
      </div>
      
      <style jsx global>{`
        @media print {
          .no-print { display: none; }
          .page-break-inside-avoid { page-break-inside: avoid; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={<div>Loading Print Content...</div>}>
      <PrintContent />
    </Suspense>
  );
}
