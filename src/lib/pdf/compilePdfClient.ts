import React from 'react';
import { DocumentMeta, DocumentSection } from '@/lib/documents/types';

let workerInstance: Worker | null = null;
let workerFailed = false;
let nextRequestId = 1;

interface PendingJob {
  resolve: (buf: Uint8Array) => void;
  reject: (err: Error) => void;
}

const pendingJobs = new Map<number, PendingJob>();

function getOrCreateWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined' || workerFailed) {
    return null;
  }
  if ((window as unknown as Record<string, unknown>).__QUILLFOLIO_DISABLE_PDF_WORKER__) {
    return null;
  }
  if (workerInstance) return workerInstance;

  try {
    const worker = new Worker(new URL('./pdfCompile.worker.ts', import.meta.url));
    worker.onmessage = (event: MessageEvent<{ id: number; buffer?: ArrayBuffer; error?: string }>) => {
      const { id, buffer, error } = event.data;
      const pending = pendingJobs.get(id);
      if (!pending) return;
      pendingJobs.delete(id);
      if (error || !buffer) {
        pending.reject(new Error(error || 'PDF worker returned empty buffer'));
      } else {
        pending.resolve(new Uint8Array(buffer));
      }
    };
    worker.onerror = () => {
      workerFailed = true;
      workerInstance = null;
      for (const [id, pending] of pendingJobs.entries()) {
        pendingJobs.delete(id);
        pending.reject(new Error('PDF worker crashed; falling back to main thread'));
      }
    };
    workerInstance = worker;
    return workerInstance;
  } catch {
    workerFailed = true;
    return null;
  }
}

async function compileOnMainThread(meta: DocumentMeta, sections: DocumentSection[]): Promise<Uint8Array> {
  const [{ pdf }, { DocumentPdfRenderer }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/components/pdf/DocumentPdfRenderer'),
  ]);
  const docElement = React.createElement(DocumentPdfRenderer, { meta, sections });
  const blob = await pdf(docElement as any).toBlob();
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Compiles a Quillfolio document to PDF bytes in a dedicated Web Worker,
 * with automatic fallback to main-thread dynamic import if Workers are unavailable or fail.
 */
export async function compilePdfBytes(
  meta: DocumentMeta,
  sections: DocumentSection[]
): Promise<{ bytes: Uint8Array; mode: 'worker' | 'main-thread' }> {
  const worker = getOrCreateWorker();
  if (worker) {
    try {
      const bytes = await new Promise<Uint8Array>((resolve, reject) => {
        const id = nextRequestId++;
        pendingJobs.set(id, { resolve, reject });
        worker.postMessage({ id, meta, sections });
      });
      return { bytes, mode: 'worker' };
    } catch {
      // Fall back to main thread if worker fails
    }
  }
  const bytes = await compileOnMainThread(meta, sections);
  return { bytes, mode: 'main-thread' };
}

export function warmPdfWorker() {
  getOrCreateWorker();
}
