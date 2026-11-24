import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PRODUCT_NAME } from '@/config/app';
import { AppHeader } from '@/components/navigation/AppHeader';
import { DashboardDocumentList } from '@/components/dashboard/DashboardDocumentList';
import {
  FileText,
  GraduationCap,
  Globe,
  Plus,
  ArrowRight,
} from 'lucide-react';

interface DocumentRecord {
  id: string;
  type: string;
  title: string;
  target_role: string | null;
  target_company: string | null;
  page_count: number | null;
  template_id?: string | null;
  updated_at: string;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user master profile
  const { data: profile } = await supabase
    .from('master_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  // Fetch documents
  const { data: docs } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  // Fetch personal website status
  const { data: userSite } = await supabase
    .from('websites')
    .select('username, is_published')
    .eq('user_id', user.id)
    .maybeSingle();

  const userDocs = (docs || []) as DocumentRecord[];
  const resumes = userDocs.filter((d: DocumentRecord) => d.type === 'resume');
  const cvs = userDocs.filter((d: DocumentRecord) => d.type === 'cv');

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-8">
      {/* Top Navigation Panel with Mobile Disclosure Menu */}
      <AppHeader currentPath="/dashboard" />

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full space-y-6">
        {/* Welcome & Status Bar Panel */}
        <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0B0B0B]">
              Welcome{user.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}
            </h1>
            <p className="text-sm text-[#333333] mt-1">
              {profile ? (
                <span>
                  Master profile active &bull; {profile.background_group || 'Background configured'}
                </span>
              ) : (
                <span>Setup your background to adapt documents to your field.</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#800021] hover:bg-[#881144] text-[#FFFFFF] text-xs font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Document
            </Link>
          </div>
        </div>

        {/* 3 Overview Columns: Resumes, Academic CVs, Personal Website */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Resumes */}
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-lg bg-[#F1F7F7] text-[#800021] border border-[#6B6B6B]">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F1F7F7] text-[#0B0B0B] border border-[#6B6B6B]">
                  {resumes.length} {resumes.length === 1 ? 'doc' : 'docs'}
                </span>
              </div>
              <h2 className="font-display text-lg font-bold text-[#0B0B0B]">Resumes</h2>
              <p className="text-xs text-[#333333] mt-1.5 leading-relaxed">
                Single-page ATS-optimized documents tailored for jobs, placements, and industry internships.
              </p>
            </div>
            <Link
              href="/onboarding?type=resume"
              className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-[#800021] hover:underline focus:outline-none focus:ring-2 focus:ring-[#800021] rounded"
            >
              Create new Resume <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2: Academic CVs */}
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-lg bg-[#F1F7F7] text-[#800021] border border-[#6B6B6B]">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F1F7F7] text-[#0B0B0B] border border-[#6B6B6B]">
                  {cvs.length} {cvs.length === 1 ? 'doc' : 'docs'}
                </span>
              </div>
              <h2 className="font-display text-lg font-bold text-[#0B0B0B]">Academic CVs</h2>
              <p className="text-xs text-[#333333] mt-1.5 leading-relaxed">
                Multi-page scholarly dossiers with research interests, publications, teaching, and grant sections.
              </p>
            </div>
            <Link
              href="/onboarding?type=cv"
              className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-[#800021] hover:underline focus:outline-none focus:ring-2 focus:ring-[#800021] rounded"
            >
              Create new CV <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 3: Personal Website */}
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-lg bg-[#F1F7F7] text-[#800021] border border-[#6B6B6B]">
                  <Globe className="w-5 h-5" />
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border border-[#6B6B6B] ${
                    userSite?.is_published
                      ? 'bg-[#DAF1DE] text-[#051F20]'
                      : 'bg-[#FFE4D8] text-[#800021]'
                  }`}
                >
                  {userSite?.is_published ? 'Published' : 'Unpublished'}
                </span>
              </div>
              <h2 className="font-display text-lg font-bold text-[#0B0B0B]">Public Website</h2>
              <p className="text-xs text-[#333333] mt-1.5 leading-relaxed">
                {userSite?.is_published
                  ? `Live at /u/${userSite.username}. Every field protected by strict whitelist visibility.`
                  : 'A responsive portfolio generated directly from verified master profile facts.'}
              </p>
            </div>
            <Link
              href="/website"
              className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-[#800021] hover:underline focus:outline-none focus:ring-2 focus:ring-[#800021] rounded"
            >
              Manage Website <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Documents Section with Create Modal, Duplicate, Delete, and 20-Cap Badge */}
        <DashboardDocumentList initialDocuments={userDocs} />
      </main>

      {/* Footer Panel */}
      <footer className="max-w-6xl mx-auto w-full mt-6 bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl px-4 sm:px-6 py-3 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#333333] text-center sm:text-left">
        <div>{PRODUCT_NAME} &bull; Privacy-first Profile &amp; Document Engine</div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/api/account/export"
            className="hover:underline hover:text-[#0B0B0B] min-h-[44px] inline-flex items-center px-1"
          >
            Export all data (JSON)
          </Link>
          <span aria-hidden="true">&bull;</span>
          <Link
            href="/privacy"
            className="hover:underline hover:text-[#0B0B0B] min-h-[44px] inline-flex items-center px-1"
          >
            Privacy &amp; Data Rights
          </Link>
        </div>
      </footer>
    </div>
  );
}
