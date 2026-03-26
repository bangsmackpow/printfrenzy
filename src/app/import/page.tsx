"use client";

import { useState, useRef } from "react";

export default function CSVImport() {
  const [file, setFile] = useState<File | null>(null);
  const [batchName, setBatchName] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [results, setResults] = useState<{ count: number; skipped: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
      setStatus("idle");
      setErrorMessage("");
    } else {
      setErrorMessage("Please select a valid .csv file");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile);
      setStatus("idle");
      setErrorMessage("");
    } else {
      setErrorMessage("Please drop a valid .csv file");
    }
  };

  const handleImport = async () => {
    if (!file) return;
    
    setStatus("uploading");
    setErrorMessage("");
    setResults(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("batch_name", batchName);

    try {
      const res = await fetch("/api/orders/import", { 
        method: "POST", 
        body: formData 
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setStatus("success");
        setResults({ count: data.count, skipped: 0 }); // Note: updated to match new simplified return
        setFile(null); // Clear file after successful import
        if (fileInputRef.current) fileInputRef.current.value = "";
        setBatchName(""); // Clear batch name after successful import
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Failed to process the CSV file.");
      }
    } catch (err) {
      console.error("Import error:", err);
      setStatus("error");
      setErrorMessage("A network error occurred. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Import Wix Orders</h1>
          <p className="text-slate-500 mt-3 font-medium text-lg">Batch upload orders directly from your Wix CSV export.</p>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
          <div className="p-10">
            {/* Batch Name Input */}
            <div className="mb-8">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Batch Order Name (Optional)</label>
                <input 
                    type="text"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    placeholder="e.g. Thunder Soccer Team"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all outline-none"
                />
                <p className="text-[10px] text-slate-400 font-medium mt-2 px-1 italic">This name will group all items in this CSV under one card in the queue.</p>
            </div>

            {/* Drop Zone */}
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer group ${
                isDragging 
                  ? "border-blue-500 bg-blue-50/50 scale-[1.01]" 
                  : file 
                    ? "border-green-400 bg-green-50/20" 
                    : "border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-white"
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept=".csv" 
                onChange={handleFileChange} 
              />
              
              <div className="flex flex-col items-center">
                <div className={`h-20 w-20 rounded-2xl flex items-center justify-center mb-6 transition-all ${
                  file ? "bg-green-100 text-green-600" : "bg-white text-slate-400 shadow-sm border border-slate-100 group-hover:scale-110"
                }`}>
                  {file ? (
                    <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  ) : (
                    <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  )}
                </div>
                
                {file ? (
                  <>
                    <p className="text-xl font-bold text-slate-800 break-all px-4">{file.name}</p>
                    <p className="text-slate-500 mt-2 font-medium">Ready to import • {(file.size / 1024).toFixed(1)} KB</p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-bold text-slate-800">Choose CSV or drag & drop</p>
                    <p className="text-slate-400 mt-2 font-medium">Wix order export format supported</p>
                  </>
                )}
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mt-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
                <p className="font-bold text-sm">{errorMessage}</p>
              </div>
            )}

            {/* Results Grid */}
            {status === "success" && results && (
              <div className="mt-8 grid grid-cols-2 gap-4 animate-in zoom-in-95 duration-500">
                <div className="bg-green-50/50 p-6 rounded-3xl border border-green-100 text-center">
                  <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Success</p>
                  <p className="text-3xl font-black text-green-700">{results.count}</p>
                  <p className="text-xs font-bold text-green-600 mt-1">Orders Imported</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Skipped</p>
                  <p className="text-3xl font-black text-slate-800">{results.skipped}</p>
                  <p className="text-xs font-bold text-slate-400 mt-1">Check CSV Data</p>
                </div>
                <a 
                  href="/dashboard"
                  className="col-span-2 bg-green-600 hover:bg-green-700 text-white p-4 rounded-2xl font-bold text-center flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Import Complete: View Queue
                </a>
              </div>
            )}

            {/* Action Button */}
            {status !== "success" && (
              <button 
                onClick={handleImport} 
                disabled={!file || status === "uploading"}
                className={`mt-8 w-full py-5 rounded-3xl font-black text-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 shadow-xl ${
                  !file || status === "uploading"
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-slate-900 hover:bg-blue-600 text-white shadow-blue-200/50"
                }`}
              >
                {status === "uploading" ? (
                  <>
                    <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Process Wix CSV
                  </>
                )}
              </button>
            )}

            <div className="mt-8 pt-8 border-t border-slate-50">
              <div className="bg-slate-50/50 p-6 rounded-3xl">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Instructions</h3>
                <ul className="space-y-3 text-sm font-medium text-slate-600">
                  <li className="flex items-start gap-3">
                    <span className="h-5 w-5 bg-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black border border-slate-200 shadow-sm">1</span>
                    Export your orders from Wix Dashboard as CSV.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="h-5 w-5 bg-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black border border-slate-200 shadow-sm">2</span>
                    Drag the file here or click to select manually.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="h-5 w-5 bg-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black border border-slate-200 shadow-sm">3</span>
                    Click &apos;Process&apos; to add orders to the production queue.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
