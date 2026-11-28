/// <reference lib="webworker" />
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { DocumentMeta, DocumentSection } from '@/lib/documents/types';
import { DocumentPdfRenderer } from '@/components/pdf/DocumentPdfRenderer';

interface CompileRequest {
  id: number;
  meta: DocumentMeta;
  sections: DocumentSection[];
}

self.onmessage = async (event: MessageEvent<CompileRequest>) => {
  const { id, meta, sections } = event.data;
  try {
    const docElement = React.createElement(DocumentPdfRenderer, { meta, sections });
    const blob = await pdf(docElement as any).toBlob();
    const buffer = await blob.arrayBuffer();
    self.postMessage({ id, buffer }, [buffer]);
  } catch (err) {
    self.postMessage({
      id,
      error: err instanceof Error ? err.message : 'PDF worker compilation failed',
    });
  }
};
