"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewOrder() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      order_number: formData.get('order_number'),
      customer_name: formData.get('customer_name'),
      product_name: formData.get('product_name'),
      variant: formData.get('variant'),
      image_url: formData.get('image_url'), // Direct URL for now
    };

    const res = await fetch('/api/orders/manual', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (res.ok) {
      router.push('/dashboard');
    } else {
      alert("Failed to save order");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Add Manual Order</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow">
        <div>
          <label className="block text-sm font-medium mb-1">Customer Name</label>
          <input name="customer_name" required className="w-full border p-2 rounded" placeholder="John Doe" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Order # (Optional)</label>
            <input name="order_number" className="w-full border p-2 rounded" placeholder="e.g. EMAIL-101" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Product Name</label>
            <input name="product_name" required className="w-full border p-2 rounded" placeholder="Custom Tee" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Variant (Size/Color)</label>
          <input name="variant" className="w-full border p-2 rounded" placeholder="Large / Black" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Image URL</label>
          <input name="image_url" required className="w-full border p-2 rounded" placeholder="https://..." />
        </div>
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 disabled:bg-slate-400"
        >
          {loading ? "Saving..." : "Create Order"}
        </button>
      </form>
    </div>
  );
}