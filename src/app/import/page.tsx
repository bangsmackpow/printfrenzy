"use client";
import { useState } from 'react';

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');

  const handleUpload = async () => {
    if (!file) return;
    setStatus('Uploading...');
    
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/orders/import', { method: 'POST', body: formData });
    const result = await res.json();
    
    if (res.ok) setStatus(`Success! Imported ${result.count} orders.`);
    else setStatus(`Error: ${result.error}`);
  };

  return (
    <div className="p-10 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Import Wix CSV</h1>
      <input 
        type="file" 
        accept=".csv" 
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="block w-full mb-4 border p-2"
      />
      <button 
        onClick={handleUpload}
        className="bg-black text-white px-6 py-2 rounded font-bold"
      >
        Process Orders
      </button>
      {status && <p className="mt-4 font-mono text-sm">{status}</p>}
    </div>
  );
}