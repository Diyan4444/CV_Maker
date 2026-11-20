export type AtsCheckStatus = 'pass' | 'needs_attention' | 'info';

export interface AtsCheckResult {
  id: string;
  name: string;
  status: AtsCheckStatus;
  explanation: string;
  sectionId?: string;
  fieldId?: string;
}

export interface AtsReadinessReport {
  title: string;
  note: string;
  checks: AtsCheckResult[];
  summary: {
    passCount: number;
    needsAttentionCount: number;
    infoCount: number;
  };
  durationMs?: number;
}
