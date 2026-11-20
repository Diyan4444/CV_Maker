import React from 'react';
import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';
import { DocumentMeta, DocumentSection } from '@/lib/documents/types';
import { stripNonLatinScript } from '@/lib/validation/pdf-text';
import { registerNotoFonts } from '@/lib/pdf/fonts';

registerNotoFonts();

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 44,
    fontSize: 9.5,
    fontFamily: 'Noto Serif',
    color: '#0B0B0B',
    lineHeight: 1.4,
  },
  headerContainer: {
    textAlign: 'center',
    marginBottom: 18,
    paddingBottom: 10,
    borderBottomWidth: 0.8,
    borderBottomColor: '#6B6B6B',
  },
  name: {
    fontSize: 20,
    fontFamily: 'Noto Serif',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  headline: {
    fontSize: 10,
    fontFamily: 'Noto Serif',
    color: '#333333',
    marginBottom: 6,
  },
  contactRow: {
    textAlign: 'center',
    fontSize: 8.5,
    color: '#333333',
    lineHeight: 1.35,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Noto Serif',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    borderBottomWidth: 0.8,
    borderBottomColor: '#6B6B6B',
    paddingBottom: 2.5,
    marginBottom: 7,
  },
  entryContainer: {
    marginBottom: 8,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 1.5,
  },
  entryTitle: {
    fontWeight: 'bold',
    fontFamily: 'Noto Serif',
    fontSize: 9.5,
    color: '#0B0B0B',
  },
  entrySubtitle: {
    fontSize: 9,
    fontStyle: 'italic',
    color: '#333333',
  },
  dateLocation: {
    fontSize: 8.5,
    color: '#333333',
    textAlign: 'right',
  },
  bulletList: {
    marginTop: 2.5,
    paddingLeft: 10,
  },
  bulletItem: {
    fontSize: 8.5,
    marginBottom: 2,
    lineHeight: 1.35,
  },
  // Academic Publications: Numbered citations [1], [2]
  pubRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  pubIndex: {
    width: 22,
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: 'Noto Serif',
    color: '#333333',
  },
  pubContent: {
    flex: 1,
  },
  pubTitle: {
    fontSize: 9,
    fontFamily: 'Noto Serif',
    fontWeight: 'bold',
    color: '#0B0B0B',
  },
  pubMeta: {
    fontSize: 8.5,
    color: '#333333',
    lineHeight: 1.3,
  },
  paragraph: {
    fontSize: 9,
    lineHeight: 1.4,
    color: '#1A1A1A',
  },
  skillsCategory: {
    marginBottom: 3.5,
    fontSize: 9,
  },
  boldLabel: {
    fontWeight: 'bold',
    fontFamily: 'Noto Serif',
  },
});

interface TemplateProps {
  meta: DocumentMeta;
  sections: DocumentSection[];
}

