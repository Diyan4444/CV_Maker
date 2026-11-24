import { createCanvas } from 'canvas';
import fs from 'node:fs';
import path from 'node:path';

function generateOgImage() {
  const width = 1200;
  const height = 630;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background - Quillfolio Mist palette
  ctx.fillStyle = '#F1F7F7';
  ctx.fillRect(0, 0, width, height);

  // Decorative subtle top border in Deep Wine (#800021)
  ctx.fillStyle = '#800021';
  ctx.fillRect(0, 0, width, 12);

  // Central Card Panel (#FFFFFF with #6B6B6B border)
  const cardX = 80;
  const cardY = 70;
  const cardW = width - 160;
  const cardH = height - 140;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(cardX, cardY, cardW, cardH);
  ctx.strokeStyle = '#6B6B6B';
  ctx.lineWidth = 2;
  ctx.strokeRect(cardX, cardY, cardW, cardH);

  // Badge pill
  const badgeX = cardX + 60;
  const badgeY = cardY + 60;
  const badgeW = 280;
  const badgeH = 38;
  ctx.fillStyle = '#FFE4D8';
  ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
  ctx.strokeStyle = '#800021';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

  ctx.fillStyle = '#800021';
  ctx.font = 'bold 16px "DM Sans", sans-serif';
  ctx.fillText('CAREER • ACADEMIC • PROFILE', badgeX + 16, badgeY + 25);

  // Product Wordmark
  ctx.fillStyle = '#0B0B0B';
  ctx.font = 'bold 76px "Fraunces", Georgia, serif';
  ctx.fillText('Quillfolio', badgeX, badgeY + 130);

  // Ink-line underline
  ctx.fillStyle = '#800021';
  ctx.fillRect(badgeX, badgeY + 148, 140, 5);

  // Tagline
  ctx.fillStyle = '#1A1A1A';
  ctx.font = '28px "DM Sans", -apple-system, sans-serif';
  ctx.fillText(
    'Build one profile. Generate targeted resumes and academic CVs.',
    badgeX,
    badgeY + 210
  );

  // Subtext / Capabilities
  ctx.fillStyle = '#4A4A4A';
  ctx.font = '20px "DM Sans", -apple-system, sans-serif';
  ctx.fillText(
    'Live PDF preview • Rule-based ATS readiness • Complete data export & deletion',
    badgeX,
    badgeY + 260
  );

  // Bottom note
  ctx.fillStyle = '#6B6B6B';
  ctx.font = '16px "DM Sans", -apple-system, sans-serif';
  ctx.fillText(
    'Private by design • Direct PDF export • Self-serve data rights',
    badgeX,
    badgeY + 330
  );

  // Save to public/og-image.png
  const outPath = path.join(process.cwd(), 'public', 'og-image.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outPath, buffer);
  console.log(`[OG Image Generated] ${outPath} (${buffer.length} bytes, 1200x630)`);
}

generateOgImage();
