"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from "next-auth/react";
import { useTheme } from '@/context/ThemeContext';
import { useState, useEffect, useRef, useCallback } from 'react';

interface SearchResult {
  id: string;
  order_number: string;
  customer_name: string;
  product_name: string;
  variant: string;
  notes: string;
  print_name: string;
  status: string;
  quantity: number;
  image_url: string;
  created_at: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const role = (session?.user as { role?: string })?.role;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = useCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
      if (res.ok) {
        setResults(await res.json());
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 250);
  };

  const handleSelect = (result: SearchResult) => {
    setQuery('');
    setResults([]);
    setFocused(false);
    inputRef.current?.blur();
    router.push(`/orders/details?order_number=${encodeURIComponent(result.order_number)}`);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setQuery('');
        setResults([]);
        setFocused(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const navLinks = [
    { name: 'Print Queue', href: '/dashboard', icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
    )},
    { name: 'Order Sheets', href: '/orders/print', icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 00-2 2h2m2 4h10a2 2 0 002-2v-3a2 2 0 00-2-2H5a2 2 0 00-2 2v3a2 2 0 002 2zm0 0v-9a2 2 0 012-2h6a2 2 0 012 2v9m-8-3h4" /></svg>
    )},
    { name: 'Import Wix', href: '/import', icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
    )},
    { name: 'Manual Order', href: '/orders/new', icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
    )},
    { name: 'Shipping Tool', href: '/shipping', icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
    )},
    { name: 'Vinyl Calc', href: '/vinyl-calculator', icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
    )},
    { name: 'Settings', href: '/settings', icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.756 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    )},
    ...((role === 'ADMIN' || role === 'MANAGER') ? [{ name: 'Manage Staff', href: '/admin/users', icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    )}, { name: 'Audit Log', href: '/admin/audit', icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
    )}] : [])
  ];

  const stageColors: Record<string, string> = {
    RECEIVED: 'bg-slate-100 text-slate-600',
    ORDERING: 'bg-amber-100 text-amber-700',
    PRINTING: 'bg-blue-100 text-blue-700',
    STAGING: 'bg-purple-100 text-purple-700',
    PRODUCTION: 'bg-orange-100 text-orange-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    ARCHIVED: 'bg-slate-100 text-slate-400',
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-background border-r border-slate-200 dark:border-slate-800 z-40 hidden md:block transition-colors">
      <div className="flex flex-col h-full p-6">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="h-10 w-10 bg-slate-900 dark:bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black italic shadow-lg shadow-slate-200 dark:shadow-none">P</div>
          <span className="font-black text-xl tracking-tighter uppercase italic text-foreground">PrintFrenzy</span>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleChange}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 200)}
              placeholder="Search orders..."
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[9px] font-bold text-slate-400">⌘K</kbd>
          </div>

          {/* Results dropdown */}
          {focused && query.trim().length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 max-h-80 overflow-y-auto">
              {searching && (
                <div className="px-4 py-6 text-center">
                  <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-[10px] font-bold text-slate-400">Searching...</p>
                </div>
              )}
              {!searching && results.length === 0 && (
                <div className="px-4 py-6 text-center">
                  <p className="text-[10px] font-bold text-slate-400">No results for "{query}"</p>
                </div>
              )}
              {!searching && results.map((result) => (
                <button
                  key={result.id}
                  onMouseDown={() => handleSelect(result)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-50 dark:border-slate-700/50 last:border-b-0 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black text-slate-900 dark:text-white">#{result.order_number}</span>
                    <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${stageColors[result.status] || 'bg-slate-100 text-slate-500'}`}>
                      {result.status}
                    </span>
                  </div>
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">{result.customer_name} — {result.product_name}</p>
                  {result.print_name && (
                    <p className="text-[9px] font-bold text-blue-500 mt-0.5 truncate">Print: {result.print_name}</p>
                  )}
                </button>
              ))}
            </div>
          )}
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
                    ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xl shadow-slate-200 dark:shadow-none scale-[1.02]' 
                    : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className={`${isActive ? 'text-blue-400 dark:text-white' : 'group-hover:text-blue-600'} transition-colors`}>
                  {link.icon}
                </div>
                <span className="text-[11px] font-black uppercase tracking-widest">{link.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
            {/* Theme Toggle */}
            <button 
                onClick={toggleTheme}
                className="flex items-center gap-4 px-4 py-4 w-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl transition-all group"
            >
                {theme === 'light' && <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 9H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                {theme === 'dark' && <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
                {theme.startsWith('polarized') && <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-2V4a8 8 0 110 16z" /></svg>}
                <span className="text-[11px] font-black uppercase tracking-widest">{theme.replace('-', ' ')} Mode</span>
            </button>

            <button 
                onClick={() => signOut()}
                className="flex items-center gap-4 px-4 py-4 w-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all group"
            >
                <svg className="h-5 w-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                <span className="text-[11px] font-black uppercase tracking-widest">Sign Out</span>
            </button>
        </div>
      </div>
    </aside>
  );
}
