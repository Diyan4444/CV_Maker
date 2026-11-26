'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PRODUCT_NAME } from '@/config/app';
import { Menu, X, LogOut, LayoutDashboard, User, Settings } from 'lucide-react';

interface AppHeaderProps {
  currentPath?: string;
}

export function AppHeader({ currentPath }: AppHeaderProps) {
  const pathname = usePathname() || currentPath || '';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const links = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/profile', label: 'Master Profile', icon: User },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="max-w-6xl mx-auto w-full mb-6 relative z-30">
      <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl shadow-sm px-6 py-3.5 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="font-display text-xl font-bold tracking-tight text-[#0B0B0B] hover:text-[#800021] focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2 rounded min-h-[44px] inline-flex items-center"
          >
            {PRODUCT_NAME}
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden sm:flex items-center gap-2 text-xs font-semibold" aria-label="Main Navigation">
            {links.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-1 ${
                    isActive
                      ? 'bg-[#FFE4D8] text-[#800021] font-bold'
                      : 'text-[#333333] hover:text-[#0B0B0B] hover:bg-[#F1F7F7]'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Desktop Sign Out & Mobile Toggle */}
        <div className="flex items-center gap-3">
          <form action="/auth/signout" method="post" className="hidden sm:block">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#333333] hover:text-[#0B0B0B] hover:bg-[#F1F7F7] border border-[#6B6B6B] rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-1"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </form>

          {/* Mobile Menu Disclosure Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-menu"
            aria-label="Toggle navigation menu"
            className="sm:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md border border-[#6B6B6B] text-[#0B0B0B] hover:bg-[#F1F7F7] focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown Panel */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-menu"
          className="sm:hidden mt-2 bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl shadow-lg p-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <nav className="flex flex-col gap-1 text-sm" aria-label="Mobile Navigation">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#FFE4D8] text-[#800021] font-bold'
                      : 'text-[#0B0B0B] hover:bg-[#F1F7F7]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="pt-2 border-t border-[#6B6B6B]">
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#800021] hover:bg-[#FFE4D8] rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out of account
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
