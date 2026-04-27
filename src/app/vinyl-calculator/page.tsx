"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VinylCalculator() {
  const router = useRouter();
  const [width, setWidth] = useState<number>(24);
  const [height, setHeight] = useState<number>(12);
  const [pricePerSqFt, setPricePerSqFt] = useState<number>(2.50);
  const [quantity, setQuantity] = useState<number>(1);
  const [margin, setMargin] = useState<number>(10); // 10% waste

  const sqFt = (width * height) / 144;
  const totalSqFt = sqFt * quantity;
  const subtotal = totalSqFt * pricePerSqFt;
  const totalCost = subtotal * (1 + margin / 100);

  return (
    <div className="min-h-screen bg-slate-50 p-8 md:p-16">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center gap-4 mb-12">
            <button onClick={() => router.back()} className="h-12 w-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Production Tools</p>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Vinyl Cost Calculator</h1>
            </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Inputs */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-8">
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Width (Inches)</label>
                        <input 
                            type="number" 
                            value={width} 
                            onChange={(e) => setWidth(Number(e.target.value))}
                            className="w-20 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-right font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <input 
                        type="range" min="1" max="120" step="0.5"
                        value={width} onChange={(e) => setWidth(Number(e.target.value))}
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Height (Inches)</label>
                        <input 
                            type="number" 
                            value={height} 
                            onChange={(e) => setHeight(Number(e.target.value))}
                            className="w-20 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-right font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <input 
                        type="range" min="1" max="120" step="0.5"
                        value={height} onChange={(e) => setHeight(Number(e.target.value))}
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Price Per Sq Ft</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                            <input 
                                type="number" step="0.01"
                                value={pricePerSqFt} 
                                onChange={(e) => setPricePerSqFt(Number(e.target.value))}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-8 pr-4 py-4 font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity</label>
                        <input 
                            type="number" 
                            value={quantity} 
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Waste Margin (%)</label>
                        <span className="font-black text-slate-900">{margin}%</span>
                    </div>
                    <input 
                        type="range" min="0" max="100" step="5"
                        value={margin} onChange={(e) => setMargin(Number(e.target.value))}
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
                    />
                </div>
            </div>

            {/* Results */}
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-blue-200 flex flex-col justify-between">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-8">Calculation Result</p>
                    
                    <div className="space-y-6">
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                            <span className="text-slate-400 text-sm font-bold">Area Per Unit</span>
                            <span className="text-xl font-black italic">{sqFt.toFixed(2)} SQ FT</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                            <span className="text-slate-400 text-sm font-bold">Total Material</span>
                            <span className="text-xl font-black italic">{totalSqFt.toFixed(2)} SQ FT</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/10 pb-4">
                            <span className="text-slate-400 text-sm font-bold">Price Basis</span>
                            <span className="text-xl font-black italic">${pricePerSqFt.toFixed(2)} / FT²</span>
                        </div>
                    </div>
                </div>

                <div className="mt-12">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Estimated Production Cost</p>
                    <div className="text-7xl font-black tracking-tighter italic text-blue-500">
                        ${totalCost.toFixed(2)}
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 mt-4 uppercase italic">Includes {margin}% waste factor</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
