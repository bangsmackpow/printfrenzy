"use client";

import './globals.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from "next-auth/react";
import { Providers } from "@/components/Providers";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;

  const navLinks = [
    { name: 'Print Queue', href: '/dashboard', icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
    )},
    { name: 'Production Print', href: '/orders/print', icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 00-2 2h2m2 4h10a2 2 0 002-2v-3a2 2 0 00-2-2H5a2 2 0 00-2 2v3a2 2 0 002 2zm0 0v-9a2 2 0 012-2h6a2 2 0 012 2v9m-8-3h4" /></svg>
    )},
    { name: 'Import Wix', href: '/import', icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
    )},
    { name: 'Manual Order', href: '/orders/new', icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z\" /></svg>
    )},
    { name: 'Shipping Tool', href: '/shipping', icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
    )},
    { name: 'Settings', href: '/settings', icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.756 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    )},
    ...(role === 'ADMIN' ? [{ name: 'Manage Staff', href: '/admin/users', icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    )}] : [])
  ];

  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900">
        <Providers>
          {!isLoginPage && (
            <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 z-40 hidden md:block">
              <div className="flex flex-col h-full p-6">
                <div className="flex items-center gap-3 mb-12 px-2">
                  <div className="h-10 w-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black italic shadow-lg shadow-slate-200">P</div>
                  <span className="font-black text-xl tracking-tighter uppercase italic">PrintFrenzy</span>
                </div>

                <nav className="flex-grow space-y-2">
                  {navLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group ${
                          isActive 
                            ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 scale-[1.02]' 
                            : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`${isActive ? 'text-blue-400' : 'group-hover:text-blue-600'} transition-colors`}>
                          {link.icon}
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-widest">{link.name}</span>
                      </Link>
                    );
                  })}
                </nav>

                <div className="pt-6 border-t border-slate-100">
                    <button 
                        onClick={() => signOut()}
                        className="flex items-center gap-4 px-4 py-4 w-full text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all group"
                    >
                        <svg className="h-5 w-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        <span className="text-[11px] font-black uppercase tracking-widest">Sign Out</span>
                    </button>
                </div>
              </div>
            </aside>
          )}

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
