'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { WARM_TOKENS } from '@/styles/tokens';
import { ChevronDown, Check } from 'lucide-react';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  id: string;
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}

export function Combobox({
  id,
  options,
  value,
  onChange,
  placeholder = 'Search or select...',
  ariaLabel,
}: ComboboxProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value) || null,
    [options, value]
  );

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const displayValue = isFiltering ? query : selectedOption?.label || '';

  const filteredOptions = useMemo(() => {
    if (!isFiltering || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, isFiltering]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsFiltering(false);
        setQuery(selectedOption?.label || '');
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [selectedOption]);

  const selectOption = (opt: ComboboxOption) => {
    onChange(opt.value);
    setQuery(opt.label);
    setIsFiltering(false);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const openList = () => {
    setIsOpen(true);
    const currentIdx = filteredOptions.findIndex((o) => o.value === value);
    setActiveIndex(currentIdx >= 0 ? currentIdx : filteredOptions.length > 0 ? 0 : -1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        openList();
      } else if (filteredOptions.length > 0) {
        setActiveIndex((prev) => (prev + 1) % filteredOptions.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        openList();
      } else if (filteredOptions.length > 0) {
        setActiveIndex((prev) => (prev <= 0 ? filteredOptions.length - 1 : prev - 1));
      }
    } else if (e.key === 'Home' && isOpen) {
      e.preventDefault();
      if (filteredOptions.length > 0) setActiveIndex(0);
    } else if (e.key === 'End' && isOpen) {
      e.preventDefault();
      if (filteredOptions.length > 0) setActiveIndex(filteredOptions.length - 1);
    } else if (e.key === 'Enter' && isOpen) {
      e.preventDefault();
      if (activeIndex >= 0 && filteredOptions[activeIndex]) {
        selectOption(filteredOptions[activeIndex]);
      }
    } else if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      setIsOpen(false);
      setIsFiltering(false);
      setQuery(selectedOption?.label || '');
      setActiveIndex(-1);
    }
  };

  const activeOptionId =
    isOpen && activeIndex >= 0 && filteredOptions[activeIndex]
      ? `${listboxId}-opt-${activeIndex}`
      : undefined;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
          value={displayValue}
          placeholder={placeholder}
          onFocus={() => {
            if (!isOpen) openList();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsFiltering(true);
            setIsOpen(true);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          className="w-full min-h-[44px] pl-3.5 pr-10 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#800021]"
          style={{
            backgroundColor: WARM_TOKENS.surface,
            borderColor: WARM_TOKENS.borderDefault,
            color: WARM_TOKENS.ink,
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Toggle options"
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
              setIsFiltering(false);
              setQuery(selectedOption?.label || '');
            } else {
              openList();
              inputRef.current?.focus();
            }
          }}
          className="absolute right-1.5 min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-md"
          style={{ color: WARM_TOKENS.muted }}
        >
          <ChevronDown className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-40 mt-1.5 w-full max-h-60 overflow-y-auto rounded-xl border shadow-lg py-1"
          style={{
            backgroundColor: WARM_TOKENS.surface,
            borderColor: WARM_TOKENS.borderDefault,
          }}
        >
          {filteredOptions.length === 0 ? (
            <li className="px-3.5 py-2.5 text-xs" style={{ color: WARM_TOKENS.muted }}>
              No matching options
            </li>
          ) : (
            filteredOptions.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isActive = idx === activeIndex;
              return (
                <li
                  key={opt.value}
                  id={`${listboxId}-opt-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectOption(opt);
                  }}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className="min-h-[44px] px-3.5 py-2 text-sm flex items-center justify-between gap-2 cursor-pointer"
                  style={{
                    backgroundColor: isActive
                      ? WARM_TOKENS.surface2
                      : isSelected
                      ? WARM_TOKENS.accentSoft
                      : WARM_TOKENS.surface,
                    color: WARM_TOKENS.ink,
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  <span>{opt.label}</span>
                  {isSelected && (
                    <Check
                      className="w-4 h-4 shrink-0"
                      style={{ color: WARM_TOKENS.accentStrong }}
                      aria-hidden="true"
                    />
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
