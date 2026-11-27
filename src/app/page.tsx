import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { PRODUCT_NAME } from '@/config/app';
import { BACKGROUND_GROUPS } from '@/config/onboarding/departments';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { Emph } from '@/components/ui/Emph';
import { HighlightShape } from '@/components/ui/HighlightShape';
import { FloatCard } from '@/components/ui/FloatCard';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import {
  ArrowRight,
  LogIn,
  CheckCircle2,
  ShieldCheck,
  Download,
  Trash2,
  Layers,
} from 'lucide-react';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: `${PRODUCT_NAME} — Master Profile, Resume & Academic CV Builder`,
  description:
    'Build one master profile, then shape it into a resume or an academic CV with live PDF preview and rule-based ATS checks.',
  openGraph: {
    title: `${PRODUCT_NAME} — Master Profile, Resume & Academic CV Builder`,
    description:
      'Build one master profile, then shape it into a resume or an academic CV with live PDF preview and rule-based ATS checks.',
    url: '/',
    siteName: PRODUCT_NAME,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: `${PRODUCT_NAME} Open Graph Preview`,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${PRODUCT_NAME} — Master Profile, Resume & Academic CV Builder`,
    description:
      'Build one master profile, then shape it into a resume or an academic CV with live PDF preview and rule-based ATS checks.',
    images: ['/og-image.png'],
  },
};

const SPECIMENS = [
  {
    id: 'ats_single_column',
    label: 'ATS SINGLE COLUMN',
    title: 'ATS Single Column',
    borderClass: 'border-l-[var(--glass-accent)]',
    description:
      'Linear single-column reading order designed for standard applicant tracking parsers and recruiter screening.',
    image: '/landing/ats_single_column.png',
    alt: 'ATS Single Column Resume Specimen for Alex Example rendered to A4 PDF',
  },
  {
    id: 'modern_professional',
    label: 'MODERN PROFESSIONAL',
    title: 'Modern Professional',
    borderClass: 'border-l-[var(--glass-accent)]',
    description:
      'Clean hierarchy with subtle accent bars and balanced spacing for industry engineering and management roles.',
    image: '/landing/modern_professional.png',
    alt: 'Modern Professional Resume Specimen for Alex Example rendered to A4 PDF',
  },
  {
    id: 'academic_cv',
    label: 'ACADEMIC CV',
    title: 'Academic CV',
    borderClass: 'border-l-[#8EB69B]',
    description:
      'Serif typography structured for multi-page academic dossiers, publications, grants, and teaching records.',
    image: '/landing/academic_cv.png',
    alt: 'Academic CV Specimen for Alex Example rendered to A4 PDF',
  },
];

const FAQ_ITEMS = [
  {
    tag: 'EXPORT FORMAT',
    question: 'What file format does Quillfolio export?',
    answer:
      'Documents export exclusively as standard A4 PDF files with selectable vector text. Word (.docx) export is not offered.',
  },
  {
    tag: 'ATS CHECKS',
    question: 'Do the ATS readiness checks guarantee interviews?',
    answer:
      'No. Checks are deterministic, rule-based structural heuristics (such as text extraction order, contact details, and split hyphens), not a score or hiring guarantee.',
  },
  {
    tag: 'TYPOGRAPHY',
    question: 'Which scripts are supported in PDF exports?',
    answer:
      'Currently supports Latin character sets via bundled Noto Sans and Noto Serif fonts. Non-Latin scripts are detected and omitted from compiled PDFs.',
  },
  {
    tag: 'DATA RIGHTS',
    question: 'Can I export or delete my account data?',
    answer:
      'Export your complete data as JSON at any time. Delete your account and everything is removed immediately and permanently. Data is never sold, shared with data brokers, or used to train third-party machine learning models.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between relative text-[#FFFDF9] font-sans selection:bg-[#FFE4D8] selection:text-[var(--glass-accent)]">
      {/* Skip to Content Accessible Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 bg-[#800021] text-[#FFFFFF] px-4 py-2 min-h-[44px] inline-flex items-center rounded-md font-semibold text-sm shadow-md focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2"
      >
        Skip to main content
      </a>

      {/* Full-Width Sticky Glass Header */}
      <PublicHeader />

      {/* Main Content Area (Asymmetric 12-col Grid, max 1680px, 4px spacing grid) */}
      <main
        id="main-content"
        className="max-w-[1680px] mx-auto w-full px-4 sm:px-8 py-8 sm:py-12 space-y-16 sm:space-y-24"
      >
        {/* HERO SECTION (Above the fold: never hidden) */}
        <section id="hero" aria-labelledby="hero-heading">
          <div className="landing-glass border glass-divider rounded-2xl p-6 sm:p-12 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-6">
                <h1
                  id="hero-heading"
                  className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#FFFDF9] leading-[1.15]"
                >
                  A resume builder for people who do the{' '}
                  <span className="relative inline-block">
                    <em className="font-display italic text-[var(--glass-accent)] font-semibold">real</em>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 120 14"
                      preserveAspectRatio="none"
                      className="pointer-events-none absolute left-0 -bottom-1 w-full h-3 overflow-visible"
                    >
                      <path
                        d="M 2 9 Q 34 3, 64 8 T 118 6"
                        fill="none"
                        stroke="var(--glass-accent)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>{' '}
                  work.
                </h1>

                <p className="text-base sm:text-xl text-[#FFFDF9] max-w-[70ch] leading-relaxed">
                  Build one master profile, then shape it into a resume or an academic CV.
                </p>

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  <Link
                    href="/login"
                    className="group inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] bg-[#800021] hover:bg-[#881144] text-[#FFFFFF] font-semibold text-sm rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2 transition-colors"
                  >
                    <span>Get started</span>
                    <ArrowRight
                      className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none"
                      aria-hidden="true"
                    />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] btn-glass-secondary font-semibold text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2 transition-colors"
                  >
                    <LogIn className="w-4 h-4 text-[var(--glass-accent)]" aria-hidden="true" />
                    <span>Sign in</span>
                  </Link>
                </div>

                <div className="pt-4 border-t glass-divider space-y-2 max-w-[70ch]">
                  <p className="text-xs text-[#FFFDF9]">
                    <strong>Self-Serve Data Rights:</strong> Complete JSON export and instant one-click account deletion at any time.
                  </p>
                  <p className="text-xs text-[var(--glass-fg-muted)]">
                    Plain limitations: Documents export exclusively as standard PDF files. Non-Latin scripts are not rendered in PDFs yet. ATS checks are rule-based structural heuristics, not a score or a guarantee.
                  </p>
                </div>
              </div>

              <div className="lg:col-span-5">
                <FloatCard floatIndex={0}>
                  <div className="card-lift-inner glass-tile border-l-4 border-l-[var(--glass-accent)] rounded-xl p-6 shadow-xs space-y-4">
                    <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-[var(--glass-accent)]">
                      SINGLE-COLUMN A4 SPECIMEN
                    </span>
                    <div className="relative w-full aspect-[3/4] max-h-[380px] rounded-lg overflow-hidden border glass-divider bg-[#FFFFFF]">
                      <Image
                        src="/landing/ats_single_column.png"
                        alt="ATS Single Column Resume Specimen for Alex Example"
                        fill
                        sizes="(max-width: 1024px) 100vw, 480px"
                        className="object-cover object-top"
                        priority
                      />
                    </div>
                    <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--glass-fg-muted)]">
                      SAMPLE WITH FICTIONAL DATA &middot; SELECTABLE VECTOR TEXT
                    </p>
                  </div>
                </FloatCard>
              </div>
            </div>
          </div>
        </section>

        {/* 01. HOW IT WORKS */}
        <ScrollReveal>
          <section
            id="how-it-works"
            aria-labelledby="how-it-works-heading"
            className="scroll-mt-[calc(var(--header-h,84px)+16px)]"
          >
            <div className="landing-glass border glass-divider rounded-2xl p-6 sm:p-10 shadow-sm space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-4 space-y-3">
                  <span className="font-mono text-xs font-bold text-[var(--glass-accent)]">01</span>
                  <h2
                    id="how-it-works-heading"
                    className="font-display text-2xl sm:text-4xl font-bold text-[#FFFDF9]"
                  >
                    <Emph headingKey="how_it_works" />
                  </h2>
                </div>
                <div className="lg:col-span-8 space-y-3 max-w-[70ch]">
                  <p className="text-sm sm:text-base text-[#FFFDF9] leading-relaxed">
                    Your{' '}
                    <HighlightShape variant="pill" fill="accentSoft" rotate={-1.8}>
                      master profile
                    </HighlightShape>{' '}
                    stores verified education, experience, projects, publications, and credentials once. Each resume or academic CV starts as an isolated copy you can tailor without overwriting your source records.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <ScrollReveal staggerIndex={1} className="md:col-span-4">
                  <FloatCard floatIndex={1}>
                    <div className="card-lift-inner glass-tile border-l-4 border-l-[var(--glass-accent)] rounded-xl p-6 space-y-3 h-full">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--glass-accent)]">
                        STEP 01 &middot; MASTER PROFILE
                      </span>
                      <h3 className="font-display text-lg font-bold text-[#FFFDF9]">
                        Maintain one source of truth
                      </h3>
                      <p className="text-xs sm:text-sm text-[var(--glass-fg-muted)] leading-relaxed max-w-[70ch]">
                        Store degrees, roles, publications, and skills once in structured PostgreSQL tables with row-level security.
                      </p>
                    </div>
                  </FloatCard>
                </ScrollReveal>

                <ScrollReveal staggerIndex={2} className="md:col-span-4">
                  <FloatCard floatIndex={2}>
                    <div className="card-lift-inner glass-tile border-l-4 border-l-[var(--glass-accent)] rounded-xl p-6 space-y-3 h-full">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--glass-accent)]">
                        STEP 02 &middot; ISOLATED COPIES
                      </span>
                      <h3 className="font-display text-lg font-bold text-[#FFFDF9]">
                        Shape each target document
                      </h3>
                      <p className="text-xs sm:text-sm text-[var(--glass-fg-muted)] leading-relaxed max-w-[70ch]">
                        Reorder sections, hide irrelevant entries, adjust A4 typography and margins, and import missing items on demand.
                      </p>
                    </div>
                  </FloatCard>
                </ScrollReveal>

                <ScrollReveal staggerIndex={3} className="md:col-span-4">
                  <FloatCard floatIndex={3}>
                    <div className="card-lift-inner glass-tile border-l-4 border-l-[#8EB69B] rounded-xl p-6 space-y-3 h-full">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8EB69B]">
                        STEP 03 &middot; PDF &amp; CHECKS
                      </span>
                      <h3 className="font-display text-lg font-bold text-[#FFFDF9]">
                        Verify before downloading
                      </h3>
                      <p className="text-xs sm:text-sm text-[var(--glass-fg-muted)] leading-relaxed max-w-[70ch]">
                        Inspect the live A4 canvas alongside 13 deterministic ATS readiness checks that verify extracted PDF text order.
                      </p>
                    </div>
                  </FloatCard>
                </ScrollReveal>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* 02. RENDERED TEMPLATE SPECIMENS */}
        <ScrollReveal>
          <section
            id="templates"
            aria-labelledby="templates-heading"
            className="scroll-mt-[calc(var(--header-h,84px)+16px)]"
          >
            <div className="landing-glass border glass-divider rounded-2xl p-6 sm:p-10 shadow-sm space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-4 space-y-3">
                  <span className="font-mono text-xs font-bold text-[var(--glass-accent)]">02</span>
                  <h2
                    id="templates-heading"
                    className="font-display text-2xl sm:text-4xl font-bold text-[#FFFDF9]"
                  >
                    <Emph headingKey="templates" />
                  </h2>
                </div>
                <div className="lg:col-span-8 max-w-[70ch]">
                  <p className="text-sm sm:text-base text-[#FFFDF9] leading-relaxed">
                    Every specimen below is rendered directly to{' '}
                    <HighlightShape variant="ribbon" fill="readyBg" rotate={1.6}>
                      A4 vector PDF
                    </HighlightShape>{' '}
                    using the exact same typography engine used in the editor.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {SPECIMENS.map((spec, idx) => (
                  <ScrollReveal key={spec.id} staggerIndex={idx + 1} className="md:col-span-4">
                    <FloatCard floatIndex={idx + 4}>
                      <div
                        className={`card-lift-inner glass-tile border-l-4 ${spec.borderClass} rounded-xl p-6 space-y-4 h-full flex flex-col`}
                      >
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--glass-accent)]">
                          {spec.label}
                        </span>
                        <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden border glass-divider bg-[#FFFFFF]">
                          <Image
                            src={spec.image}
                            alt={spec.alt}
                            fill
                            sizes="(max-width: 768px) 100vw, 380px"
                            className="object-cover object-top"
                          />
                        </div>
                        <div className="space-y-2">
                          <h3 className="font-display text-lg font-bold text-[#FFFDF9]">
                            {spec.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-[var(--glass-fg-muted)] leading-relaxed">
                            {spec.description}
                          </p>
                        </div>
                      </div>
                    </FloatCard>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* 03. FIVE DISCIPLINES */}
        <ScrollReveal>
          <section
            id="backgrounds"
            aria-labelledby="backgrounds-heading"
            className="scroll-mt-[calc(var(--header-h,84px)+16px)]"
          >
            <div className="landing-glass border glass-divider rounded-2xl p-6 sm:p-10 shadow-sm space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-4 space-y-3">
                  <span className="font-mono text-xs font-bold text-[var(--glass-accent)]">03</span>
                  <h2
                    id="backgrounds-heading"
                    className="font-display text-2xl sm:text-4xl font-bold text-[#FFFDF9]"
                  >
                    <Emph headingKey="backgrounds" />
                  </h2>
                </div>
                <div className="lg:col-span-8 max-w-[70ch]">
                  <p className="text-sm sm:text-base text-[#FFFDF9] leading-relaxed">
                    Onboarding adapts section defaults to your background group, or lets you choose Other (type your own) for custom fields.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6">
                {BACKGROUND_GROUPS.map((group, idx) => (
                  <ScrollReveal
                    key={group.id}
                    staggerIndex={idx + 1}
                    className={idx < 2 ? 'lg:col-span-6' : 'lg:col-span-4'}
                  >
                    <FloatCard floatIndex={idx + 7}>
                      <div className="card-lift-inner glass-tile border-l-4 border-l-[var(--glass-accent)] rounded-xl p-6 space-y-2 h-full">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--glass-accent)]">
                          DISCIPLINE 0{idx + 1}
                        </span>
                        <h3 className="font-display text-base font-bold text-[#FFFDF9]">
                          {group.label}
                        </h3>
                        <p className="text-xs text-[var(--glass-fg-muted)] leading-relaxed">
                          {group.specializations.slice(0, 4).join(' · ')}
                          {group.specializations.length > 4 ? ' · Other (type your own)' : ''}
                        </p>
                      </div>
                    </FloatCard>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* 04. PLAIN ANSWERS & LIMITS */}
        <ScrollReveal>
          <section
            id="faq"
            aria-labelledby="faq-heading"
            className="scroll-mt-[calc(var(--header-h,84px)+16px)]"
          >
            <div className="landing-glass border glass-divider rounded-2xl p-6 sm:p-10 shadow-sm space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-4 space-y-3">
                  <span className="font-mono text-xs font-bold text-[var(--glass-accent)]">04</span>
                  <h2
                    id="faq-heading"
                    className="font-display text-2xl sm:text-4xl font-bold text-[#FFFDF9]"
                  >
                    <Emph headingKey="faq" />
                  </h2>
                </div>
                <div className="lg:col-span-8 max-w-[70ch]">
                  <p className="text-sm sm:text-base text-[#FFFDF9] leading-relaxed">
                    What Quillfolio does today, what it{' '}
                    <HighlightShape variant="hexagon" fill="blush" rotate={-1.6}>
                      does not do
                    </HighlightShape>{' '}
                    and how your data is handled.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {FAQ_ITEMS.map((item, idx) => (
                  <ScrollReveal key={item.tag} staggerIndex={idx + 1} className="md:col-span-6">
                    <div className="card-lift-inner glass-tile border-l-4 border-l-[#8EB69B] rounded-xl p-6 space-y-2 h-full">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8EB69B]">
                        {item.tag}
                      </span>
                      <h3 className="font-display text-base font-bold text-[#FFFDF9]">
                        {item.question}
                      </h3>
                      <p className="text-xs sm:text-sm text-[var(--glass-fg-muted)] leading-relaxed max-w-[70ch]">
                        {item.answer}
                      </p>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* 05. PLANNED */}
        <ScrollReveal>
          <section id="coming-next" aria-labelledby="planned-heading">
            <div className="landing-glass border glass-divider rounded-2xl p-6 sm:p-10 shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-4 space-y-3">
                  <span className="font-mono text-xs font-bold text-[var(--glass-accent)]">05</span>
                  <h2
                    id="planned-heading"
                    className="font-display text-2xl sm:text-3xl font-bold text-[#FFFDF9]"
                  >
                    Planned: More templates
                  </h2>
                </div>
                <div className="lg:col-span-8">
                  <div className="glass-tile border-l-4 border-l-[var(--glass-accent)] rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2 max-w-[70ch]">
                      <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--glass-accent)]">
                        <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                        COMING NEXT
                      </span>
                      <p className="text-xs sm:text-sm text-[#FFFDF9] leading-relaxed">
                        Additional single-column resume and academic CV layouts are planned while keeping all existing PDF and ATS guarantees intact.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--glass-fg-muted)]">
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4 text-[#8EB69B]" aria-hidden="true" />
                        <span>RLS isolated</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Download className="w-4 h-4 text-[#8EB69B]" aria-hidden="true" />
                        <span>JSON export</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Trash2 className="w-4 h-4 text-[#8EB69B]" aria-hidden="true" />
                        <span>Instant delete</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-[#8EB69B]" aria-hidden="true" />
                        <span>A4 PDF</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>
      </main>

      <PublicFooter />
    </div>
  );
}