export function AcademicCvTemplate({ meta, sections }: TemplateProps) {
  const accent = meta.accentColor || (meta as any).accent_color || '#163832';

  const formatDateRange = (start?: string, end?: string, isCurrent?: boolean) => {
    if (!start && !end) return '';
    if (isCurrent) return `${start || ''} – Present`.trim();
    if (start && end) return `${start} – ${end}`;
    return start || end || '';
  };

  const visibleSections = sections
    .filter((sec) => (sec.isVisible !== undefined ? sec.isVisible : (sec as any).is_visible !== false))
    .sort((a, b) => {
      const orderA = a.orderIndex !== undefined ? a.orderIndex : ((a as any).section_order ?? 0);
      const orderB = b.orderIndex !== undefined ? b.orderIndex : ((b as any).section_order ?? 0);
      return orderA - orderB;
    });

  const headerSec = sections.find((s) => (s.sectionType || (s as any).section_type) === 'header');
  const authorName = headerSec ? stripNonLatinScript((headerSec.content as any)?.fullName || (headerSec.content as any)?.full_name || '') : '';
  const docSubject = (meta as any).target_role || (meta as any).targetRole || (meta.type === 'cv' ? 'Curriculum Vitae' : 'Professional Resume');

  return (
    <Document
      title={stripNonLatinScript(meta.title) || 'Resume'}
      author={authorName}
      subject={docSubject}
      keywords={meta.type || 'resume, cv'}
      creator="CV Studio (CV Maker)"
      producer="CV Studio (react-pdf)"
      language="en"
    >
      <Page size="A4" style={styles.page}>
        {visibleSections.map((sec) => {
          const type = sec.sectionType || (sec as any).section_type;
          const displayTitle = (sec as any).custom_title || (sec as any).customTitle || sec.title;

          // 1. Header Section
          if (type === 'header') {
            const h = sec.content as any;
            const cleanName = stripNonLatinScript(h.fullName || h.full_name || '');
            const cleanHeadline = stripNonLatinScript(h.headline || '');

            const formatDisplayUrl = (rawUrl: string, fallback?: string): string => {
              if (!rawUrl) return fallback || '';
              return rawUrl.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
            };

            const contactItems: Array<{ text: string; url?: string }> = [];
            if (h.email) contactItems.push({ text: h.email, url: `mailto:${h.email}` });
            if (h.phone) contactItems.push({ text: h.phone, url: `tel:${h.phone}` });
            if (h.location) {
              contactItems.push({ text: h.location });
            } else if (h.city || h.country) {
              contactItems.push({ text: [h.city, h.country].filter(Boolean).join(', ') });
            }

            if (h.links && Array.isArray(h.links)) {
              h.links.forEach((l: any) => {
                const url = l?.url || '';
                const display = formatDisplayUrl(url, l?.label);
                if (display) {
                  contactItems.push({ text: display, url: url || undefined });
                }
              });
            } else {
              if (h.linkedinUrl) {
                contactItems.push({
                  text: formatDisplayUrl(h.linkedinUrl, 'LinkedIn'),
                  url: h.linkedinUrl,
                });
              }
              if (h.githubUrl) {
                contactItems.push({
                  text: formatDisplayUrl(h.githubUrl, 'GitHub'),
                  url: h.githubUrl,
                });
              }
              if (h.websiteUrl) {
                contactItems.push({
                  text: formatDisplayUrl(h.websiteUrl, 'Curriculum Vitae'),
                  url: h.websiteUrl,
                });
              }
            }

            return (
              <View key={sec.id} style={styles.headerContainer}>
                <Text style={[styles.name, { color: accent }]}>{cleanName}</Text>
                {cleanHeadline ? <Text style={styles.headline}>{cleanHeadline}</Text> : null}
                <Text style={styles.contactRow}>
                  {contactItems.map((item, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 ? ' • ' : ''}
                      {item.url ? (
                        <Link src={item.url} style={{ color: '#0B0B0B', textDecoration: 'none' }}>
                          {item.text}
                        </Link>
                      ) : (
                        item.text
                      )}
                    </React.Fragment>
                  ))}
                </Text>
              </View>
            );
          }

          // 2. Summary / Research Interests
          if (type === 'summary') {
            const summary = sec.content as any;
            const text = stripNonLatinScript(summary.text || '');
            if (!text) return null;

            return (
              <View key={sec.id} style={styles.section}>
                <Text style={[styles.sectionTitle, { color: accent }]}>{displayTitle}</Text>
                <Text style={styles.paragraph}>{text}</Text>
              </View>
            );
          }

          // 3. Education Section
          if (type === 'education') {
            const entries = ((sec.content as any).entries || []).filter((e: any) => e.isVisible !== false);
            if (entries.length === 0) return null;

            return (
              <View key={sec.id} style={styles.section}>
                <Text style={[styles.sectionTitle, { color: accent }]}>{displayTitle}</Text>
                {entries.map((edu: any) => {
                  const inst = edu.institution || edu.subtitle || '';
                  const deg = edu.degree || edu.title || '';
                  return (
                    <View key={edu.id} style={styles.entryContainer}>
                      <View style={styles.entryRow}>
                        <Text style={styles.entryTitle}>{stripNonLatinScript(deg)}</Text>
                        <Text style={styles.dateLocation}>
                          {formatDateRange(edu.startDate, edu.endDate, edu.isCurrent)}
                        </Text>
                      </View>
                      <View style={styles.entryRow}>
                        <Text style={styles.entrySubtitle}>{stripNonLatinScript(inst)}</Text>
                        {edu.fieldOfStudy ? (
                          <Text style={styles.dateLocation}>{stripNonLatinScript(edu.fieldOfStudy)}</Text>
                        ) : null}
                      </View>
                      {edu.bullets && edu.bullets.length > 0 && (
                        <View style={styles.bulletList}>
                          {edu.bullets.map((b: string, bIdx: number) => (
                            <Text key={bIdx} style={styles.bulletItem}>
                              • {stripNonLatinScript(b)}
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          }

          // 4. Experience / Appointments Section
          if (type === 'experience') {
            const entries = ((sec.content as any).entries || []).filter((e: any) => e.isVisible !== false);
            if (entries.length === 0) return null;

            return (
              <View key={sec.id} style={styles.section}>
                <Text style={[styles.sectionTitle, { color: accent }]}>{displayTitle}</Text>
                {entries.map((exp: any) => {
                  const org = exp.organization || exp.subtitle || exp.company || '';
                  const role = exp.role || exp.title || '';
                  return (
                    <View key={exp.id} style={styles.entryContainer}>
                      <View style={styles.entryRow}>
                        <Text style={styles.entryTitle}>{stripNonLatinScript(role)}</Text>
                        <Text style={styles.dateLocation}>
                          {formatDateRange(exp.startDate, exp.endDate, exp.isCurrent)}
                        </Text>
                      </View>
                      <View style={styles.entryRow}>
                        <Text style={styles.entrySubtitle}>{stripNonLatinScript(org)}</Text>
                        {exp.location ? (
                          <Text style={styles.dateLocation}>{stripNonLatinScript(exp.location)}</Text>
                        ) : null}
                      </View>
                      {exp.bullets && exp.bullets.length > 0 && (
                        <View style={styles.bulletList}>
                          {exp.bullets.map((b: string, bIdx: number) => (
                            <Text key={bIdx} style={styles.bulletItem}>
                              • {stripNonLatinScript(b)}
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          }

          // 5. Academic Publications (Numbered [1], [2], ...)
          if (type === 'publications') {
            const entries = ((sec.content as any).entries || []).filter((e: any) => e.isVisible !== false);
            if (entries.length === 0) return null;

            return (
              <View key={sec.id} style={styles.section}>
                <Text style={[styles.sectionTitle, { color: accent }]}>{displayTitle}</Text>
                {entries.map((pub: any, pIdx: number) => {
                  const authors = Array.isArray(pub.authors)
                    ? pub.authors.map((a: string) => stripNonLatinScript(a)).join(', ')
                    : '';
                  return (
                    <View key={pub.id} style={styles.pubRow}>
                      <Text style={styles.pubIndex}>[{pIdx + 1}]</Text>
                      <View style={styles.pubContent}>
                        <Text style={styles.pubTitle}>{`"${stripNonLatinScript(pub.title)}"`}</Text>
                        <Text style={styles.pubMeta}>
                          {authors ? `${authors}. ` : ''}
                          {pub.subtitle ? `${stripNonLatinScript(pub.subtitle)} ` : ''}
                          {pub.venue ? `${stripNonLatinScript(pub.venue)}. ` : ''}
                          {pub.doiOrUrl ? `DOI: ${pub.doiOrUrl}` : ''}
                        </Text>
                        {pub.bullets && pub.bullets.length > 0 && (
                          <View style={styles.bulletList}>
                            {pub.bullets.map((b: string, bIdx: number) => (
                              <Text key={bIdx} style={styles.bulletItem}>
                                {stripNonLatinScript(b)}
                              </Text>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          }

          // 6. Projects Section
          if (type === 'projects') {
            const entries = ((sec.content as any).entries || []).filter((e: any) => e.isVisible !== false);
            if (entries.length === 0) return null;

            return (
              <View key={sec.id} style={styles.section}>
                <Text style={[styles.sectionTitle, { color: accent }]}>{displayTitle}</Text>
                {entries.map((proj: any) => {
                  const pSub = proj.subtitle || proj.role || '';
                  return (
                    <View key={proj.id} style={styles.entryContainer}>
                      <View style={styles.entryRow}>
                        <Text style={styles.entryTitle}>{stripNonLatinScript(proj.title)}</Text>
                        <Text style={styles.dateLocation}>
                          {formatDateRange(proj.startDate, proj.endDate)}
                        </Text>
                      </View>
                      {pSub ? (
                        <Text style={styles.entrySubtitle}>{stripNonLatinScript(pSub)}</Text>
                      ) : null}
                      {proj.bullets && proj.bullets.length > 0 && (
                        <View style={styles.bulletList}>
                          {proj.bullets.map((b: string, bIdx: number) => (
                            <Text key={bIdx} style={styles.bulletItem}>
                              • {stripNonLatinScript(b)}
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          }

          // 7. Skills Section
          if (type === 'skills') {
            const entries = ((sec.content as any).entries || []).filter((e: any) => e.isVisible !== false);
            if (entries.length === 0) return null;

            return (
              <View key={sec.id} style={styles.section}>
                <Text style={[styles.sectionTitle, { color: accent }]}>{displayTitle}</Text>
                {entries.map((cat: any) => {
                  const catTitle = cat.category || cat.title || '';
                  const skillText = Array.isArray(cat.items)
                    ? cat.items.map((it: any) => stripNonLatinScript(it.name || it)).join(', ')
                    : stripNonLatinScript(cat.subtitle || '');
                  return (
                    <Text key={cat.id} style={styles.skillsCategory}>
                      <Text style={styles.boldLabel}>{stripNonLatinScript(catTitle)}: </Text>
                      {skillText}
                    </Text>
                  );
                })}
              </View>
            );
          }

          // 8. Achievements / Awards Section
          if (type === 'achievements' || type === 'awards') {
            const entries = ((sec.content as any).entries || []).filter((e: any) => e.isVisible !== false);
            if (entries.length === 0) return null;

            return (
              <View key={sec.id} style={styles.section}>
                <Text style={[styles.sectionTitle, { color: accent }]}>{displayTitle}</Text>
                {entries.map((ach: any) => (
                  <View key={ach.id} style={styles.entryContainer}>
                    <View style={styles.entryRow}>
                      <Text style={styles.entryTitle}>{stripNonLatinScript(ach.title)}</Text>
                      {ach.date ? <Text style={styles.dateLocation}>{ach.date}</Text> : null}
                    </View>
                    {ach.issuer ? (
                      <Text style={styles.entrySubtitle}>{stripNonLatinScript(ach.issuer)}</Text>
                    ) : null}
                    {ach.description ? (
                      <Text style={styles.paragraph}>{stripNonLatinScript(ach.description)}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            );
          }

          // 9. Certifications Section
          if (type === 'certifications') {
            const entries = ((sec.content as any).entries || []).filter((e: any) => e.isVisible !== false);
            if (entries.length === 0) return null;

            return (
              <View key={sec.id} style={styles.section}>
                <Text style={[styles.sectionTitle, { color: accent }]}>{displayTitle}</Text>
                {entries.map((cert: any) => (
                  <View key={cert.id} style={styles.entryContainer}>
                    <View style={styles.entryRow}>
                      <Text style={styles.entryTitle}>{stripNonLatinScript(cert.name || cert.title)}</Text>
                      {cert.date ? <Text style={styles.dateLocation}>{cert.date}</Text> : null}
                    </View>
                    {cert.issuingOrg || cert.subtitle ? (
                      <Text style={styles.entrySubtitle}>
                        {stripNonLatinScript(cert.issuingOrg || cert.subtitle)}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            );
          }

          // 10. Custom Sections (e.g. Grants, Fellowships)
          if (type === 'custom') {
            const entries = ((sec.content as any).entries || []).filter((e: any) => e.isVisible !== false);
            if (entries.length === 0) return null;

            return (
              <View key={sec.id} style={styles.section}>
                <Text style={[styles.sectionTitle, { color: accent }]}>{displayTitle}</Text>
                {entries.map((c: any) => (
                  <View key={c.id} style={styles.entryContainer}>
                    <View style={styles.entryRow}>
                      <Text style={styles.entryTitle}>{stripNonLatinScript(c.title)}</Text>
                      {c.date || c.startDate ? (
                        <Text style={styles.dateLocation}>
                          {formatDateRange(c.startDate, c.endDate) || c.date}
                        </Text>
                      ) : null}
                    </View>
                    {c.subtitle ? (
                      <Text style={styles.entrySubtitle}>{stripNonLatinScript(c.subtitle)}</Text>
                    ) : null}
                    {c.description ? (
                      <Text style={styles.paragraph}>{stripNonLatinScript(c.description)}</Text>
                    ) : null}
                    {c.bullets && c.bullets.length > 0 && (
                      <View style={styles.bulletList}>
                        {c.bullets.map((b: string, bIdx: number) => (
                          <Text key={bIdx} style={styles.bulletItem}>
                            • {stripNonLatinScript(b)}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            );
          }

          return null;
        })}
      </Page>
    </Document>
  );
}
