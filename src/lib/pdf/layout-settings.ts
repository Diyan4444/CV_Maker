import { LayoutSettings, PdfFontFamily, TemplateId } from '@/lib/documents/types';

export interface ResolvedPdfLayout {
  fontFamily: PdfFontFamily;
  fontSize: number;
  fontScale: number;
  lineHeight: number;
  pageMargin: number;
  paddingTop: number;
  paddingBottom: number;
  paddingHorizontal: number;
  underlineLinks: boolean;
  pageNumbers: boolean;
}

export function getTemplateLayoutDefaults(templateId?: TemplateId | string): ResolvedPdfLayout {
  if (templateId === 'academic_cv') {
    return {
      fontFamily: 'Noto Serif',
      fontSize: 9.5,
      fontScale: 1,
      lineHeight: 1.4,
      pageMargin: 44,
      paddingTop: 40,
      paddingBottom: 40,
      paddingHorizontal: 44,
      underlineLinks: true,
      pageNumbers: false,
    };
  }

  return {
    fontFamily: 'Noto Sans',
    fontSize: 9.5,
    fontScale: 1,
    lineHeight: 1.35,
    pageMargin: 40,
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 40,
    underlineLinks: true,
    pageNumbers: false,
  };
}

export function resolvePdfLayout(
  templateId?: TemplateId | string,
  settings?: LayoutSettings | null
): ResolvedPdfLayout {
  const defaults = getTemplateLayoutDefaults(templateId);
  if (!settings) return defaults;

  const fontFamily = settings.fontFamily ?? defaults.fontFamily;
  const fontSize = settings.fontSize ?? defaults.fontSize;
  const lineHeight = settings.lineHeight ?? defaults.lineHeight;
  const underlineLinks = settings.underlineLinks ?? defaults.underlineLinks;
  const pageNumbers = settings.pageNumbers ?? defaults.pageNumbers;

  const hasCustomMargin = typeof settings.pageMargin === 'number';
  const pageMargin = hasCustomMargin ? settings.pageMargin! : defaults.pageMargin;
  const paddingTop = hasCustomMargin ? pageMargin : defaults.paddingTop;
  const paddingHorizontal = hasCustomMargin ? pageMargin : defaults.paddingHorizontal;
  const baseBottom = hasCustomMargin ? pageMargin : defaults.paddingBottom;
  const paddingBottom = pageNumbers ? Math.max(baseBottom, 34) : baseBottom;

  return {
    fontFamily,
    fontSize,
    fontScale: fontSize / 9.5,
    lineHeight,
    pageMargin,
    paddingTop,
    paddingBottom,
    paddingHorizontal,
    underlineLinks,
    pageNumbers,
  };
}
