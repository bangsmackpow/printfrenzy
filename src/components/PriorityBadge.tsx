"use client";

import type { MouseEvent } from 'react';

interface PriorityBadgeProps {
  active?: boolean | number | null;
  by?: string | null;
  at?: string | null;
  note?: string | null;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  label?: string;
  className?: string;
  showText?: boolean;
}

function formatWhen(at?: string | null): string {
  if (!at) return '';
  const d = new Date(at);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function PriorityBadge({
  active,
  by,
  at,
  note,
  onClick,
  label = 'Priority',
  className = '',
  showText = false,
}: PriorityBadgeProps) {
  if (!active) return null;

  const when = formatWhen(at);
  const who = by || 'unknown';
  const title = [
    `${label} — marked by ${who}${when ? ` on ${when}` : ''}`,
    note ? `Note: ${note}` : '',
    onClick ? 'Click to open priority note' : '',
  ]
    .filter(Boolean)
    .join('\n');

  const base = `inline-flex items-center gap-1.5 rounded-lg bg-amber-400 text-amber-950 ring-1 ring-amber-500/40 shadow-sm font-black uppercase tracking-widest ${
    showText ? 'px-2.5 py-1 text-[9px]' : 'h-8 w-8 justify-center'
  } ${onClick ? 'hover:bg-amber-300 hover:scale-105 transition-all cursor-pointer' : ''} ${className}`;

  const inner = (
    <>
      <svg className={showText ? 'h-3 w-3' : 'h-4 w-4'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" strokeLinecap="round" strokeWidth={2.5} />
      </svg>
      {showText && <span>{label}</span>}
    </>
  );

  if (!onClick) {
    return (
      <span className={base} title={title} aria-label={title}>
        {inner}
      </span>
    );
  }

  return (
    <button type="button" onClick={onClick} className={base} title={title} aria-label={title}>
      {inner}
    </button>
  );
}
