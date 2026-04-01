"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getPrinterQualityImage } from '@/utils/wixUtils';
import Image from 'next/image';
import { useSession } from 'next-auth/react';

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

type OrderStatus = 'RECEIVED' | 'ORDERING' | 'PRINTING' | 'STAGING' | 'PRODUCTION' | 'COMPLETED' | 'ARCHIVED';

interface Rate {
    object_id: string;
    provider: string;
    servicelevel: { name: string, token: string };
    amount: string;
    currency: string;
    duration_terms: string;
}

function ShippingBlock({ orderNumber, customerName }: { orderNumber: string, customerName: string }) {
    const [loading, setLoading] = useState(false);
    const [address, setAddress] = useState({ 
        street: '', 
        city: '', 
        state: '', 
        zip: '',
        weight: '7',
        length: '12',
        width: '11',
        height: '2'
    });
    const [shipment, setShipment] = useState<{ tracking_number?: string, label_url?: string } | null>(null);
    const [error, setError] = useState("");
    const [rates, setRates] = useState<Rate[]>([]);
    const [selectedRateId, setSelectedRateId] = useState<string>("");
    const [showAllRates, setShowAllRates] = useState(false);

    useEffect(() => {
        fetch(`/api/shipping/status?order_number=${orderNumber}&customer_name=${encodeURIComponent(customerName)}`)
            .then(res => res.json())
            .then(data => {
                if (data.shipment) setShipment(data.shipment);
            })
            .catch(() => {});
    }, [orderNumber, customerName]);

    const handleGetRates = async () => {
        setLoading(true);
        setError("");
        setRates([]);
        try {
            const res = await fetch('/api/shipping/rates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_number: orderNumber, customer_name: customerName, ...address })
            });
            const data = await res.json();
            if (res.ok) {
                if (data.rates && data.rates.length > 0) {
                    const sorted = (data.rates || []).sort((a: Rate, b: Rate) => parseFloat(a.amount) - parseFloat(b.amount));
                    setRates(sorted);
                    const gaRate = sorted.find((r: Rate) => 
                        r.servicelevel.token === 'usps_ground_advantage' || 
                        r.servicelevel.name.toLowerCase().includes("ground advantage")
                    );
                    if (gaRate) setSelectedRateId(gaRate.object_id);
                    else if (sorted.length > 0) setSelectedRateId(sorted[0].object_id);
                    setShowAllRates(false);
                }
            } else {
                setError(data.error || "Failed to fetch rates");
            }
        } catch (err: unknown) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchaseRate = async () => {
        if (!selectedRateId) return;
        setLoading(true);
        setError("");
        try {
            const res = await fetch('/api/shipping/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_number: orderNumber, customer_name: customerName, ...address, rate_id: selectedRateId })
            });
            const data = await res.json();
            if (res.ok) {
                setShipment(data);
                setRates([]);
            } else {
                console.error("Purchase Error Details:", data.details);
                const detailMsg = data.details?.messages?.[0]?.text || data.details?.message || "";
                setError(data.error + (detailMsg ? `: ${detailMsg}` : ""));
            }
        } catch (err: unknown) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    if (shipment?.tracking_number) {
        return (
            <div className="bg-green-50 border border-green-200 p-6 rounded-[2rem] flex items-center justify-between mt-4 shadow-sm">
                <div>
                    <p className="text-[10px] font-black uppercase text-green-600 tracking-widest mb-1">USPS Label Generated</p>
                    <div className="flex items-center gap-2">
                        <p className="font-black text-slate-900 text-lg italic uppercase">{shipment.tracking_number}</p>
                        <a 
                            href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${shipment.tracking_number}`}
                            target="_blank"
                            className="p-2 bg-white border border-green-100 text-green-600 rounded-lg hover:bg-green-100 transition-all"
                            title="Track on USPS"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </a>
                    </div>
                </div>
                <a href={shipment.label_url} target="_blank" className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-blue-100">Print Label</a>
            </div>
        );
    }

    return (
        <div className="bg-white border border-slate-200 p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 mt-4 overflow-hidden">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                Purchase Shipping Label
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <input type="text" placeholder="Street Address" className="md:col-span-2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-300 uppercase" value={address.street} onChange={e => setAddress({...address, street: e.target.value})} />
                <input type="text" placeholder="City" className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-300 uppercase" value={address.city} onChange={e => setAddress({...address, city: e.target.value})} />
                <div className="flex gap-2">
                    <input type="text" placeholder="ST" className="w-16 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-300 text-center uppercase" value={address.state} maxLength={2} onChange={e => setAddress({...address, state: e.target.value})} />
                    <input type="text" placeholder="ZIP" className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-300 text-center font-mono" value={address.zip} onChange={e => setAddress({...address, zip: e.target.value})} />
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pt-4 border-t border-slate-50">
                <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase text-slate-400 ml-1">Weight (oz)</p>
                    <input type="number" placeholder="OZ" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-300" value={address.weight} onChange={e => setAddress({...address, weight: e.target.value})} />
                </div>
                <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase text-slate-400 ml-1">L (in)</p>
                    <input type="number" placeholder="L" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono placeholder:text-slate-300" value={address.length} onChange={e => setAddress({...address, length: e.target.value})} />
                </div>
                <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase text-slate-400 ml-1">W (in)</p>
                    <input type="number" placeholder="W" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono placeholder:text-slate-300" value={address.width} onChange={e => setAddress({...address, width: e.target.value})} />
                </div>
                <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase text-slate-400 ml-1">H (in)</p>
                    <input type="number" placeholder="H" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono placeholder:text-slate-300" value={address.height} onChange={e => setAddress({...address, height: e.target.value})} />
                </div>
            </div>

            {rates.length > 0 && (
                <div className="mt-6 space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 animate-in slide-in-from-top-2">
                    <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-3 ml-1">Available Shipping Methods</p>
                    {rates
                        .filter((r) => {
                            if (showAllRates) return true;
                            const isGA = r.servicelevel.token.includes('usps_ground') || (r.provider.toLowerCase() === 'usps' && r.servicelevel.name.toLowerCase().includes("ground"));
                            const hasGA = rates.some(r2 => r2.servicelevel.token.includes('usps_ground') || (r2.provider.toLowerCase() === 'usps' && r2.servicelevel.name.toLowerCase().includes("ground")));
                            if (!hasGA) return true;
                            const gaRate = rates.find(r2 => r2.servicelevel.token.includes('usps_ground') || (r2.provider.toLowerCase() === 'usps' && r2.servicelevel.name.toLowerCase().includes("ground")));
                            const gaAmount = parseFloat(gaRate?.amount || "999");
                            return isGA || parseFloat(r.amount) < gaAmount;
                        })
                        .map(rate => (
                        <label key={rate.object_id} className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedRateId === rate.object_id ? 'bg-white border-blue-600 shadow-sm' : 'bg-transparent border-transparent hover:border-slate-200'}`}>
                            <div className="flex items-center gap-3">
                                <input type="radio" name="order-rate" checked={selectedRateId === rate.object_id} onChange={() => setSelectedRateId(rate.object_id)} className="w-4 h-4 text-blue-600" />
                                <div>
                                    <p className="font-black text-xs text-slate-900 uppercase italic leading-none mb-1">
                                        <span className="text-blue-600 mr-2">{rate.provider}</span>
                                        {rate.servicelevel.name}
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">{rate.duration_terms}</p>
                                </div>
                            </div>
                            <p className="font-black text-slate-900 text-base">${rate.amount}</p>
                        </label>
                    ))}

                    {showAllRates ? (
                        <button type="button" onClick={() => setShowAllRates(false)} className="w-full py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors">Hide more options</button>
                    ) : rates.length > 1 && (
                        <button type="button" onClick={() => setShowAllRates(true)} className="w-full py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors">Show more carrier options</button>
                    )}

                    <button 
                        onClick={handlePurchaseRate} 
                        disabled={loading || !selectedRateId} 
                        className="w-full mt-2 bg-blue-600 text-white px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                    >
                        {loading ? <span className="animate-spin text-lg">⚙️</span> : 'Confirm & Purchase Label'}
                    </button>
                    <button onClick={() => setRates([])} className="w-full text-center py-2 text-[9px] font-black uppercase text-slate-400 hover:text-red-500 transition-colors">Cancel</button>
                </div>
            )}

            {error && <p className="text-red-500 text-[10px] font-black uppercase mt-3 px-2">{error}</p>}
            
            {!rates.length && (
                <button 
                    onClick={handleGetRates} 
                    disabled={loading || !address.street || !address.city || !address.state || !address.zip || !address.weight} 
                    className="w-full bg-slate-900 text-white px-4 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-slate-900 transition-all flex items-center justify-center gap-2 mt-2"
                >
                    {loading ? <span className="animate-pulse">Comparing Rates...</span> : 'Compare Carrier Rates'}
                </button>
            )}
        </div>
    );
}

