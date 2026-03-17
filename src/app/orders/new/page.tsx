"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData);

    const res = await fetch('/api/orders/manual', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (res.ok) router.push('/dashboard');
    else { alert("Error saving order"); setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto p-10 bg-white mt-10 shadow rounded-xl">
      <h1 className="text-2xl font-bold mb-6">Manual Order Entry</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input name="customer_name" placeholder="Customer Name" required className="w-full border p-2 rounded" />
        <input name="order_number" placeholder="Order #" className="w-full border p-2 rounded" />
        <input name="product_name" placeholder="Product Name" required className="w-full border p-2 rounded" />
        <input name="variant" placeholder="Size/Color" className="w-full border p-2 rounded" />
        <input name="image_url" placeholder="Image URL (Wix or Direct)" required className="w-full border p-2 rounded" />
        <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold">Save Order</button>
      </form>
    </div>
  );
}