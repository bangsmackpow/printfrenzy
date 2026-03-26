"use client";

import './globals.css';
import { usePathname } from 'next/navigation';
import { Providers } from "@/components/Providers";
import { Sidebar } from "@/components/Sidebar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900">
        <Providers>
          {!isLoginPage && <Sidebar />}

          <div className={`${!isLoginPage ? 'md:ml-64' : ''} min-h-screen`}>
            <main className="min-h-screen">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
