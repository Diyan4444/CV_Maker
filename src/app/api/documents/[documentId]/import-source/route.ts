import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { requireAuthUser } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import {
  documents,
  masterProfiles,
  education,
  experiences,
  projects,
  skills,
  publications,
  achievements,
  certifications,
  customSections,
} from '@/lib/db/schema';
import { createDocumentSectionsFromProfile, MasterProfileDataset } from '@/lib/documents/profile-to-document';
import { SectionType } from '@/lib/documents/types';

const ALLOWED_IMPORT_SECTIONS = new Set<SectionType>([
  'header',
  'summary',
  'education',
  'experience',
  'projects',
  'skills',
  'publications',
  'achievements',
  'certifications',
  'custom',
]);

interface RouteContext {
  params: Promise<{ documentId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireAuthUser();
    const { documentId } = await params;
    const sectionParam = (req.nextUrl.searchParams.get('section') || '').trim() as SectionType;

    if (!ALLOWED_IMPORT_SECTIONS.has(sectionParam)) {
      return NextResponse.json(
        { error: 'Invalid or missing section parameter.' },
        { status: 400 }
      );
    }

    const [doc] = await db
      .select({ id: documents.id, type: documents.type })
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, user.id)))
      .limit(1);

    if (!doc) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }

    const [profile] = await db
      .select()
      .from(masterProfiles)
      .where(eq(masterProfiles.userId, user.id))
      .limit(1);

    const profileId = profile?.id;

    let educationRows: typeof education.$inferSelect[] = [];
    let experienceRows: typeof experiences.$inferSelect[] = [];
    let projectRows: typeof projects.$inferSelect[] = [];
    let skillRows: typeof skills.$inferSelect[] = [];
    let publicationRows: typeof publications.$inferSelect[] = [];
    let achievementRows: typeof achievements.$inferSelect[] = [];
    let certificationRows: typeof certifications.$inferSelect[] = [];
    let customSectionRows: typeof customSections.$inferSelect[] = [];

    if (profileId) {
      if (sectionParam === 'education') {
        educationRows = await db.select().from(education).where(eq(education.profileId, profileId));
      } else if (sectionParam === 'experience') {
        experienceRows = await db.select().from(experiences).where(eq(experiences.profileId, profileId));
      } else if (sectionParam === 'projects') {
        projectRows = await db.select().from(projects).where(eq(projects.profileId, profileId));
      } else if (sectionParam === 'skills') {
        skillRows = await db.select().from(skills).where(eq(skills.profileId, profileId));
      } else if (sectionParam === 'publications') {
        publicationRows = await db.select().from(publications).where(eq(publications.profileId, profileId));
      } else if (sectionParam === 'achievements') {
        achievementRows = await db.select().from(achievements).where(eq(achievements.profileId, profileId));
      } else if (sectionParam === 'certifications') {
        certificationRows = await db.select().from(certifications).where(eq(certifications.profileId, profileId));
      } else if (sectionParam === 'custom') {
        customSectionRows = await db.select().from(customSections).where(eq(customSections.profileId, profileId));
      }
    }

    if (sectionParam === 'custom') {
      const customEntries = customSectionRows.flatMap((cs) =>
        (cs.entries || []).map((entry) => ({
          id: randomUUID(),
          sourceId: cs.id,
          isVisible: true,
          title: entry.title || '',
          subtitle: entry.subtitle || undefined,
          date: entry.date || undefined,
          description: entry.description || undefined,
          bullets: entry.bullets || [],
        }))
      );
      return NextResponse.json({
        section: 'custom',
        hasData: customEntries.length > 0,
        count: customEntries.length,
        entries: customEntries,
      });
    }

    const dataset: MasterProfileDataset = {
      profile: profile || null,
      userMeta: {
        fullName: (user.user_metadata?.full_name as string) || '',
        email: user.email || '',
      },
      education: educationRows,
      experiences: experienceRows,
      projects: projectRows,
      skills: skillRows,
      publications: publicationRows,
      achievements: achievementRows,
      certifications: certificationRows.map((c) => ({
        id: c.id,
        name: c.name,
        issuingOrg: c.issuer,
        issueDate: c.issueDate,
        credentialUrl: c.url,
      })),
      customSections: [],
    };

    const generated = createDocumentSectionsFromProfile(
      doc.id,
      doc.type === 'cv' ? 'cv' : 'resume',
      dataset
    );

    if (sectionParam === 'header') {
      const headerSec = generated.find((s) => s.sectionType === 'header');
      const content = (headerSec?.content as Record<string, unknown>) || null;
      const hasData = Boolean(
        content &&
          (String(content.fullName || '').trim() ||
            String(content.email || '').trim() ||
            String(content.phone || '').trim() ||
            String(content.headline || '').trim())
      );
      return NextResponse.json({
        section: 'header',
        hasData,
        count: hasData ? 1 : 0,
        content,
      });
    }

    if (sectionParam === 'summary') {
      const summarySec = generated.find((s) => s.sectionType === 'summary');
      const text = ((summarySec?.content as { text?: string })?.text || '').trim();
      const hasData = text.length > 0;
      return NextResponse.json({
        section: 'summary',
        hasData,
        count: hasData ? 1 : 0,
        content: hasData ? { schema_version: '1.0.0', text } : null,
      });
    }

    const matchingSec = generated.find((s) => s.sectionType === sectionParam);
    const entries = ((matchingSec?.content as { entries?: unknown[] })?.entries || []) as unknown[];

    return NextResponse.json({
      section: sectionParam,
      hasData: entries.length > 0,
      count: entries.length,
      entries,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Failed to load master profile entries.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
