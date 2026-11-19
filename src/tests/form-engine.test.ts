import { describe, it, expect } from 'vitest';
import { BACKGROUND_GROUPS } from '../config/onboarding/departments';
import { resolveFormSteps } from '../config/onboarding/resolver';

describe('Phase 2 Form Engine, Department Rules & Verbatim Spec Verification', () => {
  it('contains exactly the 5 specified background groups with exact labels and ids', () => {
    const groupIds = BACKGROUND_GROUPS.map((g) => g.id);
    expect(groupIds).toEqual([
      'engineering_technology',
      'commerce_management',
      'arts_humanities',
      'science',
      'other',
    ]);
  });

  it('snapshot: all 5 specialization lists match the product specification verbatim', () => {
    const eng = BACKGROUND_GROUPS.find((g) => g.id === 'engineering_technology')!;
    expect(eng.specializations).toEqual([
      'Computer Science Engineering',
      'Information Technology',
      'Electronics and Telecommunication',
      'Electronics Engineering',
      'Electrical Engineering',
      'Mechanical Engineering',
      'Civil Engineering',
      'Chemical Engineering',
      'Artificial Intelligence and Data Science',
      'Robotics and Automation',
      'Biotechnology',
    ]);

    const comm = BACKGROUND_GROUPS.find((g) => g.id === 'commerce_management')!;
    expect(comm.specializations).toEqual([
      'B.Com',
      'BBA',
      'MBA',
      'Finance',
      'Accounting',
      'Economics',
      'Marketing',
      'Human Resources',
      'Business Analytics',
      'Entrepreneurship',
      'Banking and Financial Management',
    ]);

    const arts = BACKGROUND_GROUPS.find((g) => g.id === 'arts_humanities')!;
    expect(arts.specializations).toEqual([
      'English Literature',
      'History',
      'Political Science',
      'Psychology',
      'Sociology',
      'Philosophy',
      'Journalism',
      'Mass Communication',
      'Languages',
      'Fine Arts',
      'Performing Arts',
      'Design',
    ]);

    const sci = BACKGROUND_GROUPS.find((g) => g.id === 'science')!;
    expect(sci.specializations).toEqual([
      'Physics',
      'Chemistry',
      'Mathematics',
      'Statistics',
      'Biology',
      'Biotechnology',
      'Environmental Science',
      'Computer Science',
      'Data Science',
    ]);

    const other = BACKGROUND_GROUPS.find((g) => g.id === 'other')!;
    expect(other.specializations).toEqual([
      'Diploma and vocational education',
      'Law',
      'Medicine and healthcare',
      'Architecture',
      'Hospitality and tourism',
      'Education and teaching',
      'Research and academia',
      'Freelancing',
      'Creative professionals',
      'Working professionals',
      'Entrepreneurs',
    ]);
  });

  it('unmapped specializations (Chemical, Robotics, Law) cleanly resolve to generic base steps without programming assumptions', () => {
    const chemSteps = resolveFormSteps({
      backgroundGroup: 'engineering_technology',
      specialization: 'Chemical Engineering',
    });
    const chemFieldIds = chemSteps.flatMap((s) => s.fields.map((f) => f.id));
    expect(chemFieldIds).not.toContain('programming_languages');
    expect(chemFieldIds).not.toContain('github_profile');
    expect(chemFieldIds).toContain('professional_tools');
    expect(chemFieldIds).toContain('competencies_skills');

    const robSteps = resolveFormSteps({
      backgroundGroup: 'engineering_technology',
      specialization: 'Robotics and Automation',
    });
    const robFieldIds = robSteps.flatMap((s) => s.fields.map((f) => f.id));
    expect(robFieldIds).not.toContain('programming_languages');
    expect(robFieldIds).toContain('professional_tools');

    const lawSteps = resolveFormSteps({
      backgroundGroup: 'other',
      specialization: 'Law',
    });
    const lawFieldIds = lawSteps.flatMap((s) => s.fields.map((f) => f.id));
    expect(lawFieldIds).toContain('degree');
    expect(lawFieldIds).toContain('institution');
    expect(lawFieldIds).not.toContain('programming_languages');
  });

  it('maps CS, IT, AI & Data Science (and Science CS / Data Science) to the software/CS_IT set with verbatim bullets', () => {
    const softwareSpecs = [
      { group: 'engineering_technology', spec: 'Computer Science Engineering' },
      { group: 'engineering_technology', spec: 'Information Technology' },
      { group: 'engineering_technology', spec: 'Artificial Intelligence and Data Science' },
      { group: 'science', spec: 'Computer Science' },
      { group: 'science', spec: 'Data Science' },
    ];

    for (const item of softwareSpecs) {
      const steps = resolveFormSteps({
        backgroundGroup: item.group,
        specialization: item.spec,
      });
      const fieldIds = steps.flatMap((s) => s.fields.map((f) => f.id));
      expect(fieldIds, `Failed on ${item.spec}`).toContain('programming_languages');
      expect(fieldIds, `Failed on ${item.spec}`).toContain('frameworks_and_libraries');
      expect(fieldIds, `Failed on ${item.spec}`).toContain('databases');
      expect(fieldIds, `Failed on ${item.spec}`).toContain('development_tools');
      expect(fieldIds, `Failed on ${item.spec}`).toContain('github_profile');
    }
  });

  it('maps Electrical and Electronics to verbatim Step 4 hardware/circuits set', () => {
    const eeSpecs = [
      'Electrical Engineering',
      'Electronics Engineering',
      'Electronics and Telecommunication',
    ];

    for (const spec of eeSpecs) {
      const steps = resolveFormSteps({
        backgroundGroup: 'engineering_technology',
        specialization: spec,
      });
      const fieldIds = steps.flatMap((s) => s.fields.map((f) => f.id));
      expect(fieldIds, `Failed on ${spec}`).toContain('circuit_design');
      expect(fieldIds, `Failed on ${spec}`).toContain('embedded_systems');
      expect(fieldIds, `Failed on ${spec}`).toContain('microcontrollers');
      expect(fieldIds, `Failed on ${spec}`).toContain('matlab_simulation_tools');
      expect(fieldIds, `Failed on ${spec}`).toContain('instrumentation');
      expect(fieldIds, `Failed on ${spec}`).not.toContain('github_profile');
    }
  });

  it('maps Mechanical Engineering to verbatim Step 4 bullets (CAD software, simulation tools, manufacturing processes)', () => {
    const steps = resolveFormSteps({
      backgroundGroup: 'engineering_technology',
      specialization: 'Mechanical Engineering',
    });
    const fieldIds = steps.flatMap((s) => s.fields.map((f) => f.id));
    expect(fieldIds).toContain('cad_software');
    expect(fieldIds).toContain('simulation_tools');
    expect(fieldIds).toContain('manufacturing_processes');

    const cadField = steps.flatMap((s) => s.fields).find((f) => f.id === 'cad_software');
    expect(cadField?.label).toBe('CAD software');
  });

  it('degree field is a text field with suggestions, not a hardcoded restricted dropdown', () => {
    const steps = resolveFormSteps({
      backgroundGroup: 'engineering_technology',
    });
    const academicStep = steps.find((s) => s.stepId === 'academic_identity');
    const degreeField = academicStep?.fields.find((f) => f.id === 'degree');
    expect(degreeField?.type).toBe('text');
    expect(degreeField?.suggestions?.length).toBeGreaterThan(0);
  });
});
