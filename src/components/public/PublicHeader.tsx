'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PRODUCT_NAME } from '@/config/app';
import { LogIn, Menu, X, ArrowRight } from 'lucide-react';

const NAV_LINKS = [
  { label: 'How it works', href: '/#how-it-works', sectionId: 'how-it-works' },
  { label: 'Templates', href: '/#templates', sectionId: 'templates' },
  { label: 'Backgrounds', href: '/#backgrounds', sectionId: 'backgrounds' },
  { label: 'FAQ', href: '/#faq', sectionId: 'faq' },
  { label: 'Privacy', href: '/privacy', sectionId: 'privacy' },
] as const;

export function PublicHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeHref, setActiveHref] = useState<string>(
    pathname === '/privacy' ? '/privacy' : '/#how-it-works'
  );
  const headerRef = useRef<HTMLElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const indicatorRef = useRef<HTMLSpanElement | null>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const currentRectRef = useRef<{ left: number; width: number } | null>(null);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const updateHeaderHeight = () => {
      const totalStickyBottom = Math.ceil(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--header-h', `${totalStickyBottom}px`);
    };

    updateHeaderHeight();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateHeaderHeight);
      observer.observe(el);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', updateHeaderHeight);
    return () => window.removeEventListener('resize', updateHeaderHeight);
  }, [mobileMenuOpen]);

  const moveIndicatorTo = useCallback((href: string) => {
    const navEl = navRef.current;
    const indicatorEl = indicatorRef.current;
    const targetEl = linkRefs.current[href];
    if (!navEl || !indicatorEl || !targetEl) return;
    if (window.innerWidth < 1024) return;
    if (!window.matchMedia('(hover: hover)').matches) return;

    const navRect = navEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const nextLeft = targetRect.left - navRect.left;
    const nextWidth = targetRect.width;
    if (nextWidth <= 0) return;

    const prev = currentRectRef.current;
    currentRectRef.current = { left: nextLeft, width: nextWidth };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const motionOff = document.documentElement.dataset.motion === 'off';

    indicatorEl.style.opacity = '1';
    indicatorEl.style.transformOrigin = 'left center';

    if (!prev || reduced || motionOff || typeof indicatorEl.animate !== 'function') {
      indicatorEl.style.transform = `translate3d(${nextLeft}px, 0, 0) scaleX(${nextWidth})`;
      return;
    }

    const spanLeft = Math.min(prev.left, nextLeft);
    const spanRight = Math.max(prev.left + prev.width, nextLeft + nextWidth);
    const spanWidth = Math.max(1, spanRight - spanLeft);
    const overshootLeft = nextLeft + (nextLeft >= prev.left ? 3 : -3);

    indicatorEl.getAnimations().forEach((a) => a.cancel());
    const anim = indicatorEl.animate(
      [
        {
          transform: `translate3d(${prev.left}px, 0, 0) scaleX(${prev.width})`,
          offset: 0,
        },
        {
          transform: `translate3d(${spanLeft}px, 0, 0) scaleX(${spanWidth})`,
          offset: 0.42,
        },
        {
          transform: `translate3d(${overshootLeft}px, 0, 0) scaleX(${nextWidth})`,
          offset: 0.8,
        },
        {
          transform: `translate3d(${nextLeft}px, 0, 0) scaleX(${nextWidth})`,
          offset: 1,
        },
      ],
      {
        duration: 450,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'forwards',
      }
    );
    anim.onfinish = () => {
      indicatorEl.style.transform = `translate3d(${nextLeft}px, 0, 0) scaleX(${nextWidth})`;
      anim.cancel();
    };
  }, []);

  // Scroll-spy for landing sections
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const sectionIds = ['how-it-works', 'templates', 'backgrounds', 'faq'];
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (elements.length === 0) {
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const href = `/#${visible[0].target.id}`;
          setActiveHref(href);
        }
      },
      { rootMargin: '-25% 0px -55% 0px', threshold: 0 }
    );

    elements.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    moveIndicatorTo(activeHref);
  }, [activeHref, moveIndicatorTo]);

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 w-full landing-glass border-b border-[#D8D0C5]"
    >
      <div className="max-w-[1680px] mx-auto w-full px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
        {/* Wordmark */}
        <Link
          href="/"
          className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#FFFDF9] min-h-[44px] inline-flex items-center focus:outline-none focus:ring-2 focus:ring-[#FFFDF9] rounded-md"
        >
          {PRODUCT_NAME}
        </Link>

        {/* Desktop Nav Links */}
        <nav
          ref={navRef}
          aria-label="Main Navigation"
          onMouseLeave={() => moveIndicatorTo(activeHref)}
          className="hidden md:flex items-center md:gap-2 lg:gap-6 relative min-w-0"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              ref={(el) => {
                linkRefs.current[link.href] = el;
              }}
              href={link.href}
              onMouseEnter={() => moveIndicatorTo(link.href)}
              onFocus={() => moveIndicatorTo(link.href)}
              onBlur={() => moveIndicatorTo(activeHref)}
              className={`text-xs lg:text-sm font-medium min-h-[44px] inline-flex items-center whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFFDF9] rounded-md px-1.5 lg:px-2 ${
                activeHref === link.href ? 'text-[var(--glass-accent)]' : 'text-[#FFFDF9] hover:text-[var(--glass-accent)]'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {/* Desktop >=1024px active-section indicator (transform-only WAAPI) */}
          <span
            ref={indicatorRef}
            id="nav-active-indicator"
            aria-hidden="true"
            style={{ width: '1px', opacity: 0 }}
            className="hidden lg:block pointer-events-none absolute bottom-1 left-0 h-[2px] bg-[var(--glass-accent)]"
          />
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="btn-glass-secondary inline-flex items-center gap-2 px-4 py-2 min-h-[44px] text-sm font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFFDF9] transition-colors"
          >
            <LogIn className="w-4 h-4 text-[var(--glass-accent)]" aria-hidden="true" />
            Sign in
          </Link>
          <Link
            href="/login"
            className="group inline-flex items-center gap-2 px-4 py-2 min-h-[44px] text-sm font-semibold text-[#FFFFFF] bg-[#800021] hover:bg-[#881144] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2 shadow-xs transition-colors"
          >
            <span>Get started</span>
            <ArrowRight
              className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none"
              aria-hidden="true"
            />
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-3 py-2 min-h-[44px] text-xs font-semibold text-[#FFFFFF] bg-[#800021] hover:bg-[#881144] rounded-md focus:outline-none focus:ring-2 focus:ring-[#800021]"
          >
            Sign in
          </Link>
          <button
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="btn-glass-secondary min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFFDF9]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown Panel */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-menu"
          className="md:hidden border-t glass-divider px-4 py-4 space-y-2 text-[#FFFDF9]"
        >
          <nav aria-label="Mobile Navigation" className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={handleLinkClick}
                className="text-sm font-medium text-[#24221F] hover:bg-[#EFE8DE] px-3 py-2 min-h-[44px] flex items-center rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="pt-2 border-t border-[#D8D0C5] flex flex-col gap-2">
            <Link
              href="/login"
              onClick={handleLinkClick}
              className="group w-full inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] text-sm font-semibold text-[#FFFFFF] bg-[#800021] hover:bg-[#881144] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800021]"
            >
              <span>Get started</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
