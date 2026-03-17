import './globals.css';
import Link from 'next/link';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50">
        <nav className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg">
          <div className="flex gap-6 font-medium">
            <Link href="/dashboard" className="hover:text-blue-400 transition">Dashboard</Link>
            <Link href="/import" className="hover:text-blue-400 transition">Import Wix</Link>
            <Link href="/orders/new" className="hover:text-blue-400 transition">New Order</Link>
          </div>
          <div className="flex gap-4 text-sm text-slate-400">
             <Link href="/admin/users" className="hover:text-white">Settings</Link>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}