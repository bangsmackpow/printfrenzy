"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewOrderPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    order_number: '',
    customer_name: '',
    product_name: '',
    variant: '',
    image_url: '',
    quantity: 1
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setUploading(true);
    const body = new FormData();
    body.append("file", selectedFile);

    try {
        const res = await fetch("/api/upload", {
            method: "POST",
            body
        });
        const data = await res.json();
        if (data.publicUrl) {
            setFormData({ ...formData, image_url: data.publicUrl });
        }
    } catch (err) {
        console.error("Upload failed", err);
    } finally {
        setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const dataToSubmit = {
        ...formData,
        image_url: formData.image_url || '/placeholder.png'
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
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between items-center">
                <span>Production Artwork (Optional)</span>
                {uploading && <span className="text-blue-600 animate-pulse lowercase font-bold tracking-tight">uploading...</span>}
            </label>
            
            <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative group/upload h-32 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden">
                        <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" accept="image/*" />
                        {formData.image_url ? (
                            <img src={formData.image_url} alt="Preview" className="h-full w-full object-contain p-2" />
                        ) : (
                            <>
                                <svg className="w-8 h-8 text-slate-300 group-hover/upload:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <p className="text-[9px] font-black text-slate-400 mt-2 uppercase">Upload File</p>
                            </>
                        )}
                    </div>
                    <div className="flex flex-col justify-center gap-2">
                        <input
                            type="url"
                            value={formData.image_url}
                            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                            className="w-full bg-slate-100/50 border border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-[10px]"
                            placeholder="Direct URL Paste..."
                        />
                        <p className="text-[9px] font-bold text-slate-400 leading-tight">Paste a Wix/R2 URL directly or upload a fresh file above.</p>
                    </div>
                </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || uploading}
            className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest hover:bg-blue-600 active:scale-[0.98] transition-all shadow-xl shadow-blue-100 disabled:opacity-50 mt-4"
          >
            {loading ? 'Submitting to Queue...' : 'Inject into Production'}
          </button>
        </form>
      </div>
    </div>
  );
}
