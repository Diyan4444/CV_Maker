'use client';

import React, { useEffect, useRef, useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { DocumentMeta, DocumentSection } from '@/lib/documents/types';
import { DocumentPdfRenderer } from '@/components/pdf/DocumentPdfRenderer';
import { ZoomIn, ZoomOut, AlertCircle, RefreshCw } from 'lucide-react';

interface LivePdfPreviewProps {
  meta: DocumentMeta;
  sections: DocumentSection[];
  onPageCountChange?: (count: number) => void;
}

export function LivePdfPreview({ meta, sections, onPageCountChange }: LivePdfPreviewProps) {
  const [numPages, setNumPages] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const renderVersionRef = useRef<number>(0);
  const onPageCountChangeRef = useRef(onPageCountChange);

  useEffect(() => {
    onPageCountChangeRef.current = onPageCountChange;
  });

  // Debounced compilation and render
  useEffect(() => {
    let isCancelled = false;
    const currentVersion = ++renderVersionRef.current;

    const timer = setTimeout(async () => {
      setIsCompiling(true);
      setErrorMsg(null);
      if (canvasContainerRef.current) {
        canvasContainerRef.current.setAttribute('data-compiling', 'true');
      }

      try {
        // 1. Compile with @react-pdf/renderer
        const docElement = <DocumentPdfRenderer meta={meta} sections={sections} />;
        const blob = await pdf(docElement).toBlob();
        if (isCancelled || renderVersionRef.current !== currentVersion) return;

        // 2. Parse PDF with pdfjs-dist
        const pdfjs = await import('pdfjs-dist');
        if (typeof window !== 'undefined') {
          pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        }

        const arrayBuffer = await blob.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdfDoc = await loadingTask.promise;

        if (isCancelled || renderVersionRef.current !== currentVersion) return;

        setNumPages(pdfDoc.numPages);
        onPageCountChangeRef.current?.(pdfDoc.numPages);

        const container = canvasContainerRef.current;
        if (!container) return;

        // Save current scroll position before drawing
        const currentScrollTop = scrollContainerRef.current?.scrollTop || 0;

        // Clear and draw pages
        container.innerHTML = '';
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: scale * 1.5 }); // 1.5x sharp retina preview

          const pageCard = document.createElement('div');
          pageCard.className =
            'mb-6 bg-white border border-[#6B6B6B] rounded shadow-md overflow-hidden transition-shadow';
          pageCard.style.width = '100%';

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = '100%';
          canvas.style.height = 'auto';
          canvas.style.display = 'block';

          const ctx = canvas.getContext('2d');
          if (ctx) {
            await (page.render as any)({ canvasContext: ctx, viewport, canvas }).promise;
          }

          pageCard.appendChild(canvas);
          container.appendChild(pageCard);
        }

        // Restore scroll position cleanly
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = currentScrollTop;
        }

        container.setAttribute('data-rendered-version', String(currentVersion));
        container.setAttribute('data-rendered-at', String(performance.now()));
        container.setAttribute('data-compiling', 'false');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('preview-canvas-rendered', {
              detail: { version: currentVersion, timestamp: performance.now() },
            })
          );
        }

        setIsCompiling(false);
      } catch (err: unknown) {
        if (!isCancelled) {
          console.error('PDF Preview render error:', err);
          setErrorMsg('Failed to render live preview. Check document content.');
          setIsCompiling(false);
        }
      }
    }, 250); // 250ms debounce ensures fluid typing

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [meta, sections, scale]);

  const handleZoomIn = () => setScale((s) => Math.min(1.5, Number((s + 0.15).toFixed(2))));
  const handleZoomOut = () => setScale((s) => Math.max(0.6, Number((s - 0.15).toFixed(2))));

  return (
    <div className="flex flex-col h-full bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl overflow-hidden shadow-sm">
      {/* Top Preview Toolbar */}
      <div className="bg-[#FFFFFF] border-b border-[#6B6B6B] px-4 py-2.5 flex items-center justify-between text-xs font-medium">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-[#0B0B0B]">Live A4 Preview</span>
          <span className="px-2 py-0.5 rounded bg-[#F1F7F7] text-[#333333] border border-[#6B6B6B]">
            {numPages} {numPages === 1 ? 'page' : 'pages'}
          </span>
          {isCompiling && (
            <span className="flex items-center gap-1 text-[#800021] animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" /> Updating...
            </span>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 0.6}
            aria-label="Zoom Out"
            className="p-1 rounded border border-[#6B6B6B] bg-[#FFFFFF] hover:bg-[#F1F7F7] text-[#0B0B0B] disabled:opacity-40 transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="w-12 text-center text-[11px] text-[#333333]">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 1.5}
            aria-label="Zoom In"
            className="p-1 rounded border border-[#6B6B6B] bg-[#FFFFFF] hover:bg-[#F1F7F7] text-[#0B0B0B] disabled:opacity-40 transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Exceeds 2-page informational warning for Resumes */}
      {meta.type === 'resume' && numPages > 2 && (
        <div className="bg-[#FFE4D8] border-b border-[#800021] px-4 py-2 text-xs text-[#800021] flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            Resumes are typically 1–2 pages for ATS screening and recruiter review. Your resume is
            currently {numPages} pages.
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-[#FFE4D8] text-[#800021] border-b border-[#800021] text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Scrollable Canvas Container */}
      <div
        ref={scrollContainerRef}
        id="pdf-preview-scroll-container"
        className="flex-1 overflow-y-auto p-6 bg-[#F1F7F7] flex justify-center"
      >
        <div
          ref={canvasContainerRef}
          id="pdf-preview-canvas-container"
          className="w-full max-w-[620px] transition-all"
        />
      </div>
    </div>
  );
}
