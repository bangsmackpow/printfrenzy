"use client";
import { useState } from "react";

export default function CSVImport() {
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState("");

  const handleImport = async () => {
    if (!file) return;
    setMsg("Processing...");
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/orders/import", { method: "POST", body: formData });
    if (res.ok) {
      const data = await res.json();
      setMsg(`Success! Imported ${data.count} orders.`);
    } else {
      setMsg("Import failed.");
    }
  };

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-4">Import Wix Orders</h1>
      <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button onClick={handleImport} className="bg-green-600 text-white px-4 py-2 rounded ml-2">Upload</button>
      <p className="mt-4">{msg}</p>
    </div>
  );
}