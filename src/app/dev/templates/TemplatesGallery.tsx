'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ONE_PAGE_RESUME_FIXTURE,
  TWO_PAGE_RESUME_FIXTURE,
  THREE_PAGE_ACADEMIC_CV_FIXTURE,
  EXTREME_EDGE_CASE_FIXTURE,
  FORTY_BULLETS_FIXTURE,
  FONT_SPEC_FIXTURE,
} from '@/lib/fixtures/document-fixtures';
import { LivePdfPreview } from '@/components/editor/LivePdfPreview';
import { TemplateId, FullDocument } from '@/lib/documents/types';
import { ArrowLeft, Layers, Palette, FileText } from 'lucide-react';

const FIXTURES: { id: string; name: string; doc: FullDocument }[] = [
  { id: '1page', name: '1-Page Industry Resume', doc: ONE_PAGE_RESUME_FIXTURE },
  { id: '2page', name: '2-Page Senior Engineer Resume', doc: TWO_PAGE_RESUME_FIXTURE },
  { id: '3page', name: '3-Page Academic Scholarly CV', doc: THREE_PAGE_ACADEMIC_CV_FIXTURE },
  { id: 'extreme', name: 'Extreme Edge Case (Long text, 60 skills, null dates)', doc: EXTREME_EDGE_CASE_FIXTURE },
  { id: '40bullets', name: 'Multi-Page Entry Flow (40 bullets & 600ch bullet)', doc: FORTY_BULLETS_FIXTURE },
  { id: 'fontspec', name: 'Font Diacritics & Typographical Symbols', doc: FONT_SPEC_FIXTURE },
];

const TEMPLATES: { id: TemplateId; name: string }[] = [
  { id: 'ats_single_column', name: 'ATS Single Column' },
  { id: 'modern_professional', name: 'Modern Professional' },
  { id: 'academic_cv', name: 'Academic CV' },
];

const ACCENTS = [
  { hex: '#0B0B0B', name: 'Ink Black' },
  { hex: '#800021', name: 'Wine' },
  { hex: '#881144', name: 'Deep Wine' },
  { hex: '#243A66', name: 'Navy' },
  { hex: '#163832', name: 'Forest' },
  { hex: '#235347', name: 'Deep Teal' },
  { hex: '#5D6B6B', name: 'Slate Mist' },
];

export function TemplatesGallery() {
  const [selectedFixtureId, setSelectedFixtureId] = useState<string>('1page');
  const [selectedTemplateId, setSelectedTemplateId] = useState<TemplateId>('ats_single_column');
  const [selectedAccent, setSelectedAccent] = useState<string>('#0B0B0B');
  const [liveEditValue, setLiveEditValue] = useState<string>('');

  const currentFixture = FIXTURES.find((f) => f.id === selectedFixtureId) || FIXTURES[0];

  const overriddenSections = currentFixture.doc.sections.map((s) => {
    if (s.sectionType === 'header' && liveEditValue !== '') {
      return {
        ...s,
        content: {
          ...(s.content as any),
          fullName: liveEditValue,
        },
      };
    }
    return s;
  });

  const activeDoc: FullDocument = {
    ...currentFixture.doc,
    meta: {
      ...currentFixture.doc.meta,
      template_id: selectedTemplateId,
      accent_color: selectedAccent,
    },
    sections: overriddenSections,
  };

  return (
    <div className="min-h-screen bg-[#F1F7F7] flex flex-col p-4 sm:p-6 text-[#0B0B0B]">
      {/* Header Bar */}
      <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-4 sm:px-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg border border-[#6B6B6B] text-[#333333] hover:text-[#0B0B0B] hover:bg-[#F1F7F7] transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021]"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-display text-xl font-bold text-[#0B0B0B]">
              Dev Template &amp; Stress Gallery
            </h1>
            <p className="text-xs text-[#333333]">
              Isolated PDF preview testing for 1-page, 2-page, 3-page, and extreme stress fixtures.
            </p>
          </div>
        </div>

        <div className="text-xs text-[#6B6B6B] bg-[#F1F7F7] px-3 py-1.5 rounded-lg border border-[#6B6B6B]">
          Dev-only Route &bull; Stripped in Production
        </div>
      </div>

      {/* Main Grid: Controls on Left, Live PDF on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Controls Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Live Benchmark Input */}
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-4 sm:p-5 shadow-sm">
            <label htmlFor="benchmark-live-edit-input" className="block text-xs font-bold text-[#0B0B0B] mb-2">
              Live Benchmark Edit Input
            </label>
            <input
              id="benchmark-live-edit-input"
              type="text"
              value={liveEditValue}
              onChange={(e) => setLiveEditValue(e.target.value)}
              placeholder="Type to trigger live preview update..."
              className="w-full text-xs p-2.5 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] focus:outline-none focus:ring-2 focus:ring-[#800021]"
            />
          </div>

          {/* Fixture Selector */}
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-[#0B0B0B]">
              <Layers className="w-4 h-4 text-[#800021]" />
              Select Fixture Dataset
            </div>
            <div className="space-y-2">
              {FIXTURES.map((fix) => (
                <button
                  key={fix.id}
                  type="button"
                  onClick={() => setSelectedFixtureId(fix.id)}
                  className={`w-full text-left p-3 rounded-lg border text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021] ${
                    selectedFixtureId === fix.id
                      ? 'border-[#800021] bg-[#FFE4D8]/30 font-semibold text-[#800021]'
                      : 'border-[#6B6B6B] bg-[#FFFFFF] hover:bg-[#F1F7F7] text-[#0B0B0B]'
                  }`}
                >
                  {fix.name}
                </button>
              ))}
            </div>
          </div>

          {/* Template Selector */}
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-[#0B0B0B]">
              <FileText className="w-4 h-4 text-[#800021]" />
              Select Render Template
            </div>
            <div className="space-y-2">
              {TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => setSelectedTemplateId(tmpl.id)}
                  className={`w-full text-left p-3 rounded-lg border text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021] ${
                    selectedTemplateId === tmpl.id
                      ? 'border-[#800021] bg-[#FFE4D8]/30 font-semibold text-[#800021]'
                      : 'border-[#6B6B6B] bg-[#FFFFFF] hover:bg-[#F1F7F7] text-[#0B0B0B]'
                  }`}
                >
                  {tmpl.name}
                </button>
              ))}
            </div>
          </div>

          {/* Accent Selector */}
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-[#0B0B0B]">
              <Palette className="w-4 h-4 text-[#800021]" />
              Allowed Accent Colors
            </div>
            <div className="grid grid-cols-4 gap-2">
              {ACCENTS.map((acc) => (
                <button
                  key={acc.hex}
                  type="button"
                  onClick={() => setSelectedAccent(acc.hex)}
                  title={acc.name}
                  className={`p-2 rounded-lg border flex flex-col items-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021] ${
                    selectedAccent === acc.hex
                      ? 'border-[#800021] bg-[#FFE4D8]/40 ring-1 ring-[#800021]'
                      : 'border-[#6B6B6B] bg-[#FFFFFF] hover:bg-[#F1F7F7]'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-full border border-[#6B6B6B] shadow-xs"
                    style={{ backgroundColor: acc.hex }}
                  />
                  <span className="text-[10px] text-[#333333] font-medium truncate w-full text-center">
                    {acc.name.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Preview Column */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-4 flex-1 flex flex-col shadow-sm min-h-[700px]">
            <LivePdfPreview
              meta={activeDoc.meta}
              sections={activeDoc.sections}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
