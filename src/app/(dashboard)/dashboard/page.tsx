import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/navigation/AppShell';
import {
  DashboardDocumentList,
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

  // Fetch documents sorted by last edited
  const { data: docs } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  const userDocs = (docs || []) as DocumentItem[];

  // Fetch real counts per master profile section
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

  const profileSummary: ProfileSummaryData = {
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

  return (
    <AppShell userEmail={user.email || ''} currentPath="/dashboard">
      <main className="w-full">
        <DashboardDocumentList initialDocuments={userDocs} profileSummary={profileSummary} />
      </main>
    </AppShell>
  );
}
