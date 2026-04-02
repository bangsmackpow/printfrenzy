"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const PLACEHOLDER_URL = 'https://pub-0a9a68a0e7bd45fd90bf38ff3ec0e00b.r2.dev/placeholder.svg';

export default function NewOrderPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    order_number: '',
    customer_name: '',
    product_name: '',
    variant: '',
    image_url: '',
    image_url2: '',
    image_url3: '',
    image_url4: '',
    quantity: 1
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<Record<number, boolean>>({});

  const handleFileUpload = async (slot: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setUploading(prev => ({ ...prev, [slot]: true }));
    const body = new FormData();
    body.append("file", selectedFile);

    try {
        const res = await fetch("/api/upload", { method: "POST", body });
        const data = await res.json();
        if (data.publicUrl) {
            setFormData(prev => ({ ...prev, [`image_url${slot === 1 ? '' : slot}`]: data.publicUrl }));
        }
    } catch (err) {
        console.error("Upload failed", err);
    } finally {
        setUploading(prev => ({ ...prev, [slot]: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const dataToSubmit = {
        ...formData,
        image_url: formData.image_url || PLACEHOLDER_URL
    };

    try {
      const res = await fetch('/api/orders/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit),
      });

      if (res.ok) {
        router.push('/dashboard');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create order');
      }
    } catch (err) {
      console.error(err);
      alert('A network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const imageSlots = [
    { key: 'image_url' as const, label: 'Image 1' },
    { key: 'image_url2' as const, label: 'Image 2' },
    { key: 'image_url3' as const, label: 'Image 3' },
    { key: 'image_url4' as const, label: 'Image 4' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-8 md:p-16 flex items-center justify-center">
      <div className="max-w-xl w-full">
        <header className="text-center mb-12">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 mb-2">Internal Production</p>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase">Manual Job</h1>
        </header>

        <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Batch / Order #</label>
                <input
                    type="text"
                    required
                    value={formData.order_number}
                    onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase"
                    placeholder="e.g. 50505"
                />
            </div>
            <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity</label>
                <input
                    type="number"
                    required
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-center"
                />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Customer Name</label>
            <input
              type="text"
              required
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase"
              placeholder="e.g. JOHN SMITH"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Description</label>
            <input
              type="text"
              required
              value={formData.product_name}
              onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase"
              placeholder="e.g. GILDAN 5000 - BLACK"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Size / Variant</label>
            <input
              type="text"
              value={formData.variant}
              onChange={(e) => setFormData({ ...formData, variant: e.target.value })}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase"
              placeholder="e.g. ADULT XL"
            />
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-50">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Production Artwork (Up to 4 Images)</label>
            
            <div className="grid grid-cols-2 gap-4">
              {imageSlots.map((slot, idx) => {
                const url = formData[slot.key];
                const isUploading = uploading[idx + 1];
                return (
                  <div key={slot.key} className="space-y-2">
                    <div className="relative group/upload h-28 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden">
                      <input
                        type="file"
                        onChange={(e) => handleFileUpload(idx + 1, e)}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        accept="image/*"
                      />
                      {url ? (
                        <>
                          <Image src={url} alt={slot.label} fill className="object-contain p-2" unoptimized />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, [slot.key]: '' })); }}
                            className="absolute top-1 right-1 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-black opacity-0 group-hover/upload:opacity-100 transition-opacity z-20"
                          >
                            ×
                          </button>
                        </>
                      ) : (
                        <>
                          <svg className="w-6 h-6 text-slate-300 group-hover/upload:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          <p className="text-[8px] font-black text-slate-400 mt-1 uppercase">{slot.label}</p>
                        </>
                      )}
                      {isUploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>}
                    </div>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setFormData(prev => ({ ...prev, [slot.key]: e.target.value }))}
                      className="w-full bg-slate-100/50 border border-slate-100 rounded-lg px-3 py-2 font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-[9px]"
                      placeholder="URL..."
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || Object.values(uploading).some(Boolean)}
            className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest hover:bg-blue-600 active:scale-[0.98] transition-all shadow-xl shadow-blue-100 disabled:opacity-50 mt-4"
          >
            {loading ? 'Submitting to Queue...' : 'Inject into Production'}
          </button>
        </form>
      </div>
    </div>
  );
}
