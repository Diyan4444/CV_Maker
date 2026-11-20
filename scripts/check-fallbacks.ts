import fs from 'fs';
import path from 'path';

const files = [
  'src/components/pdf/templates/AtsSingleColumn.tsx',
  'src/components/pdf/templates/ModernProfessional.tsx',
  'src/components/pdf/templates/AcademicCv.tsx',
];

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  content.split('\n').forEach((line, idx) => {
    if (line.includes('||') && (line.includes("'") || line.includes('"'))) {
      console.log(`${path.basename(f)}:${idx + 1}: ${line.trim()}`);
    }
  });
}
