import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { PRODUCT_NAME } from '@/config/app';
import { BACKGROUND_GROUPS } from '@/config/onboarding/departments';
import { OPERATOR_NAME, CONTACT_EMAIL, DATABASE_REGION_LABEL } from '@/config/legal';
import { LandingHeader } from '@/components/landing/LandingHeader';
import {
  ArrowRight,
  LogIn,
  CheckCircle2,
  ShieldCheck,
  Download,
  Trash2,
} from 'lucide-react';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: `${PRODUCT_NAME} — Master Profile, Resume & Academic CV Builder`,
  description:
    'Build one master profile, then generate targeted resumes and detailed academic CVs with live PDF preview and rule-based ATS checks.',
  openGraph: {
    title: `${PRODUCT_NAME} — Master Profile, Resume & Academic CV Builder`,
    description:
      'Build one master profile, then generate targeted resumes and detailed academic CVs with live PDF preview and rule-based ATS checks.',
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
      'Build one master profile, then generate targeted resumes and detailed academic CVs with live PDF preview and rule-based ATS checks.',
    images: ['/og-image.png'],
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between relative text-[#0B0B0B] font-sans selection:bg-[#FFE4D8] selection:text-[#800021]">
      {/* Skip to Content Accessible Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 bg-[#800021] text-[#FFFFFF] px-4 py-2 min-h-[44px] inline-flex items-center rounded-md font-semibold text-sm shadow-md focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2"
      >
        Skip to main content
      </a>

      {/* Editorial Sticky Header */}
      <LandingHeader />

      {/* Main Content Area */}
      <main id="main-content" className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-16 sm:space-y-24">
        
        {/* 1. HERO SECTION */}
        <section id="hero" aria-labelledby="hero-heading" className="space-y-6">
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-2xl p-6 sm:p-12 shadow-sm space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFE4D8] text-[#800021] text-xs font-semibold tracking-wide uppercase border border-[#800021]">
              Master Profile &bull; Targeted Resumes &bull; Academic CVs
            </div>

            <h1
              id="hero-heading"
              className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#0B0B0B] leading-[1.15]"
            >
              Build one profile, produce a resume or academic CV.
            </h1>

            <p className="text-base sm:text-xl text-[#1A1A1A] max-w-3xl leading-relaxed">
              Build your master profile once, then generate targeted resumes and detailed academic CVs with a live preview and rule-based ATS checks.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] bg-[#800021] hover:bg-[#881144] text-[#FFFFFF] font-semibold text-sm rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2 transition-colors"
              >
                Get started
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] bg-[#FFFFFF] border border-[#6B6B6B] text-[#0B0B0B] hover:bg-[#F1F7F7] font-semibold text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2 transition-colors"
              >
                <LogIn className="w-4 h-4 text-[#800021]" />
                Sign in
              </Link>
            </div>

            <div className="pt-4 border-t border-[#6B6B6B] space-y-2">
              <p className="text-xs text-[#333333]">
                <strong className="text-[#0B0B0B]">Self-Serve Data Rights:</strong> Complete JSON export and instant one-click account deletion at any time.
              </p>
              <p className="text-xs text-[#6B6B6B]">
                Plain limitations: Documents export exclusively as standard PDF files. Currently supports Latin character sets. Readiness checks are rule-based structural heuristics, not an automated score or hiring guarantee.
              </p>
            </div>
          </div>
        </section>

        {/* 2. TEMPLATE SPECIMENS */}
        <section id="templates" aria-labelledby="templates-heading" className="space-y-6">
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-2xl p-6 sm:p-8 shadow-sm space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#F1F7F7] text-[#0B0B0B] text-xs font-semibold uppercase tracking-wider border border-[#6B6B6B]">
              Document Formats
            </div>
            <h2 id="templates-heading" className="font-display text-2xl sm:text-4xl font-bold text-[#0B0B0B]">
              Real Rendered Template Specimens
            </h2>
            <p className="text-sm sm:text-base text-[#333333]">
              Sample with fictional data. Rendered directly from production react-pdf layouts and verified under 150 KB.
            </p>
          </div>

          {/* Asymmetric editorial specimen presentation */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Featured Left Specimen: ATS Single Column */}
            <div className="lg:col-span-7 bg-[#FFFFFF] border border-[#6B6B6B] rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#6B6B6B] pb-3">
                <div>
                  <h3 className="font-display text-xl font-bold text-[#0B0B0B]">ATS Single Column</h3>
                  <p className="text-xs text-[#6B6B6B]">Primary format for corporate and industry applications</p>
                </div>
                <span className="text-xs px-2.5 py-1 bg-[#F1F7F7] text-[#0B0B0B] border border-[#6B6B6B] rounded-full font-medium">
                  Verified ATS-Friendly
                </span>
              </div>
              <div className="relative w-full aspect-[595/842] max-w-lg mx-auto bg-[#F1F7F7] border border-[#6B6B6B] rounded-lg overflow-hidden shadow-xs">
                <Image
                  src="/landing/ats_single_column.png"
                  alt="Sample ATS Single Column resume specimen for fictional candidate Alex Example"
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              </div>
              <p className="text-xs sm:text-sm text-[#1A1A1A] leading-relaxed pt-2 border-t border-[#6B6B6B]">
                Single-column layout with no tables, images, or graphic icons for direct text parsing by applicant tracking systems.
              </p>
            </div>

            {/* Stacked Right Specimens: Modern Professional & Academic CV */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              {/* Modern Professional */}
              <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-[#6B6B6B] pb-2">
                  <h3 className="font-display text-lg font-bold text-[#0B0B0B]">Modern Professional</h3>
                  <span className="text-xs px-2 py-0.5 bg-[#FFE4D8] text-[#800021] border border-[#800021] rounded-full font-medium">
                    Accent Dividers
                  </span>
                </div>
                <div className="relative w-full aspect-[595/842] max-h-72 bg-[#F1F7F7] border border-[#6B6B6B] rounded-lg overflow-hidden shadow-xs">
                  <Image
                    src="/landing/modern_professional.png"
                    alt="Sample Modern Professional resume specimen for fictional candidate Alex Example"
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 35vw"
                  />
                </div>
                <p className="text-xs text-[#1A1A1A] leading-relaxed pt-1 border-t border-[#6B6B6B]">
                  Structured section layout with subtle wine-tone divider rules and clean hierarchy, without floating boxes or background graphics.
                </p>
              </div>

              {/* Academic CV */}
              <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-[#6B6B6B] pb-2">
                  <h3 className="font-display text-lg font-bold text-[#0B0B0B]">Academic CV</h3>
                  <span className="text-xs px-2 py-0.5 bg-[#F1F7F7] text-[#0B0B0B] border border-[#6B6B6B] rounded-full font-medium">
                    Multi-Page Record
                  </span>
                </div>
                <div className="relative w-full aspect-[595/842] max-h-72 bg-[#F1F7F7] border border-[#6B6B6B] rounded-lg overflow-hidden shadow-xs">
                  <Image
                    src="/landing/academic_cv.png"
                    alt="Sample Academic CV specimen for fictional candidate Alex Example"
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 35vw"
                  />
                </div>
                <p className="text-xs text-[#1A1A1A] leading-relaxed pt-1 border-t border-[#6B6B6B]">
                  Multi-page academic record format with formal serif headings, dedicated publications, teaching, and research sections.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. HOW IT WORKS */}
        <section id="how-it-works" aria-labelledby="how-it-works-heading" className="space-y-6">
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-2xl p-6 sm:p-8 shadow-sm space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#F1F7F7] text-[#0B0B0B] text-xs font-semibold uppercase tracking-wider border border-[#6B6B6B]">
              Workflow
            </div>
            <h2 id="how-it-works-heading" className="font-display text-2xl sm:text-4xl font-bold text-[#0B0B0B]">
              How It Works
            </h2>
            <p className="text-sm sm:text-base text-[#333333]">
              Four deliberate steps from your academic background to a clean, downloadable document.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step 1 */}
            <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col justify-between">
              <div>
                <span className="font-display text-4xl sm:text-5xl font-bold text-[#800021] block mb-3">01</span>
                <h3 className="font-display text-xl font-bold text-[#0B0B0B] mb-2">Choose your background</h3>
                <p className="text-sm text-[#1A1A1A] leading-relaxed">
                  Select your academic department or professional domain during onboarding to configure relevant section fields.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#6B6B6B] text-xs text-[#6B6B6B]">
                Configures suggestions for engineering, commerce, humanities, sciences, or custom disciplines.
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col justify-between">
              <div>
                <span className="font-display text-4xl sm:text-5xl font-bold text-[#800021] block mb-3">02</span>
                <h3 className="font-display text-xl font-bold text-[#0B0B0B] mb-2">Fill your master profile once</h3>
                <p className="text-sm text-[#1A1A1A] leading-relaxed">
                  Enter your education, experience, skills, and publications in a single central profile.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#6B6B6B] text-xs text-[#6B6B6B]">
                Your central career record persists so you never need to retype dates or bullets.
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col justify-between">
              <div>
                <span className="font-display text-4xl sm:text-5xl font-bold text-[#800021] block mb-3">03</span>
                <h3 className="font-display text-xl font-bold text-[#0B0B0B] mb-2">Build and edit with a live preview</h3>
                <p className="text-sm text-[#1A1A1A] leading-relaxed">
                  Create independent document copies, toggle sections, adjust margins and typography, and see updates in real time.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#6B6B6B] text-xs text-[#6B6B6B]">
                Client-side PDF rendering shows the precise output before you export.
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col justify-between">
              <div>
                <span className="font-display text-4xl sm:text-5xl font-bold text-[#800021] block mb-3">04</span>
                <h3 className="font-display text-xl font-bold text-[#0B0B0B] mb-2">Run readiness checks and download PDF</h3>
                <p className="text-sm text-[#1A1A1A] leading-relaxed">
                  Run rule-based formatting checks and export a standards-compliant PDF file.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#6B6B6B] text-xs text-[#6B6B6B]">
                Direct download with embedded fonts and extractable plain text.
              </div>
            </div>
          </div>
        </section>

        {/* 4. BACKGROUND-AWARE STRUCTURE */}
        <section id="backgrounds" aria-labelledby="backgrounds-heading" className="space-y-6">
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-2xl p-6 sm:p-8 shadow-sm space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#F1F7F7] text-[#0B0B0B] text-xs font-semibold uppercase tracking-wider border border-[#6B6B6B]">
              Disciplinary Alignment
            </div>
            <h2 id="backgrounds-heading" className="font-display text-2xl sm:text-4xl font-bold text-[#0B0B0B]">
              Background-Aware Structure
            </h2>
            <p className="text-sm sm:text-base text-[#333333]">
              Rendered directly from application configuration. Section suggestions adapt to your domain while remaining fully customizable.
            </p>
          </div>

          <div className="space-y-6">
            {/* 5 Background Groups from config */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {BACKGROUND_GROUPS.map((group) => (
                <div
                  key={group.id}
                  className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-2xl p-6 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#0B0B0B] mb-3 pb-2 border-b border-[#6B6B6B]">
                      {group.label}
                    </h3>
                    <ul className="space-y-1.5 text-xs text-[#1A1A1A]">
                      {group.specializations.map((spec) => (
                        <li key={spec} className="flex items-start gap-1.5">
                          <span className="text-[#800021] font-bold">&bull;</span>
                          <span>{spec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#6B6B6B] text-[11px] text-[#6B6B6B]">
                    {group.specializations.length} configured disciplines
                  </div>
                </div>
              ))}

              {/* Other (type your own) Card */}
              <div className="bg-[#FFE4D8] border border-[#800021] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-[#800021] mb-3 pb-2 border-b border-[#800021]">
                    Other (type your own)
                  </h3>
                  <p className="text-xs text-[#0B0B0B] leading-relaxed mb-3">
                    If your discipline, vocational program, or interdisciplinary career is not listed in the standard department catalog, Quillfolio allows you to type your custom domain.
                  </p>
                  <ul className="space-y-1.5 text-xs text-[#1A1A1A]">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#800021] shrink-0" />
                      <span>Custom academic faculties</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#800021] shrink-0" />
                      <span>Specialized vocational trades</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#800021] shrink-0" />
                      <span>Cross-functional industry tracks</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-4 pt-3 border-t border-[#800021] text-[11px] text-[#800021] font-semibold">
                  Extensible onboarding architecture
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. READINESS CHECKS */}
        <section id="readiness-checks" aria-labelledby="readiness-heading" className="space-y-6">
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-2xl p-6 sm:p-10 shadow-sm space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#F1F7F7] text-[#0B0B0B] text-xs font-semibold uppercase tracking-wider border border-[#6B6B6B]">
                Verification Invariants
              </div>
              <h2 id="readiness-heading" className="font-display text-2xl sm:text-4xl font-bold text-[#0B0B0B]">
                What the Readiness Checks Are
              </h2>
            </div>

            {/* Explicit Honest Disclaimer matching in-app text */}
            <div className="bg-[#F1F7F7] border border-[#6B6B6B] rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#0B0B0B]">
                <ShieldCheck className="w-4 h-4 text-[#800021]" />
                Honest Structural Disclaimer
              </div>
              <p className="text-xs sm:text-sm text-[#1A1A1A] leading-relaxed">
                Readiness checks are rule-based heuristics to catch common formatting and structural omissions before submission. They are not an official ATS score, and no automated tool can guarantee an interview or job offer.
              </p>
            </div>

            {/* Checklist of what is covered */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 border border-[#6B6B6B] rounded-xl bg-[#FFFFFF] space-y-1.5">
                <h3 className="font-display text-base font-bold text-[#0B0B0B] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#800021]" />
                  Contact Information Completeness
                </h3>
                <p className="text-xs text-[#333333]">
                  Verifies full name, phone number, email address, and location are present in the document header.
                </p>
              </div>

              <div className="p-4 border border-[#6B6B6B] rounded-xl bg-[#FFFFFF] space-y-1.5">
                <h3 className="font-display text-base font-bold text-[#0B0B0B] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#800021]" />
                  Experience Chronology & Details
                </h3>
                <p className="text-xs text-[#333333]">
                  Checks for reverse-chronological ordering, organization names, dates, and actionable bullet descriptions.
                </p>
              </div>

              <div className="p-4 border border-[#6B6B6B] rounded-xl bg-[#FFFFFF] space-y-1.5">
                <h3 className="font-display text-base font-bold text-[#0B0B0B] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#800021]" />
                  Education Verification Fields
                </h3>
                <p className="text-xs text-[#333333]">
                  Confirms academic institution name, degree title, and graduation year or date range are specified.
                </p>
              </div>

              <div className="p-4 border border-[#6B6B6B] rounded-xl bg-[#FFFFFF] space-y-1.5">
                <h3 className="font-display text-base font-bold text-[#0B0B0B] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#800021]" />
                  Typography & Layout Standards
                </h3>
                <p className="text-xs text-[#333333]">
                  Ensures margins, line spacing, and font hierarchies conform to standard A4/Letter readability limits.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. YOUR DATA */}
        <section id="your-data" aria-labelledby="your-data-heading" className="space-y-6">
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-2xl p-6 sm:p-10 shadow-sm space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#FFE4D8] text-[#800021] text-xs font-semibold uppercase tracking-wider border border-[#800021]">
                Ownership & Privacy
              </div>
              <h2 id="your-data-heading" className="font-display text-2xl sm:text-4xl font-bold text-[#0B0B0B]">
                Your Data
              </h2>
            </div>

            <p className="text-sm sm:text-base text-[#1A1A1A] leading-relaxed max-w-3xl">
              You own all data you enter into Quillfolio. Export your complete data as machine-readable JSON at any time. If you delete your account, all profiles, documents, and database records are immediately and permanently removed via database cascade.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 border border-[#6B6B6B] rounded-xl bg-[#F1F7F7] space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-[#0B0B0B]">
                  <Download className="w-4 h-4 text-[#800021]" />
                  Machine-Readable Export
                </div>
                <p className="text-xs text-[#333333]">
                  Download all your profiles, documents, and sections in standard JSON format from your account settings.
                </p>
              </div>

              <div className="p-5 border border-[#6B6B6B] rounded-xl bg-[#F1F7F7] space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-[#0B0B0B]">
                  <Trash2 className="w-4 h-4 text-[#800021]" />
                  Permanent Account Deletion
                </div>
                <p className="text-xs text-[#333333]">
                  Self-serve account deletion requires recent sign-in verification and immediately purges all database records.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/privacy"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#800021] hover:text-[#881144] min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[#800021] rounded-md"
              >
                Read our full Privacy Policy & Data Rights
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* 7. COMING NEXT */}
        <section id="coming-next" aria-labelledby="coming-next-heading" className="space-y-4">
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-2xl p-6 sm:p-8 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-[#F1F7F7] text-[#0B0B0B] border border-[#6B6B6B] rounded-full">
                coming next
              </span>
            </div>
            <h2 id="coming-next-heading" className="font-display text-2xl font-bold text-[#0B0B0B]">
              Personal Portfolio Website
            </h2>
            <p className="text-sm text-[#333333] max-w-2xl leading-relaxed">
              A clean, responsive public web portfolio generated directly from your master profile. Not yet released—currently in active development.
            </p>
          </div>
        </section>

        {/* 8. FAQ */}
        <section id="faq" aria-labelledby="faq-heading" className="space-y-6">
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-2xl p-6 sm:p-8 shadow-sm space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#F1F7F7] text-[#0B0B0B] text-xs font-semibold uppercase tracking-wider border border-[#6B6B6B]">
              Knowledge Base
            </div>
            <h2 id="faq-heading" className="font-display text-2xl sm:text-4xl font-bold text-[#0B0B0B]">
              Frequently Asked Questions
            </h2>
            <p className="text-sm sm:text-base text-[#333333]">
              Plain, factual answers regarding profiles, ATS checks, formatting, and security.
            </p>
          </div>

          <div className="space-y-3">
            {/* Q1 */}
            <details className="group bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-5 shadow-xs transition-colors">
              <summary className="font-display text-base sm:text-lg font-bold text-[#0B0B0B] cursor-pointer min-h-[44px] flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#800021] rounded-md">
                <span>What is a master profile?</span>
                <span className="text-xs font-bold text-[#800021] group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="pt-3 text-sm text-[#1A1A1A] leading-relaxed border-t border-[#6B6B6B] mt-3">
                A single structured record of your complete educational background, work history, skills, and projects. It serves as your personal career archive so you never have to re-enter your history when creating tailored documents.
              </div>
            </details>

            {/* Q2 */}
            <details className="group bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-5 shadow-xs transition-colors">
              <summary className="font-display text-base sm:text-lg font-bold text-[#0B0B0B] cursor-pointer min-h-[44px] flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#800021] rounded-md">
                <span>What does &quot;ATS readiness&quot; mean?</span>
                <span className="text-xs font-bold text-[#800021] group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="pt-3 text-sm text-[#1A1A1A] leading-relaxed border-t border-[#6B6B6B] mt-3">
                Our checks evaluate rule-based formatting principles—such as single-column flow, standard section titles, and valid PDF text encoding—that applicant tracking systems require to parse resumes without dropping information. It is not an algorithmic score or hiring guarantee.
              </div>
            </details>

            {/* Q3 */}
            <details className="group bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-5 shadow-xs transition-colors">
              <summary className="font-display text-base sm:text-lg font-bold text-[#0B0B0B] cursor-pointer min-h-[44px] flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#800021] rounded-md">
                <span>Can I use non-English names and scripts?</span>
                <span className="text-xs font-bold text-[#800021] group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="pt-3 text-sm text-[#1A1A1A] leading-relaxed border-t border-[#6B6B6B] mt-3">
                Currently, PDF generation uses embedded Helvetica and Times-Roman core fonts that support standard Latin character sets. Non-Latin scripts such as Devanagari, Cyrillic, Chinese, or Arabic are not yet rendered in exported PDFs.
              </div>
            </details>

            {/* Q4 */}
            <details className="group bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-5 shadow-xs transition-colors">
              <summary className="font-display text-base sm:text-lg font-bold text-[#0B0B0B] cursor-pointer min-h-[44px] flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#800021] rounded-md">
                <span>Which file formats are supported for export?</span>
                <span className="text-xs font-bold text-[#800021] group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="pt-3 text-sm text-[#1A1A1A] leading-relaxed border-t border-[#6B6B6B] mt-3">
                Documents export directly as standard, non-linearized PDF files (PDF 1.3/1.4). Your complete account data exports as structured JSON.
              </div>
            </details>

            {/* Q5 */}
            <details className="group bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-5 shadow-xs transition-colors">
              <summary className="font-display text-base sm:text-lg font-bold text-[#0B0B0B] cursor-pointer min-h-[44px] flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#800021] rounded-md">
                <span>What happens to my data?</span>
                <span className="text-xs font-bold text-[#800021] group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="pt-3 text-sm text-[#1A1A1A] leading-relaxed border-t border-[#6B6B6B] mt-3">
                Your account and document data are stored securely in a PostgreSQL database hosted in Tokyo, Japan. Data is never sold, shared with data brokers, or used to train third-party machine learning models.
              </div>
            </details>

            {/* Q6 */}
            <details className="group bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-5 shadow-xs transition-colors">
              <summary className="font-display text-base sm:text-lg font-bold text-[#0B0B0B] cursor-pointer min-h-[44px] flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#800021] rounded-md">
                <span>Can I delete my account?</span>
                <span className="text-xs font-bold text-[#800021] group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="pt-3 text-sm text-[#1A1A1A] leading-relaxed border-t border-[#6B6B6B] mt-3">
                Yes. Account deletion is self-serve in Settings, requires recent authentication and confirmation of your email address, and immediately and permanently purges your account and all associated documents from the database.
              </div>
            </details>

            {/* Q7 */}
            <details className="group bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-5 shadow-xs transition-colors">
              <summary className="font-display text-base sm:text-lg font-bold text-[#0B0B0B] cursor-pointer min-h-[44px] flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#800021] rounded-md">
                <span>Does it work on a phone?</span>
                <span className="text-xs font-bold text-[#800021] group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="pt-3 text-sm text-[#1A1A1A] leading-relaxed border-t border-[#6B6B6B] mt-3">
                Yes. The entire platform, including document editing, section management, and live preview tab switching, is fully responsive and designed to work on mobile viewports down to 320px.
              </div>
            </details>
          </div>
        </section>

      </main>

      {/* 9. FOOTER */}
      <footer className="mt-16 sm:mt-24 border-t border-[#6B6B6B] bg-[#FFFFFF] py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#333333]">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-display font-bold text-sm text-[#0B0B0B]">{PRODUCT_NAME}</span>
            <span>&bull;</span>
            <Link
              href="/privacy"
              className="text-[#1A1A1A] hover:text-[#800021] min-h-[44px] inline-flex items-center underline focus:outline-none focus:ring-2 focus:ring-[#800021] rounded-xs"
            >
              Privacy & Data Rights
            </Link>
            <span>&bull;</span>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-[#1A1A1A] hover:text-[#800021] min-h-[44px] inline-flex items-center underline focus:outline-none focus:ring-2 focus:ring-[#800021] rounded-xs"
            >
              Contact: {CONTACT_EMAIL}
            </a>
          </div>

          <div className="text-center sm:text-right space-y-1">
            <p>Database Region: {DATABASE_REGION_LABEL}</p>
            <p>&copy; 2026 {OPERATOR_NAME}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
