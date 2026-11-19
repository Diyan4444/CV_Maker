import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { DocumentMeta, DocumentSection } from '@/lib/documents/types';
import { stripNonLatinScript } from '@/lib/validation/pdf-text';
import { registerNotoFonts } from '@/lib/pdf/fonts';

registerNotoFonts();

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 40,
    fontSize: 9.5,
    fontFamily: 'Noto Sans',
    color: '#0B0B0B',
    lineHeight: 1.35,
  },
  headerContainer: {
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1.5,
  },
  name: {
    fontSize: 20,
    fontFamily: 'Noto Sans',
    fontWeight: 'bold',
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  headline: {
    fontSize: 10.5,
    fontFamily: 'Noto Sans',
    color: '#333333',
    marginBottom: 6,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    fontSize: 8.5,
    color: '#333333',
  },
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  sectionBar: {
    width: 3,
    height: 11,
    borderRadius: 1.5,
  },
  sectionTitle: {
    fontSize: 10.5,
    fontWeight: 'bold',
    fontFamily: 'Noto Sans',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  entryContainer: {
    marginBottom: 7,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 1.5,
  },
  entryTitle: {
    fontWeight: 'bold',
    fontFamily: 'Noto Sans',
    fontSize: 9.5,
    color: '#0B0B0B',
  },
  entrySubtitle: {
    fontSize: 9,
    color: '#333333',
  },
  dateLocation: {
    fontSize: 8.5,
    color: '#5D6B6B',
    textAlign: 'right',
  },
  bulletList: {
    marginTop: 2.5,
    paddingLeft: 8,
  },
  bulletItem: {
    fontSize: 8.5,
    marginBottom: 1.5,
    lineHeight: 1.3,
  },
  skillsCategory: {
    marginBottom: 3,
    fontSize: 9,
  },
  boldLabel: {
    fontWeight: 'bold',
    fontFamily: 'Noto Sans',
  },
  paragraph: {
    fontSize: 9,
    lineHeight: 1.35,
    color: '#1A1A1A',
  },
});

interface TemplateProps {
  meta: DocumentMeta;
  sections: DocumentSection[];
}

