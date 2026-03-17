"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewOrder() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    let finalImageUrl = formData.get("image_url") as string;

    // 1. If a file is selected, upload to R2 first
    if (file) {
      const preRes = await fetch("/api/upload", {
        method: "POST",
        body: JSON.stringify({ contentType: file.type, fileName: file.name }),
      });
      const { signedUrl, publicUrl } = await preRes.json();
      await fetch(signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      finalImageUrl = publicUrl;
    }

    // 2. Save the order to D1
    await fetch("/api/orders/manual", {
      method: "POST",
      body: JSON.stringify({
        customer_name: formData.get("customer_name"),
        product_name: formData.get("product_name"),
        image_url: finalImageUrl,
      }),
    });
    router.push("/dashboard");
  };

  return (
    <div className="p-10 max-w-lg mx-auto bg-white rounded shadow-xl mt-10">
      <h1 className="text-xl font-bold mb-4">New Manual Order</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input name="customer_name" placeholder="Customer Name" className="w-full border p-2" required />
        <input name="product_name" placeholder="Item (e.g. Red Hoodie)" className="w-full border p-2" required />
        
        <div className="border-2 border-dashed p-4 rounded">
          <label className="block text-sm text-slate-500 mb-2">Upload Reference Photo</label>
          <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
          <p className="text-xs mt-2 text-slate-400">Or paste a Wix URL below</p>
        </div>
        
        <input name="image_url" placeholder="Wix Image URL (if no file)" className="w-full border p-2" />
        
        <button className="w-full bg-blue-600 text-white py-3 rounded font-bold" disabled={loading}>
          {loading ? "Uploading..." : "Save Order"}
        </button>
      </form>
    </div>
  );
}