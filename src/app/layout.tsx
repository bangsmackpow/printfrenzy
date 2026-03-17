import './globals.css';
import Link from 'next/link';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="bg-slate-900 text-white p-4 flex gap-6">
          <Link href="/dashboard" className="hover:text-blue-400">Dashboard</Link>
          <Link href="/orders/new" className="hover:text-blue-400">Add Order</Link>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}