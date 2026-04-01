"use client";

import { useEffect, useState, Suspense, useCallback, useRef } from 'react';
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
  image_url2?: string;
  image_url3?: string;
  image_url4?: string;
  status: string;
  created_at: string;
  notes?: string;
  print_name?: string;
}

function PrintContent() {
  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatches, setSelectedBatches] = useState<Set<string>>(new Set());
  const [printing, setPrinting] = useState(false);
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('order_number');
  const customerFilter = searchParams.get('customer');
  const printRef = useRef<HTMLDivElement>(null);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    try {
      const url = orderNumber 
        ? `/api/orders/details?order_number=${encodeURIComponent(orderNumber)}`
        : `/api/orders/details`;
      const res = await fetch(url);
      if (res.ok) {
        let data: Order[] = await res.json();
        if (customerFilter) {
            data = data.filter((item) => item.customer_name === customerFilter);
        }
        setItems(data);
        const batches = new Set<string>(data.map((item) => item.order_number || 'MANUAL-JOBS'));
        setSelectedBatches(batches);
      }
    } catch (err) {
      console.error("Print fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [orderNumber, customerFilter]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Group by order_number
  const grouped = items.reduce((acc, item) => {
    const key = item.order_number || 'MANUAL-JOBS';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, Order[]>);

  const toggleBatch = (batch: string) => {
    setSelectedBatches(prev => {
      const next = new Set(prev);
      if (next.has(batch)) next.delete(batch);
      else next.add(batch);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedBatches(new Set(Object.keys(grouped)));
  };

  const clearAll = () => {
    setSelectedBatches(new Set());
  };

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 100);
  };

  if (loading) {
    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-20 text-center gap-6">
            <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-black text-[10px] uppercase tracking-widest text-slate-400">Loading Order Sheets</p>
        </div>
    );
  }

  if (!items.length) {
    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-20 text-center gap-6">
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

  const batchEntries = Object.entries(grouped);
  const selectedCount = [...selectedBatches].reduce((sum, batch) => sum + (grouped[batch]?.length || 0), 0);

  return (
    <div className="bg-[#f8fafc] min-h-screen">
      {/* Selection UI - hidden during print */}
      <div className="no-print">
        <div className="p-8 max-w-6xl mx-auto">
          <div className="mb-10 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight italic">Order Sheets</h1>
              <p className="text-slate-500 mt-2 font-medium">Select which batches to print.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200">
                <span className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center font-black text-white text-sm">{selectedBatches.size}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{selectedCount} Items Selected</span>
              </div>
              <button 
                onClick={selectAll}
                className="px-5 py-3 bg-white border border-slate-200 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-600 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm"
              >
                Select All
              </button>
              <button 
                onClick={clearAll}
                className="px-5 py-3 bg-white border border-slate-200 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-600 hover:border-red-200 hover:text-red-600 transition-all shadow-sm"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {batchEntries.map(([batch, batchItems]) => {
              const isSelected = selectedBatches.has(batch);
              return (
                <button
                  key={batch}
                  onClick={() => toggleBatch(batch)}
                  className={`text-left p-6 rounded-2xl border-2 transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/50 shadow-lg shadow-blue-100/50'
                      : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-6 w-6 rounded-lg flex items-center justify-center transition-all ${
                        isSelected ? 'bg-blue-600' : 'bg-slate-100 border border-slate-200'
                      }`}>
                        {isSelected && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        )}
                      </div>
                      <span className="font-black text-slate-900 text-sm">#{batch}</span>
                    </div>
                    <span className="bg-slate-900 text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase">{batchItems.length} items</span>
                  </div>
                  <div className="space-y-1">
                    {batchItems.slice(0, 3).map(item => (
                      <p key={item.id} className="text-xs font-medium text-slate-500 truncate">{item.customer_name} — {item.product_name}</p>
                    ))}
                    {batchItems.length > 3 && (
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">+{batchItems.length - 3} more</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-center pb-20">
            <button 
              onClick={handlePrint}
              disabled={selectedBatches.size === 0}
              className="bg-slate-900 text-white px-12 py-5 rounded-full font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-2xl text-sm flex items-center gap-4 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-slate-900"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 00-2 2h2m2 4h10a2 2 0 002-2v-3a2 2 0 00-2-2H5a2 2 0 00-2 2v3a2 2 0 002 2zm0 0v-9a2 2 0 012-2h6a2 2 0 012 2v9m-8-3h4" /></svg>
              Print {selectedCount} Selected Items
            </button>
          </div>
        </div>
      </div>

      {/* Printable content */}
      <div ref={printRef} className="print-only bg-white text-black min-h-screen p-8 print:p-0">
        {batchEntries.map(([batch, parts]) => {
          if (!selectedBatches.has(batch)) return null;

          return parts.map((item, idx) => (
            <div key={item.id} className="print-page">
              {/* Batch header on first item of each batch */}
              {idx === 0 && (
                <div className="border-b-4 border-black pb-6 mb-8 flex justify-between items-end">
                  <div>
                    <h1 className="text-5xl font-black uppercase tracking-tighter italic">Order Sheets</h1>
                    <p className="text-lg font-bold mt-2 text-slate-500">
                      Batch #{batch} &mdash; {parts.length} item{parts.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-slate-400">Printed by PrintFrenzy</p>
                    <p className="text-sm font-bold text-slate-500">{new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              )}

              {/* Batch note on first item if exists */}
              {idx === 0 && item.notes && (
                <div className="bg-amber-50 p-6 rounded-2xl border-4 border-amber-400 border-dashed mb-8">
                  <p className="text-xs font-black uppercase text-amber-600 tracking-widest mb-1">Production Note</p>
                  <p className="text-lg font-black italic text-slate-900">&quot;{item.notes}&quot;</p>
                </div>
              )}

              {/* Single item packing slip */}
              <div className="border-4 border-black rounded-3xl overflow-hidden bg-white relative">
                {/* QTY Badge */}
                <div className="absolute top-4 right-4 z-10 h-16 w-16 bg-slate-900 text-white rounded-2xl flex flex-col items-center justify-center border-2 border-white shadow-lg">
                  <p className="text-[8px] font-black uppercase tracking-tighter opacity-60 leading-none mb-0.5">Qty</p>
                  <p className="text-3xl font-black leading-none">x{item.quantity}</p>
                </div>

                {/* Header bar */}
                <div className="bg-black text-white px-8 py-4 flex justify-between items-center">
                  <span className="font-black text-[10px] uppercase tracking-widest opacity-80">Item {idx + 1} of {parts.length}</span>
                  <span className="font-black text-xl uppercase italic">{item.customer_name}</span>
                </div>

                <div className="p-8 space-y-6">
                  <div className="flex gap-8 items-start">
                    {(() => {
                      const allImages = [item.image_url, item.image_url2, item.image_url3, item.image_url4].filter((img): img is string => Boolean(img));
                      if (allImages.length <= 1) {
                        return (
                          <div className="w-48 h-48 relative bg-slate-50 border-2 border-slate-100 rounded-2xl flex-shrink-0">
                            <Image
                              src={getPrinterQualityImage(item.image_url, true)}
                              alt="Artwork"
                              fill
                              className="object-contain p-4"
                              unoptimized
                            />
                          </div>
                        );
                      }
                      return (
                        <div className="w-48 h-48 flex-shrink-0 grid grid-cols-2 grid-rows-2 gap-px bg-slate-200 rounded-2xl overflow-hidden border-2 border-slate-100">
                          {allImages.slice(0, 4).map((img, idx) => (
                            <div key={idx} className="relative bg-slate-50">
                              <Image
                                src={getPrinterQualityImage(img, true)}
                                alt={`Artwork ${idx + 1}`}
                                fill
                                className="object-contain p-1"
                                unoptimized
                              />
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    <div className="flex-grow space-y-5 pt-2">
                      <div>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Product</p>
                        <h2 className="text-3xl font-black tracking-tighter leading-tight italic uppercase text-slate-900">{item.product_name}</h2>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-100">
                        <p className="text-[9px] font-black uppercase text-blue-600 tracking-widest mb-1">Variant / Options</p>
                        <p className="text-lg font-black uppercase italic text-slate-700">{item.variant || 'Standard'}</p>
                      </div>

                      {item.print_name && (
                        <div className="bg-blue-600 p-5 rounded-xl text-white">
                          <p className="text-[9px] font-black uppercase text-blue-200 tracking-widest mb-1">Name to Print</p>
                          <p className="text-4xl font-black tracking-tighter uppercase italic">{item.print_name}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sign-offs */}
                  <div className="grid grid-cols-3 gap-6 pt-6 border-t-2 border-slate-100">
                    <span className="flex flex-col items-center gap-2 bg-slate-50 p-3 rounded-xl border-2 border-slate-100">
                      <div className="h-6 w-6 border-4 border-black rounded-lg"></div>
                      <span className="text-[9px] font-black uppercase">Art OK</span>
                    </span>
                    <span className="flex flex-col items-center gap-2 bg-slate-50 p-3 rounded-xl border-2 border-slate-100">
                      <div className="h-6 w-6 border-4 border-black rounded-lg"></div>
                      <span className="text-[9px] font-black uppercase">Printed</span>
                    </span>
                    <span className="flex flex-col items-center gap-2 bg-slate-50 p-3 rounded-xl border-2 border-slate-100">
                      <div className="h-6 w-6 border-4 border-black rounded-lg"></div>
                      <span className="text-[9px] font-black uppercase">Applied</span>
                    </span>
                  </div>

                  <div className="flex justify-between items-end pt-4 border-t-2 border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">QC Inspector:</p>
                    <div className="w-40 border-b-2 border-black"></div>
                  </div>
                </div>

                <div className="bg-slate-900 text-white/40 px-8 py-3 flex justify-between text-[8px] font-black uppercase tracking-widest">
                  <span>REF: {item.id.slice(0,8)}</span>
                  <span className="text-white">Batch: {batch}</span>
                </div>
              </div>
            </div>
          ));
        })}
      </div>

      <style jsx global>{`
        .print-only { display: none; }
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .print-page {
            page-break-after: always;
            break-after: page;
            padding: 24px;
          }
          .print-page:last-child {
            page-break-after: auto;
          }
        }
      `}</style>
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={<div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-black text-[10px] uppercase tracking-widest text-slate-400 italic">Loading Order Sheets</p>
    </div>}>
      <PrintContent />
    </Suspense>
  );
}
