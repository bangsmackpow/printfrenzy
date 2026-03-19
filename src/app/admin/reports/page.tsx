"use client";

import { useEffect, useState } from 'react';

interface StatusSummary {
  status: string;
  count: number;
  items: number;
}

interface PerformanceData {
  count: number;
  items: number;
}

interface ReportData {
  statusSummary: StatusSummary[];
  performanceToday: PerformanceData | null;
  productPending: { product_name: string; items: number }[];
}

interface BackupItem {
  key: string;
  size: number;
  uploaded: string;
}

export default function ReportsAdmin() {
  const [data, setData] = useState<ReportData | null>(null);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const statsRes = await fetch('/api/admin/reports');
      const backupsRes = await fetch('/api/admin/backups');
      if (statsRes.ok) setData(await statsRes.json());
      if (backupsRes.ok) setBackups(await backupsRes.json());
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ORDERED': return 'bg-blue-600';
      case 'PRINTED': return 'bg-slate-900';
      case 'COMPLETED': return 'bg-green-600';
      default: return 'bg-slate-200';
    }
  };

  if (loading && !data) return (
     <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent shadow-lg shadow-blue-100"></div>
     </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] py-16 px-4">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight italic">Performance Analytics</h1>
                <p className="text-slate-500 mt-2 font-medium">Production throughput and system health monitoring.</p>
            </div>
            <button onClick={fetchStats} className="p-4 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 shadow-sm transition-all active:scale-95">
                🔄
            </button>
        </div>

        {/* Global Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {data?.statusSummary.map((s) => (
                <div key={s.status} className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative group overflow-hidden">
                    <div className={`absolute top-0 right-0 h-24 w-24 translate-x-12 -translate-y-12 opacity-5 rounded-full ${getStatusColor(s.status)}`}></div>
                    <h3 className="text-xs font-black text-slate-400 tracking-widest uppercase mb-4">{s.status}</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black text-slate-900">{s.count || 0}</span>
                        <span className="text-slate-400 font-bold">Jobs</span>
                    </div>
                    <p className="mt-4 text-sm font-bold text-slate-500 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-slate-300"></span>
                        {s.items || 0} Total Items
                    </p>
                </div>
            ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left Col: Pending distribution */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold text-slate-800 ml-2">Pending Product Snapshot</h2>
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
                    {data?.productPending.map((p, idx) => (
                        <div key={idx} className="space-y-2">
                            <div className="flex justify-between text-xs font-black uppercase tracking-widest text-slate-400">
                                <span>{p.product_name}</span>
                                <span className="text-slate-900">{p.items} Items</span>
                            </div>
                            <div className="h-3 bg-slate-50 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-blue-600 rounded-full transition-all duration-1000" 
                                    style={{ width: `${(p.items / (data.statusSummary.find(s => s.status === 'ORDERED')?.items || 1)) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                    {data?.productPending.length === 0 && (
                        <p className="text-center py-10 text-slate-400 font-bold italic">Queue is clear! Great job.</p>
                    )}
                </div>
            </div>

            {/* Right Col: Backups */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold text-slate-800 ml-2">Automated Data Backups</h2>
                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 font-bold">💾</div>
                            <span className="font-bold text-slate-700">Recent R2 Snapshots</span>
                        </div>
                        <button 
                            onClick={async () => {
                                if (window.confirm("Run full database backup to R2 now?")) {
                                    setLoading(true);
                                    await fetch('/api/admin/backups', { method: 'POST' });
                                    fetchStats();
                                }
                            }}
                            className="bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95"
                        >Backup Now</button>
                    </div>
                    <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
                        {backups.map((bak, idx) => (
                            <div key={idx} className="px-8 py-5 group hover:bg-slate-50 transition-colors flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">JSON Dump</span>
                                    <span className="font-bold text-slate-800 text-sm font-mono truncate max-w-[200px]">{bak.key.split('/').pop()}</span>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <span className="text-xs font-black text-slate-900 uppercase">{(bak.size / 1024).toFixed(1)} KB</span>
                                    <span className="text-[10px] text-slate-400 font-medium">Uploaded to R2</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
