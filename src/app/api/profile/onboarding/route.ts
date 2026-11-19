import { NextResponse } from 'next/server';
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
  documents,
  documentSections,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const user = await requireAuthUser();
    const body = await request.json();

    const {
      outputType = 'resume',
      backgroundGroup,
      specialization,
      stage,
      purposes = [],
      formValues = {},
    } = body;

    let profileId: string;
    let documentId: string;

    await db.transaction(async (tx) => {
      // 1. Fetch or create Master Profile
      const existingProfiles = await tx
        .select()
        .from(masterProfiles)
        .where(eq(masterProfiles.userId, user.id))
        .limit(1);

      // Extract social links and contact info from onboarding answers
      const socialLinks: Record<string, string> = {};
      if (formValues.github_profile && typeof formValues.github_profile === 'string') {
        socialLinks.github = formValues.github_profile;
      }
      if (formValues.portfolio_links && typeof formValues.portfolio_links === 'string') {
        socialLinks.portfolio = formValues.portfolio_links;
      }
      if (formValues.portfolio_or_work_link && typeof formValues.portfolio_or_work_link === 'string') {
        socialLinks.portfolio = formValues.portfolio_or_work_link;
      }

      if (existingProfiles.length > 0) {
        profileId = existingProfiles[0].id;
        await tx
          .update(masterProfiles)
          .set({
            backgroundGroup,
            specialization,
            stage,
            purposes,
            socialLinks: {
              ...(existingProfiles[0].socialLinks || {}),
              ...socialLinks,
            },
            updatedAt: new Date(),
          })
          .where(eq(masterProfiles.id, profileId));
      } else {
        const inserted = await tx
          .insert(masterProfiles)
          .values({
            userId: user.id,
            backgroundGroup,
            specialization,
            stage,
            purposes,
            socialLinks,
          })
          .returning();
        profileId = inserted[0].id;
      }

      // 2. Populate Education table directly from onboarding answers (stable upsert)
      if (formValues.degree || formValues.institution) {
        const existingEdu = await tx
          .select()
          .from(education)
          .where(eq(education.profileId, profileId))
          .limit(1);

        if (existingEdu.length === 0) {
          await tx.insert(education).values({
            profileId,
            degree: (formValues.degree as string) || 'Degree Program',
            institution: (formValues.institution as string) || 'University / Institution',
            gradeValue: (formValues.cgpa_percentage as string) || null,
            gradeType: formValues.cgpa_percentage ? 'cgpa' : 'none',
          });
        }
      }

      // 3. Populate Projects table from onboarding questions
      const projectEntries = [
        {
          title: (formValues.final_year_project_title as string)?.trim(),
          desc: (formValues.final_year_project_description as string)?.trim(),
        },
        {
          title: (formValues.msc_bsc_project_title as string)?.trim(),
          desc: (formValues.project_description as string)?.trim(),
        },
        {
          title: (formValues.academic_projects as string)?.trim(),
          desc: '',
        },
        {
          title: (formValues.independent_projects as string)?.trim(),
          desc: '',
        },
        {
          title: (formValues.key_projects as string)?.trim(),
          desc: '',
        },
      ].filter((p) => Boolean(p.title));

      for (let i = 0; i < projectEntries.length; i++) {
        const p = projectEntries[i];
        await tx.insert(projects).values({
          profileId,
          title: p.title!,
          bullets: p.desc ? [p.desc] : [],
          orderIndex: i,
        });
      }

      // 4. Populate Experiences table from onboarding questions
      const experienceEntries = [
        {
          org: (formValues.internships_industrial_training as string)?.trim(),
          type: 'internship',
          role: 'Intern / Industrial Trainee',
        },
        {
          org: (formValues.internships_or_articleship as string)?.trim(),
          type: 'internship',
          role: 'Articleship / Intern',
        },
        {
          org: (formValues.internships_work_experience as string)?.trim(),
          type: 'internship',
          role: 'Intern / Associate',
        },
        {
          org: (formValues.internships_or_trainings as string)?.trim(),
          type: 'internship',
          role: 'Research / Laboratory Intern',
        },
        {
          org: (formValues.key_experiences as string)?.trim(),
          type: 'job',
          role: 'Professional Experience',
        },
      ].filter((e) => Boolean(e.org));

      for (let i = 0; i < experienceEntries.length; i++) {
        const e = experienceEntries[i];
        await tx.insert(experiences).values({
          profileId,
          organization: e.org!,
          type: e.type,
          role: e.role,
          bullets: [],
          orderIndex: i,
        });
      }

      // 5. Populate Achievements table from onboarding questions
      const achievementEntries = [
        { title: (formValues.technical_competitions as string)?.trim(), org: 'Technical Competition' },
        { title: (formValues.competitions as string)?.trim(), org: 'Competition / Contest' },
        { title: (formValues.exhibitions_performances as string)?.trim(), org: 'Exhibition / Performance' },
        { title: (formValues.scientific_publications_presentations as string)?.trim(), org: 'Scientific Presentation / Publication' },
        { title: (formValues.credentials_awards as string)?.trim(), org: 'Award / Honor' },
      ].filter((a) => Boolean(a.title));

      for (let i = 0; i < achievementEntries.length; i++) {
        const a = achievementEntries[i];
        await tx.insert(achievements).values({
          profileId,
          title: a.title!,
          issuerOrOrg: a.org,
          orderIndex: i,
        });
      }

      // 6. Populate Certifications table from onboarding questions
      const certificationEntries = [
        { name: (formValues.certifications_pursued as string)?.trim(), issuer: 'Certification Authority' },
        { name: (formValues.workshops_trainings as string)?.trim(), issuer: 'Workshop / Training Program' },
      ].filter((c) => Boolean(c.name));

      for (let i = 0; i < certificationEntries.length; i++) {
        const c = certificationEntries[i];
        await tx.insert(certifications).values({
          profileId,
          name: c.name!,
          issuer: c.issuer,
          orderIndex: i,
        });
      }

      // 7. Populate Skills table from department questions
      const tagFields = [
        { key: 'programming_languages', category: 'Programming languages' },
        { key: 'frameworks_and_libraries', category: 'Frameworks and libraries' },
        { key: 'databases', category: 'Databases' },
        { key: 'development_tools', category: 'Development tools' },
        { key: 'software_architecture_experience', category: 'Software architecture' },
        { key: 'technical_interests', category: 'Technical interests' },
        { key: 'cad_software', category: 'CAD software' },
        { key: 'simulation_tools', category: 'Simulation tools' },
        { key: 'manufacturing_processes', category: 'Manufacturing processes' },
        { key: 'circuit_design', category: 'Circuit design' },
        { key: 'embedded_systems', category: 'Embedded systems' },
        { key: 'microcontrollers', category: 'Microcontrollers' },
        { key: 'pcb_design', category: 'PCB design' },
        { key: 'power_systems', category: 'Power systems' },
        { key: 'matlab_simulation_tools', category: 'Simulation tools' },
        { key: 'instrumentation', category: 'Instrumentation' },
        { key: 'structural_design', category: 'Structural design' },
        { key: 'surveying', category: 'Surveying' },
        { key: 'construction_management', category: 'Construction management' },
        { key: 'civil_software', category: 'Civil software' },
        { key: 'financial_analysis', category: 'Financial analysis' },
        { key: 'accounting', category: 'Accounting' },
        { key: 'auditing', category: 'Auditing' },
        { key: 'taxation', category: 'Taxation' },
        { key: 'financial_modelling', category: 'Financial modelling' },
        { key: 'excel_and_financial_tools', category: 'Financial tools' },
        { key: 'market_research', category: 'Market research' },
        { key: 'digital_marketing', category: 'Digital marketing' },
        { key: 'seo', category: 'SEO' },
        { key: 'social_media_campaigns', category: 'Social media campaigns' },
        { key: 'business_development', category: 'Business development' },
        { key: 'strategic_planning', category: 'Strategic planning' },
        { key: 'leadership', category: 'Leadership' },
        { key: 'sales_experience', category: 'Sales experience' },
        { key: 'research_interests', category: 'Research interests' },
        { key: 'research_methodology', category: 'Research methodology' },
        { key: 'psychometric_tools', category: 'Psychometric tools' },
        { key: 'design_software', category: 'Design software' },
        { key: 'ui_ux_work', category: 'UI/UX work' },
        { key: 'creative_techniques', category: 'Creative techniques' },
        { key: 'instruments_and_tools', category: 'Instruments and tools' },
        { key: 'laboratory_experience', category: 'Laboratory experience' },
        { key: 'scientific_software', category: 'Scientific software' },
        { key: 'professional_tools', category: 'Professional tools' },
        { key: 'competencies_skills', category: 'Competencies' },
      ];

      for (const item of tagFields) {
        const val = formValues[item.key];
        if (Array.isArray(val) && val.length > 0) {
          await tx.insert(skills).values({
            profileId,
            category: item.category,
            items: val.map((name: string) => ({ name })),
          });
        }
      }

      // 4. Create Initial Document (Resume or Academic CV)
      const templateId =
        outputType === 'cv'
          ? 'academic_cv'
          : 'ats_single_column';

      const docTitle =
        outputType === 'cv'
          ? `${specialization || 'Academic'} CV`
          : `${specialization || 'Professional'} Resume`;

      const newDocs = await tx
        .insert(documents)
        .values({
          userId: user.id,
          title: docTitle,
          type: outputType === 'cv' ? 'cv' : 'resume',
          templateId,
          targetRole: specialization || '',
        })
        .returning();

      const createdDoc = newDocs[0];
      documentId = createdDoc.id;

      // Seed default document sections
      const defaultSections = [
        { type: 'header', title: 'Contact Header', order: 0, content: { email: user.email, name: user.user_metadata?.full_name || '' } },
        { type: 'education', title: 'Education', order: 1, content: {} },
        { type: 'skills', title: 'Skills', order: 2, content: {} },
        { type: 'projects', title: 'Projects', order: 3, content: {} },
        { type: 'experiences', title: 'Experience', order: 4, content: {} },
      ];

      for (const s of defaultSections) {
        await tx.insert(documentSections).values({
          documentId: createdDoc.id,
          sectionType: s.type,
          title: s.title,
          orderIndex: s.order,
          content: s.content,
        });
      }
    });

    return NextResponse.json({
      success: true,
      profileId: profileId!,
      documentId: documentId!,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('Onboarding API error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
