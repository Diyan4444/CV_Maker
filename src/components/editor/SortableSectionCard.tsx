'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
} from 'lucide-react';
import { DocumentSection } from '@/lib/documents/types';

interface SortableSectionCardProps {
  section: DocumentSection;
  index: number;
  totalCount: number;
  isCollapsed: boolean;
  isFocused: boolean;
  onToggleCollapse: () => void;
  onFocusSection: () => void;
  onBlurSection: () => void;
  onTitleChange: (title: string) => void;
  onToggleVisibility: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onDeleteCustom?: () => void;
  children: React.ReactNode;
}

export function SortableSectionCard({
  section,
  index,
  totalCount,
  isCollapsed,
  isFocused,
  onToggleCollapse,
  onFocusSection,
  onBlurSection,
  onTitleChange,
  onToggleVisibility,
  onMove,
  onDeleteCustom,
  children,
}: SortableSectionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [menuOpen]);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    opacity: isDragging ? 0.85 : 1,
    zIndex: isDragging ? 20 : undefined,
  };

  const sectionLabel = section.title || section.sectionType;

  const surfaceBg = !section.isVisible
    ? 'bg-[#F1F7F7]'
    : isFocused
      ? 'bg-[#FBF6F0]'
      : 'bg-[#FFFDF9]';

  const handleDragHandleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.altKey && e.key === 'ArrowUp') {
      e.preventDefault();
      if (index > 0) onMove('up');
      return;
    }
    if (e.altKey && e.key === 'ArrowDown') {
      e.preventDefault();
      if (index < totalCount - 1) onMove('down');
      return;
    }
    if (listeners?.onKeyDown) {
      (listeners.onKeyDown as (event: React.KeyboardEvent<HTMLButtonElement>) => void)(e);
    }
  };

  return (
    <div
      ref={setNodeRef}
      id={section.id}
      data-section-type={section.sectionType}
      data-editing={isFocused ? 'true' : 'false'}
      style={style}
      onFocusCapture={onFocusSection}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          onBlurSection();
        }
      }}
      className={`border rounded-xl overflow-visible shadow-xs transition-colors motion-reduce:transition-none ${surfaceBg} ${
        isFocused
          ? 'border-[#D8D0C5] border-l-[3px] border-l-[#9E4857]'
          : 'border-[#D8D0C5]'
      }`}
    >
      {/* Section Header */}
      <div
        className={`p-3 sm:px-4 border-b border-[#D8D0C5] rounded-t-xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 ${surfaceBg}`}
      >
        <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
          {/* Drag Handle */}
          <button
            type="button"
            data-testid={`drag-handle-${section.id}`}
            aria-label={`Drag to reorder ${sectionLabel} (or press Alt+Up / Alt+Down)`}
            {...attributes}
            {...listeners}
            onKeyDown={handleDragHandleKeyDown}
            className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:w-7 sm:h-7 flex items-center justify-center rounded text-[#706A63] hover:text-[#24221F] hover:bg-[#EFE8DE] cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-[#800021] flex-shrink-0 touch-none"
          >
            <GripVertical className="w-4 h-4" aria-hidden="true" />
          </button>

          {/* Collapse Toggle */}
          <button
            type="button"
            data-testid={`collapse-btn-${section.id}`}
            onClick={onToggleCollapse}
            aria-expanded={!isCollapsed}
            aria-controls={`section-body-${section.id}`}
            aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${sectionLabel}`}
            className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:w-7 sm:h-7 flex items-center justify-center rounded text-[#24221F] hover:bg-[#EFE8DE] focus:outline-none focus:ring-2 focus:ring-[#800021] flex-shrink-0"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
            )}
          </button>

          {/* Number + Prominent Title */}
          <span className="text-xs font-mono font-bold text-[#706A63] w-5 flex-shrink-0">
            {index + 1}.
          </span>
          <input
            ref={titleInputRef}
            type="text"
            aria-label={`Section Title for ${sectionLabel}`}
            value={section.title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="font-display font-bold text-sm sm:text-base text-[#24221F] bg-transparent border border-transparent hover:border-[#D8D0C5] focus:border-[#800021] focus:bg-[#FFFDF9] rounded px-2 py-1 sm:py-0.5 flex-1 min-w-0 transition-colors"
          />

          {/* Non-colour Editing Indicator */}
          {isFocused && (
            <span
              data-testid={`editing-badge-${section.id}`}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#800021] bg-[#FFE4D8] border border-[#800021]/30 px-2 py-0.5 rounded flex-shrink-0"
            >
              <Pencil className="w-2.5 h-2.5" aria-hidden="true" />
              <span>Editing</span>
            </span>
          )}

          {/* Subtle Muted Hidden Label (only when hidden) */}
          {!section.isVisible && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#706A63] bg-[#FFFDF9] border border-[#D8D0C5] px-2 py-0.5 rounded flex-shrink-0">
              <EyeOff className="w-3 h-3" aria-hidden="true" />
              <span>Hidden from PDF</span>
            </span>
          )}
        </div>

        {/* Right Controls: Visibility Eye + Overflow Menu */}
        <div className="flex items-center gap-1 flex-shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={onToggleVisibility}
            aria-label={section.isVisible ? `Hide ${sectionLabel}` : `Show ${sectionLabel}`}
            className={`min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:w-8 sm:h-8 flex items-center justify-center rounded border border-[#D8D0C5] transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021] ${
              section.isVisible
                ? 'bg-[#FFFDF9] text-[#24221F] hover:bg-[#EFE8DE]'
                : 'bg-[#FFE4D8] text-[#800021]'
            }`}
          >
            {section.isVisible ? (
              <Eye className="w-4 h-4 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
            ) : (
              <EyeOff className="w-4 h-4 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
            )}
          </button>

          {/* Overflow Menu */}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              data-testid={`section-menu-btn-${section.id}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={`More actions for ${sectionLabel}`}
              onClick={() => setMenuOpen((prev) => !prev)}
              className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:w-8 sm:h-8 flex items-center justify-center rounded border border-[#D8D0C5] bg-[#FFFDF9] hover:bg-[#EFE8DE] text-[#24221F] transition-colors focus:outline-none focus:ring-2 focus:ring-[#800021]"
            >
              <MoreVertical className="w-4 h-4 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                aria-label={`Actions for ${sectionLabel}`}
                className="absolute right-0 mt-1 w-44 rounded-lg border border-[#D8D0C5] bg-[#FFFDF9] shadow-md py-1 z-30"
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={index === 0}
                  onClick={() => {
                    onMove('up');
                    setMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-[#24221F] hover:bg-[#EFE8DE] disabled:opacity-40 flex items-center gap-2"
                >
                  <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Move up</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={index === totalCount - 1}
                  onClick={() => {
                    onMove('down');
                    setMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-[#24221F] hover:bg-[#EFE8DE] disabled:opacity-40 flex items-center gap-2"
                >
                  <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Move down</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    requestAnimationFrame(() => {
                      titleInputRef.current?.focus();
                      titleInputRef.current?.select();
                    });
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-[#24221F] hover:bg-[#EFE8DE] flex items-center gap-2"
                >
                  <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Rename</span>
                </button>
                {section.sectionType === 'custom' && onDeleteCustom && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onDeleteCustom();
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-red-700 hover:bg-red-50 flex items-center gap-2 border-t border-[#D8D0C5] mt-1 pt-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Delete section</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible Section Body (smooth 200ms grid-template-rows, inert when collapsed) */}
      <div
        id={`section-body-${section.id}`}
        className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${
          isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
        }`}
        inert={isCollapsed ? true : undefined}
      >
        <div className="overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
