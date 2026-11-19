'use client';

import React, { useState } from 'react';
import { FieldConfig, FormFieldValue } from '@/config/onboarding/types';
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
                className="text-xs font-semibold uppercase tracking-wider text-[var(--text)]"
              >
                {field.label}
                {field.required ? (
                  <span className="text-red-500 ml-1">*</span>
                ) : (
                  <span className="text-[var(--text-muted)] font-normal lowercase ml-1">
                    (optional)
                  </span>
                )}
              </label>
            </div>

            {field.helperText && (
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
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
                  className="w-full px-3.5 py-2.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-sm focus:border-[var(--accent)] transition-colors"
                />
                {field.suggestions && field.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[11px] text-[var(--text-muted)] self-center mr-1">
                      Suggestions:
                    </span>
                    {field.suggestions.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => onChange(field.id, sug)}
                        className="text-[11px] px-2 py-0.5 rounded border border-[var(--border)] bg-[var(--surface-alt)] hover:bg-[var(--surface)] text-[var(--text)] transition-colors"
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
                className="w-full px-3.5 py-2.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-sm focus:border-[var(--accent)] transition-colors"
              />
            )}

            {field.type === 'url' && (
              <input
                id={field.id}
                type="url"
                value={stringVal}
                placeholder={field.placeholder || 'https://...'}
                onChange={(e) => onChange(field.id, e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-sm focus:border-[var(--accent)] transition-colors"
              />
            )}

            {field.type === 'select' && (
              <select
                id={field.id}
                value={stringVal}
                onChange={(e) => onChange(field.id, e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-sm focus:border-[var(--accent)] transition-colors"
              >
                <option value="">Select option...</option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
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
                    className="flex-1 px-3.5 py-2 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs focus:border-[var(--accent)] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTag(field.id)}
                    className="px-3 py-2 rounded-md bg-[var(--surface-alt)] border border-[var(--border)] text-[var(--text)] text-xs font-medium hover:bg-[var(--surface)] transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>

                {Array.isArray(rawVal) && rawVal.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {rawVal.map((tag: string) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--surface-alt)] text-[var(--text)] text-xs border border-[var(--border)]"
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
