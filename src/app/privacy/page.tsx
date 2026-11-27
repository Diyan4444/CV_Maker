import React from 'react';
import Link from 'next/link';
import {
  OPERATOR_NAME,
  CONTACT_EMAIL,
  DATABASE_REGION_LABEL,
  EFFECTIVE_DATE,
  PRIVACY_VERSION,
} from '@/config/legal';
import { PRODUCT_NAME } from '@/config/app';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { FloatCard } from '@/components/ui/FloatCard';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Emph } from '@/components/ui/Emph';
import { GLASS_TOKENS } from '@/styles/tokens';
import {
  Shield,
  Server,
  Lock,
  Cookie,
  Trash2,
  Download,
  Mail,
  ArrowRight,
} from 'lucide-react';

export const metadata = {
  title: `Privacy & Data Rights - ${PRODUCT_NAME}`,
  description: 'Verified facts on data collection, infrastructure, cookies, export, and account deletion.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between" style={{ color: GLASS_TOKENS.fg }}>
      {/* Shared Public Header */}
      <div className="pt-4 sm:pt-8">
        <PublicHeader />
      </div>

      {/* Main Content Container */}
      <main className="relative z-10 max-w-4xl w-full mx-auto px-4 sm:px-8 my-8 space-y-8 pt-2">
        {/* Title Panel */}
        <FloatCard floatIndex={1}>
          <GlassPanel variant="dense" className="p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="glass-tile p-2 rounded-lg" style={{ color: GLASS_TOKENS.accentOnGlass }}>
                <Shield className="w-5 h-5" aria-hidden="true" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: GLASS_TOKENS.accentOnGlass }}>
                Legal &amp; Privacy Notice
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: GLASS_TOKENS.fg }}>
              <Emph headingKey="privacy" />
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs pt-1" style={{ color: GLASS_TOKENS.fgMuted }}>
              <span><strong>Version:</strong> {PRIVACY_VERSION}</span>
              <span>&bull;</span>
              <span><strong>Effective Date:</strong> {EFFECTIVE_DATE}</span>
              <span>&bull;</span>
              <span><strong>Primary Operator:</strong> {OPERATOR_NAME}</span>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed pt-2 border-t glass-divider" style={{ color: GLASS_TOKENS.fgMuted }}>
              This policy describes strictly and transparently what data {PRODUCT_NAME} collects, where that data is hosted, how authentication is handled, and how you can export or permanently destroy your records at any time.
            </p>
          </GlassPanel>
        </FloatCard>

        {/* Table of Contents Panel */}
        <FloatCard floatIndex={2}>
          <GlassPanel as="nav" variant="dense" aria-label="Table of contents" className="p-6 space-y-3">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider" style={{ color: GLASS_TOKENS.fg }}>
              Contents
            </h2>
            <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs" style={{ color: GLASS_TOKENS.accentOnGlass }}>
              <li><a href="#section-1" className="hover:underline">1. Operator &amp; Scope</a></li>
              <li><a href="#section-2" className="hover:underline">2. Information We Collect</a></li>
              <li><a href="#section-3" className="hover:underline">3. Processing Locations &amp; Infrastructure</a></li>
              <li><a href="#section-4" className="hover:underline">4. Authentication &amp; Sign-In Methods</a></li>
              <li><a href="#section-5" className="hover:underline">5. Cookies &amp; Local Storage</a></li>
              <li><a href="#section-6" className="hover:underline">6. Third-Party Scripts &amp; Analytics</a></li>
              <li><a href="#section-7" className="hover:underline">7. No Commercial Sale of Data</a></li>
              <li><a href="#section-8" className="hover:underline">8. Data Retention &amp; Permanent Deletion</a></li>
              <li><a href="#section-9" className="hover:underline">9. Your Rights: Export &amp; Erasure</a></li>
              <li><a href="#section-10" className="hover:underline">10. Contact Information</a></li>
              <li><a href="#section-11" className="hover:underline">11. Changes &amp; Amendments</a></li>
            </ol>
          </GlassPanel>
        </FloatCard>

        {/* Section 1 */}
        <FloatCard as="section" id="section-1" floatIndex={3} className="scroll-mt-[calc(var(--header-h,84px)+16px)]">
          <GlassPanel variant="dense" className="p-6 sm:p-8 space-y-3">
            <h2 className="font-display text-lg font-bold" style={{ color: GLASS_TOKENS.fg }}>
              1. Operator &amp; Scope
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: GLASS_TOKENS.fgMuted }}>
              {PRODUCT_NAME} is an editorial resume and CV document engine operated by <strong>{OPERATOR_NAME}</strong> (&quot;we&quot;, &quot;us&quot;, or &quot;the operator&quot;). This document describes our technical practices for data storage, processing, export, and account deletion across all application endpoints.
            </p>
          </GlassPanel>
        </FloatCard>

        {/* Section 2 */}
        <FloatCard as="section" id="section-2" floatIndex={4} className="scroll-mt-[calc(var(--header-h,84px)+16px)]">
          <GlassPanel variant="dense" className="p-6 sm:p-8 space-y-4">
            <h2 className="font-display text-lg font-bold" style={{ color: GLASS_TOKENS.fg }}>
              2. Information We Collect
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: GLASS_TOKENS.fgMuted }}>
              We store only the facts and materials that you deliberately submit when building your master profile, curriculum vitae, and resume:
            </p>
            <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm leading-relaxed pl-2" style={{ color: GLASS_TOKENS.fgMuted }}>
              <li><strong style={{ color: GLASS_TOKENS.fg }}>Account Identity:</strong> Primary email address, authentication user identifier (UUID), account creation timestamp, and last sign-in timestamp.</li>
              <li><strong style={{ color: GLASS_TOKENS.fg }}>Master Profile Records:</strong> Full name, professional headline, biographical summary, contact information (email, phone, location, personal links), and categorization tags (field of study, career stage).</li>
              <li><strong style={{ color: GLASS_TOKENS.fg }}>Academic &amp; Professional Facts:</strong> Chronological entries for education, employment history, independent projects, skill proficiencies, publications, honors and awards, professional certifications, and custom section content.</li>
              <li><strong style={{ color: GLASS_TOKENS.fg }}>Documents &amp; Layouts:</strong> Resumes and Academic CVs authored by you, including customized section order, visibility flags, selected typographic templates, accent color overrides, and version counter state.</li>
              <li><strong style={{ color: GLASS_TOKENS.fg }}>Telemetry &amp; Usage Logs:</strong> Action metadata such as token counts and completion timestamps generated during profile operations.</li>
            </ul>
          </GlassPanel>
        </FloatCard>

        {/* Section 3 */}
        <FloatCard as="section" id="section-3" floatIndex={5} className="scroll-mt-[calc(var(--header-h,84px)+16px)]">
          <GlassPanel variant="dense" className="p-6 sm:p-8 space-y-3">
            <h2 className="font-display text-lg font-bold flex items-center gap-2" style={{ color: GLASS_TOKENS.fg }}>
              <Server className="w-5 h-5" style={{ color: GLASS_TOKENS.accentOnGlass }} aria-hidden="true" />
              <span>3. Processing Locations &amp; Infrastructure</span>
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: GLASS_TOKENS.fgMuted }}>
              All user data is processed and stored across verified enterprise infrastructure:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm leading-relaxed pl-2" style={{ color: GLASS_TOKENS.fgMuted }}>
              <li><strong style={{ color: GLASS_TOKENS.fg }}>Database &amp; Authentication:</strong> Hosted by Supabase with PostgreSQL storage located in <strong style={{ color: GLASS_TOKENS.fg }}>{DATABASE_REGION_LABEL}</strong>. All tables enforce strict PostgreSQL Row Level Security (RLS) policies ensuring tenant isolation.</li>
              <li><strong style={{ color: GLASS_TOKENS.fg }}>Application Server &amp; Edge Delivery:</strong> Hosted by Vercel for serverless function execution, dynamic page rendering, and static asset distribution.</li>
            </ul>
          </GlassPanel>
        </FloatCard>

        {/* Section 4 */}
        <FloatCard as="section" id="section-4" floatIndex={6} className="scroll-mt-[calc(var(--header-h,84px)+16px)]">
          <GlassPanel variant="dense" className="p-6 sm:p-8 space-y-3">
            <h2 className="font-display text-lg font-bold flex items-center gap-2" style={{ color: GLASS_TOKENS.fg }}>
              <Lock className="w-5 h-5" style={{ color: GLASS_TOKENS.accentOnGlass }} aria-hidden="true" />
              <span>4. Authentication &amp; Sign-In Methods</span>
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: GLASS_TOKENS.fgMuted }}>
              The application provides two authentication mechanisms managed securely via Supabase Auth:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm leading-relaxed pl-2" style={{ color: GLASS_TOKENS.fgMuted }}>
              <li><strong style={{ color: GLASS_TOKENS.fg }}>Email Magic Link (Passwordless):</strong> A cryptographic one-time sign-in link delivered to your verified email address. No passwords are created or stored on our servers.</li>
              <li>
                <strong style={{ color: GLASS_TOKENS.fg }}>Google Sign-In (OAuth):</strong> We offer sign-in with Google via Supabase Auth. Google sends your email address, full name, and avatar URL to Supabase Auth. On account creation, our database trigger stores your user ID, email address, full name, and avatar URL in your account profile; we do not display your Google avatar in the app. See{' '}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                  style={{ color: GLASS_TOKENS.accentOnGlass }}
                >
                  Google&apos;s Privacy Policy
                </a>
                .
              </li>
            </ul>
          </GlassPanel>
        </FloatCard>

        {/* Section 5 */}
        <FloatCard as="section" id="section-5" floatIndex={7} className="scroll-mt-[calc(var(--header-h,84px)+16px)]">
          <GlassPanel variant="dense" className="p-6 sm:p-8 space-y-3">
            <h2 className="font-display text-lg font-bold flex items-center gap-2" style={{ color: GLASS_TOKENS.fg }}>
              <Cookie className="w-5 h-5" style={{ color: GLASS_TOKENS.accentOnGlass }} aria-hidden="true" />
              <span>5. Cookies &amp; Local Storage</span>
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: GLASS_TOKENS.fgMuted }}>
              This site uses only essential authentication cookies to keep you signed in, plus browser <code className="font-mono text-xs">localStorage</code> on your device for workspace preferences and unsaved editor drafts. There are no advertising or analytics cookies.
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm leading-relaxed pl-2" style={{ color: GLASS_TOKENS.fgMuted }}>
              <li><strong style={{ color: GLASS_TOKENS.fg }}>Sidebar state (<code className="font-mono text-xs">quillfolio_sidebar_collapsed</code>):</strong> Remembers whether the workspace navigation sidebar is expanded or collapsed.</li>
              <li><strong style={{ color: GLASS_TOKENS.fg }}>Interface preferences (<code className="font-mono text-xs">quillfolio_motion</code>, <code className="font-mono text-xs">quillfolio_float</code>, <code className="font-mono text-xs">quillfolio_glass</code>, <code className="font-mono text-xs">quillfolio_bg_level</code>):</strong> Stores your Settings &gt; Interface choices for Animations, Float amplitude, Glass preset, and Background contrast.</li>
              <li><strong style={{ color: GLASS_TOKENS.fg }}>Local editor drafts (keyed per document ID):</strong> Temporarily holds unsaved document changes in your browser so work is not lost if a connection drops; cleared automatically once saved or on account deletion.</li>
            </ul>
          </GlassPanel>
        </FloatCard>

        {/* Section 6 */}
        <FloatCard as="section" id="section-6" floatIndex={8} className="scroll-mt-[calc(var(--header-h,84px)+16px)]">
          <GlassPanel variant="dense" className="p-6 sm:p-8 space-y-3">
            <h2 className="font-display text-lg font-bold" style={{ color: GLASS_TOKENS.fg }}>
              6. Third-Party Scripts &amp; Analytics
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: GLASS_TOKENS.fgMuted }}>
              Our codebase contains <strong style={{ color: GLASS_TOKENS.fg }}>zero third-party tracking scripts, zero marketing tags, and zero analytics beacons</strong>.
            </p>
            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: GLASS_TOKENS.fgMuted }}>
              Typography (Fraunces and DM Sans) is bundled and served directly from our application domain via Next.js Font Optimization. No client requests are transmitted to external font CDN servers.
            </p>
          </GlassPanel>
        </FloatCard>

        {/* Section 7 */}
        <FloatCard as="section" id="section-7" floatIndex={9} className="scroll-mt-[calc(var(--header-h,84px)+16px)]">
          <GlassPanel variant="dense" className="p-6 sm:p-8 space-y-3">
            <h2 className="font-display text-lg font-bold" style={{ color: GLASS_TOKENS.fg }}>
              7. No Commercial Sale of Data
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: GLASS_TOKENS.fgMuted }}>
              We do not sell, rent, monetize, or trade your personal records, career history, or generated documents to data brokers, advertising networks, or model-training aggregators. Your master profile and documents belong exclusively to you.
            </p>
          </GlassPanel>
        </FloatCard>

        {/* Section 8 */}
        <FloatCard as="section" id="section-8" floatIndex={10} className="scroll-mt-[calc(var(--header-h,84px)+16px)]">
          <GlassPanel variant="dense" className="p-6 sm:p-8 space-y-3">
            <h2 className="font-display text-lg font-bold flex items-center gap-2" style={{ color: GLASS_TOKENS.fg }}>
              <Trash2 className="w-5 h-5" style={{ color: GLASS_TOKENS.accentOnGlass }} aria-hidden="true" />
              <span>8. Data Retention &amp; Permanent Deletion</span>
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: GLASS_TOKENS.fgMuted }}>
              We retain your facts only while your account remains active. When you trigger account deletion via the Settings panel:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm leading-relaxed pl-2" style={{ color: GLASS_TOKENS.fgMuted }}>
              <li>Your account identity is immediately destroyed in the Supabase authentication service.</li>
              <li>All associated profile records, curriculum vitae, resumes, custom sections, and usage logs are immediately and permanently removed via relational database cascades (<code className="font-mono text-xs">ON DELETE CASCADE</code>).</li>
              <li>All active sessions are invalidated and browser cookies and local drafts are purged.</li>
              <li>Deletion is instantaneous, permanent, and irreversible.</li>
            </ul>
          </GlassPanel>
        </FloatCard>

        {/* Section 9 */}
        <FloatCard as="section" id="section-9" floatIndex={11} className="scroll-mt-[calc(var(--header-h,84px)+16px)]">
          <GlassPanel variant="dense" className="p-6 sm:p-8 space-y-4">
            <h2 className="font-display text-lg font-bold flex items-center gap-2" style={{ color: GLASS_TOKENS.fg }}>
              <Download className="w-5 h-5" style={{ color: GLASS_TOKENS.accentOnGlass }} aria-hidden="true" />
              <span>9. Your Rights: Export &amp; Erasure</span>
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed" style={{ color: GLASS_TOKENS.fgMuted }}>
              You maintain full sovereignty over your data and can exercise your export and erasure rights directly through the application interface at any time:
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/settings"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg bg-[#800021] text-white text-xs font-semibold hover:bg-[#881144] focus:outline-none focus:ring-2 focus:ring-[#FFFDF9] transition-colors"
              >
                <span>Go to Account Settings</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <a
                href="/api/account/export"
                download
                className="btn-glass-secondary inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FFFDF9] transition-colors"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Direct Data Export (JSON)</span>
              </a>
            </div>
          </GlassPanel>
        </FloatCard>

        {/* Section 10 */}
        <GlassPanel as="section" id="section-10" variant="dense" className="p-6 sm:p-8 space-y-3 scroll-mt-[calc(var(--header-h,84px)+16px)]">
          <h2 className="font-display text-lg font-bold flex items-center gap-2" style={{ color: GLASS_TOKENS.fg }}>
            <Mail className="w-5 h-5" style={{ color: GLASS_TOKENS.accentOnGlass }} aria-hidden="true" />
            <span>10. Contact Information</span>
          </h2>
          <p className="text-xs sm:text-sm leading-relaxed" style={{ color: GLASS_TOKENS.fgMuted }}>
            For questions regarding privacy, security, or data handling, contact the operator directly at:
          </p>
          <div className="glass-tile p-4 rounded-lg text-xs space-y-1" style={{ color: GLASS_TOKENS.fgMuted }}>
            <div><strong style={{ color: GLASS_TOKENS.fg }}>Operator:</strong> {OPERATOR_NAME}</div>
            <div><strong style={{ color: GLASS_TOKENS.fg }}>Inquiries:</strong> <a href={`mailto:${CONTACT_EMAIL}`} className="hover:underline" style={{ color: GLASS_TOKENS.accentOnGlass }}>{CONTACT_EMAIL}</a></div>
          </div>
        </GlassPanel>

        {/* Section 11 */}
        <GlassPanel as="section" id="section-11" variant="dense" className="p-6 sm:p-8 space-y-3 scroll-mt-[calc(var(--header-h,84px)+16px)]">
          <h2 className="font-display text-lg font-bold" style={{ color: GLASS_TOKENS.fg }}>
            11. Changes &amp; Amendments
          </h2>
          <p className="text-xs sm:text-sm leading-relaxed" style={{ color: GLASS_TOKENS.fgMuted }}>
            Any future revisions to our technical architecture, storage vendors, or data schema will be reflected in this policy along with an updated version number and effective date.
          </p>
        </GlassPanel>
      </main>

      {/* Shared Public Footer */}
      <PublicFooter />
    </div>
  );
}
