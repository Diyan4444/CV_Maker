import { describe, it, expect } from 'vitest';
import React from 'react';
import { Document, Page, Text, StyleSheet, pdf } from '@react-pdf/renderer';
import { PDFParse } from 'pdf-parse';
import { registerNotoFonts } from '@/lib/pdf/fonts';

registerNotoFonts();

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 12,
    fontFamily: 'Noto Sans',
  },
  serifPage: {
    padding: 36,
    fontSize: 12,
    fontFamily: 'Noto Serif',
  },
  heading: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  text: {
    marginBottom: 6,
  },
});

const TEST_STRINGS = [
  'Łukasz Żółć',
  'Şahin Çelik',
  'Nguyễn Văn Đạt',
  'Řehoř Dvořák',
  'Søren Müller',
  'En dash: 2020 – 2024',
  'Em dash: High performance — zero lag',
  'Bullet: • Item 1 • Item 2',
  'Curly quotes: “Double Quotes” and ‘Single Quotes’',
];

const TestDoc = () =>
  React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      React.createElement(Text, { style: styles.heading }, 'Noto Sans Diacritics & Typography Test'),
      TEST_STRINGS.map((str, i) => React.createElement(Text, { key: i, style: styles.text }, str))
    ),
    React.createElement(
      Page,
      { size: 'A4', style: styles.serifPage },
      React.createElement(Text, { style: styles.heading }, 'Noto Serif Diacritics & Typography Test'),
      TEST_STRINGS.map((str, i) => React.createElement(Text, { key: i, style: styles.text }, str))
    )
  );

describe('Noto Sans & Noto Serif Diacritics & Typographical Symbols', () => {
  it('correctly renders Latin names with diacritics and quotes without replacement or drop', async () => {
    const stream = await pdf(React.createElement(TestDoc)).toBuffer();
    const chunks: Buffer[] = [];
    for await (const chunk of stream as any) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    const text = result.text || '';

    console.log('Extracted Noto test PDF text:\n', text);

    // Verify all 5 user names with diacritics
    expect(text).toContain('Łukasz Żółć');
    expect(text).toContain('Şahin Çelik');
    expect(text).toContain('Nguyễn Văn Đạt');
    expect(text).toContain('Řehoř Dvořák');
    expect(text).toContain('Søren Müller');

    // Verify typographical punctuation
    expect(text).toContain('–'); // en dash
    expect(text).toContain('—'); // em dash
    expect(text).toContain('•'); // bullet
    expect(text).toContain('“Double Quotes”');
    expect(text).toContain('‘Single Quotes’');
  });
});
