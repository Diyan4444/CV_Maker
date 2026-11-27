import React from 'react';
import { redirect } from 'next/navigation';
import { getVerifiedUser } from '@/lib/supabase/server';
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
import { Emph } from '@/components/ui/Emph';
import { FloatCard } from '@/components/ui/FloatCard';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { GLASS_TOKENS } from '@/styles/tokens';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await getVerifiedUser();
  if (!user) {
    redirect('/login?next=/profile');
  }

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

  // 2. Fetch all 8 child profile sections in parallel (1 round trip instead of 8)
  const [
    educationRows,
    experienceRows,
    projectRows,
    skillRows,
    publicationRows,
    achievementRows,
    certificationRows,
    customSectionRows,
  ] = await Promise.all([
    db.select().from(education).where(eq(education.profileId, profile.id)).orderBy(desc(education.startDate)),
    db.select().from(experiences).where(eq(experiences.profileId, profile.id)).orderBy(desc(experiences.startDate)),
    db.select().from(projects).where(eq(projects.profileId, profile.id)).orderBy(projects.orderIndex),
    db.select().from(skills).where(eq(skills.profileId, profile.id)).orderBy(skills.orderIndex),
    db.select().from(publications).where(eq(publications.profileId, profile.id)).orderBy(publications.orderIndex),
    db.select().from(achievements).where(eq(achievements.profileId, profile.id)).orderBy(achievements.orderIndex),
    db.select().from(certifications).where(eq(certifications.profileId, profile.id)).orderBy(certifications.orderIndex),
    db.select().from(customSections).where(eq(customSections.profileId, profile.id)).orderBy(customSections.orderIndex),
  ]);

  return (
    <AppShell userEmail={user.email || ''} currentPath="/profile">
      {/* Main Content */}
      <main className="w-full min-w-0 space-y-7 pt-2">
        {/* Page Title & Instructions Panel */}
        <FloatCard floatIndex={1}>
          <GlassPanel variant="frosted" className="p-6 sm:p-8">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: GLASS_TOKENS.fg }}>
              <Emph headingKey="profile" />
            </h1>
            <p className="text-xs sm:text-sm mt-1.5 leading-relaxed max-w-[70ch]" style={{ color: GLASS_TOKENS.fgMuted }}>
              Single normalized source of truth for all your career and academic facts. Changes made here can be reused across all your resumes and CVs.
            </p>
          </GlassPanel>
        </FloatCard>

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
