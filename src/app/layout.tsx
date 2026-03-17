"use client";
import './globals.css';
import Link from 'next/link';
import { signIn, signOut } from "@/auth";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Note: Wrap this in a <SessionProvider> in your actual file if using useSession
  return (
    <html lang="en">
      <body className="bg-slate-50">
        <nav className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg">
          <div className="flex gap-6 font-medium">
            <Link href="/dashboard" className="hover:text-blue-400">Queue</Link>
            <Link href="/import" className="hover:text-blue-400">Import Wix</Link>
            <Link href="/orders/new" className="hover:text-blue-400">New Order</Link>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/admin/users" className="text-sm text-slate-400 hover:text-white">Staff</Link>
            <button 
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="bg-red-900/50 hover:bg-red-800 px-3 py-1 rounded text-sm border border-red-700 transition"
            >
              Logout
            </button>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}