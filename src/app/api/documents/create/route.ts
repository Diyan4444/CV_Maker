import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import {
  documents,
  documentSections,
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
import { eq, count } from 'drizzle-orm';
import { createDocumentSectionsFromProfile } from '@/lib/documents/profile-to-document';
import { DocumentType, TemplateId } from '@/lib/documents/types';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthUser();

    // 1. Enforce 20-document user cap with user-friendly error
    const [docCountRow] = await db
      .select({ count: count() })
      .from(documents)
      .where(eq(documents.userId, user.id));

    const totalDocs = Number(docCountRow?.count || 0);
    if (totalDocs >= 20) {
      return NextResponse.json(
        {
          error:
            'You have reached the maximum limit of 20 documents. Please delete an older document to create a new one.',
          code: 'DOCUMENT_LIMIT_REACHED',
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const type: DocumentType = body.type === 'cv' ? 'cv' : 'resume';
    const templateId: TemplateId =
      body.templateId || (type === 'cv' ? 'academic_cv' : 'ats_single_column');
    const title = (body.title || (type === 'cv' ? 'Academic Curriculum Vitae' : 'Professional Resume')).slice(
      0,
      200
    );
    const targetRole = body.targetRole ? String(body.targetRole).slice(0, 200) : null;
    const accentColor = body.accentColor || '#1A1A1A';

    // 2. Fetch user master profile & all child tables
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
      [
        educationRows,
        experienceRows,
        projectRows,
        skillRows,
        publicationRows,
        achievementRows,
        certificationRows,
        customSectionRows,
      ] = await Promise.all([
        db.select().from(education).where(eq(education.profileId, profileId)),
        db.select().from(experiences).where(eq(experiences.profileId, profileId)),
        db.select().from(projects).where(eq(projects.profileId, profileId)),
        db.select().from(skills).where(eq(skills.profileId, profileId)),
        db.select().from(publications).where(eq(publications.profileId, profileId)),
        db.select().from(achievements).where(eq(achievements.profileId, profileId)),
        db.select().from(certifications).where(eq(certifications.profileId, profileId)),
        db.select().from(customSections).where(eq(customSections.profileId, profileId)),
      ]);
    }

    const docId = randomUUID();

    // 3. Clone profile data into independent document sections
    const generatedSections = createDocumentSectionsFromProfile(docId, type, {
      profile: profile || null,
      userMeta: {
        fullName: user.user_metadata?.full_name || '',
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
        name: c.name || '',
        issuingOrg: c.issuer || '',
        issueDate: c.issueDate,
        credentialUrl: c.url,
      })),
      customSections: customSectionRows.map((cs) => ({
        id: cs.id,
        title: cs.sectionTitle,
        entries: cs.entries,
      })),
    });

    // 4. Save document and sections atomically in a single transaction
    await db.transaction(async (tx) => {
      await tx.insert(documents).values({
        id: docId,
        userId: user.id,
        title,
        type,
        templateId,
        accentColor,
        targetRole,
        version: 1,
        schemaVersion: '1.0.0',
        isArchived: false,
      });

      if (generatedSections.length > 0) {
        await tx.insert(documentSections).values(
          generatedSections.map((sec) => ({
            id: sec.id,
            documentId: docId,
            sectionType: (sec.sectionType || sec.section_type || 'custom') as string,
            title: sec.title,
            orderIndex: sec.orderIndex ?? sec.section_order ?? 0,
            isVisible: sec.isVisible ?? sec.is_visible ?? true,
            content: sec.content,
          }))
        );
      }
    });

    return NextResponse.json({
      success: true,
      documentId: docId,
      document: { id: docId },
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    console.error('[DOCUMENT_CREATE_ERROR] Failed to create document');
    const message = err instanceof Error ? err.message : 'Failed to create document.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
