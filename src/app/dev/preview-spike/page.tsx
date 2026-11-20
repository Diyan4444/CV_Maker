'use client';

import React, { useState, useEffect, useRef } from 'react';
import { notFound } from 'next/navigation';
import { Document, Page, Text, StyleSheet, pdf } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: 'Helvetica' },
  heading: { fontSize: 18, marginBottom: 8, fontWeight: 'bold' },
  subheading: { fontSize: 12, marginBottom: 6, fontWeight: 'bold' },
  text: { marginBottom: 3, lineHeight: 1.4 },
});

function ResumeDocument({ name, experienceCount }: { name: string; experienceCount: number }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.heading}>{name}</Text>
        <Text style={styles.subheading}>Education</Text>
        <Text style={styles.text}>B.Tech in Computer Science Engineering &bull; 2024</Text>
        <Text style={styles.subheading}>Experience</Text>
        {Array.from({ length: experienceCount }).map((_, i) => (
          <Text key={i} style={styles.text}>
            Software Engineer entry #{i + 1} &bull; Architecting scalable microservices, end-to-end database migrations, and high-performance WebGL graphics pipelines.
          </Text>
        ))}
      </Page>
      <Page size="A4" style={styles.page}>
        <Text style={styles.subheading}>Publications &amp; Projects</Text>
        {Array.from({ length: experienceCount }).map((_, i) => (
          <Text key={i} style={styles.text}>
            Research Publication #{i + 1}: Automated WCAG AA Accessibility Verification &amp; Scalable Relational Multi-Tenant Architectures.
          </Text>
        ))}
      </Page>
    </Document>
  );
}

export default function PreviewSpikePage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  const [name, setName] = useState('Diyan Shah');
  const [count, setCount] = useState(15);
  const [stats, setStats] = useState({
    compileTimeMs: 0,
    canvasDrawTimeMs: 0,
    totalTimeMs: 0,
    renderCount: 0,
    numPages: 0,
  });

  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;

    const renderToCanvas = async () => {
      const t0 = performance.now();
      try {
        // 1. Compile with @react-pdf/renderer
        const doc = <ResumeDocument name={name} experienceCount={count} />;
        const blob = await pdf(doc).toBlob();
        const t1 = performance.now();
        const compileTime = t1 - t0;

        if (!active) return;

        // 2. Load PDF with pdfjs-dist
        const pdfjs = await import('pdfjs-dist');
        if (typeof window !== 'undefined') {
          pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        }

        const arrayBuffer = await blob.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdfDoc = await loadingTask.promise;

        if (!active) return;

        const container = canvasContainerRef.current;
        if (!container) return;

        // Remember scroll position
        const previousScroll = scrollContainerRef.current?.scrollTop || 0;

        const tDrawStart = performance.now();

        // Render each page into canvas
        container.innerHTML = '';
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: 1.25 }); // Sharp preview scaling

          const pageWrapper = document.createElement('div');
          pageWrapper.className = 'mb-6 shadow-md bg-white border border-gray-300 rounded';

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

          pageWrapper.appendChild(canvas);
          container.appendChild(pageWrapper);
        }

        const tDrawEnd = performance.now();
        const canvasDrawTime = tDrawEnd - tDrawStart;
        const totalTime = tDrawEnd - t0;

        // Restore scroll position
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = previousScroll;
        }

        if (active) {
          setStats((prev) => ({
            compileTimeMs: compileTime,
            canvasDrawTimeMs: canvasDrawTime,
            totalTimeMs: totalTime,
            renderCount: prev.renderCount + 1,
            numPages: pdfDoc.numPages,
          }));
        }
      } catch {
        console.error('[SPIKE_RENDER_ERROR] Render failed');
      }
    };

    renderToCanvas();

    return () => {
      active = false;
    };
  }, [name, count]);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 bg-white min-h-screen">
      <h1 className="text-2xl font-bold">PDF Preview Spike: Canvas (PDF.js) Benchmark</h1>
      <div className="flex gap-4 items-center">
        <input
          id="name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 rounded"
          placeholder="Name"
        />
        <button
          id="inc-btn"
          onClick={() => setCount((c) => c + 1)}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Add Entry ({count})
        </button>
      </div>

      <div className="p-4 bg-gray-100 rounded text-sm space-y-1">
        <div id="stat-compile-time">React-PDF Compile: {stats.compileTimeMs.toFixed(1)} ms</div>
        <div id="stat-canvas-time">PDF.js Canvas Draw: {stats.canvasDrawTimeMs.toFixed(1)} ms</div>
        <div id="stat-total-time">Total Turnaround: {stats.totalTimeMs.toFixed(1)} ms</div>
        <div id="stat-pages">Pages: {stats.numPages}</div>
        <div id="stat-render-count">Render count: {stats.renderCount}</div>
      </div>

      <div
        ref={scrollContainerRef}
        id="scroll-container"
        className="border rounded h-[700px] w-full overflow-y-auto bg-gray-200 p-6"
      >
        <div ref={canvasContainerRef} id="canvas-container" className="max-w-[700px] mx-auto" />
      </div>
    </div>
  );
}
