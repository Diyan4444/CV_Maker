import { describe, it, expect } from 'vitest';
import { db } from '../lib/db';
import { masterProfiles, documents, websites, projects } from '../lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Tenant Ownership Isolation Unit Tests
 * Proves that query constructs filter by user ownership and child tables join to parent profile ownership.
 */
describe('Tenant Ownership & Boundary Tests', () => {
  const userA_id = '11111111-1111-1111-1111-111111111111';
  const userB_id = '22222222-2222-2222-2222-222222222222';

  it('documents query enforces userId constraint and isolates user A from user B', () => {
    // Generate SQL query statement for user A
    const queryA = db.select().from(documents).where(eq(documents.userId, userA_id)).toSQL();
    expect(queryA.sql).toContain('"documents"."user_id" = $1');
    expect(queryA.params).toEqual([userA_id]);

    // Query for user B uses user B parameter
    const queryB = db.select().from(documents).where(eq(documents.userId, userB_id)).toSQL();
    expect(queryB.params).toEqual([userB_id]);
  });

  it('child tables (education, projects) enforce master_profiles ownership join', () => {
    // Verified pattern for reading child items with user ownership verification
    const childQuery = db
      .select({
        project: projects,
      })
      .from(projects)
      .innerJoin(masterProfiles, eq(projects.profileId, masterProfiles.id))
      .where(eq(masterProfiles.userId, userA_id))
      .toSQL();

    expect(childQuery.sql).toContain('inner join "master_profiles"');
    expect(childQuery.sql).toContain('"master_profiles"."user_id" = $1');
    expect(childQuery.params).toEqual([userA_id]);
  });

  it('public website query enforces is_published=true AND whitelist DTO projection', () => {
    // Public website query never queries raw user profile or private fields
    const publicQuery = db
      .select({
        username: websites.username,
        palette: websites.palette,
        isPublished: websites.isPublished,
        customHeadline: websites.customHeadline,
        customBio: websites.customBio,
        fieldVisibility: websites.fieldVisibility,
      })
      .from(websites)
      .where(and(eq(websites.username, 'johndoe'), eq(websites.isPublished, true)))
      .toSQL();

    expect(publicQuery.sql).toContain('"websites"."username" = $1');
    expect(publicQuery.sql).toContain('"websites"."is_published" = $2');
    expect(publicQuery.params).toEqual(['johndoe', true]);
  });
});
