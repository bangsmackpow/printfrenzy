"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface ManualItem {
  id: string;
  product_name: string;
  variant: string;
  quantity: number;
  customer_name?: string;
  image_url?: string; // Choice: Row-specific image
  file?: File | null; // Row-specific file
  uploading?: boolean;
}

export default function NewOrder() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [items, setItems] = useState<ManualItem[]>([
    { id: crypto.randomUUID(), product_name: "", variant: "", quantity: 1 }
  ]);

  const router = useRouter();

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), product_name: "", variant: "", quantity: 1 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(i => i.id !== id));
    }
  };

  const updateItem = <K extends keyof ManualItem>(id: string, field: K, value: ManualItem[K]) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const uploadFile = async (f: File): Promise<string> => {
    const uploadFormData = new FormData();
    uploadFormData.append("file", f);
    uploadFormData.append("fileName", f.name);
    const uploadRes = await fetch("/api/upload", { method: "POST", body: uploadFormData });
    if (!uploadRes.ok) throw new Error("Failed to upload file");
    const { publicUrl } = await uploadRes.json();
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("uploading");
    setErrorMessage("");
    
    try {
      // 1. Upload Master File if exists and no Master URL
      let finalMasterImageUrl = imageUrl;
      if (file && !imageUrl) {
        finalMasterImageUrl = await uploadFile(file);
      }

      // 2. Upload Row Files if they exist
      const processedItems = await Promise.all(items.map(async (item) => {
        let rowImageUrl = item.image_url || finalMasterImageUrl;
        if (item.file) {
          rowImageUrl = await uploadFile(item.file);
        }
        
        if (!rowImageUrl) throw new Error(`Missing image for item: ${item.product_name || 'Line Item'}`);

        return {
          product_name: item.product_name,
          variant: item.variant,
          quantity: item.quantity,
          customer_name: item.customer_name,
          image_url: rowImageUrl
        };
      }));

      const orderRes = await fetch("/api/orders/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_number: orderNumber,
          customer_name: customerName,
          items: processedItems
        }),
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json();
        throw new Error(errData.error || "Failed to save order");
      }

      setStatus("success");
      setTimeout(() => router.push("/dashboard"), 1000);
    } catch (err: unknown) {
      const error = err as Error;
      setStatus("error");
      setErrorMessage(error.message || "An unexpected error occurred");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight italic flex items-center gap-3">
              <div className="h-8 w-8 bg-blue-600 rounded-xl flex items-center justify-center italic text-white text-lg">+</div>
              New Manual Order
            </h1>
            <p className="text-slate-500 mt-2 font-medium">Create multi-item orders with individual designs.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 p-8 space-y-6">
            <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
              <span className="h-5 w-5 bg-blue-100 rounded-lg flex items-center justify-center">1</span>
              Batch Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Master Order #</label>
                <input value={orderNumber} onChange={e => setOrderNumber(e.target.value)} placeholder="e.g. ThunderSoccer-2024" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold" required />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Main Customer</label>
                <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="e.g. Coach Sarah" className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold" required />
              </div>
            </div>

            <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                <p className="text-[10px] font-black uppercase text-blue-600 mb-4 tracking-widest">Master Design (Applies to all items by default)</p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    <div className={`border-2 border-dashed rounded-[1.5rem] p-6 text-center transition-all relative overflow-hidden h-32 flex items-center justify-center ${
                        file ? "border-green-400 bg-white" : "border-slate-200 hover:border-blue-400 bg-white"
                    }`}>
                        <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={e => setFile(e.target.files?.[0] || null)} />
                        {file ? (
                          <div className="flex items-center gap-4">
                            <div className="relative h-20 w-20 shadow-sm rounded-lg overflow-hidden">
                                <Image src={URL.createObjectURL(file)} alt="Preview" fill className="object-contain" unoptimized />
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] font-bold text-slate-700 truncate max-w-[150px]">{file.name}</p>
                                <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-[10px] text-red-500 font-bold uppercase mt-1 hover:underline relative z-20">Remove</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <div className="h-8 w-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 mb-2">📸</div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Upload Master Ref</p>
                          </div>
                        )}
                    </div>
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Or Paste Master Wix URL</label>
                        <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs font-bold shadow-sm" />
                    </div>
                </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                <span className="h-5 w-5 bg-blue-100 rounded-lg flex items-center justify-center">2</span>
                Order Line Items
              </h2>
              <button type="button" onClick={addItem} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2">
                <span>+</span> Add Item
              </button>
            </div>

            <div className="space-y-6">
              {items.map((item) => (
                <div key={item.id} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 relative group animate-in zoom-in-95 duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                    <div className="md:col-span-1">
                        <div className={`aspect-square border-2 border-dashed rounded-2xl flex flex-col items-center justify-center relative overflow-hidden transition-all ${
                             item.file || item.image_url ? "border-green-400 bg-white" : "border-slate-200 hover:border-blue-400 bg-white"
                        }`}>
                            <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={e => updateItem(item.id, 'file', e.target.files?.[0] || null)} />
                            {item.file ? (
                                <Image src={URL.createObjectURL(item.file)} fill className="object-contain p-2" alt="p" unoptimized />
                            ) : item.image_url ? (
                                <Image src={item.image_url} fill className="object-contain p-2" alt="p" unoptimized />
                            ) : (
                                <span className="text-[20px] text-slate-200">🖼️</span>
                            )}
                        </div>
                    </div>

                    <div className="md:col-span-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Product Name</label>
                            <input value={item.product_name} onChange={e => updateItem(item.id, 'product_name', e.target.value)} placeholder="e.g. Heavy Cotton T-Shirt" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Qty</label>
                            <input type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value))} min="1" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Variant / Size</label>
                            <input value={item.variant} onChange={e => updateItem(item.id, 'variant', e.target.value)} placeholder="e.g. XL - Black" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Recipient / Row Image URL (Optional Override)</label>
                            <div className="flex gap-2">
                                <input value={item.customer_name || ""} onChange={e => updateItem(item.id, 'customer_name', e.target.value)} placeholder="Recipient Name" className="flex-grow px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                                <input value={item.image_url || ""} onChange={e => updateItem(item.id, 'image_url', e.target.value)} placeholder="Design URL (if different)" className="w-1/2 px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-[10px] outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                    </div>
                  </div>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(item.id)} className="absolute -top-2 -right-2 h-8 w-8 bg-red-50 text-red-500 rounded-full flex items-center justify-center border border-red-100 hover:bg-red-500 hover:text-white transition-all shadow-sm">×</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-sm font-bold animate-in slide-in-from-top-2">⚠️ {errorMessage}</div>
          )}

          <button disabled={status === "uploading" || status === "success"} className="w-full py-6 rounded-[2rem] bg-slate-900 hover:bg-blue-600 disabled:bg-slate-200 text-white font-black text-xl shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3">
            {status === "uploading" ? "Launching to Queue..." : status === "success" ? "✔ Added to Production" : "Create Manual Order"}
          </button>
        </form>
      </div>
    </div>
  );
}