"use client";

export const runtime = "edge";

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  product_name: string;
  variant: string;
  image_url: string;
  quantity: number;
}

export default function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
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
  const [fetching, setFetching] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/single?id=${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setFormData({
              order_number: data.order_number || '',
              customer_name: data.customer_name || '',
              product_name: data.product_name || '',
              variant: data.variant || '',
              image_url: data.image_url || '',
              quantity: data.quantity || 1
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch order", err);
      } finally {
        setFetching(false);
      }
    }
    fetchOrder();
  }, [id]);

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

    try {
      const dataToSubmit = {
        id,
        ...formData,
        image_url: formData.image_url || '/placeholder.svg'
      };

      const res = await fetch('/api/orders/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSubmit),
      });

      if (res.ok) {
        router.push('/dashboard');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update order');
      }
    } catch (err) {
      console.error(err);
      alert('A network error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
            <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-black text-[10px] uppercase tracking-widest text-slate-400 italic">Recalling Order Manifest</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 md:p-16 flex items-center justify-center">
      <div className="max-w-xl w-full">
        <header className="text-center mb-12">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 mb-2">Production Modification</p>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase">Edit Order</h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">ID: {id}</p>
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
                <span>Update Artwork</span>
                {uploading && <span className="text-blue-600 animate-pulse lowercase font-bold tracking-tight">uploading...</span>}
            </label>
            
            <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative group/upload h-32 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden">
                        <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" accept="image/*" />
                        {formData.image_url ? (
                            <Image 
                                src={formData.image_url} 
                                alt="Preview" 
                                fill
                                className="object-contain p-2"
                                unoptimized
                            />
                        ) : (
                            <>
                                <svg className="w-8 h-8 text-slate-300 group-hover/upload:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <p className="text-[9px] font-black text-slate-400 mt-2 uppercase">Upload New File</p>
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
                        <p className="text-[9px] font-bold text-slate-400 leading-tight">Replace the current image URL if needed.</p>
                    </div>
                </div>
            </div>
          </div>

          <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 py-5 bg-white border border-slate-200 text-slate-400 rounded-[2rem] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || uploading}
                className="flex-[2] py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest hover:bg-blue-600 active:scale-[0.98] transition-all shadow-xl shadow-blue-100 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Apply Modifications'}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
}
