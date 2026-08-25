"use client";

import { useState, useRef } from "react";
import Image from 'next/image';
import { getPrinterQualityImage } from '@/utils/wixUtils';
import { logClient } from '@/utils/clientLogger';

type ImportMode = 'quick' | 'review';
type Status = "idle" | "uploading" | "previewing" | "importing" | "success" | "error";

interface PreviewRow {
  rowIndex: number;
  orderNumber: string | null;
  customerName: string;
  productName: string;
  variant: string;
  imageUrl: string | null;
  orderedAt: string | null;
  quantity: number;
  duplicate: boolean;
}

export default function CSVImport() {
  const [mode, setMode] = useState<ImportMode>("quick");
  const [file, setFile] = useState<File | null>(null);
  const [batchName, setBatchName] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [previewRows, setPreviewRows] = useState<PreviewRow[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [results, setResults] = useState<{ count: number; skipped: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const resetFlow = () => {
    setStatus("idle");
    setPreviewRows(null);
    setSelected(new Set());
    setResults(null);
    setErrorMessage("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
      resetFlow();
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
      resetFlow();
    } else {
      setErrorMessage("Please drop a valid .csv file");
    }
  };

  // --- Original one-step import (unchanged behavior) ---
  const quickImport = async () => {
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
        setResults({ count: data.count, skipped: data.skipped || 0 });
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setBatchName("");
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Failed to process the CSV file.");
      }
    } catch (err) {
      logClient.error('import_quick_failed', { error: err instanceof Error ? err.message : String(err) });
      setStatus("error");
      setErrorMessage("A network error occurred. Please try again.");
    }
  };

  // --- New two-step review & select import ---
  const loadPreview = async () => {
    if (!file) return;
    setStatus("uploading");
    setErrorMessage("");
    setResults(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/orders/import/preview", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        const rows: PreviewRow[] = data.rows || [];
        setPreviewRows(rows);
        setSelected(new Set(rows.filter(r => !r.duplicate).map(r => r.rowIndex)));
        setStatus("previewing");
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Failed to preview the CSV file.");
      }
    } catch (err) {
      logClient.error('import_preview_failed', { error: err instanceof Error ? err.message : String(err) });
      setStatus("error");
      setErrorMessage("A network error occurred while previewing. Please try again.");
    }
  };

  const toggleRow = (rowIndex: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (!previewRows) return;
    setSelected(new Set(previewRows.filter(r => !r.duplicate).map(r => r.rowIndex)));
  };

  const clearAll = () => setSelected(new Set());

  const importSelected = async () => {
    if (!previewRows || selected.size === 0) return;
    setStatus("importing");
    setErrorMessage("");
    setResults(null);

    const rows = previewRows
      .filter(r => selected.has(r.rowIndex))
      .map(r => ({
        orderNumber: r.orderNumber,
        customerName: r.customerName,
        productName: r.productName,
        variant: r.variant,
        imageUrl: r.imageUrl,
        orderedAt: r.orderedAt,
        quantity: r.quantity,
      }));

    try {
      const res = await fetch("/api/orders/import/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch_name: batchName, rows })
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setResults({ count: data.count, skipped: data.skipped || 0 });
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setBatchName("");
        setPreviewRows(null);
        setSelected(new Set());
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Failed to import the selected items.");
      }
    } catch (err) {
      logClient.error('import_select_failed', { count: selected.size, error: err instanceof Error ? err.message : String(err) });
      setStatus("error");
      setErrorMessage("A network error occurred. Please try again.");
    }
  };

  const selectedCount = selected.size;
  const duplicateCount = previewRows ? previewRows.filter(r => r.duplicate).length : 0;
  const newCount = previewRows ? previewRows.length - duplicateCount : 0;

  return (
    <div className="min-h-screen bg-[#f8fafc] py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Import Wix Orders</h1>
          <p className="text-slate-500 mt-3 font-medium text-lg">Batch upload orders directly from your Wix CSV export.</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 flex gap-1">
            <button
              onClick={() => { setMode("quick"); resetFlow(); }}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                mode === "quick" ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
            >
              Quick Import
            </button>
            <button
              onClick={() => { setMode("review"); resetFlow(); }}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                mode === "review" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
            >
              Review &amp; Select
            </button>
          </div>
        </div>

        <div className={`${mode === "review" && previewRows ? "" : "max-w-2xl mx-auto"} bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden`}>
          <div className="p-10">
            {/* Batch Name Input */}
            <div className="mb-8">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Batch Order Name (Optional)</label>
                <input 
                    type="text"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    placeholder="e.g. Wildfire Soccer"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all outline-none"
                />
                <p className="text-[10px] text-slate-400 font-medium mt-2 px-1 italic">
                  {mode === "review"
                    ? "Selected items will be grouped under this name as ONE order in the queue."
                    : "This name will group all items in this CSV under one card in the queue."}
                </p>
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

            {/* Preview Selection Grid */}
            {mode === "review" && status === "previewing" && previewRows && (
              <div className="mt-8">
                {/* Summary Banner */}
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <span className="px-4 py-2 bg-blue-50 border border-blue-100 text-blue-700 rounded-2xl text-xs font-black uppercase tracking-widest">
                    {newCount} New
                  </span>
                  <span className="px-4 py-2 bg-slate-50 border border-slate-100 text-slate-500 rounded-2xl text-xs font-black uppercase tracking-widest">
                    {duplicateCount} Already in Queue
                  </span>
                  <span className="px-4 py-2 bg-green-50 border border-green-100 text-green-700 rounded-2xl text-xs font-black uppercase tracking-widest">
                    {selectedCount} Selected
                  </span>
                  <div className="flex-grow"></div>
                  <button onClick={selectAll} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all">Select All</button>
                  <button onClick={clearAll} className="px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-blue-200 hover:text-blue-600 transition-all">Clear All</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-h-[60vh] overflow-y-auto pr-2">
                  {previewRows.map((row) => (
                    <div
                      key={row.rowIndex}
                      onClick={() => !row.duplicate && toggleRow(row.rowIndex)}
                      className={`relative bg-white rounded-[1.5rem] border-2 transition-all duration-300 flex flex-col overflow-hidden cursor-pointer ${
                        row.duplicate
                          ? "border-slate-100 opacity-50 cursor-not-allowed"
                          : selected.has(row.rowIndex)
                            ? "border-blue-600 shadow-xl shadow-blue-100 scale-[1.01]"
                            : "border-slate-100 hover:border-blue-200 shadow-sm"
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`absolute top-3 left-3 z-10 h-8 w-8 rounded-xl flex items-center justify-center transition-all ${
                        row.duplicate
                          ? "bg-slate-100 text-slate-300"
                          : selected.has(row.rowIndex)
                            ? "bg-blue-600 text-white"
                            : "bg-white/90 backdrop-blur shadow-md text-slate-300"
                      }`}>
                        {row.duplicate ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        ) : selected.has(row.rowIndex) ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-current"></div>
                        )}
                      </div>

                      {/* Duplicate Badge */}
                      {row.duplicate && (
                        <div className="absolute top-3 right-3 z-10 px-2 py-1 bg-slate-900 text-white rounded-lg text-[8px] font-black uppercase tracking-widest">
                          Already in Queue
                        </div>
                      )}

                      {/* Image */}
                      <div className="aspect-square relative overflow-hidden bg-slate-50">
                        {row.imageUrl ? (
                          <Image 
                            src={getPrinterQualityImage(row.imageUrl)} 
                            alt={row.productName} 
                            fill 
                            className="object-contain p-4"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                            <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <p className="text-[9px] font-black uppercase tracking-widest">No Image</p>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4 flex-grow flex flex-col">
                        <div className="mb-3">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">{row.customerName}</p>
                          <h3 className="text-sm font-black text-slate-900 leading-tight uppercase italic truncate">{row.productName}</h3>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="bg-slate-900 text-white px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest italic">x{row.quantity}</span>
                          {row.variant && (
                            <span className="bg-slate-50 border border-slate-100 text-slate-600 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest truncate max-w-[200px]">
                              {row.variant}
                            </span>
                          )}
                        </div>
                        <p className="mt-auto text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">
                          Order #{row.orderNumber || '—'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
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
                  <p className="text-xs font-bold text-slate-400 mt-1">Duplicates / Unavailable</p>
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => { resetFlow(); }}
                    className="bg-white border-2 border-slate-200 hover:border-blue-300 text-slate-700 p-4 rounded-2xl font-bold text-center transition-colors cursor-pointer"
                  >
                    Import Another CSV
                  </button>
                  <a 
                    href="/dashboard"
                    className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-2xl font-bold text-center flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    View Queue
                  </a>
                </div>
              </div>
            )}

            {/* Action Button */}
            {status !== "success" && (
              <button 
                onClick={mode === "review" && status === "previewing" ? importSelected : mode === "review" ? loadPreview : quickImport}
                disabled={!file || status === "uploading" || status === "importing" || (mode === "review" && status === "previewing" && selectedCount === 0)}
                className={`mt-8 w-full py-5 rounded-3xl font-black text-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 shadow-xl ${
                  !file || status === "uploading" || status === "importing" || (mode === "review" && status === "previewing" && selectedCount === 0)
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : mode === "review" && status === "previewing"
                      ? "bg-green-600 hover:bg-green-700 text-white shadow-green-200/50"
                      : "bg-slate-900 hover:bg-blue-600 text-white shadow-blue-200/50"
                }`}
              >
                {status === "uploading" || status === "importing" ? (
                  <>
                    <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    {status === "importing" ? "Importing..." : "Analyzing CSV..."}
                  </>
                ) : (
                  <>
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    {mode === "review" && status === "previewing"
                      ? `Import Selected (${selectedCount})`
                      : mode === "review"
                        ? "Review CSV"
                        : "Process Wix CSV"}
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
                    {mode === "review"
                      ? "Review the line items, tick what you want to import, and click 'Import Selected'. Only your selection is added to the queue."
                      : "Click 'Process' to add orders to the production queue."}
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