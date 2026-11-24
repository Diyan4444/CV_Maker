'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PRODUCT_NAME } from '@/config/app';
import { LogIn, Menu, X } from 'lucide-react';

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Templates', href: '#templates' },
    { label: 'Backgrounds', href: '#backgrounds' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Privacy', href: '/privacy' },
  ];

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-4 z-40 max-w-6xl mx-auto w-full px-4 sm:px-6">
      <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl px-4 sm:px-6 py-3 shadow-xs flex items-center justify-between">
        {/* Wordmark */}
        <Link
          href="/"
          className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#0B0B0B] min-h-[44px] inline-flex items-center focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2 rounded-md"
        >
          {PRODUCT_NAME}
        </Link>

        {/* Desktop Nav Links */}
        <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[#1A1A1A] hover:text-[#800021] min-h-[44px] inline-flex items-center transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2 rounded-md px-1"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] text-sm font-semibold text-[#0B0B0B] bg-[#FFFFFF] border border-[#6B6B6B] rounded-lg hover:bg-[#F1F7F7] focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2 transition-colors"
          >
            <LogIn className="w-4 h-4 text-[#800021]" />
            Sign in
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] text-sm font-semibold text-[#FFFFFF] bg-[#800021] hover:bg-[#881144] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2 shadow-xs transition-colors"
          >
            Get started
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-3 py-1.5 min-h-[44px] text-xs font-semibold text-[#FFFFFF] bg-[#800021] hover:bg-[#881144] rounded-md focus:outline-none focus:ring-2 focus:ring-[#800021]"
          >
            Sign in
          </Link>
          <button
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] hover:bg-[#F1F7F7] focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown Panel */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-menu"
          className="md:hidden mt-2 bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-4 shadow-md space-y-2"
        >
          <nav aria-label="Mobile Navigation" className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={handleLinkClick}
                className="text-sm font-medium text-[#0B0B0B] hover:bg-[#F1F7F7] px-3 py-2.5 min-h-[44px] flex items-center rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="pt-2 border-t border-[#6B6B6B] flex flex-col gap-2">
            <Link
              href="/login"
              onClick={handleLinkClick}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] text-sm font-semibold text-[#FFFFFF] bg-[#800021] hover:bg-[#881144] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800021]"
            >
              Get started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
