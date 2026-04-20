"use client";

import { useEffect, useState } from 'react';

interface AuditLog {
  id: number;
  order_id: string;
  order_number: string;
  user_email: string;
  action_type: string;
  action: string;
  details: string;
  timestamp: string;
  customer_name?: string;
  product_name?: string;
  variant?: string;
}

const ACTION_TYPE_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  STATUS_CHANGE: { label: 'Status Change', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-100' },
  ORDER_UPDATE: { label: 'Order Edit', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-100' },
  NOTES_UPDATE: { label: 'Notes Update', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-100' },
  ORDER_DELETE: { label: 'Order Delete', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-100' },
  SYSTEM_CLEAR: { label: 'System Clear', color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-100' },
  SHIPMENT_CREATED: { label: 'Label Purchase', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-100' },
};

export default function AuditAdmin() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<string[]>([]);
  const [stats, setStats] = useState<{ date: string; count: number }[]>([]);
  const [filterActionType, setFilterActionType] = useState('');
  const [filterUser, setFilterUser] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterActionType) params.set('action_type', filterActionType);
      if (filterUser) params.set('user_email', filterUser);
      params.set('limit', '100');
      const res = await fetch(`/api/admin/audit?${params.toString()}`);
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

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/audit/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.map((u: { user_email: string }) => u.user_email));
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchUsers();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [filterActionType, filterUser]);

  const clearFilters = () => {
    setFilterActionType('');
    setFilterUser('');
  };

  const actionTypes = Object.keys(ACTION_TYPE_CONFIG);

  return (
    <div className="min-h-screen bg-[#f8fafc] py-12 px-4 shadow-sm">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase">Command Center</h1>
            <p className="text-slate-500 mt-2 font-medium">Just-in-time reporting and system accountability.</p>
          </div>
          <div className="flex gap-3">
              <button onClick={() => { fetchLogs(); fetchStats(); }} className="p-3 text-slate-400 hover:text-blue-600 bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-blue-100 transition-all">
                <svg className={`h-6 w-6 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
          </div>
        </div>

        {/* Just In Time Reports Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Quick Filters */}
            <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
                <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-6">Quick Intelligence Reports</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <button 
                        onClick={() => { setFilterActionType('ORDER_DELETE'); setFilterUser(''); }}
                        className={`p-4 rounded-2xl border-2 text-left transition-all ${filterActionType === 'ORDER_DELETE' ? 'border-blue-600 bg-blue-50' : 'border-slate-50 bg-slate-50 hover:border-slate-200'}`}
                    >
                        <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Investigation</p>
                        <p className="font-black text-slate-900 text-xs">Recent Deletions</p>
                    </button>
                    <button 
                        onClick={() => { setFilterActionType('SHIPMENT_CREATED'); setFilterUser(''); }}
                        className={`p-4 rounded-2xl border-2 text-left transition-all ${filterActionType === 'SHIPMENT_CREATED' ? 'border-blue-600 bg-blue-50' : 'border-slate-50 bg-slate-50 hover:border-slate-200'}`}
                    >
                        <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Logistics</p>
                        <p className="font-black text-slate-900 text-xs">Label Purchases</p>
                    </button>
                    <button 
                        onClick={() => { setFilterActionType('SYSTEM_CLEAR'); setFilterUser(''); }}
                        className={`p-4 rounded-2xl border-2 text-left transition-all ${filterActionType === 'SYSTEM_CLEAR' ? 'border-blue-600 bg-blue-50' : 'border-slate-50 bg-slate-50 hover:border-slate-200'}`}
                    >
                        <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Destructive</p>
                        <p className="font-black text-slate-900 text-xs">System Clears</p>
                    </button>
                    <button 
                        onClick={clearFilters}
                        className="p-4 rounded-2xl border-2 border-slate-900 bg-slate-900 text-left hover:bg-blue-600 hover:border-blue-600 transition-all group"
                    >
                        <p className="text-[9px] font-black uppercase text-slate-400 group-hover:text-blue-100 mb-1">All Data</p>
                        <p className="font-black text-white text-xs">Full System History</p>
                    </button>
                </div>
            </div>

            {/* Production Stats */}
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
                <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-6">Production Velocity</h2>
                <div className="space-y-4">
                    {stats.slice(0, 4).map((stat, i) => (
                        <div key={stat.date} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-1.5 h-8 rounded-full ${i === 0 ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-900 uppercase italic">
                                        {new Date(stat.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                            <p className="text-xl font-black text-slate-900 tracking-tighter italic">x{stat.count}</p>
                        </div>
                    ))}
                    {stats.length === 0 && <p className="text-slate-300 font-bold italic text-sm py-4">Waiting for production data...</p>}
                </div>
            </div>
        </div>

        {/* Existing Filters & Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Action Type</label>
              <select
                value={filterActionType}
                onChange={(e) => setFilterActionType(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              >
                <option value="">All Actions</option>
                {actionTypes.map(type => (
                  <option key={type} value={type}>{ACTION_TYPE_CONFIG[type].label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">User</label>
              <select
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              >
                <option value="">All Users</option>
                {users.map(user => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>
            </div>
            {(filterActionType || filterUser) && (
              <button
                onClick={clearFilters}
                className="self-end px-4 py-2.5 text-sm font-black text-slate-500 uppercase tracking-widest hover:text-red-500 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-8 py-6">Timestamp</th>
                  <th className="px-8 py-6">User</th>
                  <th className="px-8 py-6">Action</th>
                  <th className="px-8 py-6">Details</th>
                  <th className="px-8 py-6">Order Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const config = ACTION_TYPE_CONFIG[log.action_type] || { label: log.action_type, color: 'text-slate-700', bgColor: 'bg-slate-50', borderColor: 'border-slate-100' };
                  let detailsText = '';
                  let detailsExtra: string | null = null;
                  try {
                    const details = log.details ? JSON.parse(log.details) : null;
                    if (details) {
                      if (log.action_type === 'STATUS_CHANGE') {
                        detailsText = `${details.from} → ${details.to}`;
                      } else if (log.action_type === 'ORDER_UPDATE') {
                        detailsText = details.product_name || 'Details changed';
                        detailsExtra = details.customer_name;
                      } else if (log.action_type === 'NOTES_UPDATE') {
                        detailsText = details.to ? (details.to.length > 60 ? details.to.substring(0, 60) + '...' : details.to) : 'Notes cleared';
                      } else if (log.action_type === 'ORDER_DELETE') {
                        detailsText = `Order #${details.order_number || 'Unknown'}`;
                      } else if (log.action_type === 'SYSTEM_CLEAR') {
                        detailsText = `${details.orders_cleared} orders cleared`;
                      } else if (log.action_type === 'SHIPMENT_CREATED') {
                        detailsText = details.tracking_number || 'Label purchased';
                        detailsExtra = details.destination;
                      } else {
                        detailsText = log.action;
                      }
                    } else {
                      detailsText = log.action;
                    }
                  } catch {
                    detailsText = log.action;
                  }

                  return (
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
                        <div className={`px-3 py-1 ${config.bgColor} ${config.color} text-[11px] font-black rounded-lg inline-block uppercase border ${config.borderColor}`}>
                          {config.label}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm text-slate-600 font-medium">
                          {detailsText}
                          {detailsExtra && <span className="text-slate-400 ml-1">({detailsExtra})</span>}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        {log.order_id ? (
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900 text-sm">#{log.order_number || 'Manual'}</span>
                            <span className="text-xs font-bold text-slate-400 capitalize">{log.customer_name}</span>
                            {log.product_name && <span className="text-[10px] font-bold text-slate-300">{log.product_name}</span>}
                          </div>
                        ) : (
                          <span className="text-slate-300 italic text-sm">System Action</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {logs.length === 0 && !loading && (
                   <tr>
                    <td colSpan={5} className="px-8 py-32 text-center text-slate-400 font-bold italic">
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
