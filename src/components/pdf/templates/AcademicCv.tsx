import React from 'react';
import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';
import { DocumentMeta, DocumentSection } from '@/lib/documents/types';
import { stripNonLatinScript } from '@/lib/validation/pdf-text';
import { registerNotoFonts } from '@/lib/pdf/fonts';
import { PRODUCT_NAME } from '@/config/app';

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
    lineHeight: 1.25,
    marginBottom: 6,
  },
  headline: {
    fontSize: 10,
    fontFamily: 'Noto Serif',
    color: '#333333',
    lineHeight: 1.35,
    marginBottom: 6,
  },
  contactRow: {
    textAlign: 'center',
    fontSize: 8.5,
    color: '#333333',
    lineHeight: 1.45,
    marginTop: 2,
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
    if (!start && !end && !isCurrent) return '';
    if (isCurrent) {
      if (start) return `${start} – Present`;
      return 'Present';
    }
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
      creator={PRODUCT_NAME}
      producer={`${PRODUCT_NAME} (react-pdf)`}
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

            const hasHeader = cleanName || cleanHeadline || contactItems.length > 0;
            if (!hasHeader) return null;

            return (
              <View key={sec.id} style={styles.headerContainer}>
                {cleanName ? <Text style={[styles.name, { color: accent }]}>{cleanName}</Text> : null}
                {cleanHeadline ? <Text style={styles.headline}>{cleanHeadline}</Text> : null}
                {contactItems.length > 0 ? (
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
                ) : null}
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
                  const inst = stripNonLatinScript(edu.institution || edu.subtitle || '').trim();
                  const deg = stripNonLatinScript(edu.degree || edu.title || '').trim();
                  const dateStr = formatDateRange(edu.startDate, edu.endDate, edu.isCurrent);
                  const study = stripNonLatinScript(edu.fieldOfStudy || '').trim();
                  const hasFirstRow = deg || dateStr;
                  const hasSecondRow = inst || study;
                  const hasBullets = edu.bullets && edu.bullets.length > 0;
                  if (!hasFirstRow && !hasSecondRow && !hasBullets) return null;

                  return (
                    <View key={edu.id} style={styles.entryContainer}>
                      {hasFirstRow ? (
                        <View style={styles.entryRow}>
                          {deg ? <Text style={styles.entryTitle}>{deg}</Text> : <View />}
                          {dateStr ? <Text style={styles.dateLocation}>{dateStr}</Text> : null}
                        </View>
                      ) : null}
                      {hasSecondRow ? (
                        <View style={styles.entryRow}>
                          {inst ? <Text style={styles.entrySubtitle}>{inst}</Text> : <View />}
                          {study ? (
                            <Text style={styles.dateLocation}>{study}</Text>
                          ) : null}
                        </View>
                      ) : null}
                      {hasBullets && (
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
                  const org = stripNonLatinScript(exp.organization || exp.subtitle || exp.company || '').trim();
                  const role = stripNonLatinScript(exp.role || exp.title || '').trim();
                  const dateStr = formatDateRange(exp.startDate, exp.endDate, exp.isCurrent);
                  const loc = stripNonLatinScript(exp.location || '').trim();
                  const hasFirstRow = role || dateStr;
                  const hasSecondRow = org || loc;
                  const hasBullets = exp.bullets && exp.bullets.length > 0;
                  if (!hasFirstRow && !hasSecondRow && !hasBullets) return null;

                  return (
                    <View key={exp.id} style={styles.entryContainer}>
                      {hasFirstRow ? (
                        <View style={styles.entryRow}>
                          {role ? <Text style={styles.entryTitle}>{role}</Text> : <View />}
                          {dateStr ? <Text style={styles.dateLocation}>{dateStr}</Text> : null}
                        </View>
                      ) : null}
                      {hasSecondRow ? (
                        <View style={styles.entryRow}>
                          {org ? <Text style={styles.entrySubtitle}>{org}</Text> : <View />}
                          {loc ? (
                            <Text style={styles.dateLocation}>{loc}</Text>
                          ) : null}
                        </View>
                      ) : null}
                      {hasBullets && (
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
                {entries.map((ach: any) => {
                  const achTitle = stripNonLatinScript(ach.title || ach.name || '').trim();
                  const achDate = (ach.date || '').trim();
                  const achIssuer = stripNonLatinScript(ach.issuer || ach.organization || ach.issuerOrOrg || '').trim();
                  const desc = stripNonLatinScript(ach.description || '').trim();
                  const hasFirstRow = achTitle || achDate;
                  if (!hasFirstRow && !achIssuer && !desc) return null;

                  return (
                    <View key={ach.id} style={styles.entryContainer}>
                      {hasFirstRow ? (
                        <View style={styles.entryRow}>
                          {achTitle ? <Text style={styles.entryTitle}>{achTitle}</Text> : <View />}
                          {achDate ? <Text style={styles.dateLocation}>{achDate}</Text> : null}
                        </View>
                      ) : null}
                      {achIssuer ? (
                        <Text style={styles.entrySubtitle}>{achIssuer}</Text>
                      ) : null}
                      {desc ? (
                        <Text style={styles.paragraph}>{desc}</Text>
                      ) : null}
                    </View>
                  );
                })}
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
                {entries.map((cert: any) => {
                  const certName = stripNonLatinScript(cert.name || cert.title || '').trim();
                  const certDate = (cert.date || cert.issueDate || cert.startDate || '').trim();
                  const certOrg = stripNonLatinScript(cert.issuingOrg || cert.subtitle || '').trim();
                  const hasFirstRow = certName || certDate;
                  if (!hasFirstRow && !certOrg) return null;

                  return (
                    <View key={cert.id} style={styles.entryContainer}>
                      {hasFirstRow ? (
                        <View style={styles.entryRow}>
                          {certName ? <Text style={styles.entryTitle}>{certName}</Text> : <View />}
                          {certDate ? <Text style={styles.dateLocation}>{certDate}</Text> : null}
                        </View>
                      ) : null}
                      {certOrg ? (
                        <Text style={styles.entrySubtitle}>{certOrg}</Text>
                      ) : null}
                    </View>
                  );
                })}
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
                {entries.map((c: any) => {
                  const itemTitle = stripNonLatinScript(c.title || c.name || '').trim();
                  const itemDate = (c.date || c.startDate || '').trim();
                  const itemSub = stripNonLatinScript(c.subtitle || '').trim();
                  const desc = stripNonLatinScript(c.description || '').trim();
                  const hasFirstRow = itemTitle || itemDate;
                  const hasBullets = c.bullets && c.bullets.length > 0;
                  if (!hasFirstRow && !itemSub && !desc && !hasBullets) return null;

                  return (
                    <View key={c.id} style={styles.entryContainer}>
                      {hasFirstRow ? (
                        <View style={styles.entryRow}>
                          {itemTitle ? <Text style={styles.entryTitle}>{itemTitle}</Text> : <View />}
                          {itemDate ? (
                            <Text style={styles.dateLocation}>
                              {formatDateRange(c.startDate, c.endDate) || itemDate}
                            </Text>
                          ) : null}
                        </View>
                      ) : null}
                      {itemSub ? (
                        <Text style={styles.entrySubtitle}>{itemSub}</Text>
                      ) : null}
                      {desc ? (
                        <Text style={styles.paragraph}>{desc}</Text>
                      ) : null}
                      {hasBullets && (
                        <View style={styles.bulletList}>
                          {c.bullets.map((b: string, bIdx: number) => (
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

          return null;
        })}
      </Page>
    </Document>
  );
}
