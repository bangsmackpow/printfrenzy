"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { getPrinterQualityImage } from '@/utils/wixUtils';
import type { Order } from '@/app/dashboard/page';

interface ItemDetailModalProps {
  item: Order;
  onClose: () => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: 'bg-slate-100 text-slate-600 border-slate-200',
  ORDERING: 'bg-amber-50 text-amber-600 border-amber-200',
  PRINTING: 'bg-blue-50 text-blue-600 border-blue-200',
  STAGING: 'bg-purple-50 text-purple-600 border-purple-200',
  PRODUCTION: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  COMPLETED: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  ARCHIVED: 'bg-slate-50 text-slate-400 border-slate-100',
};

function DetailRow({ label, value, multiline = false }: { label: string; value?: string | number | null; multiline?: boolean }) {
  const display = value === null || value === undefined || value === '' ? '—' : String(value);
  return (
    <div className="py-3 border-b border-slate-100 last:border-b-0">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className={`text-sm font-bold text-slate-900 ${multiline ? 'whitespace-pre-wrap leading-relaxed' : 'break-words'}`}>{display}</p>
    </div>
  );
}

export function ItemDetailModal({ item, onClose }: ItemDetailModalProps) {
    const images = [item.image_url, item.image_url2, item.image_url3, item.image_url4]
    .filter((img): img is string => img !== undefined && !img.includes('r2.dev/placeholder.svg'));

  const [currentImage, setCurrentImage] = useState(0);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const dragState = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const applyTransform = useCallback((s: number, o: { x: number; y: number }) => {
    scaleRef.current = s;
    offsetRef.current = o;
    setScale(s);
    setOffset(o);
  }, []);

  const resetView = useCallback(() => applyTransform(1, { x: 0, y: 0 }), [applyTransform]);

  const zoomBy = useCallback((factor: number) => {
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scaleRef.current * factor));
    applyTransform(next, next === 1 ? { x: 0, y: 0 } : offsetRef.current);
  }, [applyTransform]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setCurrentImage(i => Math.min(i + 1, images.length - 1));
      if (e.key === 'ArrowLeft') setCurrentImage(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, images.length]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      if (!dragState.current) return;
      const { startX, startY, baseX, baseY } = dragState.current;
      setOffset({ x: baseX + (e.clientX - startX), y: baseY + (e.clientY - startY) });
    };
    const onUp = () => {
      dragState.current = null;
      setDragging(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  const handleWheel = (e: React.WheelEvent) => {
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scaleRef.current * (e.deltaY < 0 ? 1.2 : 1 / 1.2)));
    applyTransform(next, next === 1 ? { x: 0, y: 0 } : offsetRef.current);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scaleRef.current <= 1) return;
    e.preventDefault();
    dragState.current = { startX: e.clientX, startY: e.clientY, baseX: offsetRef.current.x, baseY: offsetRef.current.y };
    setDragging(true);
  };

  const badgeClass = STATUS_COLORS[item.status] || 'bg-slate-100 text-slate-600 border-slate-200';
  const createdDate = new Date(item.created_at).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight truncate">
              Order #{item.order_number}
            </h2>
            <span className={`shrink-0 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${badgeClass}`}>
              {item.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 h-10 w-10 rounded-full bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300 flex items-center justify-center transition-all"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 md:grid-cols-2 flex-1 min-h-0">
          {/* Image viewer */}
          <div className="flex flex-col bg-slate-900 min-h-[40vh] md:min-h-0">
            <div
              className="relative flex-1 overflow-hidden"
              style={{ cursor: scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in' }}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onDoubleClick={() => (scale > 1 ? resetView() : zoomBy(2))}
            >
              {images.length > 0 ? (
                <Image
                  src={getPrinterQualityImage(images[currentImage])}
                  alt={`${item.product_name} ${currentImage + 1}`}
                  fill
                  className="object-contain select-none pointer-events-none transition-transform duration-75"
                  style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
                  draggable={false}
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-slate-500 text-xs font-black uppercase tracking-widest">No artwork attached</p>
                </div>
              )}
            </div>

            {/* Controls */}
            {images.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 shrink-0">
                <div className="flex gap-2">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setCurrentImage(idx); resetView(); }}
                      className={`relative h-12 w-12 rounded-xl overflow-hidden border-2 transition-all ${
                        idx === currentImage ? 'border-blue-500 scale-105' : 'border-white/20 opacity-50 hover:opacity-100'
                      }`}
                    >
                      <Image src={getPrinterQualityImage(img)} alt={`Thumb ${idx + 1}`} fill className="object-cover" unoptimized />
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 tabular-nums mr-2">
                    {Math.round(scale * 100)}%
                  </span>
                  <button onClick={() => zoomBy(1 / 1.4)} className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors" title="Zoom out">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                  </button>
                  <button onClick={() => zoomBy(1.4)} className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors" title="Zoom in">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </button>
                  <button onClick={resetView} className="h-8 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[9px] font-black uppercase tracking-widest transition-colors" title="Reset zoom">
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="p-8 overflow-y-auto">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-600 mb-4">Item Details</p>
            <DetailRow label="Customer Name" value={item.customer_name} />
            <DetailRow label="Product" value={item.product_name} />
            <DetailRow label="Size / Variant" value={item.variant || 'Standard'} multiline />
            <DetailRow label="Quantity" value={item.quantity} />
            <DetailRow label="Personalization / Prints Name" value={item.print_name} multiline />
            <DetailRow label="Production Notes" value={item.notes} multiline />
            <DetailRow label="Stage" value={item.status} />
            <DetailRow label="Date Added" value={createdDate} />
          </div>
        </div>
      </div>
    </div>
  );
}
