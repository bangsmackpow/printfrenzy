"use client";

import { useEffect, useState } from 'react';
import { useSession } from "next-auth/react";

interface User {
  id: string;
  email: string;
  role: 'USER' | 'MANAGER' | 'ADMIN';
  created_at: string;
}

export default function UserAdmin() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("USER");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [clearPassword, setClearPassword] = useState("");

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  const isAdmin = (session?.user as { role?: string })?.role === 'ADMIN';

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ text: "", type: "" });
    
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });

      if (res.ok) {
        setMessage({ text: "User added successfully!", type: "success" });
        setEmail("");
        setPassword("");
        setRole("USER");
        fetchUsers();
      } else {
        const errorData = await res.json();
        setMessage({ text: errorData.error || "Failed to add user.", type: "error" });
      }
    } catch (err) {
      console.error("Add user error:", err);
      setMessage({ text: "An error occurred. Please try again.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clearPassword) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/orders/clear', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: clearPassword })
      });
      if (res.ok) {
        alert("SYSTEM CLEARED: All data has been successfully removed.");
        window.location.reload();
      } else {
        const data = await res.json();
        alert("Clear failed: " + (data.error || "Unknown error"));
      }
    } catch { alert("Failed to connect to server."); }
    finally { 
      setSubmitting(false);
      setIsClearModalOpen(false);
      setClearPassword("");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser || !resetPassword) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${resetUser.id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPassword })
      });
      if (res.ok) alert("Password updated successfully!");
      else {
        const data = await res.json();
        alert("Error: " + data.error);
      }
    } catch {
      alert("Failed to update password.");
    } finally {
      setSubmitting(false);
      setIsResetModalOpen(false);
      setResetPassword("");
    }
  };

  const getRoleBadge = (role: string) => {
    const base = "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ";
    switch (role) {
      case 'ADMIN': return base + "bg-purple-50 text-purple-700 border-purple-100";
      case 'MANAGER': return base + "bg-blue-50 text-blue-700 border-blue-100";
      default: return base + "bg-slate-50 text-slate-600 border-slate-100";
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] py-20 px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Staff Management</h1>
            <div className="flex gap-4 mt-2">
                <a href="/admin/audit" className="text-xs font-black uppercase text-blue-600 hover:underline">Audit Logs</a>
                <a href="/admin/reports" className="text-xs font-black uppercase text-blue-600 hover:underline">Analytics</a>
            </div>
          </div>
          <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 flex gap-2">
            {isAdmin && (
              <button 
                onClick={() => setIsClearModalOpen(true)}
                className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
              >
                Clear All Orders
              </button>
            )}
            <button onClick={fetchUsers} className="p-2 text-slate-400 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all">
              <svg className={`h-6 w-6 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 sticky top-8">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                Add New Staff
              </h2>
              {message.text && (
                <div className={`mb-6 p-4 rounded-2xl text-sm font-bold border ${
                  message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
                }`}>
                  {message.text}
                </div>
              )}
              <form onSubmit={addUser} className="space-y-5">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@builtnetworks.com" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium" required />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Temporary Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium" required />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Access Role</label>
                  <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-700 appearance-none cursor-pointer">
                    <option value="USER">User (Printer Operator)</option>
                    <option value="MANAGER">Manager (Import/Manual)</option>
                    <option value="ADMIN">Administrator (Full Access)</option>
                  </select>
                </div>
                <button disabled={submitting} className="w-full bg-slate-900 hover:bg-blue-600 disabled:bg-slate-300 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-slate-100 active:scale-[0.98] mt-4 flex items-center justify-center gap-2">
                  {submitting ? "Processing..." : "Create Account"}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
                <h2 className="text-xl font-bold text-slate-800">Current Staff Members</h2>
                <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full">{users.length} Total</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <th className="px-8 py-5">User Account</th>
                      <th className="px-8 py-5">Permissions</th>
                      <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {users.map((u) => (
                      <tr key={u.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 font-black">{u.email[0].toUpperCase()}</div>
                            <div className="font-bold text-slate-800">{u.email}</div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={getRoleBadge(u.role)}>{u.role}</span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button onClick={() => { setResetUser(u); setIsResetModalOpen(true); }} className="text-xs font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors">Reset Password</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clear All Orders Modal */}
      {isClearModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-md w-full border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="h-14 w-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6">
              <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Confirm System Wipe?</h3>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">This is irreversible. Please enter your administrator password to proceed with the deletion of all data.</p>
            <form onSubmit={handleClearAll} className="space-y-6">
              <input type="password" autoFocus required placeholder="Enter Password" value={clearPassword} onChange={(e) => setClearPassword(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-red-600/20 focus:border-red-600 outline-none transition-all" />
              <div className="flex gap-4">
                <button type="button" onClick={() => { setIsClearModalOpen(false); setClearPassword(""); }} className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs transition-all">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-red-200 disabled:bg-slate-300">{submitting ? "Wiping..." : "Confirm Wipe"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Individual Reset Modal */}
      {isResetModalOpen && resetUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-md w-full border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="h-14 w-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Reset Staff Password</h3>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">Update the credential for <b>{resetUser.email}</b>. This action is effective immediately.</p>
            <form onSubmit={handleResetPassword} className="space-y-6">
              <input type="password" autoFocus required placeholder="New Password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 outline-none transition-all" />
              <div className="flex gap-4">
                <button type="button" onClick={() => { setIsResetModalOpen(false); setResetUser(null); setResetPassword(""); }} className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs transition-all">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-4 bg-slate-900 hover:bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-blue-200 disabled:bg-slate-300">{submitting ? "Updating..." : "Update Password"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}