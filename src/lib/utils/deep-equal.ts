/**
 * Deterministic deep equality helper for document content comparison.
 * Compares objects independently of key order, preserves array order,
 * and handles primitives, null, and undefined values cleanly.
 */

export function isDeepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) {
    return a === b;
  }
  if (typeof a !== typeof b) return false;

  if (typeof a !== 'object') {
    return a === b;
  }

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isDeepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  // Object comparison ignoring key insertion order
  const keysA = Object.keys(a).filter((k) => a[k] !== undefined);
  const keysB = Object.keys(b).filter((k) => b[k] !== undefined);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!isDeepEqual(a[key], b[key])) return false;
  }

  return true;
}

export function isDocumentContentEqual(
  metaA: any,
  sectionsA: any[],
  metaB: any,
  sectionsB: any[]
): boolean {
  if (!metaA || !metaB || !sectionsA || !sectionsB) return false;
  if (sectionsA.length !== sectionsB.length) return false;

  // Compare semantic meta properties (ignoring transient DB fields like version, updated_at)
  const cleanMetaA = {
    title: metaA.title ?? '',
    templateId: metaA.templateId || metaA.template_id || '',
    accentColor: metaA.accentColor || metaA.accent_color || '',
    targetRole: metaA.targetRole || metaA.target_role || '',
    type: metaA.type || '',
  };
  const cleanMetaB = {
    title: metaB.title ?? '',
    templateId: metaB.templateId || metaB.template_id || '',
    accentColor: metaB.accentColor || metaB.accent_color || '',
    targetRole: metaB.targetRole || metaB.target_role || '',
    type: metaB.type || '',
  };

  if (!isDeepEqual(cleanMetaA, cleanMetaB)) return false;

  // Compare sections in order (section order is semantic)
  for (let i = 0; i < sectionsA.length; i++) {
    const sA = sectionsA[i];
    const sB = sectionsB[i];

    if (sA.id !== sB.id) return false;
    if (sA.sectionType !== sB.sectionType) return false;
    if ((sA.title ?? '') !== (sB.title ?? '')) return false;
    if ((sA.isVisible ?? true) !== (sB.isVisible ?? true)) return false;
    if ((sA.orderIndex ?? i) !== (sB.orderIndex ?? i)) return false;

    if (!isDeepEqual(sA.content, sB.content)) return false;
  }

  return true;
}
