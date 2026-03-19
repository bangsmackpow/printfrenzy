"use client";

import { useEffect, useState } from 'react';
import { signOut } from "next-auth/react";

interface User {
  id: string;
  email: string;
  role: 'USER' | 'MANAGER' | 'ADMIN';
  created_at: string;
}

export default function UserAdmin() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("USER");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

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
      setMessage({ text: "An error occurred. Please try again.", type: "error" });
    } finally {
      setSubmitting(false);
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
    <div className="min-h-screen bg-[#f8fafc] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-12 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Staff Management</h1>
            <p className="text-slate-500 mt-2 font-medium">Manage access and roles for the DTF production team.</p>
          </div>
          <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 flex gap-2">
            <button onClick={fetchUsers} className="p-2 text-slate-400 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all">
              <svg className={`h-6 w-6 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add User Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 sticky top-8">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                Add New Staff
              </h2>
              
              {message.text && (
                <div className={`mb-6 p-4 rounded-2xl text-sm font-bold border animate-in fade-in slide-in-from-top-2 ${
                  message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
                }`}>
                  {message.text}
                </div>
              )}

              <form onSubmit={addUser} className="space-y-5">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                  <input 
                    type="email"
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder="name@builtnetworks.com"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-300 font-medium" 
                    required 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Temporary Password</label>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-300 font-medium" 
                    required 
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Access Role</label>
                  <select 
                    value={role} 
                    onChange={e => setRole(e.target.value)} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-bold text-slate-700 appearance-none cursor-pointer"
                  >
                    <option value="USER">User (Printer Operator)</option>
                    <option value="MANAGER">Manager (Import/Manual)</option>
                    <option value="ADMIN">Administrator (Full Access)</option>
                  </select>
                </div>

                <button 
                  disabled={submitting}
                  className="w-full bg-slate-900 hover:bg-blue-600 disabled:bg-slate-300 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-slate-100 active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : "Create Account"}
                </button>
              </form>
            </div>
          </div>

          {/* User List */}
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
                      <th className="px-8 py-5 text-right">Date Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {users.map((u) => (
                      <tr key={u.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 font-black">
                              {u.email[0].toUpperCase()}
                            </div>
                            <div className="font-bold text-slate-800">{u.email}</div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={getRoleBadge(u.role)}>{u.role}</span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button 
                            onClick={async () => {
                              const newPass = prompt(`Enter new password for ${u.email}:`);
                              if (!newPass) return;
                              setSubmitting(true);
                              try {
                                const res = await fetch(`/api/admin/users/${u.id}/password`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ password: newPass })
                                });
                                if (res.ok) alert("Password updated!");
                                else {
                                  const data = await res.json();
                                  alert("Error: " + data.error);
                                }
                              } catch (e) {
                                alert("Failed to update password.");
                              } finally {
                                setSubmitting(false);
                              }
                            }}
                            className="text-xs font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors mr-4"
                          >
                            Reset Password
                          </button>
                          <span className="font-medium text-slate-500 text-sm whitespace-nowrap">
                            {new Date(u.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && !loading && (
                      <tr>
                        <td colSpan={3} className="px-8 py-20 text-center">
                          <div className="bg-slate-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="h-8 w-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                          </div>
                          <p className="text-slate-400 font-bold">No registered staff members found.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}