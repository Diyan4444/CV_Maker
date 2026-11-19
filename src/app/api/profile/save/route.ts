import { NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import {
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
import { eq, inArray } from 'drizzle-orm';

interface SaveProfileRequestBody {
  profile: {
    headline?: string;
    summary?: string;
    contactInfo?: Record<string, unknown>;
    socialLinks?: Record<string, unknown>;
    updatedAt?: string; // For optimistic concurrency check
  };
  clientUpdatedAt?: string;
  educations?: Array<{ id?: string; institution?: string; degree?: string; fieldOfStudy?: string; gradeValue?: string }>;
  experiences?: Array<{ id?: string; type?: string; organization?: string; role?: string; bullets?: string[] }>;
  projects?: Array<{ id?: string; title?: string; role?: string; bullets?: string[]; toolsUsed?: string[] }>;
  skills?: Array<{ id?: string; category?: string; items?: { name: string; proficiency?: string }[] }>;
  publications?: Array<{ id?: string; title?: string; venue?: string; publicationDate?: string; doiOrUrl?: string; summary?: string }>;
  achievements?: Array<{ id?: string; title?: string; issuerOrOrg?: string; date?: string; description?: string }>;
  certifications?: Array<{ id?: string; name?: string; issuer?: string; issueDate?: string; url?: string }>;
  customSections?: Array<{ id?: string; sectionTitle?: string; entries?: unknown[] }>;
}

export async function POST(request: Request) {
  try {
    const user = await requireAuthUser();
    const body: SaveProfileRequestBody = await request.json();

    const {
      profile,
      clientUpdatedAt,
      educations = [],
      experiences: exps = [],
      projects: projs = [],
      skills: sks = [],
      publications: pubs = [],
      achievements: achs = [],
      certifications: certs = [],
      customSections: customs = [],
    } = body;

    // 1. Verify Master Profile ownership
    const existing = await db
      .select()
      .from(masterProfiles)
      .where(eq(masterProfiles.userId, user.id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Master profile not found' }, { status: 404 });
    }

    const currentProfile = existing[0];
    const profileId = currentProfile.id;

    // 2. Optimistic Concurrency Check:
    // If client provides clientUpdatedAt or profile.updatedAt and it does not match currentProfile.updatedAt, reject stale save
    const incomingTimestamp = clientUpdatedAt || profile.updatedAt;
    if (incomingTimestamp) {
      const clientTime = new Date(incomingTimestamp).getTime();
      const serverTime = new Date(currentProfile.updatedAt).getTime();
      // Allow 1000ms jitter, but if client is meaningfully older, reject
      if (serverTime - clientTime > 1000) {
        return NextResponse.json(
          {
            error: 'STALE_SAVE_CONFLICT',
            message: 'Your profile was modified in another session. Please refresh to load the latest data before saving.',
            serverUpdatedAt: currentProfile.updatedAt.toISOString(),
          },
          { status: 409 }
        );
      }
    }

    const newUpdatedAt = new Date();

    // 3. Stable-ID Transactional Sync:
    // Upsert items by ID; delete ONLY rows removed by user. Never wipe-and-reinsert.
    await db.transaction(async (tx) => {
      // a. Update master profile top-level fields
      await tx
        .update(masterProfiles)
        .set({
          headline: profile.headline ?? currentProfile.headline,
          summary: profile.summary ?? currentProfile.summary,
          contactInfo: profile.contactInfo ?? currentProfile.contactInfo,
          socialLinks: profile.socialLinks ?? currentProfile.socialLinks,
          updatedAt: newUpdatedAt,
        })
        .where(eq(masterProfiles.id, profileId));

      // b. Sync Education with Stable IDs
      const validEdu = educations.filter((e) => (e.institution || '').trim() || (e.degree || '').trim());
      const keptEduIds = validEdu.map((e) => e.id).filter((id): id is string => Boolean(id && !id.startsWith('temp-')));
      
      const currentEduRows = await tx.select({ id: education.id }).from(education).where(eq(education.profileId, profileId));
      const eduToDelete = currentEduRows.map((r) => r.id).filter((id) => !keptEduIds.includes(id));
      if (eduToDelete.length > 0) {
        await tx.delete(education).where(inArray(education.id, eduToDelete));
      }

      // Upsert / Insert education
      for (let i = 0; i < validEdu.length; i++) {
        const edu = validEdu[i];
        if (edu.id && !edu.id.startsWith('temp-') && keptEduIds.includes(edu.id)) {
          await tx
            .update(education)
            .set({
              institution: edu.institution || 'Institution',
              degree: edu.degree || 'Degree',
              fieldOfStudy: edu.fieldOfStudy || '',
              gradeValue: edu.gradeValue || null,
              gradeType: edu.gradeValue ? 'cgpa' : 'none',
              orderIndex: i,
            })
            .where(eq(education.id, edu.id));
        } else {
          await tx.insert(education).values({
            profileId,
            institution: edu.institution || 'Institution',
            degree: edu.degree || 'Degree',
            fieldOfStudy: edu.fieldOfStudy || '',
            gradeValue: edu.gradeValue || null,
            gradeType: edu.gradeValue ? 'cgpa' : 'none',
            orderIndex: i,
          });
        }
      }

      // c. Sync Experiences with Stable IDs
      const validExp = exps.filter((e) => (e.organization || '').trim() || (e.role || '').trim());
      const keptExpIds = validExp.map((e) => e.id).filter((id): id is string => Boolean(id && !id.startsWith('temp-')));
      const currentExpRows = await tx.select({ id: experiences.id }).from(experiences).where(eq(experiences.profileId, profileId));
      const expToDelete = currentExpRows.map((r) => r.id).filter((id) => !keptExpIds.includes(id));
      if (expToDelete.length > 0) {
        await tx.delete(experiences).where(inArray(experiences.id, expToDelete));
      }

      for (let i = 0; i < validExp.length; i++) {
        const e = validExp[i];
        if (e.id && !e.id.startsWith('temp-') && keptExpIds.includes(e.id)) {
          await tx
            .update(experiences)
            .set({
              type: e.type || 'job',
              organization: e.organization || 'Organization',
              role: e.role || 'Role',
              bullets: e.bullets || [],
              orderIndex: i,
            })
            .where(eq(experiences.id, e.id));
        } else {
          await tx.insert(experiences).values({
            profileId,
            type: e.type || 'job',
            organization: e.organization || 'Organization',
            role: e.role || 'Role',
            bullets: e.bullets || [],
            orderIndex: i,
          });
        }
      }

      // d. Sync Projects with Stable IDs
      const validProjs = projs.filter((p) => (p.title || '').trim());
      const keptProjIds = validProjs.map((p) => p.id).filter((id): id is string => Boolean(id && !id.startsWith('temp-')));
      const currentProjRows = await tx.select({ id: projects.id }).from(projects).where(eq(projects.profileId, profileId));
      const projToDelete = currentProjRows.map((r) => r.id).filter((id) => !keptProjIds.includes(id));
      if (projToDelete.length > 0) {
        await tx.delete(projects).where(inArray(projects.id, projToDelete));
      }

      for (let i = 0; i < validProjs.length; i++) {
        const p = validProjs[i];
        if (p.id && !p.id.startsWith('temp-') && keptProjIds.includes(p.id)) {
          await tx
            .update(projects)
            .set({
              title: p.title || 'Project',
              role: p.role || '',
              bullets: p.bullets || [],
              toolsUsed: p.toolsUsed || [],
              orderIndex: i,
            })
            .where(eq(projects.id, p.id));
        } else {
          await tx.insert(projects).values({
            profileId,
            title: p.title || 'Project',
            role: p.role || '',
            bullets: p.bullets || [],
            toolsUsed: p.toolsUsed || [],
            orderIndex: i,
          });
        }
      }

      // e. Sync Skills with Stable IDs
      const validSkills = sks.filter((s) => (s.category || '').trim());
      const keptSkillIds = validSkills.map((s) => s.id).filter((id): id is string => Boolean(id && !id.startsWith('temp-')));
      const currentSkillRows = await tx.select({ id: skills.id }).from(skills).where(eq(skills.profileId, profileId));
      const skillToDelete = currentSkillRows.map((r) => r.id).filter((id) => !keptSkillIds.includes(id));
      if (skillToDelete.length > 0) {
        await tx.delete(skills).where(inArray(skills.id, skillToDelete));
      }

      for (let i = 0; i < validSkills.length; i++) {
        const s = validSkills[i];
        if (s.id && !s.id.startsWith('temp-') && keptSkillIds.includes(s.id)) {
          await tx
            .update(skills)
            .set({
              category: s.category || 'General',
              items: s.items || [],
              orderIndex: i,
            })
            .where(eq(skills.id, s.id));
        } else {
          await tx.insert(skills).values({
            profileId,
            category: s.category || 'General',
            items: s.items || [],
            orderIndex: i,
          });
        }
      }

      // f. Sync Publications with Stable IDs
      const validPubs = pubs.filter((p) => (p.title || '').trim());
      const keptPubIds = validPubs.map((p) => p.id).filter((id): id is string => Boolean(id && !id.startsWith('temp-')));
      const currentPubRows = await tx.select({ id: publications.id }).from(publications).where(eq(publications.profileId, profileId));
      const pubToDelete = currentPubRows.map((r) => r.id).filter((id) => !keptPubIds.includes(id));
      if (pubToDelete.length > 0) {
        await tx.delete(publications).where(inArray(publications.id, pubToDelete));
      }

      for (let i = 0; i < validPubs.length; i++) {
        const pub = validPubs[i];
        if (pub.id && !pub.id.startsWith('temp-') && keptPubIds.includes(pub.id)) {
          await tx
            .update(publications)
            .set({
              title: pub.title || 'Publication',
              venue: pub.venue || '',
              publicationDate: pub.publicationDate || '',
              doiOrUrl: pub.doiOrUrl || '',
              summary: pub.summary || '',
              orderIndex: i,
            })
            .where(eq(publications.id, pub.id));
        } else {
          await tx.insert(publications).values({
            profileId,
            title: pub.title || 'Publication',
            venue: pub.venue || '',
            publicationDate: pub.publicationDate || '',
            doiOrUrl: pub.doiOrUrl || '',
            summary: pub.summary || '',
            orderIndex: i,
          });
        }
      }

      // g. Sync Achievements with Stable IDs
      const validAchs = achs.filter((a) => (a.title || '').trim());
      const keptAchIds = validAchs.map((a) => a.id).filter((id): id is string => Boolean(id && !id.startsWith('temp-')));
      const currentAchRows = await tx.select({ id: achievements.id }).from(achievements).where(eq(achievements.profileId, profileId));
      const achToDelete = currentAchRows.map((r) => r.id).filter((id) => !keptAchIds.includes(id));
      if (achToDelete.length > 0) {
        await tx.delete(achievements).where(inArray(achievements.id, achToDelete));
      }

      for (let i = 0; i < validAchs.length; i++) {
        const ach = validAchs[i];
        if (ach.id && !ach.id.startsWith('temp-') && keptAchIds.includes(ach.id)) {
          await tx
            .update(achievements)
            .set({
              title: ach.title || 'Achievement',
              issuerOrOrg: ach.issuerOrOrg || '',
              date: ach.date || '',
              description: ach.description || '',
              orderIndex: i,
            })
            .where(eq(achievements.id, ach.id));
        } else {
          await tx.insert(achievements).values({
            profileId,
            title: ach.title || 'Achievement',
            issuerOrOrg: ach.issuerOrOrg || '',
            date: ach.date || '',
            description: ach.description || '',
            orderIndex: i,
          });
        }
      }

      // h. Sync Certifications with Stable IDs
      const validCerts = certs.filter((c) => (c.name || '').trim());
      const keptCertIds = validCerts.map((c) => c.id).filter((id): id is string => Boolean(id && !id.startsWith('temp-')));
      const currentCertRows = await tx.select({ id: certifications.id }).from(certifications).where(eq(certifications.profileId, profileId));
      const certToDelete = currentCertRows.map((r) => r.id).filter((id) => !keptCertIds.includes(id));
      if (certToDelete.length > 0) {
        await tx.delete(certifications).where(inArray(certifications.id, certToDelete));
      }

      for (let i = 0; i < validCerts.length; i++) {
        const cert = validCerts[i];
        if (cert.id && !cert.id.startsWith('temp-') && keptCertIds.includes(cert.id)) {
          await tx
            .update(certifications)
            .set({
              name: cert.name || 'Certification',
              issuer: cert.issuer || 'Issuing Organization',
              issueDate: cert.issueDate || '',
              url: cert.url || '',
              orderIndex: i,
            })
            .where(eq(certifications.id, cert.id));
        } else {
          await tx.insert(certifications).values({
            profileId,
            name: cert.name || 'Certification',
            issuer: cert.issuer || 'Issuing Organization',
            issueDate: cert.issueDate || '',
            url: cert.url || '',
            orderIndex: i,
          });
        }
      }

      // i. Sync Custom Sections with Stable IDs
      const validCustoms = customs.filter((cs) => (cs.sectionTitle || '').trim());
      const keptCustomIds = validCustoms.map((cs) => cs.id).filter((id): id is string => Boolean(id && !id.startsWith('temp-')));
      const currentCustomRows = await tx.select({ id: customSections.id }).from(customSections).where(eq(customSections.profileId, profileId));
      const customToDelete = currentCustomRows.map((r) => r.id).filter((id) => !keptCustomIds.includes(id));
      if (customToDelete.length > 0) {
        await tx.delete(customSections).where(inArray(customSections.id, customToDelete));
      }

      for (let i = 0; i < validCustoms.length; i++) {
        const cs = validCustoms[i];
        if (cs.id && !cs.id.startsWith('temp-') && keptCustomIds.includes(cs.id)) {
          await tx
            .update(customSections)
            .set({
              sectionTitle: cs.sectionTitle || 'Custom Section',
              entries: (cs.entries as { title: string; subtitle?: string; date?: string; description?: string; bullets?: string[] }[]) || [],
              orderIndex: i,
            })
            .where(eq(customSections.id, cs.id));
        } else {
          await tx.insert(customSections).values({
            profileId,
            sectionTitle: cs.sectionTitle || 'Custom Section',
            entries: (cs.entries as { title: string; subtitle?: string; date?: string; description?: string; bullets?: string[] }[]) || [],
            orderIndex: i,
          });
        }
      }
    });

    return NextResponse.json({
      success: true,
      updatedAt: newUpdatedAt.toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save profile';
    console.error('Save profile error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
