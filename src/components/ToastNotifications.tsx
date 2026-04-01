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
}

interface ToastNotificationProps {
  onNotificationClick?: (notification: Notification) => void;
}

export function useNotifications(onNotificationClick?: (notification: Notification) => void) {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastPoll, setLastPoll] = useState<string>(new Date().toISOString());

  const pollNotifications = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch(`/api/notifications/poll?since=${encodeURIComponent(lastPoll)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setNotifications(prev => [...data, ...prev]);
          setLastPoll(new Date().toISOString());
        }
      }
    } catch (err) {
      console.error("Poll error:", err);
    }
  }, [session, lastPoll]);

  useEffect(() => {
    if (!session) return;
    const interval = setInterval(pollNotifications, 5000);
    return () => clearInterval(interval);
  }, [session, pollNotifications]);

  const dismissNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    });
  }, []);

  const dismissAll = useCallback(() => {
    setNotifications([]);
    fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [] }),
    });
  }, []);

  return { notifications, dismissNotification, dismissAll, pollNotifications };
}

export function ToastNotifications({ onNotificationClick }: ToastNotificationProps) {
  const { notifications, dismissNotification, dismissAll } = useNotifications(onNotificationClick);

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
          className="pointer-events-auto bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 animate-in slide-in-from-right-full fade-in duration-300 cursor-pointer hover:shadow-3xl transition-shadow"
          onClick={() => {
            dismissNotification(notif.id);
            onNotificationClick?.(notif);
          }}
        >
          <div className="flex items-start gap-4">
            <div className={`h-10 w-10 rounded-xl ${stageColors[notif.to_stage] || 'bg-slate-500'} flex items-center justify-center flex-shrink-0`}>
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
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
