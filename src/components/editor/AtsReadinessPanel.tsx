'use client';

import React from 'react';
import { AtsReadinessReport, AtsCheckStatus } from '@/lib/ats/types';
import { CheckCircle2, AlertCircle, Info, ExternalLink } from 'lucide-react';

interface AtsReadinessPanelProps {
  report: AtsReadinessReport | null;
  isLoading?: boolean;
  onJumpToSection?: (sectionId?: string, fieldId?: string) => void;
}

export function AtsReadinessPanel({
  report,
  isLoading,
  onJumpToSection,
}: AtsReadinessPanelProps) {
  if (isLoading || !report) {
    return (
      <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 text-center shadow-xs">
        <div className="w-5 h-5 border-2 border-[#800021] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs text-[#333333]">Analyzing PDF text stream and layout structure...</p>
      </div>
    );
  }

  const getStatusBadge = (status: AtsCheckStatus) => {
    switch (status) {
      case 'pass':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#DAF1DE] text-[#0B2B26] border border-[#8EB69B]">
            <CheckCircle2 className="w-3 h-3 text-[#235347]" />
            Pass
          </span>
        );
      case 'needs_attention':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FFE4D8] text-[#800021] border border-[#800021]">
            <AlertCircle className="w-3 h-3 text-[#800021]" />
            Needs attention
          </span>
        );
      case 'info':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F1F7F7] text-[#163832] border border-[#BDD7D8]">
            <Info className="w-3 h-3 text-[#235347]" />
            Info
          </span>
        );
    }
  };

  return (
    <div
      id="ats-readiness-panel"
      role="region"
      aria-label="ATS readiness checks"
      className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-4 sm:p-5 shadow-xs space-y-4"
    >
      {/* Panel Header */}
      <div className="border-b border-[#6B6B6B] pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="font-display text-base font-bold text-[#0B0B0B]">
            {report.title}
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="text-[#235347]">{report.summary.passCount} Passed</span>
            <span>&bull;</span>
            <span className="text-[#800021]">{report.summary.needsAttentionCount} Attention</span>
            <span>&bull;</span>
            <span className="text-[#333333]">{report.summary.infoCount} Info</span>
          </div>
        </div>

        {/* Mandatory Disclaimer Note */}
        <p className="text-xs text-[#333333] mt-1.5 leading-relaxed bg-[#F1F7F7] border border-[#BDD7D8] p-2.5 rounded-lg">
          {report.note}
        </p>
      </div>

      {/* Checks List */}
      <div className="divide-y divide-[#6B6B6B]">
        {report.checks.map((check) => (
          <div
            key={check.id}
            className="py-3 first:pt-0 last:pb-0 flex flex-col gap-1.5"
            data-testid={`ats-check-${check.id}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#0B0B0B]">{check.name}</span>
              {getStatusBadge(check.status)}
            </div>

            <p className="text-xs text-[#333333] leading-relaxed">
              {check.explanation}
            </p>

            {check.sectionId && onJumpToSection && (
              <button
                type="button"
                onClick={() => onJumpToSection(check.sectionId, check.fieldId)}
                aria-label={`Go to section for ${check.name}`}
                className="self-start text-[11px] font-semibold text-[#800021] hover:underline inline-flex items-center gap-1.5 py-2 px-2.5 sm:py-0.5 sm:px-1 min-h-[44px] sm:min-h-0 focus:outline-none focus:ring-1 focus:ring-[#800021] rounded"
              >
                Go to section
                <ExternalLink className="w-3.5 h-3.5 sm:w-2.5 sm:h-2.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
