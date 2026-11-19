export type FormFieldValue = string | string[] | number | boolean | null | undefined;

export interface FieldConfig {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'tags' | 'url';
  helperText?: string;
  placeholder?: string;
  required?: boolean;
  options?: string[]; // for select
  suggestions?: string[]; // for text fields with suggestions
  appliesTo?: ('resume' | 'cv' | 'website')[];
  stages?: string[]; // career stages this question applies to
  purposes?: string[]; // purposes this question applies to
  showIf?: { fieldId: string; equals: FormFieldValue };
}

export interface StepConfig {
  stepId: string;
  stepTitle: string;
  stepDescription?: string;
  fields: FieldConfig[];
}

export interface GroupFormConfig {
  groupId: string;
  groupLabel: string;
  baseSteps: StepConfig[];
  specializationOverrides?: Record<string, Partial<StepConfig>[]>;
}
