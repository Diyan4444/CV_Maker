'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
import { Combobox } from '@/components/ui/Combobox';
import { FloatCard } from '@/components/ui/FloatCard';
import { WARM_TOKENS, ON_DARK_TOKENS } from '@/styles/tokens';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
} from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();

  // Step 1: Core Selection
  const [outputType, setOutputType] = useState<'resume' | 'cv'>('resume');
  const [backgroundGroup, setBackgroundGroup] = useState<string>('engineering_technology');
  const [specialization, setSpecialization] = useState<string>('Computer Science Engineering');
  const [customSpecialization, setCustomSpecialization] = useState<string>('');
  const [stage, setStage] = useState<string>('final_year');
  const [selectedPurposes, setSelectedPurposes] = useState<string[]>(['full_time_job']);

  // Step 2+: Dynamic Department Form State
  const [currentWizardStep, setCurrentWizardStep] = useState<number>(0);
  const [formValues, setFormValues] = useState<Record<string, FormFieldValue>>({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resumeRadioRef = useRef<HTMLButtonElement | null>(null);
  const cvRadioRef = useRef<HTMLButtonElement | null>(null);
  const actionBarRef = useRef<HTMLDivElement | null>(null);
  const [actionBarHeight, setActionBarHeight] = useState<number>(96);

  // Measure sticky bottom bar height so bottom padding & scroll-padding-bottom prevent field occlusion
  useEffect(() => {
    const updateBarHeight = () => {
      const h = actionBarRef.current?.offsetHeight || 96;
      setActionBarHeight(h);
      document.documentElement.style.scrollPaddingBottom = `${h + 24}px`;
    };
    updateBarHeight();
    window.addEventListener('resize', updateBarHeight);
    return () => {
      window.removeEventListener('resize', updateBarHeight);
      document.documentElement.style.scrollPaddingBottom = '';
    };
  }, [currentWizardStep]);

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

  const totalSteps = 1 + dynamicSteps.length;

  const specializationOptions = [
    ...(currentGroupConfig?.specializations || []).map((spec) => ({
      value: spec,
      label: spec,
    })),
    { value: 'Other (type your own)', label: 'Other (type your own)...' },
  ];

  const stageOptions = CAREER_STAGES.map((stg) => ({
    value: stg.id,
    label: stg.label,
  }));

  const togglePurpose = (purposeId: string) => {
    setSelectedPurposes((prev) =>
      prev.includes(purposeId) ? prev.filter((p) => p !== purposeId) : [...prev, purposeId]
    );
  };

  const handleFieldChange = (fieldId: string, val: FormFieldValue) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: val }));
  };

  const handleFinish = async () => {
    if (loading) return;
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

  const handleRadioKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (
      e.key === 'ArrowRight' ||
      e.key === 'ArrowDown' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowUp'
    ) {
      e.preventDefault();
      const next: 'resume' | 'cv' = outputType === 'resume' ? 'cv' : 'resume';
      setOutputType(next);
      if (next === 'resume') {
        resumeRadioRef.current?.focus();
      } else {
        cvRadioRef.current?.focus();
      }
    }
  };

  const nextStepTitle =
    currentWizardStep === 0
      ? dynamicSteps[0]?.stepTitle || 'Department Questions'
      : dynamicSteps[currentWizardStep]?.stepTitle || 'Finish';

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ paddingBottom: `${actionBarHeight + 24}px` }}
    >
      {/* Header Panel */}
      <header className="max-w-4xl mx-auto w-full pt-4 sm:pt-8 px-4 sm:px-8 mb-6 relative z-10">
        <div
          className="border rounded-xl shadow-sm px-5 sm:px-6 py-4 flex items-center justify-between"
          style={{
            backgroundColor: WARM_TOKENS.surface,
            borderColor: WARM_TOKENS.borderSubtle,
          }}
        >
          <Link
            href="/dashboard"
            className="font-display text-2xl font-bold tracking-tight min-h-[44px] inline-flex items-center rounded focus:outline-none focus:ring-2 focus:ring-[#800021]"
            style={{ color: WARM_TOKENS.ink }}
          >
            {PRODUCT_NAME}
          </Link>
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: WARM_TOKENS.muted }}
          >
            Profile Setup
          </span>
        </div>
      </header>

      <main className="max-w-2xl w-full mx-auto px-4 sm:px-0 flex-1 space-y-6 relative z-10">
        {errorMsg && (
          <div
            role="alert"
            className="p-3.5 rounded-xl text-xs border font-medium"
            style={{
              backgroundColor: WARM_TOKENS.accentSoft,
              color: WARM_TOKENS.accentStrong,
              borderColor: WARM_TOKENS.primary,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* WIZARD STEP 0: Core Selectors */}
        {currentWizardStep === 0 && (
          <div className="space-y-6">
            {/* Hero / Output Type Selector */}
            <section aria-labelledby="building-first-heading" className="space-y-4">
              <div className="px-1">
                <h1
                  id="building-first-heading"
                  className="font-display text-2xl sm:text-3xl font-bold tracking-tight"
                  style={{ color: ON_DARK_TOKENS.onDarkInk }}
                >
                  What are you building first?
                </h1>
                <p
                  className="text-xs sm:text-sm mt-1 max-w-[70ch]"
                  style={{ color: ON_DARK_TOKENS.onDarkMuted }}
                >
                  You can generate the others anytime from your single master profile.
                </p>
              </div>

              <div
                role="radiogroup"
                aria-labelledby="building-first-heading"
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                {/* Resume Card */}
                <FloatCard floatIndex={0}>
                  <button
                    ref={resumeRadioRef}
                    type="button"
                    role="radio"
                    aria-checked={outputType === 'resume'}
                    tabIndex={outputType === 'resume' ? 0 : -1}
                    onClick={() => setOutputType('resume')}
                    onKeyDown={handleRadioKeyDown}
                    className={`w-full h-full rounded-xl border p-4 text-left flex flex-col gap-3 transition-[transform,box-shadow,border-color] duration-150 motion-reduce:transition-none [@media(hover:hover)]:hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2 ${
                      outputType === 'resume' ? 'border-l-4 shadow-md' : 'shadow-sm'
                    }`}
                    style={{
                      backgroundColor: WARM_TOKENS.surface,
                      borderColor:
                        outputType === 'resume' ? WARM_TOKENS.primary : WARM_TOKENS.borderSubtle,
                      borderLeftColor:
                        outputType === 'resume' ? WARM_TOKENS.primary : WARM_TOKENS.borderSubtle,
                    }}
                  >
                    <div
                      className="w-full rounded-lg border overflow-hidden p-2 flex items-center justify-center"
                      style={{
                        backgroundColor: WARM_TOKENS.surface1,
                        borderColor: WARM_TOKENS.borderSubtle,
                      }}
                    >
                      <Image
                        src="/landing/ats_single_column.png"
                        alt="Miniature preview of the ATS Single Column resume specimen"
                        width={240}
                        height={310}
                        className="w-full max-w-[170px] h-auto rounded shadow-xs"
                      />
                    </div>
                    <div className="space-y-1 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="text-[10px] font-semibold uppercase tracking-widest"
                            style={{ color: WARM_TOKENS.muted }}
                          >
                            SAMPLE WITH FICTIONAL DATA
                          </span>
                          {outputType === 'resume' && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                              style={{
                                backgroundColor: WARM_TOKENS.accentSoft,
                                color: WARM_TOKENS.accentStrong,
                              }}
                            >
                              <Check className="w-3 h-3" aria-hidden="true" />
                              Selected
                            </span>
                          )}
                        </div>
                        <div
                          className="font-display font-bold text-base mt-1"
                          style={{ color: WARM_TOKENS.ink }}
                        >
                          Resume
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: WARM_TOKENS.muted }}>
                          1-page, ATS-optimized layout for industry roles
                        </p>
                      </div>
                    </div>
                  </button>
                </FloatCard>

                {/* Academic CV Card */}
                <FloatCard floatIndex={1}>
                  <button
                    ref={cvRadioRef}
                    type="button"
                    role="radio"
                    aria-checked={outputType === 'cv'}
                    tabIndex={outputType === 'cv' ? 0 : -1}
                    onClick={() => setOutputType('cv')}
                    onKeyDown={handleRadioKeyDown}
                    className={`w-full h-full rounded-xl border p-4 text-left flex flex-col gap-3 transition-[transform,box-shadow,border-color] duration-150 motion-reduce:transition-none [@media(hover:hover)]:hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2 ${
                      outputType === 'cv' ? 'border-l-4 shadow-md' : 'shadow-sm'
                    }`}
                    style={{
                      backgroundColor: WARM_TOKENS.surface,
                      borderColor:
                        outputType === 'cv' ? WARM_TOKENS.primary : WARM_TOKENS.borderSubtle,
                      borderLeftColor:
                        outputType === 'cv' ? WARM_TOKENS.primary : WARM_TOKENS.borderSubtle,
                    }}
                  >
                    <div
                      className="w-full rounded-lg border overflow-hidden p-2 flex items-center justify-center"
                      style={{
                        backgroundColor: WARM_TOKENS.surface1,
                        borderColor: WARM_TOKENS.borderSubtle,
                      }}
                    >
                      <Image
                        src="/landing/academic_cv.png"
                        alt="Miniature preview of the Academic CV specimen"
                        width={240}
                        height={310}
                        className="w-full max-w-[170px] h-auto rounded shadow-xs"
                      />
                    </div>
                    <div className="space-y-1 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="text-[10px] font-semibold uppercase tracking-widest"
                            style={{ color: WARM_TOKENS.muted }}
                          >
                            SAMPLE WITH FICTIONAL DATA
                          </span>
                          {outputType === 'cv' && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                              style={{
                                backgroundColor: WARM_TOKENS.accentSoft,
                                color: WARM_TOKENS.accentStrong,
                              }}
                            >
                              <Check className="w-3 h-3" aria-hidden="true" />
                              Selected
                            </span>
                          )}
                        </div>
                        <div
                          className="font-display font-bold text-base mt-1"
                          style={{ color: WARM_TOKENS.ink }}
                        >
                          Academic CV
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: WARM_TOKENS.muted }}>
                          Multi-page scholarly dossier for research &amp; publications
                        </p>
                      </div>
                    </div>
                  </button>
                </FloatCard>
              </div>
            </section>

            {/* 01 Your background */}
            <section
              aria-labelledby="section-01-heading"
              className="rounded-xl border p-5 sm:p-6 shadow-sm space-y-5"
              style={{
                backgroundColor: WARM_TOKENS.surface,
                borderColor: WARM_TOKENS.borderSubtle,
              }}
            >
              <div
                className="flex items-baseline gap-3 pb-3 border-b"
                style={{ borderColor: WARM_TOKENS.borderSubtle }}
              >
                <span
                  className="font-mono text-xs font-bold"
                  style={{ color: WARM_TOKENS.accentStrong }}
                >
                  01
                </span>
                <h2
                  id="section-01-heading"
                  className="font-display text-lg font-bold"
                  style={{ color: WARM_TOKENS.ink }}
                >
                  Your background
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="bg-group"
                    className="block text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: WARM_TOKENS.ink }}
                  >
                    Your background
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
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#800021]"
                    style={{
                      backgroundColor: WARM_TOKENS.surface,
                      borderColor: WARM_TOKENS.borderDefault,
                      color: WARM_TOKENS.ink,
                    }}
                  >
                    {BACKGROUND_GROUPS.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="spec-select"
                    className="block text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: WARM_TOKENS.ink }}
                  >
                    Specialization / Field
                  </label>
                  <Combobox
                    id="spec-select"
                    value={specialization}
                    onChange={setSpecialization}
                    options={specializationOptions}
                    placeholder="Search specialization..."
                  />

                  {specialization === 'Other (type your own)' && (
                    <input
                      type="text"
                      aria-label="Custom specialization"
                      placeholder="Specify your field or branch"
                      value={customSpecialization}
                      onChange={(e) => setCustomSpecialization(e.target.value)}
                      className="mt-2.5 w-full min-h-[44px] px-3.5 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#800021]"
                      style={{
                        backgroundColor: WARM_TOKENS.surface,
                        borderColor: WARM_TOKENS.borderDefault,
                        color: WARM_TOKENS.ink,
                      }}
                    />
                  )}
                </div>
              </div>
            </section>

            {/* 02 Where are you right now? */}
            <section
              aria-labelledby="section-02-heading"
              className="rounded-xl border p-5 sm:p-6 shadow-sm space-y-5"
              style={{
                backgroundColor: WARM_TOKENS.surface,
                borderColor: WARM_TOKENS.borderSubtle,
              }}
            >
              <div
                className="flex items-baseline gap-3 pb-3 border-b"
                style={{ borderColor: WARM_TOKENS.borderSubtle }}
              >
                <span
                  className="font-mono text-xs font-bold"
                  style={{ color: WARM_TOKENS.accentStrong }}
                >
                  02
                </span>
                <h2
                  id="section-02-heading"
                  className="font-display text-lg font-bold"
                  style={{ color: WARM_TOKENS.ink }}
                >
                  Where are you right now?
                </h2>
              </div>

              <div>
                <label
                  htmlFor="career-stage"
                  className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: WARM_TOKENS.ink }}
                >
                  Where are you right now?
                </label>
                <Combobox
                  id="career-stage"
                  value={stage}
                  onChange={setStage}
                  options={stageOptions}
                  placeholder="Search stage..."
                />
              </div>
            </section>

            {/* 03 What are you working toward? */}
            <section
              aria-labelledby="section-03-heading"
              className="rounded-xl border p-5 sm:p-6 shadow-sm space-y-5"
              style={{
                backgroundColor: WARM_TOKENS.surface,
                borderColor: WARM_TOKENS.borderSubtle,
              }}
            >
              <div
                className="flex items-baseline gap-3 pb-3 border-b"
                style={{ borderColor: WARM_TOKENS.borderSubtle }}
              >
                <span
                  className="font-mono text-xs font-bold"
                  style={{ color: WARM_TOKENS.accentStrong }}
                >
                  03
                </span>
                <h2
                  id="section-03-heading"
                  className="font-display text-lg font-bold"
                  style={{ color: WARM_TOKENS.ink }}
                >
                  What are you working toward?
                </h2>
              </div>

              <div>
                <p className="text-xs mb-3" style={{ color: WARM_TOKENS.muted }}>
                  Select all that apply.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {DOCUMENT_PURPOSES.map((p) => {
                    const isChecked = selectedPurposes.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        aria-pressed={isChecked}
                        onClick={() => togglePurpose(p.id)}
                        className={`min-h-[44px] px-3.5 py-2.5 rounded-lg border text-left text-xs font-medium flex items-center justify-between gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021] ${
                          isChecked ? 'border-l-4' : ''
                        }`}
                        style={{
                          backgroundColor: isChecked ? WARM_TOKENS.accentSoft : WARM_TOKENS.surface,
                          borderColor: isChecked ? WARM_TOKENS.primary : WARM_TOKENS.borderDefault,
                          borderLeftColor: isChecked ? WARM_TOKENS.primary : WARM_TOKENS.borderDefault,
                          color: WARM_TOKENS.ink,
                        }}
                      >
                        <span>{p.label}</span>
                        {isChecked && (
                          <Check
                            className="w-3.5 h-3.5 shrink-0"
                            style={{ color: WARM_TOKENS.accentStrong }}
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* WIZARD STEP > 0: Dynamic Form Engine */}
        {currentWizardStep > 0 && (
          <section
            className="rounded-xl border p-6 sm:p-8 shadow-sm space-y-6"
            style={{
              backgroundColor: WARM_TOKENS.surface,
              borderColor: WARM_TOKENS.borderSubtle,
            }}
          >
            <div
              className="pb-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              style={{ borderColor: WARM_TOKENS.borderSubtle }}
            >
              <div>
                <h1
                  className="font-display text-2xl font-bold tracking-tight"
                  style={{ color: WARM_TOKENS.ink }}
                >
                  {dynamicSteps[currentWizardStep - 1]?.stepTitle || 'Department Questions'}
                </h1>
                {dynamicSteps[currentWizardStep - 1]?.stepDescription && (
                  <p className="text-xs mt-1" style={{ color: WARM_TOKENS.muted }}>
                    {dynamicSteps[currentWizardStep - 1].stepDescription}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleFinish}
                disabled={loading}
                className="min-h-[44px] text-xs font-semibold hover:underline self-start sm:self-auto px-2 rounded focus:outline-none focus:ring-2 focus:ring-[#800021]"
                style={{ color: WARM_TOKENS.accentStrong }}
              >
                Skip and complete later
              </button>
            </div>

            <GenericFormEngine
              fields={dynamicSteps[currentWizardStep - 1]?.fields || []}
              values={formValues}
              onChange={handleFieldChange}
            />
          </section>
        )}
      </main>

      {/* Sticky Bottom Action Bar */}
      <div
        ref={actionBarRef}
        data-testid="onboarding-sticky-bar"
        className="fixed bottom-0 inset-x-0 z-30 border-t shadow-md"
        style={{
          backgroundColor: WARM_TOKENS.surface,
          borderColor: WARM_TOKENS.borderSubtle,
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <button
              type="button"
              disabled={currentWizardStep === 0 || loading}
              onClick={() => {
                setCurrentWizardStep((prev) => Math.max(0, prev - 1));
                window.scrollTo({ top: 0, behavior: 'auto' });
              }}
              className="min-h-[44px] px-4 py-2 rounded-lg border text-xs font-semibold inline-flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F8F4ED] focus:outline-none focus:ring-2 focus:ring-[#800021]"
              style={{
                backgroundColor: WARM_TOKENS.surface,
                borderColor: WARM_TOKENS.borderDefault,
                color: WARM_TOKENS.ink,
              }}
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Back</span>
            </button>

            <span
              className="text-xs font-semibold sm:hidden"
              style={{ color: WARM_TOKENS.muted }}
            >
              Step {currentWizardStep + 1} of {totalSteps}
            </span>
          </div>

          <div className="flex items-center gap-4 justify-end">
            <span
              className="hidden sm:inline text-xs font-semibold whitespace-nowrap"
              style={{ color: WARM_TOKENS.muted }}
            >
              Step {currentWizardStep + 1} of {totalSteps}
            </span>

            {currentWizardStep < dynamicSteps.length ? (
              <button
                type="button"
                onClick={() => {
                  setCurrentWizardStep((prev) => prev + 1);
                  window.scrollTo({ top: 0, behavior: 'auto' });
                }}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2"
                style={{
                  backgroundColor: WARM_TOKENS.primary,
                  color: WARM_TOKENS.primaryText,
                }}
              >
                <span>Continue to {nextStepTitle}</span>
                <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={loading}
                aria-busy={loading}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2"
                style={{
                  backgroundColor: WARM_TOKENS.primary,
                  color: WARM_TOKENS.primaryText,
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Saving Onboarding...</span>
                  </>
                ) : (
                  <>
                    <span>Finish &amp; Open Document</span>
                    <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
