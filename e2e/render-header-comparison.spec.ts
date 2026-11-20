import { test } from '@playwright/test';
import React from 'react';
import { pdf, Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { AtsSingleColumnTemplate } from '../src/components/pdf/templates/AtsSingleColumn';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Diyan/.gemini/antigravity/brain/0476a383-8a86-41cb-a552-ce7ab883faf8';

const extremeDoc: any = {
  meta: {
    id: 'test-extreme',
    title: 'Extreme Layout Test',
    type: 'resume',
    accentColor: '#0B0B0B',
  },
  sections: [
    {
      id: 'sec-header',
      sectionType: 'header',
      title: 'Header',
      isVisible: true,
      content: {
        schema_version: '1.0.0',
        fullName: 'Prof. Dr. Maximilian Alexander Montgomery-Chamberlain III, FRS FREng',
        headline: 'Chair of Distributed Systems & Autonomous Infrastructure Architecture, High-Performance Scalable Cloud Research Group',
        email: 'alexander.montgomery-chamberlain.distinguished.chair@research-institute-center.cambridge.ac.uk',
        phone: '+44 (0) 20 7946 0912 ext. 48291 / mobile direct: +1 (555) 019-2834 (CET/BST)',
        location: 'Cambridge, Cambridgeshire, United Kingdom / Frankfurt am Main, Hesse, Germany',
      },
    },
  ],
};

function OldUnfixedHeaderDocument() {
  const styles = StyleSheet.create({
    page: {
      paddingTop: 36,
      paddingBottom: 36,
      paddingHorizontal: 40,
      fontSize: 9.5,
      fontFamily: 'Helvetica',
      color: '#0B0B0B',
      lineHeight: 1.35,
    },
    headerContainer: {
      marginBottom: 14,
      textAlign: 'center',
    },
    name: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 2,
      color: '#0B0B0B',
    },
    headline: {
      fontSize: 10,
      color: '#333333',
      marginBottom: 4,
    },
    contactRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      fontSize: 8.5,
      color: '#333333',
      flexWrap: 'wrap',
      gap: 4,
    },
  });

  const h = extremeDoc.sections[0].content;
  const contactParts = [h.email, h.phone, h.location];

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      React.createElement(
        View,
        { style: styles.headerContainer },
        React.createElement(Text, { style: styles.name }, h.fullName),
        React.createElement(Text, { style: styles.headline }, h.headline),
        React.createElement(
          View,
          { style: styles.contactRow },
          contactParts.map((part, idx) =>
            React.createElement(
              Text,
              { key: idx },
              `${part} ${idx < contactParts.length - 1 ? '•' : ''}`
            )
          )
        )
      )
    )
  );
}

test('Render PNGs of Old Unfixed Layout and Current Fixed Layout', async ({ page }) => {
  // 1. Render Old Unfixed
  const oldBlob = await pdf(React.createElement(OldUnfixedHeaderDocument) as any).toBlob();
  const oldBase64 = Buffer.from(await oldBlob.arrayBuffer()).toString('base64');

  await page.goto('about:blank');
  await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js' });

  await page.evaluate(async (b64) => {
    const raw = atob(b64);
    const uint8 = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) uint8[i] = raw.charCodeAt(i);

    const pdfjsLib = (window as any).pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const loadingTask = pdfjsLib.getDocument({ data: uint8 });
    const pdfDoc = await loadingTask.promise;
    const pageDoc = await pdfDoc.getPage(1);
    const viewport = pageDoc.getViewport({ scale: 2.0 });

    const canvas = document.createElement('canvas');
    canvas.id = 'render-canvas';
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    await pageDoc.render({ canvasContext: ctx, viewport }).promise;
  }, oldBase64);

  const oldCanvas = page.locator('#render-canvas');
  const oldPngPath = path.join(ARTIFACT_DIR, 'header_old_unfixed_collision.png');
  await oldCanvas.screenshot({ path: oldPngPath });
  console.log(`Saved Old Unfixed PNG to ${oldPngPath}`);

  // 2. Render Current Fixed Layout
  const fixedBlob = await pdf(
    React.createElement(AtsSingleColumnTemplate, {
      meta: extremeDoc.meta,
      sections: extremeDoc.sections,
    }) as any
  ).toBlob();
  const fixedBase64 = Buffer.from(await fixedBlob.arrayBuffer()).toString('base64');

  await page.evaluate(async (b64) => {
    document.body.innerHTML = '';
    const raw = atob(b64);
    const uint8 = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) uint8[i] = raw.charCodeAt(i);

    const pdfjsLib = (window as any).pdfjsLib;
    const loadingTask = pdfjsLib.getDocument({ data: uint8 });
    const pdfDoc = await loadingTask.promise;
    const pageDoc = await pdfDoc.getPage(1);
    const viewport = pageDoc.getViewport({ scale: 2.0 });

    const canvas = document.createElement('canvas');
    canvas.id = 'render-canvas-fixed';
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    await pageDoc.render({ canvasContext: ctx, viewport }).promise;
  }, fixedBase64);

  const fixedCanvas = page.locator('#render-canvas-fixed');
  const fixedPngPath = path.join(ARTIFACT_DIR, 'header_current_fixed_layout.png');
  await fixedCanvas.screenshot({ path: fixedPngPath });
  console.log(`Saved Fixed Layout PNG to ${fixedPngPath}`);
});
