'use client';

import React, { useEffect, useRef, useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { DocumentMeta, DocumentSection } from '@/lib/documents/types';
import { DocumentPdfRenderer } from '@/components/pdf/DocumentPdfRenderer';
import { ZoomIn, ZoomOut, AlertCircle, RefreshCw } from 'lucide-react';
import { QuillfolioWordmark, SkeletonBlock } from '@/components/ui/LoadingSystem';

interface LivePdfPreviewProps {
  meta: DocumentMeta;
  sections: DocumentSection[];
  onPageCountChange?: (count: number) => void;
  onTextExtracted?: (text: string, pageCount: number) => void;
}

export function LivePdfPreview({
  meta,
  sections,
  onPageCountChange,
  onTextExtracted,
}: LivePdfPreviewProps) {
  const [numPages, setNumPages] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [hasRenderedOnce, setHasRenderedOnce] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const renderVersionRef = useRef<number>(0);
  const prevPdfDocRef = useRef<any>(null);
  const onPageCountChangeRef = useRef(onPageCountChange);
  const onTextExtractedRef = useRef(onTextExtracted);

  useEffect(() => {
    onPageCountChangeRef.current = onPageCountChange;
    onTextExtractedRef.current = onTextExtracted;
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

        // Extract full text for ATS readiness checks
        let extractedFullText = '';
        for (let pIdx = 1; pIdx <= pdfDoc.numPages; pIdx++) {
          const pageObj = await pdfDoc.getPage(pIdx);
          const textContent = await pageObj.getTextContent();
          const pageStrings = textContent.items
            .filter((item: any) => 'str' in item)
            .map((item: any) => item.str);
          extractedFullText += pageStrings.join(' ') + '\n';
        }
        onTextExtractedRef.current?.(extractedFullText.trim(), pdfDoc.numPages);

        const container = canvasContainerRef.current;
        if (!container) return;

        // Destroy previous PDF.js document to release worker memory and font caches
        if (prevPdfDocRef.current) {
          try {
            prevPdfDocRef.current.destroy();
          } catch {}
        }
        prevPdfDocRef.current = pdfDoc;

        // Save current scroll position before drawing
        const currentScrollTop = scrollContainerRef.current?.scrollTop || 0;

        // Clear previous canvases and release canvas backing stores
        const oldCanvases = container.querySelectorAll('canvas');
        oldCanvases.forEach((c) => {
          c.width = 0;
          c.height = 0;
        });
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

        setHasRenderedOnce(true);
        setIsCompiling(false);
      } catch {
        if (!isCancelled) {
          console.error('[PDF_PREVIEW_ERROR] PDF Preview render failed');
          setErrorMsg('Failed to render live preview. Check document content.');
          setIsCompiling(false);
        }
      }
    }, 200); // 200ms debounce ensures responsive live updates

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      if (prevPdfDocRef.current) {
        try {
          prevPdfDocRef.current.destroy();
        } catch {}
      }
    };
  }, [meta, sections, scale]);

  const handleZoomIn = () => setScale((s) => Math.min(1.5, Number((s + 0.15).toFixed(2))));
  const handleZoomOut = () => setScale((s) => Math.max(0.6, Number((s - 0.15).toFixed(2))));
  const handleFitToWidth = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const availableWidth = Math.max(240, container.clientWidth - 32);
    const a4WidthPt = 595.28;
    const targetScale = Math.max(0.6, Math.min(1.5, Number((availableWidth / a4WidthPt).toFixed(2))));
    setScale(targetScale);
  };

  return (
    <div className="flex flex-col h-full bg-[#FFFDF9] border border-[#D8D0C5] rounded-xl overflow-hidden shadow-xs">
      {/* Top Preview Toolbar */}
      <div className="bg-[#FFFDF9] border-b border-[#D8D0C5] px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-medium">
        <div className="flex items-center gap-2 min-w-0">
          <span
            id="preview-page-readout"
            className="px-2 py-0.5 rounded bg-[#EFE8DE] text-[#24221F] border border-[#D8D0C5] text-[11px] font-medium whitespace-nowrap"
          >
            {numPages} {numPages === 1 ? 'page' : 'pages'} · A4 · 210 × 297 mm
          </span>
          {isCompiling && (
            <span className="flex items-center gap-1 text-[#800021] animate-pulse whitespace-nowrap">
              <RefreshCw className="w-3 h-3 animate-spin" /> Updating...
            </span>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 0.6}
            aria-label="Zoom Out"
            className="p-1 min-w-[28px] min-h-[28px] flex items-center justify-center rounded border border-[#D8D0C5] bg-[#FFFDF9] hover:bg-[#EFE8DE] text-[#24221F] disabled:opacity-40 transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <input
            type="range"
            min={0.6}
            max={1.5}
            step={0.05}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            aria-label="Preview zoom"
            id="preview-zoom-slider"
            className="w-16 sm:w-20 accent-[#800021] cursor-pointer"
          />
          <span id="preview-zoom-percentage" className="w-10 text-center text-[11px] text-[#24221F] tabular-nums">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 1.5}
            aria-label="Zoom In"
            className="p-1 min-w-[28px] min-h-[28px] flex items-center justify-center rounded border border-[#D8D0C5] bg-[#FFFDF9] hover:bg-[#EFE8DE] text-[#24221F] disabled:opacity-40 transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            id="preview-fit-width-btn"
            onClick={handleFitToWidth}
            aria-label="Fit to width"
            className="px-2 py-1 min-h-[28px] rounded border border-[#D8D0C5] bg-[#FFFDF9] hover:bg-[#EFE8DE] text-[#24221F] text-[11px] font-medium transition-colors whitespace-nowrap"
          >
            Fit to width
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
        className="flex-1 overflow-y-auto p-6 bg-[#F1F7F7] flex flex-col items-center justify-start"
      >
        {!hasRenderedOnce && (
          <div
            id="preview-preparing-placeholder"
            className="w-full max-w-[500px] aspect-[1/1.4142] bg-[#FFFFFF] border border-[#6B6B6B] rounded shadow-md p-8 flex flex-col items-center justify-center space-y-4 text-center my-auto"
          >
            <QuillfolioWordmark size="sm" />
            <p className="font-sans text-xs text-[#333333] font-medium" role="status">
              Preparing preview...
            </p>
            <div className="w-3/4 space-y-2 pt-2" aria-hidden="true">
              <SkeletonBlock className="h-3.5 w-full" />
              <SkeletonBlock className="h-3 w-5/6 mx-auto" />
              <SkeletonBlock className="h-3 w-2/3 mx-auto" />
            </div>
          </div>
        )}

        <div
          ref={canvasContainerRef}
          id="pdf-preview-canvas-container"
          className={`w-full max-w-[620px] transition-all ${!hasRenderedOnce ? 'hidden' : 'block'}`}
        />
      </div>
    </div>
  );
}
