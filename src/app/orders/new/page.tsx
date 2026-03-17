"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewOrder() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("uploading");
    setErrorMessage("");
    
    const formData = new FormData(e.currentTarget);
    let finalImageUrl = formData.get("image_url") as string;

    try {
      // 1. If a file is selected, upload to R2 first
      if (file) {
        const preRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentType: file.type, fileName: file.name }),
        });
        
        if (!preRes.ok) {
          const errData = await preRes.json();
          throw new Error(errData.error || "Failed to get upload signature");
        }

        const { signedUrl, publicUrl } = await preRes.json();
        
        const uploadRes = await fetch(signedUrl, { 
          method: "PUT", 
          body: file, 
          headers: { "Content-Type": file.type } 
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload file to storage");
        }

        finalImageUrl = publicUrl;
      }

      if (!finalImageUrl && !file) {
        throw new Error("Please provide an image URL or upload a photo");
      }

      // 2. Save the order to D1
      const orderRes = await fetch("/api/orders/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: formData.get("customer_name"),
          product_name: formData.get("product_name"),
          image_url: finalImageUrl,
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
      console.error("Order creation error:", error);
      setStatus("error");
      setErrorMessage(error.message || "An unexpected error occurred");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] py-16 px-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight italic flex items-center gap-3">
            <div className="h-8 w-8 bg-blue-600 rounded-xl flex items-center justify-center italic text-white text-lg">+</div>
            New Manual Order
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Add a custom order directly to the production queue.</p>
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Customer Details</label>
                <input 
                  name="customer_name" 
                  placeholder="Customer Name (e.g. John Smith)" 
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-bold placeholder:font-medium placeholder:text-slate-300"
                  required 
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Product Info</label>
                <input 
                  name="product_name" 
                  placeholder="What are we printing? (e.g. Red Hoodie)" 
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-bold placeholder:font-medium placeholder:text-slate-300"
                  required 
                />
              </div>
              
              <div className="relative group">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Design Reference</label>
                <div className={`border-2 border-dashed rounded-[1.5rem] p-8 text-center transition-all ${
                  file ? "border-green-400 bg-green-50/20" : "border-slate-200 hover:border-blue-400 bg-slate-50/50"
                }`}>
                  <input 
                    type="file" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={e => setFile(e.target.files?.[0] || null)} 
                  />
                  <div className="flex flex-col items-center">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-3 ${
                      file ? "bg-green-100 text-green-600" : "bg-white text-slate-400 shadow-sm border border-slate-100"
                    }`}>
                      {file ? (
                         <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      )}
                    </div>
                    <p className="text-sm font-bold text-slate-700">{file ? file.name : "Upload Photo"}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Or Drag Here</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Alternative: Wix URL</label>
                <input 
                  name="image_url" 
                  placeholder="Paste Wix design URL if no file uploaded" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm font-medium placeholder:text-slate-300 italic" 
                />
              </div>
            </div>

            {errorMessage && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-sm font-bold flex items-center gap-3 animate-in slide-in-from-top-2">
                <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
                {errorMessage}
              </div>
            )}

            <button 
              disabled={status === "uploading" || status === "success"} 
              className={`w-full py-5 rounded-2xl font-black text-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 shadow-xl ${
                status === "uploading" || status === "success"
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-slate-900 hover:bg-blue-600 text-white shadow-blue-200/50"
              }`}
            >
              {status === "uploading" ? (
                <>
                  <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Processing...
                </>
              ) : status === "success" ? (
                 <>
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Saved!
                </>
              ) : (
                "Save Order"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}