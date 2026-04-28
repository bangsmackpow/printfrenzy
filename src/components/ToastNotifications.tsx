"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from "next-auth/react";

interface Notification {
  id: number;
  user_email: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  product_name: string;
  from_stage: string;
  to_stage: string;
  moved_by: string;
  read: number;
  timestamp: string;
  type?: 'INFO' | 'ERROR';
  errorDetails?: any;
  traceId?: string;
}

interface ToastNotificationProps {
  onNotificationClick?: (notification: Notification) => void;
}

export function useNotifications(onNotificationClick?: (notification: Notification) => void) {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastPoll, setLastPoll] = useState<string>(new Date().toISOString());

  const addError = useCallback((error: string, traceId?: string, details?: any) => {
    const id = Date.now();
    setNotifications(prev => [{
      id,
      user_email: '',
      order_id: '',
      order_number: 'ERROR',
      customer_name: 'Diagnostic',
      product_name: error,
      from_stage: '',
      to_stage: '',
      moved_by: 'System',
      read: 0,
      timestamp: new Date().toISOString(),
      type: 'ERROR',
      errorDetails: details,
      traceId
    }, ...prev]);
  }, []);

  const pollNotifications = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch(`/api/notifications/poll?since=${encodeURIComponent(lastPoll)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setNotifications(prev => [...data.map((n: any) => ({ ...n, type: 'INFO' })), ...prev]);
          setLastPoll(new Date().toISOString());
        }
      }
    } catch (err) {
      console.error("Poll error:", err);
    }
  }, [session, lastPoll]);

  useEffect(() => {
    if (!session) return;
    const interval = setInterval(pollNotifications, 10000); // 10s for production
    return () => clearInterval(interval);
  }, [session, pollNotifications]);

  const dismissNotification = useCallback((id: number) => {
    const notif = notifications.find(n => n.id === id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (notif?.type !== 'ERROR') {
      fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });
    }
  }, [notifications]);

  const dismissAll = useCallback(() => {
    setNotifications([]);
    fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [] }),
    });
  }, []);

  return { notifications, dismissNotification, dismissAll, pollNotifications, addError };
}

export function ToastNotifications({ onNotificationClick }: ToastNotificationProps) {
  const { notifications, dismissNotification, dismissAll } = useNotifications(onNotificationClick);

  useEffect(() => {
    // Listen for custom error events from global fetch wrapper or components
    const handleGlobalError = (e: any) => {
      if (e.detail) {
        // This is handled by a separate context or event listener if needed
      }
    };
    window.addEventListener('pf-error', handleGlobalError);
    return () => window.removeEventListener('pf-error', handleGlobalError);
  }, []);

  if (notifications.length === 0) return null;

  const stageColors: Record<string, string> = {
    RECEIVED: 'bg-slate-600',
    ORDERING: 'bg-amber-500',
    PRINTING: 'bg-blue-600',
    STAGING: 'bg-purple-500',
    PRODUCTION: 'bg-orange-500',
    COMPLETED: 'bg-emerald-500',
    ARCHIVED: 'bg-slate-400',
  };

  const copyDiagnostic = (notif: Notification) => {
    const data = JSON.stringify({
      traceId: notif.traceId,
      error: notif.product_name,
      details: notif.errorDetails,
      timestamp: notif.timestamp,
      url: window.location.href
    }, null, 2);
    navigator.clipboard.writeText(data);
    alert("Diagnostic data copied to clipboard!");
  };

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-md w-full pointer-events-none">
      <div className="flex justify-end pointer-events-auto mb-1">
        {notifications.length > 1 && (
          <button
            onClick={dismissAll}
            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 bg-white/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200"
          >
            Dismiss All
          </button>
        )}
      </div>
      {notifications.slice(0, 5).map((notif) => (
        <div
          key={notif.id}
          className={`pointer-events-auto rounded-2xl shadow-2xl border p-5 animate-in slide-in-from-right-full fade-in duration-300 cursor-pointer hover:shadow-3xl transition-shadow ${
            notif.type === 'ERROR' ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'
          }`}
          onClick={() => {
            if (notif.type !== 'ERROR') {
                dismissNotification(notif.id);
                onNotificationClick?.(notif);
            }
          }}
        >
          <div className="flex items-start gap-4">
            <div className={`h-10 w-10 rounded-xl ${notif.type === 'ERROR' ? 'bg-red-600' : (stageColors[notif.to_stage] || 'bg-slate-500')} flex items-center justify-center flex-shrink-0`}>
              {notif.type === 'ERROR' ? (
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              ) : (
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {notif.type === 'ERROR' ? (
                <>
                  <p className="text-sm font-black text-red-900 uppercase italic tracking-tighter">System Error</p>
                  <p className="text-xs text-red-700 mt-1 font-bold">{notif.product_name}</p>
                  {notif.traceId && (
                    <p className="text-[10px] font-black text-red-400 mt-2 uppercase tracking-widest">Support ID: {notif.traceId}</p>
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); copyDiagnostic(notif); }}
                    className="mt-3 text-[9px] font-black uppercase tracking-widest bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-slate-900 transition-colors"
                  >
                    Copy Diagnostic Data
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-slate-900">
                    <span className="text-slate-500 font-medium">{notif.moved_by}</span> moved{' '}
                    <span className="text-blue-600">#{notif.order_number}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {notif.customer_name} — {notif.product_name}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{notif.from_stage}</span>
                    <svg className="h-3 w-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span className={`text-[9px] font-black uppercase tracking-widest text-white px-2 py-0.5 rounded ${stageColors[notif.to_stage] || 'bg-slate-500'}`}>
                      {notif.to_stage}
                    </span>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismissNotification(notif.id);
              }}
              className="text-slate-300 hover:text-slate-500 flex-shrink-0"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
