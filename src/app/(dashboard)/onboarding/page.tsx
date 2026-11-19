'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PRODUCT_NAME } from '@/config/app';
import {
  BACKGROUND_GROUPS,
  CAREER_STAGES,
  DOCUMENT_PURPOSES,
} from '@/config/onboarding/departments';
import { resolveFormSteps } from '@/config/onboarding/resolver';
import { FormFieldValue } from '@/config/onboarding/types';
import { GenericFormEngine } from '@/components/forms/GenericFormEngine';
import {
  FileText,
  GraduationCap,
  Globe,
  ArrowRight,
  ArrowLeft,
  Check,
} from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();

  // Step 1: Core Selection
  const [outputType, setOutputType] = useState<'resume' | 'cv' | 'website'>('resume');
  const [backgroundGroup, setBackgroundGroup] = useState<string>('engineering_technology');
  const [specialization, setSpecialization] = useState<string>('Computer Science Engineering');
  const [customSpecialization, setCustomSpecialization] = useState<string>('');
  const [stage, setStage] = useState<string>('final_year');
  const [selectedPurposes, setSelectedPurposes] = useState<string[]>(['full_time_job']);

  // Step 2: Dynamic Department Form State
  const [currentWizardStep, setCurrentWizardStep] = useState<number>(0);
  const [formValues, setFormValues] = useState<Record<string, FormFieldValue>>({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Group config
  const currentGroupConfig = BACKGROUND_GROUPS.find((g) => g.id === backgroundGroup);
  const effectiveSpecialization =
    specialization === 'Other (type your own)' ? customSpecialization : specialization;

  // Resolve dynamic steps from JSON configs with overrides
  const dynamicSteps = resolveFormSteps({
    backgroundGroup,
    specialization: effectiveSpecialization,
    stage,
    purposes: selectedPurposes,
    outputType,
  });

  const togglePurpose = (purposeId: string) => {
    setSelectedPurposes((prev) =>
      prev.includes(purposeId) ? prev.filter((p) => p !== purposeId) : [...prev, purposeId]
    );
  };

  const handleFieldChange = (fieldId: string, val: FormFieldValue) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: val }));
  };

  const handleFinish = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/profile/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outputType,
          backgroundGroup,
          specialization: effectiveSpecialization,
          stage,
          purposes: selectedPurposes,
          formValues,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to save onboarding profile.');
      }

      // If document was created, route to editor or dashboard
      if (resData.documentId) {
        router.push(`/editor/${resData.documentId}`);
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred while saving.';
      setErrorMsg(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-6 sm:p-12">
      <header className="flex items-center justify-between max-w-4xl mx-auto w-full pb-8 border-b border-[var(--border-muted)]">
        <a href="/dashboard" className="font-display text-2xl font-bold tracking-tight text-[var(--text)]">
          {PRODUCT_NAME}
        </a>
        <div className="flex items-center gap-4">
        </div>
      </header>

      <main className="max-w-2xl w-full mx-auto my-10 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-8 sm:p-10 shadow-sm">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          <span className={currentWizardStep === 0 ? 'text-[var(--accent)] font-bold' : ''}>
            1. Background &amp; Intent
          </span>
          <span>&gt;</span>
          <span className={currentWizardStep > 0 ? 'text-[var(--accent)] font-bold' : ''}>
            2. Department Profile
          </span>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-md mb-6 text-xs bg-red-50 text-red-900 border border-red-200">
            {errorMsg}
          </div>
        )}

        {/* WIZARD STEP 0: Core Selectors */}
        {currentWizardStep === 0 && (
          <div className="space-y-8">
            <div>
              <h1 className="font-display text-2xl font-bold text-[var(--text)] tracking-tight">
                What are you building first?
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                You can generate the others anytime from your single master profile.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setOutputType('resume')}
                  className={`p-4 rounded-md border text-left flex flex-col justify-between transition-colors ${
                    outputType === 'resume'
                      ? 'border-[var(--accent)] bg-[var(--surface-alt)] text-[var(--text)]'
                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
                  }`}
                >
                  <FileText className="w-5 h-5 mb-3 text-[var(--accent)]" />
                  <div>
                    <div className="font-semibold text-sm text-[var(--text)]">Resume</div>
                    <div className="text-[11px] mt-0.5">1-page, ATS-optimized for jobs</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setOutputType('cv')}
                  className={`p-4 rounded-md border text-left flex flex-col justify-between transition-colors ${
                    outputType === 'cv'
                      ? 'border-[var(--accent)] bg-[var(--surface-alt)] text-[var(--text)]'
                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
                  }`}
                >
                  <GraduationCap className="w-5 h-5 mb-3 text-[var(--accent)]" />
                  <div>
                    <div className="font-semibold text-sm text-[var(--text)]">Academic CV</div>
                    <div className="text-[11px] mt-0.5">Scholarly dossier, research &amp; pubs</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setOutputType('website')}
                  className={`p-4 rounded-md border text-left flex flex-col justify-between transition-colors ${
                    outputType === 'website'
                      ? 'border-[var(--accent)] bg-[var(--surface-alt)] text-[var(--text)]'
                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
                  }`}
                >
                  <Globe className="w-5 h-5 mb-3 text-[var(--accent)]" />
                  <div>
                    <div className="font-semibold text-sm text-[var(--text)]">Public Website</div>
                    <div className="text-[11px] mt-0.5">Clean responsive portfolio</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Background Group */}
            <div>
              <label htmlFor="bg-group" className="block text-xs font-semibold uppercase tracking-wider text-[var(--text)] mb-2">
                Educational / Professional Background
              </label>
              <select
                id="bg-group"
                value={backgroundGroup}
                onChange={(e) => {
                  const grp = e.target.value;
                  setBackgroundGroup(grp);
                  const firstSpec =
                    BACKGROUND_GROUPS.find((g) => g.id === grp)?.specializations[0] || '';
                  setSpecialization(firstSpec);
                }}
                className="w-full px-3.5 py-2.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-sm focus:border-[var(--accent)] transition-colors"
              >
                {BACKGROUND_GROUPS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Specialization */}
            <div>
              <label htmlFor="spec-select" className="block text-xs font-semibold uppercase tracking-wider text-[var(--text)] mb-2">
                Specialization / Field
              </label>
              <select
                id="spec-select"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-sm focus:border-[var(--accent)] transition-colors"
              >
                {currentGroupConfig?.specializations.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
                <option value="Other (type your own)">Other (type your own)...</option>
              </select>

              {specialization === 'Other (type your own)' && (
                <input
                  type="text"
                  placeholder="Specify your field or branch"
                  value={customSpecialization}
                  onChange={(e) => setCustomSpecialization(e.target.value)}
                  className="mt-2.5 w-full px-3.5 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-sm focus:border-[var(--accent)] transition-colors"
                />
              )}
            </div>

            {/* Stage */}
            <div>
              <label htmlFor="career-stage" className="block text-xs font-semibold uppercase tracking-wider text-[var(--text)] mb-2">
                Current Career / Academic Stage
              </label>
              <select
                id="career-stage"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-sm focus:border-[var(--accent)] transition-colors"
              >
                {CAREER_STAGES.map((stg) => (
                  <option key={stg.id} value={stg.id}>
                    {stg.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Purpose (Multiple) */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text)] mb-2">
                Primary Purposes (select all that apply)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DOCUMENT_PURPOSES.map((p) => {
                  const isChecked = selectedPurposes.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePurpose(p.id)}
                      className={`px-3.5 py-2 rounded-md border text-left text-xs font-medium flex items-center justify-between transition-colors ${
                        isChecked
                          ? 'border-[var(--accent)] bg-[var(--surface-alt)] text-[var(--text)]'
                          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
                      }`}
                    >
                      <span>{p.label}</span>
                      {isChecked && <Check className="w-3.5 h-3.5 text-[var(--accent)]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border-muted)] flex justify-end">
              <button
                type="button"
                onClick={() => setCurrentWizardStep(1)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-[var(--accent)] text-[var(--surface)] font-medium text-sm hover:opacity-90 transition-opacity"
              >
                Continue to Department Questions <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* WIZARD STEP > 0: Dynamic Form Engine */}
        {currentWizardStep > 0 && (
          <div className="space-y-8">
            <div>
              <h2 className="font-display text-2xl font-bold text-[var(--text)] tracking-tight">
                {dynamicSteps[currentWizardStep - 1]?.stepTitle || 'Department Questions'}
              </h2>
              {dynamicSteps[currentWizardStep - 1]?.stepDescription && (
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {dynamicSteps[currentWizardStep - 1].stepDescription}
                </p>
              )}
            </div>

            <GenericFormEngine
              fields={dynamicSteps[currentWizardStep - 1]?.fields || []}
              values={formValues}
              onChange={handleFieldChange}
            />

            <div className="pt-6 border-t border-[var(--border-muted)] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentWizardStep((prev) => prev - 1)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs font-medium hover:bg-[var(--surface-alt)] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={loading}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors px-2"
                >
                  Skip and complete later
                </button>

                {currentWizardStep < dynamicSteps.length ? (
                  <button
                    type="button"
                    onClick={() => setCurrentWizardStep((prev) => prev + 1)}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-[var(--accent)] text-[var(--surface)] font-medium text-xs hover:opacity-90 transition-opacity"
                  >
                    Next Step <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFinish}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-[var(--accent)] text-[var(--surface)] font-medium text-xs hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Finish & Open Document'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
