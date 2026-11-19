import { GroupFormConfig, StepConfig, FieldConfig } from './types';
import { ENGINEERING_CONFIG } from './engineering';
import { COMMERCE_CONFIG } from './commerce';
import { ARTS_HUMANITIES_CONFIG } from './arts';
import { SCIENCE_CONFIG } from './science';
import { OTHER_CONFIG } from './other';

export const GROUP_CONFIGS: Record<string, GroupFormConfig> = {
  engineering_technology: ENGINEERING_CONFIG,
  commerce_management: COMMERCE_CONFIG,
  arts_humanities: ARTS_HUMANITIES_CONFIG,
  science: SCIENCE_CONFIG,
  other: OTHER_CONFIG,
};

/**
 * Resolves the effective list of form steps for a user given their:
 * - background group
 * - specialization (with exact product doc overrides)
 * - career stage
 * - document purposes
 * - target output type (resume, cv, website)
 */
export function resolveFormSteps(params: {
  backgroundGroup: string;
  specialization?: string;
  stage?: string;
  purposes?: string[];
  outputType?: 'resume' | 'cv' | 'website';
}): StepConfig[] {
  const groupConfig = GROUP_CONFIGS[params.backgroundGroup] || GROUP_CONFIGS.other;
  const baseSteps: StepConfig[] = JSON.parse(JSON.stringify(groupConfig.baseSteps));

  // Check for specialization overrides if present
  if (params.specialization && groupConfig.specializationOverrides?.[params.specialization]) {
    const overrides = groupConfig.specializationOverrides[params.specialization];
    // If the override is a complete set of steps (e.g. CS_IT_STEPS replacing both academic and competency steps)
    // or targets specific steps
    overrides.forEach((override) => {
      const existingStepIdx = baseSteps.findIndex((s) => s.stepId === override.stepId);
      if (existingStepIdx !== -1) {
        // Merge or replace step fields
        if (override.fields) {
          baseSteps[existingStepIdx].fields = override.fields as FieldConfig[];
        }
        if (override.stepTitle) {
          baseSteps[existingStepIdx].stepTitle = override.stepTitle;
        }
      } else {
        // If the secondary step doesn't match ID (e.g. scientific_techniques vs core_competencies), replace the 2nd step
        if (baseSteps.length > 1) {
          baseSteps[1] = {
            stepId: override.stepId || baseSteps[1].stepId,
            stepTitle: override.stepTitle || baseSteps[1].stepTitle,
            stepDescription: override.stepDescription,
            fields: (override.fields as FieldConfig[]) || baseSteps[1].fields,
          };
        }
      }
    });
  }

  // Filter fields based on outputType, stage, and purpose criteria
  return baseSteps.map((step) => ({
    ...step,
    fields: step.fields.filter((field) => {
      // 1. Output type check
      if (params.outputType && field.appliesTo && !field.appliesTo.includes(params.outputType)) {
        return false;
      }
      // 2. Stage check
      if (params.stage && field.stages && !field.stages.includes(params.stage)) {
        return false;
      }
      // 3. Purpose check
      if (
        params.purposes &&
        params.purposes.length > 0 &&
        field.purposes &&
        !field.purposes.some((p) => params.purposes!.includes(p))
      ) {
        return false;
      }
      return true;
    }),
  }));
}
