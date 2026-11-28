'use client';

import React, { useEffect, useRef, useState } from 'react';
import { DocumentMeta, DocumentSection } from '@/lib/documents/types';
import { compilePdfBytes, warmPdfWorker } from '@/lib/pdf/compilePdfClient';
import { ZoomIn, ZoomOut, AlertCircle, RefreshCw } from 'lucide-react';
import { QuillfolioWordmark, SkeletonBlock } from '@/components/ui/LoadingSystem';

interface LivePdfPreviewProps {
  meta: DocumentMeta;
  sections: DocumentSection[];
  onPageCountChange?: (count: number) => void;
  onTextExtracted?: (text: string, pageCount: number) => void;
}

function hashDocumentPayload(meta: DocumentMeta, sections: DocumentSection[]): string {
  const str = JSON.stringify({ meta, sections });
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${(hash >>> 0).toString(16)}-${str.length}`;
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

  const hasRenderedOnceRef = useRef<boolean>(false);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const renderVersionRef = useRef<number>(0);
  const prevPdfDocRef = useRef<any>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const pdfCacheRef = useRef<Map<string, Uint8Array>>(new Map());
  const onPageCountChangeRef = useRef(onPageCountChange);
  const onTextExtractedRef = useRef(onTextExtracted);

  useEffect(() => {
    onPageCountChangeRef.current = onPageCountChange;
    onTextExtractedRef.current = onTextExtracted;
  });

  // Warm the PDF compilation worker, pdfjs-dist chunk, and pdf.worker.min.mjs immediately on mount
  useEffect(() => {
    warmPdfWorker();
    if (typeof document !== 'undefined' && !document.querySelector('link[data-pdf-worker-preload]')) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'fetch';
      link.href = '/pdf.worker.min.mjs';
      link.crossOrigin = 'anonymous';
      link.setAttribute('data-pdf-worker-preload', 'true');
      document.head.appendChild(link);
    }
    import('pdfjs-dist')
      .then((pdfjs) => {
        if (typeof window !== 'undefined') {
          pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        }
      })
      .catch(() => {});
  }, []);

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
        const contentHash = hashDocumentPayload(meta, sections);
        const cachedBytes = pdfCacheRef.current.get(contentHash);

        // Start PDF compilation (in Web Worker) AND pdfjs-dist loading in parallel
        const pdfBytesPromise = cachedBytes
          ? Promise.resolve({ bytes: cachedBytes, mode: 'cache' as const })
          : compilePdfBytes(meta, sections);

        const pdfjsPromise = import('pdfjs-dist').then((pdfjs) => {
          if (typeof window !== 'undefined') {
            pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
          }
          return pdfjs;
        });

        const [compiled, pdfjs] = await Promise.all([pdfBytesPromise, pdfjsPromise]);
        if (isCancelled || renderVersionRef.current !== currentVersion) return;

        if (!cachedBytes) {
          if (pdfCacheRef.current.size >= 5) {
            const oldestKey = pdfCacheRef.current.keys().next().value;
            if (oldestKey) pdfCacheRef.current.delete(oldestKey);
          }
          pdfCacheRef.current.set(contentHash, compiled.bytes);
        }

        // Pass a copy because pdfjs transfers the underlying ArrayBuffer to its worker
        const loadingTask = pdfjs.getDocument({ data: compiled.bytes.slice() });
        const pdfDoc = await loadingTask.promise;

        if (isCancelled || renderVersionRef.current !== currentVersion) {
          try {
            (pdfDoc as any).destroy();
          } catch {}
          return;
        }

        setNumPages(pdfDoc.numPages);
        onPageCountChangeRef.current?.(pdfDoc.numPages);

        // Extract full text for ATS readiness checks
        let extractedFullText = '';
        const pages: any[] = [];
        for (let pIdx = 1; pIdx <= pdfDoc.numPages; pIdx++) {
          const pageObj = await pdfDoc.getPage(pIdx);
          pages.push(pageObj);
          const textContent = await pageObj.getTextContent();
          const pageStrings = textContent.items
            .filter((item: any) => 'str' in item)
            .map((item: any) => item.str);
          extractedFullText += pageStrings.join(' ') + '\n';
        }
        onTextExtractedRef.current?.(extractedFullText.trim(), pdfDoc.numPages);

        if (isCancelled || renderVersionRef.current !== currentVersion) {
          try {
            (pdfDoc as any).destroy();
          } catch {}
          return;
        }

        const container = canvasContainerRef.current;
        if (!container) return;

        // Cap devicePixelRatio at 2 while keeping at least 1.5x crispness
        const rawDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        const effectiveDpr = Math.min(Math.max(rawDpr, 1.5), 2);
        const renderScale = scale * effectiveDpr;

        // Build new page cards off-DOM so previous page images stay visible while regenerating
        const newCards: HTMLDivElement[] = [];
        const lazyQueue: Array<{ pageObj: any; canvas: HTMLCanvasElement; viewport: any }> = [];

        for (let i = 0; i < pages.length; i++) {
          const pageObj = pages[i];
          const viewport = pageObj.getViewport({ scale: renderScale });

          const pageCard = document.createElement('div');
          pageCard.className =
            'mb-6 bg-white border border-[#6B6B6B] rounded shadow-md overflow-hidden transition-shadow';
          pageCard.style.width = '100%';
          pageCard.setAttribute('data-page-number', String(i + 1));

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = '100%';
          canvas.style.height = 'auto';
          canvas.style.display = 'block';

          pageCard.appendChild(canvas);
          newCards.push(pageCard);

          if (i === 0) {
            // Always render page 1 before swapping so the visible image never blanks
            const ctx = canvas.getContext('2d');
            if (ctx) {
              await (pageObj.render as any)({ canvasContext: ctx, viewport, canvas }).promise;
            }
          } else {
            lazyQueue.push({ pageObj, canvas, viewport });
          }
        }

        if (isCancelled || renderVersionRef.current !== currentVersion) {
          try {
            (pdfDoc as any).destroy();
          } catch {}
          return;
        }

        // Save scroll position, release old canvases/doc, and swap in new cards atomically
        const currentScrollTop = scrollContainerRef.current?.scrollTop || 0;
        if (observerRef.current) {
          observerRef.current.disconnect();
          observerRef.current = null;
        }
        const oldCanvases = container.querySelectorAll('canvas');
        oldCanvases.forEach((c) => {
          c.width = 0;
          c.height = 0;
        });
        container.replaceChildren(...newCards);

        if (prevPdfDocRef.current && prevPdfDocRef.current !== pdfDoc) {
          try {
            prevPdfDocRef.current.destroy();
          } catch {}
        }
        prevPdfDocRef.current = pdfDoc;

        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = currentScrollTop;
        }

        // Render remaining pages lazily when visible (with immediate fallback if IntersectionObserver unavailable)
        if (lazyQueue.length > 0) {
          const renderedPages = new Set<HTMLCanvasElement>();
          const renderLazyItem = async (item: { pageObj: any; canvas: HTMLCanvasElement; viewport: any }) => {
            if (renderedPages.has(item.canvas) || isCancelled || renderVersionRef.current !== currentVersion) return;
            renderedPages.add(item.canvas);
            const ctx = item.canvas.getContext('2d');
            if (ctx) {
              try {
                await (item.pageObj.render as any)({
                  canvasContext: ctx,
                  viewport: item.viewport,
                  canvas: item.canvas,
                }).promise;
              } catch {}
            }
          };

          if (typeof IntersectionObserver !== 'undefined' && scrollContainerRef.current) {
            const obs = new IntersectionObserver(
              (entries) => {
                for (const entry of entries) {
                  if (entry.isIntersecting) {
                    const idx = Number((entry.target as HTMLElement).getAttribute('data-page-number')) - 2;
                    const item = lazyQueue[idx];
                    if (item) {
                      void renderLazyItem(item);
                      obs.unobserve(entry.target);
                    }
                  }
                }
              },
              { root: scrollContainerRef.current, rootMargin: '200px 0px' }
            );
            observerRef.current = obs;
            for (const item of lazyQueue) {
              if (item.canvas.parentElement) {
                obs.observe(item.canvas.parentElement);
              }
            }
          } else {
            for (const item of lazyQueue) {
              await renderLazyItem(item);
            }
          }
        }

        container.setAttribute('data-compile-mode', compiled.mode);
        container.setAttribute('data-rendered-version', String(currentVersion));
        container.setAttribute('data-rendered-at', String(performance.now()));
        container.setAttribute('data-compiling', 'false');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('preview-canvas-rendered', {
              detail: { version: currentVersion, timestamp: performance.now(), mode: compiled.mode },
            })
          );
        }

        hasRenderedOnceRef.current = true;
        setHasRenderedOnce(true);
        setIsCompiling(false);
      } catch {
        if (!isCancelled) {
          console.error('[PDF_PREVIEW_ERROR] PDF Preview render failed');
          setErrorMsg('Failed to render live preview. Check document content.');
          setIsCompiling(false);
        }
      }
    }, hasRenderedOnceRef.current ? 200 : 0);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [meta, sections, scale]);

  useEffect(() => {
    return () => {
      if (prevPdfDocRef.current) {
        try {
          prevPdfDocRef.current.destroy();
        } catch {}
      }
    };
  }, []);

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