export function ModernProfessionalTemplate({ meta, sections }: TemplateProps) {
  const accent = meta.accentColor || (meta as any).accent_color || '#800021';

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

  return (
    <Document title={stripNonLatinScript(meta.title)}>
      <Page size="A4" style={styles.page}>
        {visibleSections.map((sec) => {
          const type = sec.sectionType || (sec as any).section_type;

          // 1. Header Section
          if (type === 'header') {
            const h = sec.content as any;
            const cleanName = stripNonLatinScript(h.fullName || h.full_name || '');
            const cleanHeadline = stripNonLatinScript(h.headline || '');
            const contactParts: string[] = [];
            if (h.email) contactParts.push(h.email);
            if (h.phone) contactParts.push(h.phone);
            if (h.location) {
              contactParts.push(h.location);
            } else if (h.city || h.country) {
              contactParts.push([h.city, h.country].filter(Boolean).join(', '));
            }
            if (h.links && Array.isArray(h.links)) {
              h.links.forEach((l: any) => {
                if (l?.label) contactParts.push(l.label);
              });
            } else {
              if (h.linkedinUrl) contactParts.push('LinkedIn');
              if (h.githubUrl) contactParts.push('GitHub');
              if (h.websiteUrl) contactParts.push('Portfolio');
            }

            return (
              <View key={sec.id} style={[styles.headerContainer, { borderBottomColor: accent }]}>
                <Text style={[styles.name, { color: accent }]}>{cleanName}</Text>
                {cleanHeadline ? <Text style={styles.headline}>{cleanHeadline}</Text> : null}
                <View style={styles.contactRow}>
                  {contactParts.map((part, idx) => (
                    <Text key={idx}>
                      {part} {idx < contactParts.length - 1 ? '|' : ''}
                    </Text>
                  ))}
                </View>
              </View>
            );
          }

          // 2. Summary Section
          if (type === 'summary') {
            const summary = sec.content as any;
            const text = stripNonLatinScript(summary.text || '');
            if (!text) return null;

            return (
              <View key={sec.id} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionBar, { backgroundColor: accent }]} />
                  <Text style={[styles.sectionTitle, { color: accent }]}>{sec.title}</Text>
                </View>
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
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionBar, { backgroundColor: accent }]} />
                  <Text style={[styles.sectionTitle, { color: accent }]}>{sec.title}</Text>
                </View>
                {entries.map((edu: any) => {
                  const inst = edu.institution || edu.subtitle || '';
                  const deg = edu.degree || edu.title || '';
                  return (
                    <View key={edu.id} style={styles.entryContainer}>
                      <View style={styles.entryRow}>
                        <Text style={styles.entryTitle}>{stripNonLatinScript(inst)}</Text>
                        <Text style={styles.dateLocation}>
                          {formatDateRange(edu.startDate, edu.endDate, edu.isCurrent)}
                        </Text>
                      </View>
                      <View style={styles.entryRow}>
                        <Text style={styles.entrySubtitle}>
                          {stripNonLatinScript(deg)}
                          {edu.fieldOfStudy ? ` in ${stripNonLatinScript(edu.fieldOfStudy)}` : ''}
                        </Text>
                        {edu.grade ? <Text style={styles.dateLocation}>GPA/Grade: {edu.grade}</Text> : null}
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

          // 4. Experience Section
          if (type === 'experience') {
            const entries = ((sec.content as any).entries || []).filter((e: any) => e.isVisible !== false);
            if (entries.length === 0) return null;

            return (
              <View key={sec.id} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionBar, { backgroundColor: accent }]} />
                  <Text style={[styles.sectionTitle, { color: accent }]}>{sec.title}</Text>
                </View>
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

          // 5. Projects Section
          if (type === 'projects') {
            const entries = ((sec.content as any).entries || []).filter((e: any) => e.isVisible !== false);
            if (entries.length === 0) return null;

            return (
              <View key={sec.id} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionBar, { backgroundColor: accent }]} />
                  <Text style={[styles.sectionTitle, { color: accent }]}>{sec.title}</Text>
                </View>
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

          // 6. Skills Section
          if (type === 'skills') {
            const entries = ((sec.content as any).entries || []).filter((e: any) => e.isVisible !== false);
            if (entries.length === 0) return null;

            return (
              <View key={sec.id} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionBar, { backgroundColor: accent }]} />
                  <Text style={[styles.sectionTitle, { color: accent }]}>{sec.title}</Text>
                </View>
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

          // 7. Publications Section
          if (type === 'publications') {
            const entries = ((sec.content as any).entries || []).filter((e: any) => e.isVisible !== false);
            if (entries.length === 0) return null;

            return (
              <View key={sec.id} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionBar, { backgroundColor: accent }]} />
                  <Text style={[styles.sectionTitle, { color: accent }]}>{sec.title}</Text>
                </View>
                {entries.map((pub: any) => {
                  const authors = Array.isArray(pub.authors)
                    ? pub.authors.map((a: string) => stripNonLatinScript(a)).join(', ')
                    : '';
                  return (
                    <View key={pub.id} style={styles.entryContainer}>
                      <Text style={styles.entryTitle}>{`"${stripNonLatinScript(pub.title)}"`}</Text>
                      <Text style={styles.entrySubtitle}>
                        {authors}
                        {pub.venue ? ` — ${stripNonLatinScript(pub.venue)}` : ''}
                        {pub.publicationDate ? ` (${pub.publicationDate})` : ''}
                      </Text>
                    </View>
                  );
                })}
              </View>
            );
          }

          // 8. Achievements Section
          if (type === 'achievements') {
            const entries = ((sec.content as any).entries || []).filter((e: any) => e.isVisible !== false);
            if (entries.length === 0) return null;

            return (
              <View key={sec.id} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionBar, { backgroundColor: accent }]} />
                  <Text style={[styles.sectionTitle, { color: accent }]}>{sec.title}</Text>
                </View>
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
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionBar, { backgroundColor: accent }]} />
                  <Text style={[styles.sectionTitle, { color: accent }]}>{sec.title}</Text>
                </View>
                {entries.map((cert: any) => (
                  <View key={cert.id} style={styles.entryContainer}>
                    <View style={styles.entryRow}>
                      <Text style={styles.entryTitle}>{stripNonLatinScript(cert.name || cert.title)}</Text>
                      {cert.issueDate || cert.startDate ? (
                        <Text style={styles.dateLocation}>{cert.issueDate || cert.startDate}</Text>
                      ) : null}
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

          // 10. Custom Section
          if (type === 'custom') {
            const entries = ((sec.content as any).entries || []).filter((e: any) => e.isVisible !== false);
            if (entries.length === 0) return null;

            return (
              <View key={sec.id} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionBar, { backgroundColor: accent }]} />
                  <Text style={[styles.sectionTitle, { color: accent }]}>{sec.title}</Text>
                </View>
                {entries.map((c: any) => (
                  <View key={c.id} style={styles.entryContainer}>
                    <View style={styles.entryRow}>
                      <Text style={styles.entryTitle}>{stripNonLatinScript(c.title)}</Text>
                      {c.date ? <Text style={styles.dateLocation}>{c.date}</Text> : null}
                    </View>
                    {c.subtitle ? (
                      <Text style={styles.entrySubtitle}>{stripNonLatinScript(c.subtitle)}</Text>
                    ) : null}
                    {c.description ? (
                      <Text style={styles.paragraph}>{stripNonLatinScript(c.description)}</Text>
                    ) : null}
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
