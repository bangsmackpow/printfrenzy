"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

type PricingMode = 'SIMPLE' | 'LAYERED' | 'PRINTED';

interface PricingPreset {
  label: string;
  minRate: number;
  maxRate: number;
  defaultRate: number;
  description: string;
}

const PRESETS: Record<PricingMode, PricingPreset> = {
  SIMPLE: {
    label: '1-Color Cut',
    minRate: 0.40,
    maxRate: 0.75,
    defaultRate: 0.60,
    description: 'Basic single-color vinyl decals.'
  },
  LAYERED: {
    label: 'Layered / Multi',
    minRate: 0.75,
    maxRate: 1.50,
    defaultRate: 1.00,
    description: 'Multiple colors layered together.'
  },
  PRINTED: {
    label: 'Printed & Lami',
    minRate: 0.60,
    maxRate: 1.25,
    defaultRate: 0.85,
    description: 'Full color print with lamination.'
  }
};

export default function VinylCalculator() {
  const router = useRouter();
  const [width, setWidth] = useState<number>(10);
  const [height, setHeight] = useState<number>(8);
  const [mode, setMode] = useState<PricingMode>('SIMPLE');
  const [rate, setRate] = useState<number>(PRESETS.SIMPLE.defaultRate);
  const [setupFee, setSetupFee] = useState<number>(10);
  const [minCharge, setMinCharge] = useState<number>(25);
  const [quantity, setQuantity] = useState<number>(1);
  const [weedingDifficulty, setWeedingDifficulty] = useState<number>(0); // 0-100% extra
  const [quoteNotes, setQuoteNotes] = useState<string>("");

  const handleModeChange = (newMode: PricingMode) => {
    setMode(newMode);
    setRate(PRESETS[newMode].defaultRate);
  };

  const calculation = useMemo(() => {
    const sqIn = width * height;
    const basePricePerUnit = sqIn * rate;
    const weedingExtra = basePricePerUnit * (weedingDifficulty / 100);
    const unitPrice = basePricePerUnit + weedingExtra;
    
    let totalItemsPrice = unitPrice * quantity;
    const subtotal = totalItemsPrice + setupFee;
    const finalTotal = Math.max(subtotal, minCharge);
    const isMinApplied = subtotal < minCharge;

    return {
      sqIn,
      unitPrice,
      totalItemsPrice,
      subtotal,
      finalTotal,
      isMinApplied,
      weedingExtra
    };
  }, [width, height, rate, setupFee, minCharge, quantity, weedingDifficulty]);

  return (
    <div className="min-h-screen bg-slate-50 p-8 md:p-16">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center gap-4 mb-12">
            <button onClick={() => router.back()} className="h-12 w-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">RGC Production Tools</p>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Vinyl Sign Pricing Calc</h1>
            </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Presets & Config */}
            <div className="lg:col-span-2 space-y-8">
                {/* Mode Selector */}
                <div className="grid grid-cols-3 gap-4">
                    {(Object.keys(PRESETS) as PricingMode[]).map((m) => (
                        <button
                            key={m}
                            onClick={() => handleModeChange(m)}
                            className={`p-6 rounded-[2rem] border-2 transition-all text-left flex flex-col justify-between h-40 ${
                                mode === m 
                                ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]' 
                                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                            }`}
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest">{PRESETS[m].label}</span>
                            <div>
                                <p className={`text-2xl font-black italic tracking-tighter ${mode === m ? 'text-blue-400' : 'text-slate-900'}`}>
                                    ${PRESETS[m].defaultRate}<span className="text-[10px] uppercase font-bold ml-1">/ sq in</span>
                                </p>
                                <p className="text-[9px] font-bold opacity-60 mt-1 leading-tight">{PRESETS[m].description}</p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Primary Inputs */}
                <div className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Width (Inches)</label>
                                <input 
                                    type="number" value={width} onChange={(e) => setWidth(Number(e.target.value))}
                                    className="w-20 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-right font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <input 
                                type="range" min="1" max="120" step="0.25"
                                value={width} onChange={(e) => setWidth(Number(e.target.value))}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Height (Inches)</label>
                                <input 
                                    type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))}
                                    className="w-20 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-right font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <input 
                                type="range" min="1" max="120" step="0.25"
                                value={height} onChange={(e) => setHeight(Number(e.target.value))}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Weeding Difficulty (+{weedingDifficulty}%)</label>
                            </div>
                            <input 
                                type="range" min="0" max="200" step="10"
                                value={weedingDifficulty} onChange={(e) => setWeedingDifficulty(Number(e.target.value))}
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-amber-500"
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Custom Rate ($/sq in)</label>
                            <input 
                                type="number" step="0.01" value={rate} onChange={(e) => setRate(Number(e.target.value))}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-[9px] font-bold text-slate-400 italic">Range: ${PRESETS[mode].minRate} - ${PRESETS[mode].maxRate}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Setup Fee</label>
                                <input 
                                    type="number" value={setupFee} onChange={(e) => setSetupFee(Number(e.target.value))}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Min Charge</label>
                                <input 
                                    type="number" value={minCharge} onChange={(e) => setMinCharge(Number(e.target.value))}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity</label>
                            <input 
                                type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Quote Notes */}
                <div className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-4 no-print">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Quote Notes (For Customer)</label>
                    <textarea 
                        value={quoteNotes}
                        onChange={(e) => setQuoteNotes(e.target.value)}
                        placeholder="Additional details about the material, finish, or installation..."
                        rows={4}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                    />
                </div>
            </div>

            {/* Results */}
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-blue-200 flex flex-col justify-between h-fit lg:sticky lg:top-8">
                <div className="space-y-8">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">RGC Pricing Engine</p>
                    
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-slate-400">
                            <span className="text-xs font-bold uppercase">Total Area</span>
                            <span className="text-lg font-black italic text-white">{calculation.sqIn.toFixed(2)} SQ IN</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-400">
                            <span className="text-xs font-bold uppercase">Unit Price</span>
                            <span className="text-lg font-black italic text-white">${calculation.unitPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-400 border-t border-white/10 pt-4">
                            <span className="text-xs font-bold uppercase">Base Total</span>
                            <span className="text-lg font-black italic text-white">${calculation.totalItemsPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-400">
                            <span className="text-xs font-bold uppercase">Setup Fee</span>
                            <span className="text-lg font-black italic text-white">${setupFee.toFixed(2)}</span>
                        </div>
                    </div>

                    {calculation.isMinApplied && (
                        <div className="bg-blue-600/20 border border-blue-600/50 p-4 rounded-2xl animate-pulse">
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Minimum Applied</p>
                            <p className="text-xs font-bold text-white leading-tight">Subtotal of ${calculation.subtotal.toFixed(2)} was below shop minimum.</p>
                        </div>
                    )}
                </div>

                <div className="mt-12">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Customer Quote</p>
                    <div className="text-7xl font-black tracking-tighter italic text-blue-500">
                        ${calculation.finalTotal.toFixed(2)}
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                        <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                        <p className="text-[10px] font-bold text-slate-500 uppercase italic">Consistent Profit Margin Enabled</p>
                    </div>

                    <button 
                        onClick={() => window.print()}
                        className="w-full mt-10 bg-white text-slate-900 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-500 hover:text-white transition-all shadow-lg flex items-center justify-center gap-3 no-print"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 00-2 2h2m2 4h10a2 2 0 002-2v-3a2 2 0 00-2-2H5a2 2 0 00-2 2v3a2 2 0 002 2zm0 0v-9a2 2 0 012-2h6a2 2 0 012 2v9m-8-3h4" /></svg>
                        Print PDF Quote
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* Printable Quote Sheet */}
      <div className="print-only fixed inset-0 bg-white text-black p-12 z-[200]">
          <div className="max-w-3xl mx-auto space-y-12">
              <header className="flex justify-between items-start border-b-4 border-black pb-8">
                  <div>
                      <h1 className="text-4xl font-black uppercase italic tracking-tighter">Production Quote</h1>
                      <p className="text-slate-500 font-bold mt-1">Ref: {new Date().getTime().toString().slice(-6)}</p>
                  </div>
                  <div className="text-right">
                      <p className="text-2xl font-black italic">RGC SIGNS</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{new Date().toLocaleDateString()}</p>
                  </div>
              </header>

              <div className="grid grid-cols-2 gap-12">
                  <div className="space-y-6">
                      <div>
                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Service Type</p>
                          <p className="text-xl font-black uppercase italic">{PRESETS[mode].label}</p>
                      </div>
                      <div>
                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Dimensions</p>
                          <p className="text-xl font-black italic">{width}" x {height}" ({calculation.sqIn.toFixed(1)} sq in)</p>
                      </div>
                      <div>
                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Quantity</p>
                          <p className="text-xl font-black italic">x{quantity}</p>
                      </div>
                  </div>
                  <div className="bg-slate-50 p-8 rounded-3xl border-2 border-slate-100 flex flex-col justify-center text-center">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Estimated Total</p>
                      <p className="text-6xl font-black italic tracking-tighter">${calculation.finalTotal.toFixed(2)}</p>
                      {calculation.isMinApplied && (
                          <p className="text-[9px] font-black uppercase text-blue-600 mt-2">Shop Minimum Applied</p>
                      )}
                  </div>
              </div>

              {quoteNotes && (
                  <div className="space-y-2 pt-8 border-t-2 border-slate-100">
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Additional Notes</p>
                      <p className="text-lg font-bold text-slate-800 leading-relaxed whitespace-pre-wrap italic">"{quoteNotes}"</p>
                  </div>
              )}

              <footer className="pt-20 border-t-2 border-slate-100 flex justify-between items-end opacity-40">
                  <p className="text-[10px] font-black uppercase tracking-widest">Quote valid for 30 days</p>
                  <p className="text-[10px] font-black uppercase tracking-widest italic">Generated by PrintFrenzy</p>
              </footer>
          </div>
      </div>

      <style jsx global>{`
        .print-only { display: none; }
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}
