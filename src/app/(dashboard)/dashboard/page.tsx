import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { masterProfiles, documents, websites } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { PRODUCT_NAME } from '@/config/app';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';

export const instant = false;
import {
  FileText,
  GraduationCap,
  Globe,
  Plus,
  Copy,
  Trash2,
  ArrowRight,
  LogOut,
} from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 1. Ownership-guaranteed fetch: Master Profile
  let profile = null;
  let userDocs: (typeof documents.$inferSelect)[] = [];
  let userSite = null;

  try {
    const profileRows = await db
      .select()
      .from(masterProfiles)
      .where(eq(masterProfiles.userId, user.id))
      .limit(1);

    profile = profileRows[0] || null;

    // 2. Ownership-guaranteed fetch: Documents
    userDocs = await db
      .select()
      .from(documents)
      .where(eq(documents.userId, user.id))
      .orderBy(desc(documents.updatedAt));

    // 3. Ownership-guaranteed fetch: Website
    const siteRows = await db
      .select()
      .from(websites)
      .where(eq(websites.userId, user.id))
      .limit(1);

    userSite = siteRows[0] || null;
  } catch (err) {
    // Graceful fallback if database connection hasn't been configured by user yet
    console.error('Database query fallback:', err);
  }

  const resumes = userDocs.filter((d) => d.type === 'resume');
  const cvs = userDocs.filter((d) => d.type === 'cv');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-[var(--border-muted)] bg-[var(--surface)] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="/dashboard" className="font-display text-xl font-bold tracking-tight text-[var(--text)]">
              {PRODUCT_NAME}
            </a>
            <nav className="hidden sm:flex items-center gap-4 text-sm">
              <a href="/dashboard" className="text-[var(--text)] font-medium border-b-2 border-[var(--accent)] pb-0.5">
                Dashboard
              </a>
              <a href="/profile" className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                Master Profile
              </a>
              <a href="/website" className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                Public Site
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] p-2 rounded transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {/* Welcome & Status Bar */}
        <div className="mb-8 pb-6 border-b border-[var(--border-muted)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)]">
              Welcome{user.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {profile ? (
                <span>
                  Master profile active &bull; {profile.backgroundGroup || 'Background configured'}
                </span>
              ) : (
                <span>Setup your background to adapt documents to your field.</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/onboarding"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[var(--accent)] text-[var(--surface)] text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Create Document
            </a>
          </div>
        </div>

        {/* 3 Overview Columns: Resumes, Academic CVs, Personal Website */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Card 1: Resumes */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-md bg-[var(--surface-alt)] text-[var(--accent)]">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--surface-alt)] text-[var(--text-muted)]">
                  {resumes.length} {resumes.length === 1 ? 'doc' : 'docs'}
                </span>
              </div>
              <h2 className="font-display text-lg font-bold text-[var(--text)]">Resumes</h2>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                Single-page ATS-optimized documents tailored for jobs, placements, and industry internships.
              </p>
            </div>
            <a
              href="/onboarding?type=resume"
              className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline"
            >
              Create new Resume <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Card 2: Academic CVs */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-md bg-[var(--surface-alt)] text-[var(--accent)]">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--surface-alt)] text-[var(--text-muted)]">
                  {cvs.length} {cvs.length === 1 ? 'doc' : 'docs'}
                </span>
              </div>
              <h2 className="font-display text-lg font-bold text-[var(--text)]">Academic CVs</h2>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                Multi-page scholarly dossiers with research interests, publications, teaching, and grant sections.
              </p>
            </div>
            <a
              href="/onboarding?type=cv"
              className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline"
            >
              Create new CV <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Card 3: Personal Website */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-md bg-[var(--surface-alt)] text-[var(--accent)]">
                  <Globe className="w-5 h-5" />
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    userSite?.isPublished
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {userSite?.isPublished ? 'Published' : 'Unpublished'}
                </span>
              </div>
              <h2 className="font-display text-lg font-bold text-[var(--text)]">Public Website</h2>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                {userSite?.isPublished
                  ? `Live at /u/${userSite.username}. Every field protected by strict whitelist visibility.`
                  : 'A responsive portfolio generated directly from verified master profile facts.'}
              </p>
            </div>
            <a
              href="/website"
              className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline"
            >
              Manage Website <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Documents Table / List */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-[var(--border-muted)] flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-[var(--text)]">Your Documents</h3>
            <span className="text-xs text-[var(--text-muted)]">
              {userDocs.length} total document{userDocs.length === 1 ? '' : 's'}
            </span>
          </div>

          {userDocs.length === 0 ? (
            <div className="py-16 text-center px-6">
              <FileText className="w-10 h-10 mx-auto text-[var(--text-muted)] mb-3 opacity-60" />
              <h4 className="font-display text-base font-semibold text-[var(--text)]">No documents yet</h4>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto mt-1 mb-5 leading-relaxed">
                Start by setting your educational background. The builder adapts the questions and formatting to your field.
              </p>
              <a
                href="/onboarding"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[var(--accent)] text-[var(--surface)] text-xs font-medium hover:opacity-90 transition-opacity"
              >
                <Plus className="w-3.5 h-3.5" /> Create your first document
              </a>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-muted)]">
              {userDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--surface-alt)]/40 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded bg-[var(--surface-alt)] text-[var(--accent)] mt-0.5">
                      {doc.type === 'resume' ? <FileText className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
                    </div>
                    <div>
                      <a
                        href={`/editor/${doc.id}`}
                        className="font-medium text-sm text-[var(--text)] hover:underline"
                      >
                        {doc.title}
                      </a>
                      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mt-0.5">
                        <span className="capitalize">{doc.type}</span>
                        <span>&bull;</span>
                        <span>Template: {doc.templateId}</span>
                        <span>&bull;</span>
                        <span>Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <a
                      href={`/editor/${doc.id}`}
                      className="px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-alt)] transition-colors"
                    >
                      Open Editor
                    </a>
                    <form action={`/api/documents/${doc.id}/duplicate`} method="post">
                      <button
                        type="submit"
                        className="p-1.5 rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] transition-colors"
                        title="Duplicate into independent copy"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </form>
                    <form action={`/api/documents/${doc.id}/delete`} method="post">
                      <button
                        type="submit"
                        className="p-1.5 rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-muted)] bg-[var(--surface)] py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <div>{PRODUCT_NAME} &bull; Privacy-first Profile &amp; Document Engine</div>
          <div className="flex items-center gap-4">
            <a href="/api/user/export" className="hover:underline">
              Export all data (JSON)
            </a>
            <span>&bull;</span>
            <a href="/privacy" className="hover:underline">
              Privacy &amp; Data Rights
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
