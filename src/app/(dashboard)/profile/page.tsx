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
import { PRODUCT_NAME } from '@/config/app';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';

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
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--border-muted)] bg-[var(--surface)] sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="/dashboard" className="font-display text-xl font-bold tracking-tight text-[var(--text)]">
              {PRODUCT_NAME}
            </a>
            <nav className="flex items-center gap-4 text-xs font-medium">
              <a href="/dashboard" className="text-[var(--text-muted)] hover:text-[var(--text)]">
                Dashboard
              </a>
              <a href="/profile" className="text-[var(--text)] border-b-2 border-[var(--accent)] pb-0.5">
                Master Profile
              </a>
              <a href="/website" className="text-[var(--text-muted)] hover:text-[var(--text)]">
                Public Site
              </a>
            </nav>
          </div>
          <ThemeSwitcher />
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        <div className="mb-8 pb-6 border-b border-[var(--border-muted)]">
          <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text)]">
            Master Profile
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Single normalized source of truth for all your career and academic facts. Changes made here can be reused across all your resumes, CVs, and website.
          </p>
        </div>

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
    </div>
  );
}
