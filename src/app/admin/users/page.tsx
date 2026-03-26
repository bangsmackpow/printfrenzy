"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (session && (session.user as { role?: string })?.role !== 'ADMIN') {
      router.push('/dashboard');
    } else if (session) {
      fetchUsers();
    }
  }, [session, status, router]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });
      if (res.ok) {
        setEmail('');
        setPassword('');
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetPassword = async (id: string) => {
    const newPass = prompt("Enter new password for this user:");
    if (!newPass) return;

    try {
      const res = await fetch(`/api/admin/users/password`, { // Note: using consolidated pattern
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password: newPass }), // We'll need to update the consolidated route to handle this
      });
      if (res.ok) alert("Password reset successfully");
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-20 text-center">Loading Users...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-4xl font-black uppercase mb-12 italic">Manage Staff</h1>

      <form onSubmit={handleCreate} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm mb-12">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Create New Staff Account</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} className="bg-slate-50 p-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" required />
          <input type="password" placeholder="Initial Password" value={password} onChange={e => setPassword(e.target.value)} className="bg-slate-50 p-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" required />
          <select value={role} onChange={e => setRole(e.target.value)} className="bg-slate-50 p-4 rounded-2xl font-bold outline-none">
            <option value="USER">Standard User</option>
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Administrator</option>
          </select>
        </div>
        <button type="submit" className="mt-6 w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 transition-all">Create Account</button>
      </form>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">User</th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Role</th>
              <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-slate-50">
                <td className="p-6 font-bold text-slate-700">{u.email}</td>
                <td className="p-6">
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-6">
                  <button onClick={() => resetPassword(u.id)} className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline">Reset Password</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
