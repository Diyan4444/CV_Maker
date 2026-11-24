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
    <div className="min-h-screen bg-[#F1F7F7] flex flex-col justify-between p-4 sm:p-8 text-[#0B0B0B]">
      {/* Top Header Panel */}
      <header className="max-w-4xl mx-auto w-full bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl px-6 py-3.5 shadow-sm flex items-center justify-between">
        <Link
          href="/"
          className="font-display text-xl font-bold tracking-tight text-[#0B0B0B] hover:text-[#800021] focus:outline-none focus:ring-2 focus:ring-[#800021] rounded"
        >
          {PRODUCT_NAME}
        </Link>
        <div className="flex items-center gap-3 text-xs font-semibold">
          <Link
            href="/settings"
            className="text-[#333333] hover:text-[#0B0B0B] hover:bg-[#F1F7F7] px-3 py-1.5 rounded-md border border-[#6B6B6B] transition-colors"
          >
            Settings
          </Link>
          <Link
            href="/login"
            className="text-[#FFFFFF] bg-[#800021] hover:bg-[#881144] px-3 py-1.5 rounded-md transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-4xl w-full mx-auto my-8 space-y-8">
        {/* Title Panel */}
        <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 sm:p-8 shadow-sm space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#F1F7F7] text-[#800021] border border-[#6B6B6B]">
              <Shield className="w-5 h-5" aria-hidden="true" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#800021]">
              Legal &amp; Privacy Notice
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B0B0B] tracking-tight">
            Privacy &amp; Data Rights Policy
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#333333] pt-1">
            <span><strong>Version:</strong> {PRIVACY_VERSION}</span>
            <span>&bull;</span>
            <span><strong>Effective Date:</strong> {EFFECTIVE_DATE}</span>
            <span>&bull;</span>
            <span><strong>Primary Operator:</strong> {OPERATOR_NAME}</span>
          </div>
          <p className="text-xs sm:text-sm text-[#333333] leading-relaxed pt-2 border-t border-[#6B6B6B]">
            This policy describes strictly and transparently what data {PRODUCT_NAME} collects, where that data is hosted, how authentication is handled, and how you can export or permanently destroy your records at any time.
          </p>
        </div>

        {/* Table of Contents Panel */}
        <nav
          aria-label="Table of contents"
          className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 shadow-sm space-y-3"
        >
          <h2 className="font-display text-sm font-bold text-[#0B0B0B] uppercase tracking-wider">
            Contents
          </h2>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#800021]">
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
        </nav>

        {/* Section 1 */}
        <section id="section-1" className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 sm:p-8 shadow-sm space-y-3 scroll-mt-6">
          <h2 className="font-display text-lg font-bold text-[#0B0B0B]">
            1. Operator &amp; Scope
          </h2>
          <p className="text-xs sm:text-sm text-[#333333] leading-relaxed">
            {PRODUCT_NAME} is an editorial portfolio and document engine operated by <strong>{OPERATOR_NAME}</strong> (&quot;we&quot;, &quot;us&quot;, or &quot;the operator&quot;). This document describes our technical practices for data storage, processing, export, and account deletion across all application endpoints.
          </p>
        </section>

        {/* Section 2 */}
        <section id="section-2" className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 sm:p-8 shadow-sm space-y-4 scroll-mt-6">
          <h2 className="font-display text-lg font-bold text-[#0B0B0B]">
            2. Information We Collect
          </h2>
          <p className="text-xs sm:text-sm text-[#333333] leading-relaxed">
            We store only the facts and materials that you deliberately submit when building your master profile, curriculum vitae, resume, and public site:
          </p>
          <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-[#333333] leading-relaxed pl-2">
            <li><strong>Account Identity:</strong> Primary email address, authentication user identifier (UUID), account creation timestamp, and last sign-in timestamp.</li>
            <li><strong>Master Profile Records:</strong> Full name, professional headline, biographical summary, contact information (email, phone, location, personal links), and categorization tags (field of study, career stage).</li>
            <li><strong>Academic &amp; Professional Facts:</strong> Chronological entries for education, employment history, independent projects, skill proficiencies, publications, honors and awards, professional certifications, and custom section content.</li>
            <li><strong>Documents &amp; Layouts:</strong> Resumes and Academic CVs authored by you, including customized section order, visibility flags, selected typographic templates, accent color overrides, and version counter state.</li>
            <li><strong>Website Configuration:</strong> Optional public portfolio username, chosen color palette, field-level visibility preferences, and custom header/bio overrides.</li>
            <li><strong>Telemetry &amp; Usage Logs:</strong> Action metadata such as token counts and completion timestamps generated during profile operations.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section id="section-3" className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 sm:p-8 shadow-sm space-y-3 scroll-mt-6">
          <h2 className="font-display text-lg font-bold text-[#0B0B0B] flex items-center gap-2">
            <Server className="w-5 h-5 text-[#800021]" aria-hidden="true" />
            <span>3. Processing Locations &amp; Infrastructure</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#333333] leading-relaxed">
            All user data is processed and stored across verified enterprise infrastructure:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-[#333333] leading-relaxed pl-2">
            <li><strong>Database &amp; Authentication:</strong> Hosted by Supabase with PostgreSQL storage located in <strong>{DATABASE_REGION_LABEL}</strong>. All tables enforce strict PostgreSQL Row Level Security (RLS) policies ensuring tenant isolation.</li>
            <li><strong>Application Server &amp; Edge Delivery:</strong> Hosted by Vercel for serverless function execution, dynamic page rendering, and static asset distribution.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section id="section-4" className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 sm:p-8 shadow-sm space-y-3 scroll-mt-6">
          <h2 className="font-display text-lg font-bold text-[#0B0B0B] flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#800021]" aria-hidden="true" />
            <span>4. Authentication &amp; Sign-In Methods</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#333333] leading-relaxed">
            The application provides two authentication mechanisms managed securely via Supabase Auth:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-[#333333] leading-relaxed pl-2">
            <li><strong>Email Magic Link (Passwordless):</strong> A cryptographic one-time sign-in link delivered to your verified email address. No passwords are created or stored on our servers.</li>
            <li><strong>Google OAuth:</strong> Federated authentication via Google sign-in. We receive only your email address and basic profile identifier.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section id="section-5" className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 sm:p-8 shadow-sm space-y-4 scroll-mt-6">
          <h2 className="font-display text-lg font-bold text-[#0B0B0B] flex items-center gap-2">
            <Cookie className="w-5 h-5 text-[#800021]" aria-hidden="true" />
            <span>5. Cookies &amp; Local Storage</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#333333] leading-relaxed">
            {PRODUCT_NAME} uses only strictly necessary first-party browser storage for authentication and draft crash-resilience.
          </p>
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[#0B0B0B]">First-Party Cookies Set on Sign-In:</p>
            <div className="bg-[#F1F7F7] border border-[#6B6B6B] rounded-lg p-3 text-xs font-mono text-[#0B0B0B] space-y-1">
              <div>sb-&lt;project-ref&gt;-auth-token</div>
              <div>sb-&lt;project-ref&gt;-auth-token.0 (chunked token storage)</div>
              <div>sb-&lt;project-ref&gt;-auth-token.1 (chunked token storage)</div>
            </div>
            <p className="text-[11px] text-[#333333]">
              These cookies maintain your encrypted session token and are cleared immediately upon sign-out or account deletion.
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[#0B0B0B]">Local Storage Keys:</p>
            <div className="bg-[#F1F7F7] border border-[#6B6B6B] rounded-lg p-3 text-xs font-mono text-[#0B0B0B] space-y-1">
              <div>cv_maker_draft_&lt;documentId&gt;</div>
            </div>
            <p className="text-[11px] text-[#333333]">
              Used solely to buffer unsaved document edits in your local browser so work is not lost during transient network interruptions. These keys are purged automatically upon account deletion.
            </p>
          </div>
        </section>

        {/* Section 6 */}
        <section id="section-6" className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 sm:p-8 shadow-sm space-y-3 scroll-mt-6">
          <h2 className="font-display text-lg font-bold text-[#0B0B0B]">
            6. Third-Party Scripts &amp; Analytics
          </h2>
          <p className="text-xs sm:text-sm text-[#333333] leading-relaxed">
            Our codebase contains <strong>zero third-party tracking scripts, zero marketing tags, and zero analytics beacons</strong>.
          </p>
          <p className="text-xs sm:text-sm text-[#333333] leading-relaxed">
            Typography (Fraunces and DM Sans) is bundled and served directly from our application domain via Next.js Font Optimization. No client requests are transmitted to external font CDN servers.
          </p>
        </section>

        {/* Section 7 */}
        <section id="section-7" className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 sm:p-8 shadow-sm space-y-3 scroll-mt-6">
          <h2 className="font-display text-lg font-bold text-[#0B0B0B]">
            7. No Commercial Sale of Data
          </h2>
          <p className="text-xs sm:text-sm text-[#333333] leading-relaxed">
            We do not sell, rent, monetize, or trade your personal records, career history, or generated documents to data brokers, advertising networks, or model-training aggregators. Your master profile and documents belong exclusively to you.
          </p>
        </section>

        {/* Section 8 */}
        <section id="section-8" className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 sm:p-8 shadow-sm space-y-3 scroll-mt-6">
          <h2 className="font-display text-lg font-bold text-[#0B0B0B] flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-[#800021]" aria-hidden="true" />
            <span>8. Data Retention &amp; Permanent Deletion</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#333333] leading-relaxed">
            We retain your facts only while your account remains active. When you trigger account deletion via the Settings panel:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-[#333333] leading-relaxed pl-2">
            <li>Your account identity is immediately destroyed in the Supabase authentication service.</li>
            <li>All associated profile records, curriculum vitae, resumes, custom sections, website settings, and usage logs are immediately and permanently removed via relational database cascades (<code className="font-mono text-xs">ON DELETE CASCADE</code>).</li>
            <li>All active sessions are invalidated and browser cookies and local drafts are purged.</li>
            <li>Deletion is instantaneous, permanent, and irreversible.</li>
          </ul>
        </section>

        {/* Section 9 */}
        <section id="section-9" className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 sm:p-8 shadow-sm space-y-4 scroll-mt-6">
          <h2 className="font-display text-lg font-bold text-[#0B0B0B] flex items-center gap-2">
            <Download className="w-5 h-5 text-[#800021]" aria-hidden="true" />
            <span>9. Your Rights: Export &amp; Erasure</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#333333] leading-relaxed">
            You maintain full sovereignty over your data and can exercise your export and erasure rights directly through the application interface at any time:
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/settings"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg bg-[#800021] text-white text-xs font-semibold hover:bg-[#881144] focus:outline-none focus:ring-2 focus:ring-[#800021] transition-colors"
            >
              <span>Go to Account Settings</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <a
              href="/api/account/export"
              download
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-lg border border-[#6B6B6B] bg-white text-[#0B0B0B] text-xs font-semibold hover:bg-[#F1F7F7] focus:outline-none focus:ring-2 focus:ring-[#800021] transition-colors"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Direct Data Export (JSON)</span>
            </a>
          </div>
        </section>

        {/* Section 10 */}
        <section id="section-10" className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 sm:p-8 shadow-sm space-y-3 scroll-mt-6">
          <h2 className="font-display text-lg font-bold text-[#0B0B0B] flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#800021]" aria-hidden="true" />
            <span>10. Contact Information</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#333333] leading-relaxed">
            For questions regarding privacy, security, or data handling, contact the operator directly at:
          </p>
          <div className="p-4 bg-[#F1F7F7] border border-[#6B6B6B] rounded-lg text-xs space-y-1">
            <div><strong>Operator:</strong> {OPERATOR_NAME}</div>
            <div><strong>Inquiries:</strong> <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#800021] hover:underline">{CONTACT_EMAIL}</a></div>
          </div>
        </section>

        {/* Section 11 */}
        <section id="section-11" className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 sm:p-8 shadow-sm space-y-3 scroll-mt-6">
          <h2 className="font-display text-lg font-bold text-[#0B0B0B]">
            11. Changes &amp; Amendments
          </h2>
          <p className="text-xs sm:text-sm text-[#333333] leading-relaxed">
            Any future revisions to our technical architecture, storage vendors, or data schema will be reflected in this policy along with an updated version number and effective date.
          </p>
        </section>
      </main>

      {/* Footer Panel */}
      <footer className="max-w-4xl mx-auto w-full bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl px-6 py-4 text-center text-xs text-[#333333] shadow-sm">
        <div>{PRODUCT_NAME} &bull; Editorial Profile &amp; Document Engine</div>
      </footer>
    </div>
  );
}