function DetailContent() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === 'ADMIN' || (session?.user as { role?: string })?.role === 'MANAGER';
  const [items, setItems] = useState<Order[]>([]);
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderNumber = searchParams.get('order_number');
  const [batchNote, setBatchNote] = useState("");

  const updateStatus = async (orderId: string, currentStatus: OrderStatus, targetStatus?: OrderStatus) => {
    const newStatus = targetStatus || (currentStatus === 'RECEIVED' ? 'ORDERING' : 
                      currentStatus === 'ORDERING' ? 'PRINTING' : 
                      currentStatus === 'PRINTING' ? 'STAGING' : 
                      currentStatus === 'STAGING' ? 'PRODUCTION' : 
                      currentStatus === 'PRODUCTION' ? 'COMPLETED' : 'ARCHIVED');

    try {
      const res = await fetch(`/api/orders/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      });

      if (res.ok) {
        setItems(prev => prev.map(item => item.id === orderId ? { ...item, status: newStatus as OrderStatus } : item));
      } else {
        const data = await res.json();
        alert(`Failed to update: ${data.error}`);
      }
    } catch (err) {
      console.error("Update error:", err);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function startFetching() {
        if (!orderNumber) return;
        try {
            const res = await fetch(`/api/orders/details?order_number=${encodeURIComponent(orderNumber)}`);
            if (!ignore && res.ok) {
                const data = await res.json();
                setItems(data);
                if (data.length > 0 && data[0].notes) {
                    setBatchNote(data[0].notes);
                }
            }
        } catch (err) {
            console.error("Fetch error:", err);
        }
    }
    startFetching();
    return () => { ignore = true; };
  }, [orderNumber]);

  const saveBatchNote = async () => {
    try {
        const res = await fetch('/api/orders/update-notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_number: orderNumber, notes: batchNote })
        });
        if (!res.ok) {
            console.error("Failed to save note");
        }
    } catch (err) {
        console.error("Note save error:", err);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this part?")) return;
    try {
      const res = await fetch(`/api/orders/delete?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems(prev => prev.filter(item => item.id !== id));
      } else {
        const data = await res.json();
        alert(`Delete failed: ${data.error}`);
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  if (!orderNumber) return <div className="p-20 text-center font-black">No Batch Specified</div>;

  // Group items by customer_name
  const groupedByCustomer = items.reduce((acc, item) => {
    if (!acc[item.customer_name]) acc[item.customer_name] = [];
    acc[item.customer_name].push(item);
    return acc;
  }, {} as Record<string, Order[]>);

  return (
    <div className="min-h-screen bg-slate-50 p-8 md:p-16">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-16">
          <div>
            <div className="flex items-center gap-3 mb-3">
                <button onClick={() => router.back()} className="h-10 w-10 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Order Management System</p>
            </div>
            <h1 className="text-6xl font-black text-slate-900 tracking-tighter italic uppercase">Batch: {orderNumber}</h1>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 flex-grow max-w-md w-full">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block">Internal Batch Notes</label>
              <textarea 
                value={batchNote} 
                onChange={(e) => setBatchNote(e.target.value)}
                onBlur={saveBatchNote}
                placeholder="Mention special requests, rushes, or issues here..."
                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24 resize-none"
              />
              <div className="flex items-center justify-between mt-1">
                  <p className="text-[8px] font-bold text-slate-400 uppercase italic">Notes share across all production queues</p>
                  <button onClick={saveBatchNote} className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all">Save Notes</button>
              </div>
          </div>
        </header>

        <div className="space-y-16">
          {Object.entries(groupedByCustomer).map(([customer, rows]) => (
            <div key={customer} className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
              <div className="flex items-center gap-4">
                <div className="h-1 w-12 bg-blue-600 rounded-full"></div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">{customer}</h2>
                <div className="flex-grow h-[1px] bg-slate-200"></div>
                <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest">
                    {rows.length} {rows.length === 1 ? 'part' : 'parts'}
                </span>
              </div>
              
              <ShippingBlock orderNumber={orderNumber || 'Unknown'} customerName={customer} />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {rows.map((row) => (
                  <div key={row.id} className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 hover:shadow-2xl transition-all border-b-[6px] border-b-blue-600 flex flex-col">
                    <div className="aspect-square relative rounded-[1.5rem] overflow-hidden bg-slate-50 border border-slate-100 group">
                      <Image
                        src={getPrinterQualityImage(row.image_url, true)}
                        alt={row.product_name}
                        fill
                        className="object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                        unoptimized
                      />
                      <a href={row.image_url} target="_blank" className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                          <div className="bg-white/90 p-4 rounded-full shadow-2xl font-black text-xs uppercase text-slate-900">
                              Full Resolution ↗
                          </div>
                       </a>
                    </div>

                    <div className="mt-8 flex-grow">
                      <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-2">{row.variant || 'Standard Option'}</p>
                      <h3 className="text-xl font-black text-slate-900 leading-tight uppercase italic">{row.product_name}</h3>
                      
                      <div className="mt-6 flex items-center gap-4">
                          <div className="h-12 w-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black italic">
                              x{row.quantity}
                          </div>
                          <div className={`flex-grow py-3 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center border-2 ${
                              row.status === 'COMPLETED' ? 'bg-green-50 border-green-100 text-green-600' : 'bg-slate-50 border-slate-100 text-slate-400'
                          }`}>
                              {row.status}
                          </div>
                      </div>

                      {/* Print Name Input */}
                      <div className="mt-6">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Personalization / Prints Name</label>
                          <input 
                            type="text" 
                            defaultValue={row.print_name || ""} 
                            onBlur={async (e) => {
                                if (e.target.value !== row.print_name) {
                                    await fetch(`/api/orders/update-item`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ id: row.id, print_name: e.target.value })
                                    });
                                }
                            }}
                            placeholder="Type name here..."
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase italic"
                          />
                      </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-100 flex gap-2">
                      <button
                        onClick={() => router.push(`/orders/${row.id}/edit`)}
                        className="px-6 py-4 bg-white border border-slate-200 text-blue-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:border-blue-200 hover:bg-blue-50 transition-all flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        Modify
                      </button>
                      <button
                        onClick={() => updateStatus(row.id, row.status)}
                        className="flex-grow py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-blue-100"
                      >
                        Forward
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => deleteItem(row.id)}
                          className="p-4 bg-white border border-slate-200 text-slate-300 rounded-2xl hover:text-red-500 hover:border-red-100 transition-all"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h14" /></svg>
                        </button>
                      )}
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
