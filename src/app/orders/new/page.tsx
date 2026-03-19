"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ManualItem {
  id: string;
  product_name: string;
  variant: string;
  quantity: number;
  customer_name?: string;
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

  const updateItem = (id: string, field: keyof ManualItem, value: string | number) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("uploading");
    setErrorMessage("");
    
    let finalImageUrl = imageUrl;

    try {
      if (file) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", file);
        uploadFormData.append("fileName", file.name);

        const uploadRes = await fetch("/api/upload", { method: "POST", body: uploadFormData });
        if (!uploadRes.ok) throw new Error("Failed to upload file");
        const { publicUrl } = await uploadRes.json();
        finalImageUrl = publicUrl;
      }

      if (!finalImageUrl) throw new Error("Please provide a design reference photo or Wix URL");

      const orderRes = await fetch("/api/orders/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_number: orderNumber,
          customer_name: customerName,
          image_url: finalImageUrl,
          items: items.map(({ product_name, variant, quantity, customer_name }) => ({ product_name, variant, quantity, customer_name }))
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
      <div className="max-w-2xl mx-auto">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight italic flex items-center gap-3">
              <div className="h-8 w-8 bg-blue-600 rounded-xl flex items-center justify-center italic text-white text-lg">+</div>
              New Manual Order
            </h1>
            <p className="text-slate-500 mt-2 font-medium">Create multi-item orders directly.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Order Meta */}
          <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 p-8 space-y-6">
            <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
              <span className="h-5 w-5 bg-blue-100 rounded-lg flex items-center justify-center">1</span>
              General Information
            </h2>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Order # / Name</label>
                <input 
                  value={orderNumber}
                  onChange={e => setOrderNumber(e.target.value)}
                  placeholder="e.g. 14781" 
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-bold"
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Customer Details</label>
                <input 
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="e.g. John Smith" 
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-bold"
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
               {/* Design Reference */}
               <div className={`border-2 border-dashed rounded-[1.5rem] p-8 text-center transition-all relative overflow-hidden ${
                file ? "border-green-400 bg-green-50/20" : "border-slate-200 hover:border-blue-400 bg-slate-50/50"
              }`}>
                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  onChange={e => setFile(e.target.files?.[0] || null)} 
                />
                {file ? (
                  <div className="flex flex-col items-center">
                    <img src={URL.createObjectURL(file)} alt="Preview" className="h-32 w-32 object-contain rounded-xl mb-3 shadow-md bg-white p-2" />
                    <p className="text-xs font-bold text-slate-700">{file.name}</p>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="text-[10px] text-red-500 font-bold uppercase mt-2 hover:underline relative z-20"
                    >Remove</button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-4">
                    <div className="h-10 w-10 bg-white rounded-lg border flex items-center justify-center text-slate-300 mb-2">📸</div>
                    <p className="text-xs font-bold text-slate-700 uppercase">Upload Reference</p>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Or Paste Wix URL</label>
                <input 
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  placeholder="https://static.wixstatic.com/..." 
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 text-xs font-bold"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Items */}
          <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                <span className="h-5 w-5 bg-blue-100 rounded-lg flex items-center justify-center">2</span>
                Order Line Items
              </h2>
              <button type="button" onClick={addItem} className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
                <span className="text-lg leading-none">+</span> Add Item
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 relative group animate-in zoom-in-95 duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Product Name</label>
                      <input 
                        value={item.product_name}
                        onChange={e => updateItem(item.id, 'product_name', e.target.value)}
                        placeholder="e.g. Heavy Cotton T-Shirt"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Variant / Size</label>
                      <input 
                        value={item.variant}
                        onChange={e => updateItem(item.id, 'variant', e.target.value)}
                        placeholder="e.g. XL - Black"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Qty</label>
                      <input 
                        type="number"
                        value={item.quantity}
                        onChange={e => updateItem(item.id, 'quantity', parseInt(e.target.value))}
                        min="1"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Item Recipient (Optional)</label>
                      <input 
                        value={item.customer_name || ""}
                        onChange={e => updateItem(item.id, 'customer_name', e.target.value)}
                        placeholder="e.g. Krys Gerdes (Leave blank to use main customer name)"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(item.id)} className="absolute -top-2 -right-2 h-8 w-8 bg-red-50 text-red-500 rounded-full flex items-center justify-center border border-red-100 hover:bg-red-500 hover:text-white transition-all shadow-sm">
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-sm font-bold animate-in slide-in-from-top-2">
              ⚠️ {errorMessage}
            </div>
          )}

          <button 
            disabled={status === "uploading" || status === "success"}
            className="w-full py-6 rounded-[2rem] bg-slate-900 hover:bg-blue-600 disabled:bg-slate-200 text-white font-black text-xl shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3"
          >
            {status === "uploading" ? "Launching to Queue..." : status === "success" ? "✔ Added to Production" : "Create Manual Order"}
          </button>
        </form>
      </div>
    </div>
  );
}