import React, { Suspense } from 'react';
import { createClient, getVerifiedUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/navigation/AppShell';
import {
  DashboardDocumentList,
  MasterProfileSummaryCard,
  DocumentItem,
  ProfileSummaryData,
} from '@/components/dashboard/DashboardDocumentList';
import { db } from '@/lib/db';
import {
  education,
  experiences,
  projects,
  skills,
  publications,
  achievements,
  certifications,
  customSections,
} from '@/lib/db/schema';
import { count, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

async function fetchProfileSummary(
  profile: { id: string; background_group?: string | null; specialization?: string | null } | null
): Promise<ProfileSummaryData> {
  let counts = {
    education: 0,
    experiences: 0,
    projects: 0,
    skills: 0,
    publications: 0,
    achievements: 0,
    certifications: 0,
    customSections: 0,
  };

  if (profile?.id) {
    const pid = profile.id;
    const [edu, exp, proj, skl, pub, ach, cert, cust] = await Promise.all([
      db.select({ count: count() }).from(education).where(eq(education.profileId, pid)),
      db.select({ count: count() }).from(experiences).where(eq(experiences.profileId, pid)),
      db.select({ count: count() }).from(projects).where(eq(projects.profileId, pid)),
      db.select({ count: count() }).from(skills).where(eq(skills.profileId, pid)),
      db.select({ count: count() }).from(publications).where(eq(publications.profileId, pid)),
      db.select({ count: count() }).from(achievements).where(eq(achievements.profileId, pid)),
      db.select({ count: count() }).from(certifications).where(eq(certifications.profileId, pid)),
      db.select({ count: count() }).from(customSections).where(eq(customSections.profileId, pid)),
    ]);

    counts = {
      education: Number(edu[0]?.count || 0),
      experiences: Number(exp[0]?.count || 0),
      projects: Number(proj[0]?.count || 0),
      skills: Number(skl[0]?.count || 0),
      publications: Number(pub[0]?.count || 0),
      achievements: Number(ach[0]?.count || 0),
      certifications: Number(cert[0]?.count || 0),
      customSections: Number(cust[0]?.count || 0),
    };
  }

  return {
    hasProfile: Boolean(profile),
    backgroundGroup: profile?.background_group || null,
    specialization: profile?.specialization || null,
    sections: [
      { key: 'education', label: 'Education', count: counts.education, href: '/profile#education' },
      { key: 'experiences', label: 'Experience', count: counts.experiences, href: '/profile#experiences' },
      { key: 'projects', label: 'Projects', count: counts.projects, href: '/profile#projects' },
      { key: 'skills', label: 'Skills', count: counts.skills, href: '/profile#skills' },
      { key: 'publications', label: 'Publications', count: counts.publications, href: '/profile#publications' },
      { key: 'achievements', label: 'Achievements', count: counts.achievements, href: '/profile#achievements' },
      { key: 'certifications', label: 'Certifications', count: counts.certifications, href: '/profile#certifications' },
      { key: 'customSections', label: 'Custom sections', count: counts.customSections, href: '/profile#custom-sections' },
    ],
  };
}

export default async function DashboardPage() {
  const user = await getVerifiedUser();
  if (!user) {
    redirect('/login');
  }

  const supabase = await createClient();

  // Fetch profile metadata and documents in parallel (1 round trip)
  const [{ data: profile }, { data: docs }] = await Promise.all([
    supabase
      .from('master_profiles')
      .select('id, background_group, specialization')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('documents')
      .select('id, type, title, target_role, template_id, status, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false }),
  ]);

  const userDocs = (docs || []) as DocumentItem[];
  const profileSummaryPromise = fetchProfileSummary(profile);

  return (
    <AppShell userEmail={user.email || ''} currentPath="/dashboard">
      <main className="w-full">
        <DashboardDocumentList
          initialDocuments={userDocs}
          profileSummaryNode={
            <Suspense
              fallback={
                <div className="h-[280px] rounded-xl bg-[#FFFDF9] border border-[#D8D0C5] animate-pulse" />
              }
            >
              <StreamedProfileSummary profileSummaryPromise={profileSummaryPromise} />
            </Suspense>
          }
        />
      </main>
    </AppShell>
  );
}

async function StreamedProfileSummary({
  profileSummaryPromise,
}: {
  profileSummaryPromise: Promise<ProfileSummaryData>;
}) {
  const profileSummary = await profileSummaryPromise;
  return <MasterProfileSummaryCard profileSummary={profileSummary} />;
}
