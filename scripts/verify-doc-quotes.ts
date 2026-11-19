import fs from 'fs';
import path from 'path';

const docPath = path.resolve(process.cwd(), 'docs/PRODUCT_VISION.md');
const docContent = fs.readFileSync(docPath, 'utf8');

export function checkQuoteAgainstDoc(quote: string): { quote: string; found: boolean } {
  // Normalize whitespace for comparison
  const normalizedDoc = docContent.replace(/\s+/g, ' ');
  const normalizedQuote = quote.replace(/\s+/g, ' ');
  return {
    quote,
    found: normalizedDoc.includes(normalizedQuote),
  };
}

const quotesToCheck = [
  // Genuine verbatim quotes from docs/PRODUCT_VISION.md
  "Left panel: Editing controls and document sections.",
  "Right panel: Live A4 or Letter document preview.",
  "Top toolbar: Save status, undo/redo, template selection, preview and export.",
  "Changing templates must never result in lost information.",
  "Start with a smaller collection of genuinely different, professionally designed templates.",
  "1. ATS-friendly single-column.",
  "2. Modern professional.",
  "4. Academic CV.",
  "The user's information should be stored in a reusable master profile.",
  "The master profile should be independent of individual resumes and websites.",
  "Important: Changes to the master profile must not silently overwrite previously customized documents or published websites.",
  "Use explicit synchronization and version management.",
  "Support detailed sections such as:",
  "Unlike a conventional resume, an academic CV should support extensive content and multiple pages.",
  // Previously fabricated/synthesized quotes that must NOT be attributed to the doc
  "Cap: 20 documents per user. User-friendly limit reached error.",
  "Transactional save with integer versioning: client sends current version; mismatch returns 409 STALE_SAVE_CONFLICT.",
  "Resumes and CVs are independent documents cloned from master profile facts."
];

console.log('=== Checking Quoted Strings Against docs/PRODUCT_VISION.md ===\n');
for (const q of quotesToCheck) {
  const res = checkQuoteAgainstDoc(q);
  console.log(`[${res.found ? 'VERBATIM IN DOC' : 'NOT IN DOC - USER SPEC / DESIGN DECISION'}]`);
  console.log(`"${res.quote}"\n`);
}
