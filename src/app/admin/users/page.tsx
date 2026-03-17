"use client";
import { useEffect, useState } from 'react';

export default function UserAdmin() {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("USER");

  const fetchUsers = () => fetch('/api/admin/users').then(res => res.json()).then(setUsers);
  useEffect(() => { fetchUsers(); }, []);

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({ email, password, role })
    });
    setEmail(""); setPassword(""); fetchUsers();
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Staff Management</h1>
      
      <form onSubmit={addUser} className="bg-white p-4 rounded shadow mb-8 flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-xs font-bold mb-1">Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} className="w-full border p-2 rounded" required />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-bold mb-1">Temporary Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border p-2 rounded" required />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1">Role</label>
          <select value={role} onChange={e => setRole(e.target.value)} className="border p-2 rounded">
            <option value="USER">User (Printer)</option>
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <button className="bg-blue-600 text-white px-6 py-2 rounded font-bold">Add Staff</button>
      </form>

      <table className="w-full bg-white rounded shadow">
        <thead>
          <tr className="border-b bg-slate-50 text-left">
            <th className="p-3">Email</th>
            <th className="p-3">Role</th>
            <th className="p-3">Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u: any) => (
            <tr key={u.id} className="border-b">
              <td className="p-3">{u.email}</td>
              <td className="p-3"><span className="text-xs font-bold px-2 py-1 rounded bg-slate-100">{u.role}</span></td>
              <td className="p-3 text-slate-500 text-sm">{new Date(u.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}