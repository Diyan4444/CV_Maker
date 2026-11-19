/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import { DISCOVERY_PROMPTS, ExperienceDiscoveryPrompt } from '@/config/experience-prompts';
import {
  Plus,
  Trash2,
  Save,
  BookOpen,
  Briefcase,
  FolderGit2,
  Cpu,
  FileText,
  Award,
  ShieldCheck,
  LayoutGrid,
  Compass,
} from 'lucide-react';

interface MasterProfileEditorProps {
  initialProfile: any;
  initialEducation: any[];
  initialExperiences: any[];
  initialProjects: any[];
  initialSkills: any[];
  initialPublications: any[];
  initialAchievements: any[];
  initialCertifications: any[];
  initialCustomSections: any[];
}

export function MasterProfileEditor({
  initialProfile,
  initialEducation,
  initialExperiences,
  initialProjects,
  initialSkills,
  initialPublications,
  initialAchievements,
  initialCertifications,
  initialCustomSections,
}: MasterProfileEditorProps) {
  // State for all profile modules
  const [profile, setProfile] = useState(initialProfile || {});
  const [educations, setEducations] = useState(initialEducation || []);
  const [experiences, setExperiences] = useState(initialExperiences || []);
  const [projects, setProjects] = useState(initialProjects || []);
  const [skills, setSkills] = useState(initialSkills || []);
  const [publications, setPublications] = useState(initialPublications || []);
  const [achievements, setAchievements] = useState(initialAchievements || []);
  const [certifications, setCertifications] = useState(initialCertifications || []);
  const [customSections, setCustomSections] = useState(initialCustomSections || []);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleSaveAll = async () => {
    setSaving(true);
    setSaveStatus(null);

    try {
      const res = await fetch('/api/profile/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          educations,
          experiences,
          projects,
          skills,
          publications,
          achievements,
          certifications,
          customSections,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      if (data.version) {
        setProfile((prev: any) => ({ ...prev, version: data.version }));
      }
      setSaveStatus('All profile facts saved successfully.');
    } catch (err: any) {
      setSaveStatus('Error saving profile: ' + (err.message || 'Check connection'));
    } finally {
      setSaving(false);
    }
  };

  // Helper to add discovery prompt to state as an EMPTY draft for user to fill
  const handleApplyDiscoveryPrompt = (prompt: ExperienceDiscoveryPrompt) => {
    if (prompt.suggestedSection === 'experiences') {
      setExperiences((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          profileId: profile.id,
          type: prompt.suggestedType || 'volunteering',
          organization: '',
          role: '',
          bullets: [''],
        },
      ]);
    } else if (prompt.suggestedSection === 'projects') {
      setProjects((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          profileId: profile.id,
          title: '',
          role: '',
          bullets: [''],
          toolsUsed: [],
        },
      ]);
    } else if (prompt.suggestedSection === 'achievements') {
      setAchievements((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          profileId: profile.id,
          title: '',
          issuerOrOrg: '',
          date: '',
          description: '',
        },
      ]);
    }
  };

  return (
    <div className="space-y-8">
      {/* Save status notification */}
      {saveStatus && (
        <div
          className={`p-3.5 rounded-md text-xs font-medium border ${
            saveStatus.includes('Error')
              ? 'bg-red-50 text-red-900 border-red-200'
              : 'bg-[var(--surface-alt)] text-[var(--text)] border-[var(--border)]'
          }`}
        >
          {saveStatus}
        </div>
      )}

      {/* TOP BAR ACTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
        <span className="text-xs text-[var(--text-muted)]">
          Manage your normalized facts once; synchronize across outputs anytime.
        </span>
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-md bg-[var(--accent)] text-[var(--surface)] text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 w-full sm:w-auto"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save All Facts'}
        </button>
      </div>

      {/* SECTION 1: Identity, Summary & Social Links */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 sm:p-6 space-y-4">
        <h2 className="font-display text-base font-bold text-[var(--text)] border-b border-[var(--border-muted)] pb-2">
          1. Identity, Summary &amp; Contact
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--text)]">Professional Headline</label>
            <input
              type="text"
              placeholder="e.g. Final Year CSE Student | Embedded Systems Enthusiast"
              value={profile.headline || ''}
              onChange={(e) => setProfile({ ...profile, headline: e.target.value })}
              className="w-full px-3 py-2 rounded border border-[var(--border)] bg-[var(--surface-alt)]/30 text-[var(--text)] text-xs focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--text)]">Primary Location</label>
            <input
              type="text"
              placeholder="e.g. Bengaluru, India"
              value={profile.contactInfo?.location || ''}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  contactInfo: { ...profile.contactInfo, location: e.target.value },
                })
              }
              className="w-full px-3 py-2 rounded border border-[var(--border)] bg-[var(--surface-alt)]/30 text-[var(--text)] text-xs focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-[var(--text)]">Professional Summary / Bio</label>
          <textarea
            rows={3}
            placeholder="Brief professional profile or research objective..."
            value={profile.summary || ''}
            onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
            className="w-full px-3 py-2 rounded border border-[var(--border)] bg-[var(--surface-alt)]/30 text-[var(--text)] text-xs focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="pt-2 border-t border-[var(--border-muted)]">
          <h3 className="text-xs font-semibold text-[var(--text)] mb-3">Links &amp; Profiles</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="LinkedIn URL"
              value={profile.socialLinks?.linkedin || ''}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  socialLinks: { ...profile.socialLinks, linkedin: e.target.value },
                })
              }
              className="px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--surface-alt)]/30 text-[var(--text)] text-xs focus:outline-none focus:border-[var(--accent)]"
            />
            <input
              type="text"
              placeholder="GitHub / GitLab URL"
              value={profile.socialLinks?.github || ''}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  socialLinks: { ...profile.socialLinks, github: e.target.value },
                })
              }
              className="px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--surface-alt)]/30 text-[var(--text)] text-xs focus:outline-none focus:border-[var(--accent)]"
            />
            <input
              type="text"
              placeholder="Portfolio / Personal URL"
              value={profile.socialLinks?.portfolio || ''}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  socialLinks: { ...profile.socialLinks, portfolio: e.target.value },
                })
              }
              className="px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--surface-alt)]/30 text-[var(--text)] text-xs focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>
      </section>

      {/* DISCOVERY CHECKLIST FOR FRESHERS */}
      <section className="bg-[var(--surface-alt)]/40 border border-[var(--border)] rounded-lg p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
            Experience Discovery Checklist (Uncover Overlooked Projects)
          </h3>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Freshers often overlook non-corporate experiences that demonstrate initiative. Click a prompt below to create an empty draft section ready for your details:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {DISCOVERY_PROMPTS.map((prompt) => (
            <button
              key={prompt.id}
              type="button"
              onClick={() => handleApplyDiscoveryPrompt(prompt)}
              className="text-left p-3 rounded border border-[var(--border-muted)] bg-[var(--surface)] hover:border-[var(--accent)] transition-colors flex flex-col justify-between group"
            >
              <div className="text-xs font-semibold text-[var(--text)] group-hover:text-[var(--accent)]">
                + {prompt.title}
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-1">
                {prompt.helperText}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* SECTION 2: Education CRUD */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-muted)] pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="font-display text-base font-bold text-[var(--text)]">2. Education</h2>
          </div>
          <button
            type="button"
            onClick={() =>
              setEducations((prev) => [
                ...prev,
                {
                  id: `temp-${Date.now()}`,
                  profileId: profile.id,
                  institution: '',
                  degree: '',
                  fieldOfStudy: '',
                  gradeValue: '',
                },
              ])
            }
            className="inline-flex items-center gap-1 px-3 py-1 rounded border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text)] text-xs font-medium hover:bg-[var(--surface)]"
          >
            <Plus className="w-3 h-3" /> Add Education
          </button>
        </div>

        {educations.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] py-2">No education entries added yet.</p>
        ) : (
          <div className="space-y-4">
            {educations.map((edu, idx) => (
              <div key={edu.id || idx} className="p-4 rounded-md border border-[var(--border)] bg-[var(--surface-alt)]/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text)]">Education #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => setEducations((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-red-600 hover:text-red-700 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Institution / College"
                    value={edu.institution || ''}
                    onChange={(e) => {
                      const updated = [...educations];
                      updated[idx].institution = e.target.value;
                      setEducations(updated);
                    }}
                    className="px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Degree (e.g. B.Tech, B.Sc)"
                    value={edu.degree || ''}
                    onChange={(e) => {
                      const updated = [...educations];
                      updated[idx].degree = e.target.value;
                      setEducations(updated);
                    }}
                    className="px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs"
                  />
                  <input
                    type="text"
                    placeholder="CGPA / Percentage (optional)"
                    value={edu.gradeValue || ''}
                    onChange={(e) => {
                      const updated = [...educations];
                      updated[idx].gradeValue = e.target.value;
                      setEducations(updated);
                    }}
                    className="px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 3: Experience CRUD */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-muted)] pb-3">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="font-display text-base font-bold text-[var(--text)]">3. Experience</h2>
          </div>
          <button
            type="button"
            onClick={() =>
              setExperiences((prev) => [
                ...prev,
                {
                  id: `temp-${Date.now()}`,
                  profileId: profile.id,
                  type: 'internship',
                  organization: '',
                  role: '',
                  bullets: [''],
                },
              ])
            }
            className="inline-flex items-center gap-1 px-3 py-1 rounded border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text)] text-xs font-medium hover:bg-[var(--surface)]"
          >
            <Plus className="w-3 h-3" /> Add Experience
          </button>
        </div>

        {experiences.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] py-2">No experience entries added yet.</p>
        ) : (
          <div className="space-y-4">
            {experiences.map((exp, idx) => (
              <div key={exp.id || idx} className="p-4 rounded-md border border-[var(--border)] bg-[var(--surface-alt)]/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text)]">Experience #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => setExperiences((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-red-600 hover:text-red-700 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Organization / Company"
                    value={exp.organization || ''}
                    onChange={(e) => {
                      const updated = [...experiences];
                      updated[idx].organization = e.target.value;
                      setExperiences(updated);
                    }}
                    className="px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Role / Title"
                    value={exp.role || ''}
                    onChange={(e) => {
                      const updated = [...experiences];
                      updated[idx].role = e.target.value;
                      setExperiences(updated);
                    }}
                    className="px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs"
                  />
                  <select
                    value={exp.type || 'internship'}
                    onChange={(e) => {
                      const updated = [...experiences];
                      updated[idx].type = e.target.value;
                      setExperiences(updated);
                    }}
                    className="px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs"
                  >
                    <option value="internship">Internship</option>
                    <option value="job">Full-time Job</option>
                    <option value="research">Research</option>
                    <option value="volunteering">Volunteering / Club</option>
                    <option value="freelance">Freelance</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 4: Projects CRUD */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-muted)] pb-3">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="font-display text-base font-bold text-[var(--text)]">4. Projects</h2>
          </div>
          <button
            type="button"
            onClick={() =>
              setProjects((prev) => [
                ...prev,
                {
                  id: `temp-${Date.now()}`,
                  profileId: profile.id,
                  title: '',
                  role: '',
                  bullets: [''],
                  toolsUsed: [],
                },
              ])
            }
            className="inline-flex items-center gap-1 px-3 py-1 rounded border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text)] text-xs font-medium hover:bg-[var(--surface)]"
          >
            <Plus className="w-3 h-3" /> Add Project
          </button>
        </div>

        {projects.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] py-2">No projects added yet.</p>
        ) : (
          <div className="space-y-4">
            {projects.map((proj, idx) => (
              <div key={proj.id || idx} className="p-4 rounded-md border border-[var(--border)] bg-[var(--surface-alt)]/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text)]">Project #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => setProjects((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-red-600 hover:text-red-700 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Project Title"
                    value={proj.title || ''}
                    onChange={(e) => {
                      const updated = [...projects];
                      updated[idx].title = e.target.value;
                      setProjects(updated);
                    }}
                    className="px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Role / Subtitle (e.g. Lead Prototyper)"
                    value={proj.role || ''}
                    onChange={(e) => {
                      const updated = [...projects];
                      updated[idx].role = e.target.value;
                      setProjects(updated);
                    }}
                    className="px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 5: Skills & Competencies CRUD */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-muted)] pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="font-display text-base font-bold text-[var(--text)]">5. Skills &amp; Competencies</h2>
          </div>
          <button
            type="button"
            onClick={() =>
              setSkills((prev) => [
                ...prev,
                {
                  id: `temp-${Date.now()}`,
                  profileId: profile.id,
                  category: '',
                  items: [],
                },
              ])
            }
            className="inline-flex items-center gap-1 px-3 py-1 rounded border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text)] text-xs font-medium hover:bg-[var(--surface)]"
          >
            <Plus className="w-3 h-3" /> Add Skill Category
          </button>
        </div>

        {skills.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] py-2">No skill categories added yet.</p>
        ) : (
          <div className="space-y-4">
            {skills.map((sk, idx) => (
              <div key={sk.id || idx} className="p-4 rounded-md border border-[var(--border)] bg-[var(--surface-alt)]/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text)]">Category #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => setSkills((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-red-600 hover:text-red-700 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Category (e.g. Languages, Tools, Laboratory)"
                    value={sk.category || ''}
                    onChange={(e) => {
                      const updated = [...skills];
                      updated[idx].category = e.target.value;
                      setSkills(updated);
                    }}
                    className="px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Comma-separated items (e.g. Python, SQL, C++)"
                    value={(sk.items || []).map((i: any) => i.name || i).join(', ')}
                    onChange={(e) => {
                      const updated = [...skills];
                      updated[idx].items = e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .map((name) => ({ name }));
                      setSkills(updated);
                    }}
                    className="px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 6: Publications & Research CRUD */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-muted)] pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="font-display text-base font-bold text-[var(--text)]">6. Publications &amp; Research</h2>
          </div>
          <button
            type="button"
            onClick={() =>
              setPublications((prev) => [
                ...prev,
                {
                  id: `temp-${Date.now()}`,
                  profileId: profile.id,
                  title: '',
                  venue: '',
                  publicationDate: '',
                  doiOrUrl: '',
                  summary: '',
                },
              ])
            }
            className="inline-flex items-center gap-1 px-3 py-1 rounded border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text)] text-xs font-medium hover:bg-[var(--surface)]"
          >
            <Plus className="w-3 h-3" /> Add Publication
          </button>
        </div>

        {publications.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] py-2">No publications added yet.</p>
        ) : (
          <div className="space-y-4">
            {publications.map((pub, idx) => (
              <div key={pub.id || idx} className="p-4 rounded-md border border-[var(--border)] bg-[var(--surface-alt)]/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text)]">Publication #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => setPublications((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-red-600 hover:text-red-700 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Title of Paper / Book Chapter"
                    value={pub.title || ''}
                    onChange={(e) => {
                      const updated = [...publications];
                      updated[idx].title = e.target.value;
                      setPublications(updated);
                    }}
                    className="px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Conference / Journal / Venue"
                    value={pub.venue || ''}
                    onChange={(e) => {
                      const updated = [...publications];
                      updated[idx].venue = e.target.value;
                      setPublications(updated);
                    }}
                    className="px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 7: Achievements & Certifications CRUD */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 sm:p-6 space-y-6">
        {/* Achievements */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-muted)] pb-2">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[var(--accent)]" />
              <h2 className="font-display text-base font-bold text-[var(--text)]">7. Achievements &amp; Honors</h2>
            </div>
            <button
              type="button"
              onClick={() =>
                setAchievements((prev) => [
                  ...prev,
                  {
                    id: `temp-${Date.now()}`,
                    profileId: profile.id,
                    title: '',
                    issuerOrOrg: '',
                    date: '',
                  },
                ])
              }
              className="inline-flex items-center gap-1 px-3 py-1 rounded border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text)] text-xs font-medium hover:bg-[var(--surface)]"
            >
              <Plus className="w-3 h-3" /> Add Achievement
            </button>
          </div>

          {achievements.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-1">No achievements recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {achievements.map((ach, idx) => (
                <div key={ach.id || idx} className="p-3 rounded-md border border-[var(--border)] bg-[var(--surface-alt)]/20 flex flex-col sm:flex-row sm:items-center gap-3">
                  <input
                    type="text"
                    placeholder="Title (e.g. 1st Place National Hackathon)"
                    value={ach.title || ''}
                    onChange={(e) => {
                      const updated = [...achievements];
                      updated[idx].title = e.target.value;
                      setAchievements(updated);
                    }}
                    className="flex-1 w-full px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs"
                  />
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder="Awarding Body / Organization"
                      value={ach.issuerOrOrg || ''}
                      onChange={(e) => {
                        const updated = [...achievements];
                        updated[idx].issuerOrOrg = e.target.value;
                        setAchievements(updated);
                      }}
                      className="flex-1 sm:w-48 px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setAchievements((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-red-600 hover:text-red-700 text-xs px-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Certifications */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-[var(--border-muted)] pb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
              <h2 className="font-display text-base font-bold text-[var(--text)]">8. Certifications &amp; Licenses</h2>
            </div>
            <button
              type="button"
              onClick={() =>
                setCertifications((prev) => [
                  ...prev,
                  {
                    id: `temp-${Date.now()}`,
                    profileId: profile.id,
                    name: '',
                    issuer: '',
                    issueDate: '',
                  },
                ])
              }
              className="inline-flex items-center gap-1 px-3 py-1 rounded border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text)] text-xs font-medium hover:bg-[var(--surface)]"
            >
              <Plus className="w-3 h-3" /> Add Certification
            </button>
          </div>

          {certifications.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-1">No certifications recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {certifications.map((cert, idx) => (
                <div key={cert.id || idx} className="p-3 rounded-md border border-[var(--border)] bg-[var(--surface-alt)]/20 flex flex-col sm:flex-row sm:items-center gap-3">
                  <input
                    type="text"
                    placeholder="Certification Name"
                    value={cert.name || ''}
                    onChange={(e) => {
                      const updated = [...certifications];
                      updated[idx].name = e.target.value;
                      setCertifications(updated);
                    }}
                    className="flex-1 w-full px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs"
                  />
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder="Issuing Authority"
                      value={cert.issuer || ''}
                      onChange={(e) => {
                        const updated = [...certifications];
                        updated[idx].issuer = e.target.value;
                        setCertifications(updated);
                      }}
                      className="flex-1 sm:w-48 px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setCertifications((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-red-600 hover:text-red-700 text-xs px-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SECTION 8: Custom Sections CRUD */}
      <section className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-muted)] pb-3">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="font-display text-base font-bold text-[var(--text)]">9. Custom Sections</h2>
          </div>
          <button
            type="button"
            onClick={() =>
              setCustomSections((prev) => [
                ...prev,
                {
                  id: `temp-${Date.now()}`,
                  profileId: profile.id,
                  sectionTitle: '',
                  entries: [],
                },
              ])
            }
            className="inline-flex items-center gap-1 px-3 py-1 rounded border border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text)] text-xs font-medium hover:bg-[var(--surface)]"
          >
            <Plus className="w-3 h-3" /> Add Custom Section
          </button>
        </div>

        {customSections.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] py-2">No custom sections added yet.</p>
        ) : (
          <div className="space-y-4">
            {customSections.map((cs, idx) => (
              <div key={cs.id || idx} className="p-4 rounded-md border border-[var(--border)] bg-[var(--surface-alt)]/20 space-y-3">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    placeholder="Section Title (e.g. Exhibitions, Patents, Leadership)"
                    value={cs.sectionTitle || ''}
                    onChange={(e) => {
                      const updated = [...customSections];
                      updated[idx].sectionTitle = e.target.value;
                      setCustomSections(updated);
                    }}
                    className="font-semibold text-xs px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] w-2/3"
                  />
                  <button
                    type="button"
                    onClick={() => setCustomSections((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-red-600 hover:text-red-700 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bottom Save Action */}
      <div className="pt-4 border-t border-[var(--border-muted)] flex justify-end">
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-[var(--accent)] text-[var(--surface)] text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save All Facts'}
        </button>
      </div>
    </div>
  );
}
