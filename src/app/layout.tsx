"use client";
import './globals.css';
import Link from 'next/link';
import { signOut } from "@auth/nextjs/react"; // or signIn

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50">
        <nav className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg sticky top-0 z-50">
          <div className="flex gap-6 font-medium">
            <Link href="/dashboard" className="hover:text-blue-400 transition">Queue</Link>
            <Link href="/import" className="hover:text-blue-400 transition">Import Wix</Link>
            <Link href="/orders/new" className="hover:text-blue-400 transition">Manual Order</Link>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/admin/users" className="text-sm text-slate-400 hover:text-white transition">Admin</Link>
            <button 
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="bg-red-900/40 hover:bg-red-800 px-3 py-1 rounded text-sm border border-red-700 transition"
            >
              Logout
            </button>
          </div>
        </nav>
        <main className="min-h-[calc(100-64px)]">{children}</main>
      </body>
    </html>
  );
}