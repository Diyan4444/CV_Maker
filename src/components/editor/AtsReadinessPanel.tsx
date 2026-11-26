'use client';

import React, { useEffect, useState } from 'react';
import { AtsReadinessReport, AtsCheckResult, AtsCheckStatus } from '@/lib/ats/types';
import { CheckCircle2, AlertCircle, Info, ExternalLink, Loader2 } from 'lucide-react';

interface AtsReadinessPanelProps {
  report: AtsReadinessReport | null;
  isLoading?: boolean;
  onJumpToSection?: (sectionId?: string, fieldId?: string) => void;
}

const GROUP_CONFIG: Array<{
  status: AtsCheckStatus;
  heading: string;
  badgeClass: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    status: 'needs_attention',
    heading: 'Needs attention',
    badgeClass: 'bg-[#FFE4D8] text-[#800021] border-[#800021]',
    icon: AlertCircle,
  },
  {
    status: 'pass',
    heading: 'Looks good',
    badgeClass: 'bg-[#DAF1DE] text-[#0B2B26] border-[#8EB69B]',
    icon: CheckCircle2,
  },
  {
    status: 'info',
    heading: 'For your information',
    badgeClass: 'bg-[#EFE8DE] text-[#24221F] border-[#D8D0C5]',
    icon: Info,
  },
];

export function AtsReadinessPanel({
  report,
  isLoading,
  onJumpToSection,
}: AtsReadinessPanelProps) {
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  useEffect(() => {
    if (!report) return;
    const timer = setTimeout(() => {
      setLiveAnnouncement(
        `ATS Readiness updated: ${report.summary.needsAttentionCount} need attention, ${report.summary.passCount} look good, ${report.summary.infoCount} for your information.`
      );
    }, 500);
    return () => clearTimeout(timer);
  }, [report]);

  if (isLoading || !report) {
    return (
      <div
        id="ats-running-checks"
        role="status"
        aria-label="Running ATS checks"
        className="bg-[#FFFDF9] border border-[#D8D0C5] rounded-xl p-6 text-center shadow-xs space-y-3"
      >
        <div className="w-8 h-8 rounded-full bg-[#FFE4D8] border border-[#800021] flex items-center justify-center mx-auto text-[#800021]">
          <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <p className="font-serif text-sm font-bold text-[#24221F]">Running checks...</p>
          <p className="text-xs text-[#706A63]">Analyzing PDF text stream and layout structure...</p>
        </div>
      </div>
    );
  }

  const grouped: Record<AtsCheckStatus, AtsCheckResult[]> = {
    needs_attention: report.checks.filter((c) => c.status === 'needs_attention'),
    pass: report.checks.filter((c) => c.status === 'pass'),
    info: report.checks.filter((c) => c.status === 'info'),
  };

  return (
    <div
      id="ats-readiness-panel"
      role="region"
      aria-label="ATS Readiness"
      className="bg-[#FFFDF9] border border-[#D8D0C5] rounded-xl p-4 sm:p-5 shadow-xs space-y-4"
    >
      <div role="status" aria-live="polite" className="sr-only">
        {liveAnnouncement}
      </div>

      {/* Panel Header */}
      <div className="border-b border-[#D8D0C5] pb-3 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-base font-bold text-[#24221F]">
              ATS Readiness
            </h3>
            <p className="text-xs text-[#706A63] mt-0.5">
              Review your document before downloading.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            <span className="px-2 py-0.5 rounded bg-[#FFE4D8] text-[#800021] border border-[#800021]/40">
              {report.summary.needsAttentionCount} need attention
            </span>
            <span className="px-2 py-0.5 rounded bg-[#DAF1DE] text-[#235347] border border-[#8EB69B]">
              {report.summary.passCount} look good
            </span>
            <span className="px-2 py-0.5 rounded bg-[#EFE8DE] text-[#24221F] border border-[#D8D0C5]">
              {report.summary.infoCount} info
            </span>
          </div>
        </div>

        {/* Mandatory Disclaimer Note */}
        <p className="text-xs text-[#24221F] leading-relaxed bg-[#EFE8DE] border border-[#D8D0C5] p-2.5 rounded-lg">
          {report.note}
        </p>
      </div>

      {/* Grouped Checks */}
      <div className="space-y-5">
        {GROUP_CONFIG.map((group) => {
          const items = grouped[group.status];
          if (items.length === 0) return null;
          const GroupIcon = group.icon;

          return (
            <section
              key={group.status}
              aria-label={group.heading}
              data-testid={`ats-group-${group.status}`}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wide text-[#24221F] flex items-center gap-1.5">
                  <GroupIcon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{group.heading}</span>
                </h4>
                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${group.badgeClass}`}>
                  {items.length}
                </span>
              </div>

              <div className="divide-y divide-[#D8D0C5] border border-[#D8D0C5] rounded-lg bg-[#FFFDF9]">
                {items.map((check) => (
                  <div
                    key={check.id}
                    className="p-3 flex flex-col gap-1.5"
                    data-testid={`ats-check-${check.id}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#24221F]">{check.name}</span>
                    </div>

                    <p className="text-xs text-[#706A63] leading-relaxed">
                      {check.explanation}
                    </p>

                    {check.sectionId && onJumpToSection && (
                      <button
                        type="button"
                        onClick={() => onJumpToSection(check.sectionId, check.fieldId)}
                        aria-label={`Go to section for ${check.name}`}
                        className="self-start text-[11px] font-semibold text-[#800021] hover:underline inline-flex items-center gap-1.5 py-2 px-2.5 sm:py-0.5 sm:px-1 min-h-[44px] sm:min-h-0 focus:outline-none focus:ring-2 focus:ring-[#800021] rounded"
                      >
                        Go to section
                        <ExternalLink className="w-3.5 h-3.5 sm:w-2.5 sm:h-2.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
