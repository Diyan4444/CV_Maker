'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PRODUCT_NAME } from '@/config/app';
import { WARM_TOKENS, GLASS_TOKENS } from '@/styles/tokens';
import { FloatCard } from '@/components/ui/FloatCard';
import { GlassPanel } from '@/components/ui/GlassPanel';
import {
  FileText,
  User,
  Settings,
  Plus,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
  userEmail?: string;
  currentPath?: string;
}

const SIDEBAR_STORAGE_KEY = 'quillfolio_sidebar_collapsed';

export function AppShell({ children, userEmail, currentPath }: AppShellProps) {
  const pathname = usePathname() || currentPath || '';
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (saved === 'true') {
        queueMicrotask(() => setCollapsed(true));
      }
    } catch {
      // ignore storage access errors
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const navItems = [
    { href: '/dashboard', label: 'Documents', mobileLabel: 'Documents', icon: FileText },
    { href: '/profile', label: 'Master profile', mobileLabel: 'Profile', icon: User },
    { href: '/settings', label: 'Settings', mobileLabel: 'Settings', icon: Settings },
  ];

  const isRouteActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ color: GLASS_TOKENS.fg }}>
      {/* Desktop Inset Floating Left Sidebar (>= 768px) */}
      <FloatCard
        as="aside"
        floatIndex={0}
        aria-label="Workspace sidebar"
        data-collapsed={collapsed ? 'true' : 'false'}
        className={`hidden md:flex md:flex-col md:sticky md:top-4 md:m-4 md:mr-0 md:h-[calc(100vh-32px)] shrink-0 transition-[width] duration-150 motion-reduce:transition-none ${
          collapsed ? 'w-[72px]' : 'w-[232px]'
        }`}
      >
        <GlassPanel
          variant="frosted"
          className="h-full w-full flex flex-col justify-between"
        >
        <div className="p-3 space-y-4">
          {/* Wordmark + Collapse Toggle */}
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-2`}>
            {!collapsed && (
              <Link
                href="/dashboard"
                className="font-display text-xl font-bold tracking-tight px-2 min-h-[44px] inline-flex items-center rounded focus:outline-none focus:ring-2 focus:ring-[#FFFDF9]"
                style={{ color: GLASS_TOKENS.fg }}
              >
                {PRODUCT_NAME}
              </Link>
            )}
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-expanded={!collapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="btn-glass-secondary min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-[#FFFDF9]"
            >
              {collapsed ? (
                <PanelLeftOpen className="w-4 h-4" aria-hidden="true" />
              ) : (
                <PanelLeftClose className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Primary New Document Button */}
          <Link
            href="/dashboard?new=1"
            prefetch={true}
            title="New document"
            className={`min-h-[44px] rounded-lg font-semibold text-xs inline-flex items-center justify-center gap-2 transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-[#FFFDF9] ${
              collapsed ? 'w-full px-0' : 'w-full px-3'
            }`}
            style={{
              backgroundColor: WARM_TOKENS.primary,
              color: WARM_TOKENS.primaryText,
            }}
          >
            <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
            {!collapsed && <span>New document</span>}
          </Link>

          {/* Primary Navigation */}
          <nav aria-label="Main Navigation" className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isRouteActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  aria-current={active ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                  className={`min-h-[44px] rounded-lg text-xs font-semibold flex items-center gap-3 transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-[#FFFDF9] ${
                    collapsed ? 'justify-center px-0' : 'px-3'
                  }`}
                  style={{
                    backgroundColor: active ? GLASS_TOKENS.tileBgHover : 'transparent',
                    color: active ? GLASS_TOKENS.accentOnGlass : GLASS_TOKENS.fg,
                  }}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Account Block + Sign Out */}
        <div className="p-3 border-t glass-divider space-y-2">
          {userEmail && !collapsed && (
            <div
              className="px-2 py-1 text-[11px] font-medium truncate"
              style={{ color: GLASS_TOKENS.fgMuted }}
              title={userEmail}
            >
              {userEmail}
            </div>
          )}
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              title="Sign out"
              aria-label="Sign out"
              className={`btn-glass-secondary w-full min-h-[44px] rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-[#FFFDF9] ${
                collapsed ? 'justify-center px-0' : 'justify-start px-3'
              }`}
            >
              <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
              {!collapsed && <span>Sign out</span>}
            </button>
          </form>
        </div>
        </GlassPanel>
      </FloatCard>

      {/* Mobile Compact Top Bar (< 768px) */}
      <header
        data-glass-panel="true"
        data-glass-variant="frosted"
        className="glass-panel md:hidden sticky top-0 z-30 border-b px-3 py-2 flex items-center justify-between gap-2"
        style={{ borderRadius: 0 }}
      >
        <Link
          href="/dashboard"
          className="font-display text-lg font-bold tracking-tight min-h-[44px] inline-flex items-center px-1 rounded focus:outline-none focus:ring-2 focus:ring-[#FFFDF9]"
          style={{ color: GLASS_TOKENS.fg }}
        >
          {PRODUCT_NAME}
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard?new=1"
            className="min-h-[44px] px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#FFFDF9]"
            style={{
              backgroundColor: WARM_TOKENS.primary,
              color: WARM_TOKENS.primaryText,
            }}
          >
            <Plus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>New</span>
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              aria-label="Sign out"
              className="btn-glass-secondary min-h-[44px] min-w-[44px] px-2.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#FFFDF9]"
            >
              <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Sign out</span>
            </button>
          </form>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        <div className="max-w-[1680px] mx-auto w-full p-4 sm:p-6 md:p-8 pb-24 md:pb-8">
          {children}
        </div>
      </div>

      {/* Mobile Bottom Tab Bar (< 768px) */}
      <nav
        aria-label="Mobile Navigation"
        data-glass-panel="true"
        data-glass-variant="frosted"
        className="glass-panel md:hidden fixed bottom-0 inset-x-0 z-40 border-t flex items-center justify-around px-2"
        style={{
          borderRadius: 0,
          minHeight: '56px',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isRouteActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className="flex-1 min-h-[44px] py-1.5 flex flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-semibold focus:outline-none focus:ring-2 focus:ring-[#FFFDF9]"
              style={{
                color: active ? GLASS_TOKENS.accentOnGlass : GLASS_TOKENS.fgMuted,
                backgroundColor: active ? GLASS_TOKENS.tileBgHover : 'transparent',
              }}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{item.mobileLabel}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
