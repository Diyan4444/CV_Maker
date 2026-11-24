import { NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/supabase/server';
import postgres from 'postgres';
import { AccountExportDataSchema } from '@/lib/account/export-schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  let user;
  try {
    user = await requireAuthUser();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ error: 'Database connection unavailable' }, { status: 500 });
  }

  const sql = postgres(dbUrl, {
    prepare: false,
    max: 1,
    idle_timeout: 10,
    connect_timeout: 10,
  });

  try {
    // 1. User profile
    const [profile] = await sql`
      SELECT * FROM public.profiles WHERE id = ${user.id}
    `;

    // 2. Master profile & child entities
    const [masterProfile] = await sql`
      SELECT * FROM public.master_profiles WHERE user_id = ${user.id}
    `;

    let education: any[] = [];
    let experiences: any[] = [];
    let projects: any[] = [];
    let skills: any[] = [];
    let publications: any[] = [];
    let achievements: any[] = [];
    let certifications: any[] = [];
    let customSections: any[] = [];

    if (masterProfile?.id) {
      const pid = masterProfile.id;
      [
        education,
        experiences,
        projects,
        skills,
        publications,
        achievements,
        certifications,
        customSections,
      ] = await Promise.all([
        sql`SELECT * FROM public.education WHERE profile_id = ${pid} ORDER BY order_index ASC`,
        sql`SELECT * FROM public.experiences WHERE profile_id = ${pid} ORDER BY order_index ASC`,
        sql`SELECT * FROM public.projects WHERE profile_id = ${pid} ORDER BY order_index ASC`,
        sql`SELECT * FROM public.skills WHERE profile_id = ${pid} ORDER BY order_index ASC`,
        sql`SELECT * FROM public.publications WHERE profile_id = ${pid} ORDER BY order_index ASC`,
        sql`SELECT * FROM public.achievements WHERE profile_id = ${pid} ORDER BY order_index ASC`,
        sql`SELECT * FROM public.certifications WHERE profile_id = ${pid} ORDER BY order_index ASC`,
        sql`SELECT * FROM public.custom_sections WHERE profile_id = ${pid} ORDER BY order_index ASC`,
      ]);
    }

    // 3. Documents and their sections
    const rawDocuments = await sql`
      SELECT * FROM public.documents WHERE user_id = ${user.id} ORDER BY created_at DESC
    `;

    const documentsWithSections = await Promise.all(
      rawDocuments.map(async (doc) => {
        const sections = await sql`
          SELECT * FROM public.document_sections WHERE document_id = ${doc.id} ORDER BY order_index ASC
        `;
        return {
          ...doc,
          sections: Array.from(sections),
        };
      })
    );

    // 4. Website settings
    const [website] = await sql`
      SELECT * FROM public.websites WHERE user_id = ${user.id}
    `;

    // 5. AI usage logs
    const aiUsageLogs = await sql`
      SELECT * FROM public.ai_usage_logs WHERE user_id = ${user.id} ORDER BY created_at DESC
    `;

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    const exportPayload = {
      exportVersion: '1.0.0',
      exportedAt: now.toISOString(),
      account: {
        id: user.id,
        email: user.email || '',
        createdAt: user.created_at || now.toISOString(),
      },
      profile: profile || null,
      masterProfile: masterProfile || null,
      education: Array.from(education),
      experiences: Array.from(experiences),
      projects: Array.from(projects),
      skills: Array.from(skills),
      publications: Array.from(publications),
      achievements: Array.from(achievements),
      certifications: Array.from(certifications),
      customSections: Array.from(customSections),
      documents: documentsWithSections,
      website: website || null,
      aiUsageLogs: Array.from(aiUsageLogs),
    };

    // Validate payload structure using Zod schema
    const validatedData = AccountExportDataSchema.parse(exportPayload);

    return new NextResponse(JSON.stringify(validatedData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="quillfolio-export-${dateStr}.json"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('[export] Data export failed:', err);
    return NextResponse.json(
      { error: 'Failed to generate data export', details: err.message },
      { status: 500 }
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}
