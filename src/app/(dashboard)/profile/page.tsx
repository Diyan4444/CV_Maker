import React from 'react';
import { redirect } from 'next/navigation';
import { requireAuthUser } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import {
  masterProfiles,
  education,
  experiences,
  projects,
  skills,
  achievements,
  certifications,
  publications,
  customSections,
} from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { MasterProfileEditor } from './MasterProfileEditor';
import { AppShell } from '@/components/navigation/AppShell';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await requireAuthUser();

  // 1. Fetch user's Master Profile (Ownership enforced)
  const profileRows = await db
    .select()
    .from(masterProfiles)
    .where(eq(masterProfiles.userId, user.id))
    .limit(1);

  const profile = profileRows[0] || null;

  if (!profile) {
    redirect('/onboarding');
  }

  // 2. Fetch all child profile sections (Ownership enforced via profileId)
  const educationRows = await db
    .select()
    .from(education)
    .where(eq(education.profileId, profile.id))
    .orderBy(desc(education.startDate));

  const experienceRows = await db
    .select()
    .from(experiences)
    .where(eq(experiences.profileId, profile.id))
    .orderBy(desc(experiences.startDate));

  const projectRows = await db
    .select()
    .from(projects)
    .where(eq(projects.profileId, profile.id))
    .orderBy(projects.orderIndex);

  const skillRows = await db
    .select()
    .from(skills)
    .where(eq(skills.profileId, profile.id))
    .orderBy(skills.orderIndex);

  const publicationRows = await db
    .select()
    .from(publications)
    .where(eq(publications.profileId, profile.id))
    .orderBy(publications.orderIndex);

  const achievementRows = await db
    .select()
    .from(achievements)
    .where(eq(achievements.profileId, profile.id))
    .orderBy(achievements.orderIndex);

  const certificationRows = await db
    .select()
    .from(certifications)
    .where(eq(certifications.profileId, profile.id))
    .orderBy(certifications.orderIndex);

  const customSectionRows = await db
    .select()
    .from(customSections)
    .where(eq(customSections.profileId, profile.id))
    .orderBy(customSections.orderIndex);

  return (
    <AppShell userEmail={user.email || ''} currentPath="/profile">
      {/* Main Content */}
      <main className="w-full min-w-0 overflow-x-clip space-y-6">
        {/* Page Title & Instructions Panel (All text inside solid panel) */}
        <div className="bg-[#FFFDF9] border border-[#6B6B6B] rounded-xl p-6 sm:p-8 shadow-sm">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#24221F]">
            Master Profile
          </h1>
          <p className="text-xs sm:text-sm text-[#706A63] mt-1.5 leading-relaxed max-w-[70ch]">
            Single normalized source of truth for all your career and academic facts. Changes made here can be reused across all your resumes and CVs.
          </p>
        </div>

        {/* Master Profile Modular Editor */}
        <MasterProfileEditor
          initialProfile={profile}
          initialEducation={educationRows}
          initialExperiences={experienceRows}
          initialProjects={projectRows}
          initialSkills={skillRows}
          initialPublications={publicationRows}
          initialAchievements={achievementRows}
          initialCertifications={certificationRows}
          initialCustomSections={customSectionRows}
        />
      </main>
    </AppShell>
  );
}
