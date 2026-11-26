'use client';

import React, { useState } from 'react';
import { FieldConfig, FormFieldValue } from '@/config/onboarding/types';
import { Combobox } from '@/components/ui/Combobox';
import { WARM_TOKENS } from '@/styles/tokens';
import { X, Plus } from 'lucide-react';

interface GenericFormEngineProps {
  fields: FieldConfig[];
  values: Record<string, FormFieldValue>;
  onChange: (fieldId: string, value: FormFieldValue) => void;
}

export function GenericFormEngine({ fields, values, onChange }: GenericFormEngineProps) {
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});

  const handleAddTag = (fieldId: string) => {
    const raw = (tagInputs[fieldId] || '').trim();
    if (!raw) return;
    const currentTags: string[] = Array.isArray(values[fieldId]) ? (values[fieldId] as string[]) : [];
    if (!currentTags.includes(raw)) {
      onChange(fieldId, [...currentTags, raw]);
    }
    setTagInputs((prev) => ({ ...prev, [fieldId]: '' }));
  };

  const handleRemoveTag = (fieldId: string, tagToRemove: string) => {
    const currentTags: string[] = Array.isArray(values[fieldId]) ? (values[fieldId] as string[]) : [];
    onChange(
      fieldId,
      currentTags.filter((t) => t !== tagToRemove)
    );
  };

  return (
    <div className="space-y-6">
      {fields.map((field) => {
        // ShowIf check
        if (field.showIf && values[field.showIf.fieldId] !== field.showIf.equals) {
          return null;
        }

        const rawVal = values[field.id];
        const stringVal = typeof rawVal === 'string' ? rawVal : '';

        return (
          <div key={field.id} className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <label
                htmlFor={field.id}
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: WARM_TOKENS.ink }}
              >
                {field.label}
                {field.required ? (
                  <span className="ml-1" style={{ color: WARM_TOKENS.accentStrong }}>*</span>
                ) : (
                  <span className="font-normal lowercase ml-1" style={{ color: WARM_TOKENS.muted }}>
                    (optional)
                  </span>
                )}
              </label>
            </div>

            {field.helperText && (
              <p className="text-xs leading-relaxed" style={{ color: WARM_TOKENS.muted }}>
                {field.helperText}
              </p>
            )}

            {/* Field Types */}
            {field.type === 'text' && (
              <div className="space-y-2">
                <input
                  id={field.id}
                  type="text"
                  value={stringVal}
                  placeholder={field.placeholder || ''}
                  onChange={(e) => onChange(field.id, e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#800021]"
                  style={{
                    backgroundColor: WARM_TOKENS.surface,
                    borderColor: WARM_TOKENS.borderDefault,
                    color: WARM_TOKENS.ink,
                  }}
                />
                {field.suggestions && field.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[11px] self-center mr-1" style={{ color: WARM_TOKENS.muted }}>
                      Suggestions:
                    </span>
                    {field.suggestions.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => onChange(field.id, sug)}
                        className="text-[11px] min-h-[32px] px-2.5 py-1 rounded-md border transition-colors hover:bg-[#F8F4ED]"
                        style={{
                          backgroundColor: WARM_TOKENS.surface1,
                          borderColor: WARM_TOKENS.borderSubtle,
                          color: WARM_TOKENS.ink,
                        }}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {field.type === 'textarea' && (
              <textarea
                id={field.id}
                rows={3}
                value={stringVal}
                placeholder={field.placeholder || ''}
                onChange={(e) => onChange(field.id, e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#800021]"
                style={{
                  backgroundColor: WARM_TOKENS.surface,
                  borderColor: WARM_TOKENS.borderDefault,
                  color: WARM_TOKENS.ink,
                }}
              />
            )}

            {field.type === 'url' && (
              <input
                id={field.id}
                type="url"
                value={stringVal}
                placeholder={field.placeholder || 'https://...'}
                onChange={(e) => onChange(field.id, e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#800021]"
                style={{
                  backgroundColor: WARM_TOKENS.surface,
                  borderColor: WARM_TOKENS.borderDefault,
                  color: WARM_TOKENS.ink,
                }}
              />
            )}

            {field.type === 'select' && (
              (field.options?.length ?? 0) >= 8 ? (
                <Combobox
                  id={field.id}
                  value={stringVal}
                  onChange={(val) => onChange(field.id, val)}
                  options={(field.options || []).map((opt) => ({ value: opt, label: opt }))}
                  placeholder="Search or select..."
                />
              ) : (
                <select
                  id={field.id}
                  value={stringVal}
                  onChange={(e) => onChange(field.id, e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#800021]"
                  style={{
                    backgroundColor: WARM_TOKENS.surface,
                    borderColor: WARM_TOKENS.borderDefault,
                    color: WARM_TOKENS.ink,
                  }}
                >
                  <option value="">Select option...</option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )
            )}

            {field.type === 'tags' && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInputs[field.id] || ''}
                    placeholder="Type an item and press Enter or Add"
                    onChange={(e) =>
                      setTagInputs((prev) => ({ ...prev, [field.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag(field.id);
                      }
                    }}
                    className="flex-1 min-h-[44px] px-3.5 py-2 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-[#800021]"
                    style={{
                      backgroundColor: WARM_TOKENS.surface,
                      borderColor: WARM_TOKENS.borderDefault,
                      color: WARM_TOKENS.ink,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTag(field.id)}
                    className="min-h-[44px] px-3.5 py-2 rounded-lg border text-xs font-semibold hover:bg-[#F8F4ED] transition-colors flex items-center gap-1"
                    style={{
                      backgroundColor: WARM_TOKENS.surface1,
                      borderColor: WARM_TOKENS.borderDefault,
                      color: WARM_TOKENS.ink,
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Add
                  </button>
                </div>

                {Array.isArray(rawVal) && rawVal.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {rawVal.map((tag: string) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border"
                        style={{
                          backgroundColor: WARM_TOKENS.surface2,
                          borderColor: WARM_TOKENS.borderSubtle,
                          color: WARM_TOKENS.ink,
                        }}
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(field.id, tag)}
                          className="hover:text-red-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
