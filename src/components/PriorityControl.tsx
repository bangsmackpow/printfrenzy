"use client";

import { useEffect, useState } from 'react';
import { logClient } from '@/utils/clientLogger';

interface PriorityControlProps {
  scope: 'item' | 'batch';
  id?: string;
  orderNumber?: string;
  active?: boolean | number | null;
  by?: string | null;
  at?: string | null;
  note?: string | null;
  label?: string;
  placeholder?: string;
  onChange?: (update: { is_priority: boolean; priority_note: string }) => void;
  className?: string;
}

function formatWhen(at?: string | null): string {
  if (!at) return '';
  const d = new Date(at);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function PriorityControl({
  scope,
  id,
  orderNumber,
  active,
  by,
  at,
  note,
  label = 'Priority',
  placeholder = 'Why is this priority? Add context for the production team...',
  onChange,
  className = '',
}: PriorityControlProps) {
  const [isPriority, setIsPriority] = useState(!!active);
  const [noteValue, setNoteValue] = useState(note || '');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setIsPriority(!!active);
    setNoteValue(note || '');
  }, [active, note]);

  const save = async (nextIsPriority: boolean, nextNote: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/orders/priority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope,
          id,
          order_number: orderNumber,
          is_priority: nextIsPriority,
          note: nextNote,
        }),
      });
      if (res.ok) {
        onChange?.({ is_priority: nextIsPriority, priority_note: nextNote });
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1200);
      } else {
        logClient.error('priority_save_failed', { scope, id, orderNumber, status: res.status });
      }
    } catch (err) {
      logClient.error('priority_save_error', { scope, id, orderNumber, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setSaving(false);
    }
  };

  const toggle = () => {
    const next = !isPriority;
    setIsPriority(next);
    save(next, noteValue);
  };

  const when = formatWhen(at);

  return (
    <div className={`rounded-2xl border-2 transition-all p-4 ${isPriority ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'} ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <span className={`relative h-6 w-11 rounded-full transition-colors ${isPriority ? 'bg-amber-400' : 'bg-slate-300'}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${isPriority ? 'left-[1.375rem]' : 'left-0.5'}`} />
          </span>
          <input type="checkbox" checked={isPriority} onChange={toggle} className="sr-only" />
          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-700">
            <svg className={`h-3.5 w-3.5 ${isPriority ? 'text-amber-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" strokeLinecap="round" strokeWidth={2.5} />
            </svg>
            {label}
          </span>
        </label>
        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
          {saving ? 'Saving…' : savedFlash ? 'Saved ✓' : isPriority && by ? `By ${by}${when ? ` · ${when}` : ''}` : ''}
        </span>
      </div>

      {isPriority && (
        <textarea
          value={noteValue}
          onChange={(e) => setNoteValue(e.target.value)}
          onBlur={() => save(isPriority, noteValue)}
          placeholder={placeholder}
          rows={2}
          className="mt-3 w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-400 transition-all resize-none"
        />
      )}
    </div>
  );
}
