"use client";

import { useEffect, useState } from 'react';

interface AuditLog {
  id: number;
  order_id: string;
  user_email: string;
  action: string;
  timestamp: string;
  order_number?: string;
  customer_name?: string;
  product_name?: string;
}

export default function AuditAdmin() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/audit');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] py-12 px-4 shadow-sm">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight italic">Audit Log</h1>
            <p className="text-slate-500 mt-2 font-medium">History of all system actions and status changes.</p>
          </div>
          <button onClick={fetchLogs} className="p-3 text-slate-400 hover:text-blue-600 bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-blue-100 transition-all">
            <svg className={`h-6 w-6 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-8 py-6">Timestamp</th>
                  <th className="px-8 py-6">User</th>
                  <th className="px-8 py-6">Action</th>
                  <th className="px-8 py-6">Order Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-6 font-medium text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="px-8 py-6">
                      <div className="font-bold text-slate-800">{log.user_email}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="px-3 py-1 bg-blue-50 text-blue-700 text-[11px] font-black rounded-lg inline-block uppercase border border-blue-100">
                        {log.action}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {log.order_id ? (
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 text-sm">#{log.order_number || 'Manual'}</span>
                          <span className="text-xs font-bold text-slate-400 capitalize">{log.customer_name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 italic text-sm">System Reset</span>
                      )}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && !loading && (
                   <tr>
                    <td colSpan={4} className="px-8 py-32 text-center text-slate-400 font-bold italic">
                      No logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
