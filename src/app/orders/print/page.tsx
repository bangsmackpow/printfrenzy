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
  const customerFilter = searchParams.get('customer');

  const fetchDetails = useCallback(async () => {
    try {
      const url = orderNumber 
        ? `/api/orders/details?order_number=${encodeURIComponent(orderNumber)}`
        : `/api/orders/details`;
      const res = await fetch(url);
      if (res.ok) {
        let data = await res.json();
        if (customerFilter) {
            data = data.filter((item: any) => item.customer_name === customerFilter);
        }
        setItems(data);
      }
    } catch (err) {
      console.error("Print fetch error:", err);
    }
  }, [orderNumber]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  if (!items.length) {
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-20 text-center gap-6">
            <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center animate-pulse">
                <svg className="h-10 w-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 00-2 2h2m2 4h10a2 2 0 002-2v-3a2 2 0 00-2-2H5a2 2 0 00-2 2v3a2 2 0 002 2zm0 0v-9a2 2 0 012-2h6a2 2 0 012 2v9m-8-3h4" /></svg>
            </div>
            <div>
                <h2 className="text-2xl font-black uppercase text-slate-900 tracking-tighter">No Items Ready to Print</h2>
                <p className="text-slate-400 font-bold text-sm mt-2">Add items to the &quot;Print Queue&quot; status to see them here.</p>
            </div>
            <a href="/dashboard" className="text-blue-600 font-black uppercase tracking-widest text-xs hover:underline">← Back to Queue</a>
        </div>
    );
  }

  // Group by order_number for a cleaner printout
  const grouped = items.reduce((acc, item) => {
    const key = item.order_number || 'MANUAL-JOBS';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, Order[]>);

  return (
    <>
      <div className="bg-white text-black min-h-screen p-8 print:p-0">
      <div className="max-w-4xl mx-auto space-y-16">
        {/* Manifest Header */}
        <div className="border-b-8 border-black pb-10 flex justify-between items-end">
          <div>
            <h1 className="text-7xl font-black uppercase tracking-tighter italic">Order Sheets</h1>
            <p className="text-2xl font-bold mt-3 flex items-center gap-4 text-slate-500">
                <span>{orderNumber ? `Batch #${orderNumber}` : "Global Print Queue"}</span>
                <span className="h-2 w-2 bg-slate-300 rounded-full"></span>
                <span>{new Date().toLocaleDateString()}</span>
            </p>
          </div>
          <div className="text-right hidden print:block">
            <p className="text-[10px] font-black uppercase text-slate-400">Printed by PrintFrenzy</p>
          </div>
        </div>

        {Object.entries(grouped).map(([batch, parts]) => (
          <div key={batch} className="space-y-12">
            {!orderNumber && (
                <div className="flex items-center gap-6">
                    <div className="h-1 flex-grow bg-slate-900 rounded-full"></div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter italic whitespace-nowrap">Batch: {batch}</h2>
                    <div className="h-1 w-20 bg-slate-900 rounded-full"></div>
                </div>
            )}

            {/* Batch Note if exists */}
            {parts[0].notes && (
                <div className="bg-amber-50 p-8 rounded-3xl border-4 border-amber-400 border-dashed">
                    <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">📝</span>
                        <p className="text-xs font-black uppercase text-amber-600 tracking-widest">Master Production Note</p>
                    </div>
                    <p className="text-2xl font-black italic text-slate-900 leading-tight">&quot;{parts[0].notes}&quot;</p>
                </div>
            )}

            <div className="space-y-0">
              {parts.map((item, idx) => (
                <div key={item.id} className="page-break space-y-12 pb-10">
                  {/* Master Batch Header (only on first item of batch in global view) */}
                  {idx === 0 && !orderNumber && (
                    <div className="flex items-center gap-6 no-print-page-break">
                      <div className="h-1 flex-grow bg-slate-900 rounded-full"></div>
                      <h2 className="text-3xl font-black uppercase tracking-tighter italic whitespace-nowrap">Batch ID: {batch}</h2>
                      <div className="h-1 w-20 bg-slate-900 rounded-full"></div>
                    </div>
                  )}

                  <div className="border-8 border-black rounded-[3rem] overflow-hidden shadow-[15px_15px_0px_0px_rgba(0,0,0,1)] bg-white relative">
                    {/* Floating QTY Badge - High visibility, no clash */}
                    <div className="absolute top-8 right-8 z-20 h-24 w-24 bg-slate-900 text-white rounded-3xl flex flex-col items-center justify-center border-4 border-white shadow-xl">
                        <p className="text-[10px] font-black uppercase tracking-tighter opacity-60 leading-none mb-1">Total</p>
                        <p className="text-4xl font-black italic italic leading-none">x{item.quantity}</p>
                    </div>

                    <div className="bg-black text-white px-10 py-5 flex justify-between items-center pr-32">
                      <span className="font-black text-xs uppercase tracking-[0.2em] opacity-80">Part {idx + 1} of {parts.length}</span>
                      <span className="font-black text-2xl uppercase italic tracking-tight">{item.customer_name}</span>
                    </div>
                    
                    <div className="p-12 space-y-10">
                      <div className="flex gap-12 items-start">
                        <div className="w-80 h-80 relative bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] flex-shrink-0 shadow-inner">
                          <Image 
                            src={getPrinterQualityImage(item.image_url, true)} 
                            alt="Artwork" 
                            fill 
                            className="object-contain p-6"
                            unoptimized
                          />
                        </div>
                        
                        <div className="flex-grow space-y-8 pt-4">
                           <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Internal Product Reference</p>
                                <h2 className="text-5xl font-black tracking-tighter leading-[0.9] italic uppercase text-slate-900">{item.product_name}</h2>
                           </div>
                           
                           <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100">
                                <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-2">Variant / Size / Options</p>
                                <p className="text-2xl font-black uppercase italic leading-tight text-slate-700">{item.variant || 'Standard Configuration'}</p>
                           </div>

                           {item.print_name && (
                               <div className="bg-blue-600 p-8 rounded-[2rem] text-white shadow-2xl shadow-blue-200">
                                   <p className="text-[10px] font-black uppercase text-blue-200 tracking-widest mb-2">Personalization / Name to Print</p>
                                   <p className="text-6xl font-black tracking-tighter uppercase italic">{item.print_name}</p>
                               </div>
                           )}
                        </div>
                      </div>

                      {/* Production Sign-offs */}
                      <div className="grid grid-cols-2 gap-12 pt-8 border-t-4 border-slate-50">
                          <div className="space-y-4">
                             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Internal Production Signature / Notes</p>
                             <div className="h-24 border-b-2 border-slate-200 border-dashed"></div>
                             <div className="h-2 border-b-2 border-slate-100 border-dashed"></div>
                          </div>
                          <div className="flex flex-col justify-between">
                             <div className="grid grid-cols-3 gap-4 text-[11px] font-black uppercase tracking-tight">
                                <span className="flex flex-col items-center gap-3 bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
                                    <div className="h-8 w-8 border-4 border-black rounded-lg"></div> ART OK
                                </span>
                                <span className="flex flex-col items-center gap-3 bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
                                    <div className="h-8 w-8 border-4 border-black rounded-lg"></div> PRINTED
                                </span>
                                <span className="flex flex-col items-center gap-3 bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
                                    <div className="h-8 w-8 border-4 border-black rounded-lg"></div> APPLIED
                                </span>
                             </div>
                             <div className="pt-8 border-t-2 border-slate-100 mt-6 flex justify-between items-end">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">QC Inspector:</p>
                                <div className="w-48 border-b-2 border-black"></div>
                             </div>
                          </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-900 text-white/40 p-5 flex justify-between px-10 text-[9px] font-black uppercase tracking-[0.3em]">
                        <span>REF: {item.id.slice(0,8)}...</span>
                        <span className="text-white">Batch: {batch} • Item {idx+1}/{parts.length}</span>
                        <span>Verified Production Manifest</span>
                    </div>
                  </div>

                  {/* Individual Item Note - Own Page if present */}
                  {item.notes && (
                    <div className="page-break pt-10 no-print-pt-0">
                        <div className="bg-amber-50 p-16 rounded-[4rem] border-8 border-amber-400 border-dashed flex flex-col items-center justify-center text-center min-h-[400px]">
                            <div className="h-24 w-24 bg-amber-400 rounded-full flex items-center justify-center text-5xl mb-8 animate-bounce">⚠️</div>
                            <p className="text-[10px] font-black uppercase text-amber-600 tracking-[0.5em] mb-4">Urgent Production Note</p>
                            <h3 className="text-6xl font-black italic text-slate-900 tracking-tight leading-none">&quot;{item.notes}&quot;</h3>
                            <div className="mt-12 h-1 w-32 bg-amber-200 rounded-full"></div>
                        </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="text-center pt-10 pb-20 no-print">
        <button 
          onClick={() => window.print()} 
          className="bg-black text-white px-12 py-6 rounded-full font-black uppercase tracking-widest hover:scale-105 transition-all shadow-2xl text-lg flex items-center gap-4 mx-auto"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 00-2 2h2m2 4h10a2 2 0 002-2v-3a2 2 0 00-2-2H5a2 2 0 00-2 2v3a2 2 0 002 2zm0 0v-9a2 2 0 012-2h6a2 2 0 012 2v9m-8-3h4" /></svg>
          Print Order Sheets
        </button>
      </div>
      
      <style jsx global>{`
        @media print {
          .no-print { display: none; }
          body { background: white !important; margin: 0 !important; }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
          .page-break-after-always {
            page-break-after: always;
          }
          .no-print-page-break {
              page-break-inside: avoid;
          }
        }
      `}</style>
      </div>
    </>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={<div>Loading Print Content...</div>}>
      <PrintContent />
    </Suspense>
  );
}
