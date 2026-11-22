 
'use client';

import React, { useState } from 'react';
import { FIELD_LIMITS } from '@/lib/validation/field-limits';
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
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
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

  const contactInfo = profile.contactInfo || profile.contact_info || {};
  const socialLinks = profile.socialLinks || profile.social_links || {};

  const handleUpdateContact = (field: string, value: string) => {
    setProfile((prev: any) => ({
      ...prev,
      contactInfo: {
        ...(prev.contactInfo || prev.contact_info || {}),
        [field]: value,
      },
    }));
  };

  const handleUpdateSocial = (field: string, value: string) => {
    setProfile((prev: any) => ({
      ...prev,
      socialLinks: {
        ...(prev.socialLinks || prev.social_links || {}),
        [field]: value,
      },
    }));
  };

  const handleSaveAll = async () => {
    if (saving) return;
    setSaving(true);
    setSaveStatus(null);

    try {
      const res = await fetch('/api/profile/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            ...profile,
            version: profile.version,
          },
          clientVersion: profile.version,
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

      if (!res.ok) {
        if (res.status === 409) {
          setSaveStatus('Error: Conflict detected (profile updated in another session). Please reload.');
        } else {
          setSaveStatus(`Error: ${data.error || 'Failed to save profile'}`);
        }
      } else {
        setSaveStatus('All facts and identity details synchronized successfully.');
        if (data.version) {
          setProfile((prev: any) => ({ ...prev, version: data.version }));
        }
      }
    } catch {
      setSaveStatus('Network error while saving profile.');
    } finally {
      setSaving(false);
    }
  };

  // Helper to add discovery prompt to state as an EMPTY draft
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
    <div className="space-y-6">
      {/* Save status notification panel */}
      {saveStatus && (
        <div
          role="status"
          className={`p-4 rounded-xl text-xs font-semibold border flex items-center gap-2.5 shadow-sm ${
            saveStatus.includes('Error')
              ? 'bg-[#FFE4D8] text-[#800021] border-[#800021]'
              : 'bg-[#DAF1DE] text-[#051F20] border-[#235347]'
          }`}
        >
          {saveStatus.includes('Error') ? (
            <AlertCircle className="w-4 h-4 shrink-0 text-[#800021]" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#0B2B26]" />
          )}
          <span>{saveStatus}</span>
        </div>
      )}

      {/* TOP BAR ACTION PANEL */}
      <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-medium text-[#333333]">
            Manage your normalized facts once; synchronize across resumes, CVs, and personal website anytime.
          </span>
          <div className="text-[11px] text-[#6B6B6B] mt-0.5">
            Database Version: <span className="font-mono font-bold text-[#0B0B0B]">{profile.version || 1}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saving}
          aria-busy={saving}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#800021] hover:bg-[#881144] text-[#FFFFFF] text-xs font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2 transition-colors disabled:opacity-50 w-full sm:w-auto min-h-[44px]"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none flex-shrink-0" aria-hidden="true" />
              <span>Saving Profile...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>Save All Facts</span>
            </>
          )}
        </button>
      </div>

      {/* SECTION 1: Step 1 Basic Identity & Contact Information (per docs/PRODUCT_VISION.md) */}
      <section className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#6B6B6B]">
          <User className="w-5 h-5 text-[#800021]" />
          <div>
            <h2 className="font-display text-lg font-bold text-[#0B0B0B]">
              1. Basic Identity &amp; Contact Information
            </h2>
            <p className="text-xs text-[#333333] mt-0.5">
              Collected per Step 1 of the product specification. Photo stays out of the UI; never required.
            </p>
          </div>
        </div>

        {/* Identity Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0B0B0B]">Full Name</label>
            <input
              type="text"
              maxLength={255}
              placeholder="e.g. Alexandra Vance"
              value={contactInfo.fullName || ''}
              onChange={(e) => handleUpdateContact('fullName', e.target.value.slice(0, 255))}
              className="w-full px-3.5 py-2 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder:text-[#6B6B6B] text-xs focus:outline-none focus:ring-2 focus:ring-[#800021]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0B0B0B]">Preferred Professional Name</label>
            <input
              type="text"
              maxLength={150}
              placeholder="e.g. Alex Vance"
              value={contactInfo.preferredName || ''}
              onChange={(e) => handleUpdateContact('preferredName', e.target.value.slice(0, 150))}
              className="w-full px-3.5 py-2 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder:text-[#6B6B6B] text-xs focus:outline-none focus:ring-2 focus:ring-[#800021]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0B0B0B]">Professional Email</label>
            <input
              type="email"
              maxLength={150}
              placeholder="e.g. alex.vance@university.edu"
              value={contactInfo.email || ''}
              onChange={(e) => handleUpdateContact('email', e.target.value.slice(0, 150))}
              className="w-full px-3.5 py-2 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder:text-[#6B6B6B] text-xs focus:outline-none focus:ring-2 focus:ring-[#800021]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0B0B0B]">Phone Number (Optional)</label>
            <input
              type="tel"
              maxLength={100}
              placeholder="e.g. +1 (555) 019-2834"
              value={contactInfo.phone || ''}
              onChange={(e) => handleUpdateContact('phone', e.target.value.slice(0, 100))}
              className="w-full px-3.5 py-2 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder:text-[#6B6B6B] text-xs focus:outline-none focus:ring-2 focus:ring-[#800021]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0B0B0B]">Current City</label>
            <input
              type="text"
              maxLength={150}
              placeholder="e.g. San Francisco"
              value={contactInfo.city || ''}
              onChange={(e) => handleUpdateContact('city', e.target.value.slice(0, 150))}
              className="w-full px-3.5 py-2 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder:text-[#6B6B6B] text-xs focus:outline-none focus:ring-2 focus:ring-[#800021]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0B0B0B]">Current Country</label>
            <input
              type="text"
              maxLength={150}
              placeholder="e.g. United States"
              value={contactInfo.country || ''}
              onChange={(e) => handleUpdateContact('country', e.target.value.slice(0, 150))}
              className="w-full px-3.5 py-2 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder:text-[#6B6B6B] text-xs focus:outline-none focus:ring-2 focus:ring-[#800021]"
            />
          </div>
        </div>

        {/* Professional Overview */}
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0B0B0B]">Professional Headline</label>
            <input
              type="text"
              maxLength={300}
              placeholder="e.g. Computer Science Researcher | Distributed Systems Builder"
              value={profile.headline || ''}
              onChange={(e) => setProfile({ ...profile, headline: e.target.value.slice(0, 300) })}
              className="w-full px-3.5 py-2 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder:text-[#6B6B6B] text-xs focus:outline-none focus:ring-2 focus:ring-[#800021]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#0B0B0B]">Professional Summary / Bio</label>
            <textarea
              rows={3}
              maxLength={FIELD_LIMITS.summary}
              placeholder="Concise overview of your career, research interests, or academic focus..."
              value={profile.summary || ''}
              onChange={(e) => setProfile({ ...profile, summary: e.target.value.slice(0, FIELD_LIMITS.summary) })}
              className="w-full px-3.5 py-2 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder:text-[#6B6B6B] text-xs focus:outline-none focus:ring-2 focus:ring-[#800021]"
            />
          </div>
        </div>

        {/* Step 1 Social & Web Links */}
        <div className="pt-4 border-t border-[#6B6B6B] space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B0B0B]">
            Professional Links &amp; Profiles
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0B0B0B]">LinkedIn Profile</label>
              <input
                type="url"
                placeholder="https://linkedin.com/in/username"
                value={socialLinks.linkedin || ''}
                onChange={(e) => handleUpdateSocial('linkedin', e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder:text-[#6B6B6B] text-xs focus:outline-none focus:ring-2 focus:ring-[#800021]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0B0B0B]">GitHub Profile (where relevant)</label>
              <input
                type="url"
                placeholder="https://github.com/username"
                value={socialLinks.github || ''}
                onChange={(e) => handleUpdateSocial('github', e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder:text-[#6B6B6B] text-xs focus:outline-none focus:ring-2 focus:ring-[#800021]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0B0B0B]">Personal Website (if exists)</label>
              <input
                type="url"
                placeholder="https://yourname.com"
                value={socialLinks.website || ''}
                onChange={(e) => handleUpdateSocial('website', e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder:text-[#6B6B6B] text-xs focus:outline-none focus:ring-2 focus:ring-[#800021]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0B0B0B]">Other Relevant Professional Links</label>
              <input
                type="text"
                placeholder="Comma-separated or portfolio URL"
                value={socialLinks.otherLinks || socialLinks.other || ''}
                onChange={(e) => handleUpdateSocial('otherLinks', e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder:text-[#6B6B6B] text-xs focus:outline-none focus:ring-2 focus:ring-[#800021]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Education CRUD Panel */}
      <section className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#6B6B6B] pb-3">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[#800021]" />
            <h2 className="font-display text-lg font-bold text-[#0B0B0B]">2. Background &amp; Education</h2>
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] text-xs font-semibold hover:bg-[#F1F7F7] focus:outline-none focus:ring-2 focus:ring-[#800021]"
          >
            <Plus className="w-3.5 h-3.5" /> Add Degree / Institution
          </button>
        </div>

        {educations.length === 0 ? (
          <p className="text-xs text-[#333333] py-2">No educational history entered yet.</p>
        ) : (
          <div className="space-y-4">
            {educations.map((edu, idx) => (
              <div key={edu.id || idx} className="p-4 rounded-xl border border-[#6B6B6B] bg-[#F1F7F7] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0B0B0B]">Entry #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => setEducations((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-[#800021] hover:bg-[#FFE4D8] p-1 rounded text-xs"
                    title="Delete entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Institution Name"
                    value={edu.institution || ''}
                    onChange={(e) => {
                      const updated = [...educations];
                      updated[idx].institution = e.target.value;
                      setEducations(updated);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder:text-[#6B6B6B] text-xs focus:ring-2 focus:ring-[#800021]"
                  />
                  <input
                    type="text"
                    placeholder="Degree (e.g. B.Tech, B.S., M.S.)"
                    value={edu.degree || ''}
                    onChange={(e) => {
                      const updated = [...educations];
                      updated[idx].degree = e.target.value;
                      setEducations(updated);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder:text-[#6B6B6B] text-xs focus:ring-2 focus:ring-[#800021]"
                  />
                  <input
                    type="text"
                    placeholder="Field of Study / Department"
                    value={edu.fieldOfStudy || ''}
                    onChange={(e) => {
                      const updated = [...educations];
                      updated[idx].fieldOfStudy = e.target.value;
                      setEducations(updated);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder:text-[#6B6B6B] text-xs focus:ring-2 focus:ring-[#800021]"
                  />
                  <input
                    type="text"
                    placeholder="CGPA / Percentage"
                    value={edu.gradeValue || ''}
                    onChange={(e) => {
                      const updated = [...educations];
                      updated[idx].gradeValue = e.target.value;
                      setEducations(updated);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder:text-[#6B6B6B] text-xs focus:ring-2 focus:ring-[#800021]"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 3: Experience & Internships CRUD Panel */}
      <section className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#6B6B6B] pb-3">
          <div className="flex items-center gap-2.5">
            <Briefcase className="w-5 h-5 text-[#800021]" />
            <h2 className="font-display text-lg font-bold text-[#0B0B0B]">3. Experience &amp; Internships</h2>
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] text-xs font-semibold hover:bg-[#F1F7F7] focus:outline-none focus:ring-2 focus:ring-[#800021]"
          >
            <Plus className="w-3.5 h-3.5" /> Add Experience
          </button>
        </div>

        {experiences.length === 0 ? (
          <p className="text-xs text-[#333333] py-2">No experiences added yet.</p>
        ) : (
          <div className="space-y-4">
            {experiences.map((exp, idx) => (
              <div key={exp.id || idx} className="p-4 rounded-xl border border-[#6B6B6B] bg-[#F1F7F7] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0B0B0B]">Role #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => setExperiences((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-[#800021] hover:bg-[#FFE4D8] p-1 rounded text-xs"
                    title="Delete role"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Organization / Company"
                    value={exp.organization || ''}
                    onChange={(e) => {
                      const updated = [...experiences];
                      updated[idx].organization = e.target.value;
                      setExperiences(updated);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder:text-[#6B6B6B] text-xs focus:ring-2 focus:ring-[#800021]"
                  />
                  <input
                    type="text"
                    placeholder="Role Title"
                    value={exp.role || ''}
                    onChange={(e) => {
                      const updated = [...experiences];
                      updated[idx].role = e.target.value;
                      setExperiences(updated);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder:text-[#6B6B6B] text-xs focus:ring-2 focus:ring-[#800021]"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 4: Projects CRUD Panel */}
      <section className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#6B6B6B] pb-3">
          <div className="flex items-center gap-2.5">
            <FolderGit2 className="w-5 h-5 text-[#800021]" />
            <h2 className="font-display text-lg font-bold text-[#0B0B0B]">4. Projects &amp; Initiatives</h2>
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] text-xs font-semibold hover:bg-[#F1F7F7] focus:outline-none focus:ring-2 focus:ring-[#800021]"
          >
            <Plus className="w-3.5 h-3.5" /> Add Project
          </button>
        </div>

        {projects.length === 0 ? (
          <p className="text-xs text-[#333333] py-2">No projects added yet.</p>
        ) : (
          <div className="space-y-4">
            {projects.map((proj, idx) => (
              <div key={proj.id || idx} className="p-4 rounded-xl border border-[#6B6B6B] bg-[#F1F7F7] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0B0B0B]">Project #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => setProjects((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-[#800021] hover:bg-[#FFE4D8] p-1 rounded text-xs"
                    title="Delete project"
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
                    className="px-3 py-1.5 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder:text-[#6B6B6B] text-xs focus:ring-2 focus:ring-[#800021]"
                  />
                  <input
                    type="text"
                    placeholder="Role (e.g. Lead Developer, Researcher)"
                    value={proj.role || ''}
                    onChange={(e) => {
                      const updated = [...projects];
                      updated[idx].role = e.target.value;
                      setProjects(updated);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder:text-[#6B6B6B] text-xs focus:ring-2 focus:ring-[#800021]"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 5: Skills & Competencies CRUD Panel */}
      <section className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#6B6B6B] pb-3">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-[#800021]" />
            <h2 className="font-display text-lg font-bold text-[#0B0B0B]">5. Skills &amp; Competencies</h2>
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] text-xs font-semibold hover:bg-[#F1F7F7] focus:outline-none focus:ring-2 focus:ring-[#800021]"
          >
            <Plus className="w-3.5 h-3.5" /> Add Skill Category
          </button>
        </div>

        {skills.length === 0 ? (
          <p className="text-xs text-[#333333] py-2">No skill categories added yet.</p>
        ) : (
          <div className="space-y-4">
            {skills.map((sk, idx) => (
              <div key={sk.id || idx} className="p-4 rounded-xl border border-[#6B6B6B] bg-[#F1F7F7] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0B0B0B]">Category #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => setSkills((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-[#800021] hover:bg-[#FFE4D8] p-1 rounded text-xs"
                    title="Delete category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Category (e.g. Languages, Tools)"
                    value={sk.category || ''}
                    onChange={(e) => {
                      const updated = [...skills];
                      updated[idx].category = e.target.value;
                      setSkills(updated);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder:text-[#6B6B6B] text-xs focus:ring-2 focus:ring-[#800021]"
                  />
                  <input
                    type="text"
                    placeholder="Comma-separated items (e.g. Python, SQL)"
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
                    className="px-3 py-1.5 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder:text-[#6B6B6B] text-xs focus:ring-2 focus:ring-[#800021]"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 6: Publications Panel */}
      <section className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#6B6B6B] pb-3">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-[#800021]" />
            <h2 className="font-display text-lg font-bold text-[#0B0B0B]">6. Publications &amp; Papers</h2>
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
                },
              ])
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] text-xs font-semibold hover:bg-[#F1F7F7] focus:outline-none focus:ring-2 focus:ring-[#800021]"
          >
            <Plus className="w-3.5 h-3.5" /> Add Publication
          </button>
        </div>

        {publications.length === 0 ? (
          <p className="text-xs text-[#333333] py-2">No publications recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {publications.map((pub, idx) => (
              <div key={pub.id || idx} className="p-4 rounded-xl border border-[#6B6B6B] bg-[#F1F7F7] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0B0B0B]">Publication #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => setPublications((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-[#800021] hover:bg-[#FFE4D8] p-1 rounded text-xs"
                    title="Delete publication"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Title of Paper / Article"
                    value={pub.title || ''}
                    onChange={(e) => {
                      const updated = [...publications];
                      updated[idx].title = e.target.value;
                      setPublications(updated);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder:text-[#6B6B6B] text-xs focus:ring-2 focus:ring-[#800021]"
                  />
                  <input
                    type="text"
                    placeholder="Venue / Journal / Conference"
                    value={pub.venue || ''}
                    onChange={(e) => {
                      const updated = [...publications];
                      updated[idx].venue = e.target.value;
                      setPublications(updated);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder:text-[#6B6B6B] text-xs focus:ring-2 focus:ring-[#800021]"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 7: Achievements & Honors Panel (Item 4c: Separate solid panel) */}
      <section className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#6B6B6B] pb-3">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-[#800021]" />
            <div>
              <h2 className="font-display text-lg font-bold text-[#0B0B0B]">7. Achievements &amp; Honors</h2>
              <p className="text-xs text-[#333333] mt-0.5">
                Awards, academic honors, hackathons, and distinction records.
              </p>
            </div>
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] text-xs font-semibold hover:bg-[#F1F7F7] focus:outline-none focus:ring-2 focus:ring-[#800021]"
          >
            <Plus className="w-3.5 h-3.5" /> Add Achievement
          </button>
        </div>

        {achievements.length === 0 ? (
          <p className="text-xs text-[#333333] py-2">No achievements recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {achievements.map((ach, idx) => (
              <div key={ach.id || idx} className="p-4 rounded-xl border border-[#6B6B6B] bg-[#F1F7F7] flex flex-col sm:flex-row sm:items-center gap-3">
                <input
                  type="text"
                  placeholder="Achievement Title (e.g. 1st Place National Hackathon)"
                  value={ach.title || ''}
                  onChange={(e) => {
                    const updated = [...achievements];
                    updated[idx].title = e.target.value;
                    setAchievements(updated);
                  }}
                  className="flex-1 w-full px-3 py-1.5 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder:text-[#6B6B6B] text-xs focus:ring-2 focus:ring-[#800021]"
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
                    className="flex-1 sm:w-48 px-3 py-1.5 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder:text-[#6B6B6B] text-xs focus:ring-2 focus:ring-[#800021]"
                  />
                  <button
                    type="button"
                    onClick={() => setAchievements((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-[#800021] hover:bg-[#FFE4D8] p-1.5 rounded text-xs"
                    title="Delete achievement"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 8: Certifications & Licenses Panel (Item 4c: Separate solid panel) */}
      <section className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#6B6B6B] pb-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#800021]" />
            <div>
              <h2 className="font-display text-lg font-bold text-[#0B0B0B]">8. Certifications &amp; Licenses</h2>
              <p className="text-xs text-[#333333] mt-0.5">
                Industry credentials, coursework credentials, and professional licenses.
              </p>
            </div>
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] text-xs font-semibold hover:bg-[#F1F7F7] focus:outline-none focus:ring-2 focus:ring-[#800021]"
          >
            <Plus className="w-3.5 h-3.5" /> Add Certification
          </button>
        </div>

        {certifications.length === 0 ? (
          <p className="text-xs text-[#333333] py-2">No certifications recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {certifications.map((cert, idx) => (
              <div key={cert.id || idx} className="p-4 rounded-xl border border-[#6B6B6B] bg-[#F1F7F7] flex flex-col sm:flex-row sm:items-center gap-3">
                <input
                  type="text"
                  placeholder="Certification Name"
                  value={cert.name || ''}
                  onChange={(e) => {
                    const updated = [...certifications];
                    updated[idx].name = e.target.value;
                    setCertifications(updated);
                  }}
                  className="flex-1 w-full px-3 py-1.5 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder:text-[#6B6B6B] text-xs focus:ring-2 focus:ring-[#800021]"
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
                    className="flex-1 sm:w-48 px-3 py-1.5 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder:text-[#6B6B6B] text-xs focus:ring-2 focus:ring-[#800021]"
                  />
                  <button
                    type="button"
                    onClick={() => setCertifications((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-[#800021] hover:bg-[#FFE4D8] p-1.5 rounded text-xs"
                    title="Delete certification"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 9: Custom Sections Panel */}
      <section className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#6B6B6B] pb-3">
          <div className="flex items-center gap-2.5">
            <LayoutGrid className="w-5 h-5 text-[#800021]" />
            <h2 className="font-display text-lg font-bold text-[#0B0B0B]">9. Custom Sections</h2>
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] text-xs font-semibold hover:bg-[#F1F7F7] focus:outline-none focus:ring-2 focus:ring-[#800021]"
          >
            <Plus className="w-3.5 h-3.5" /> Add Custom Section
          </button>
        </div>

        {customSections.length === 0 ? (
          <p className="text-xs text-[#333333] py-2">No custom sections added yet.</p>
        ) : (
          <div className="space-y-4">
            {customSections.map((cs, idx) => (
              <div key={cs.id || idx} className="p-4 rounded-xl border border-[#6B6B6B] bg-[#F1F7F7] flex items-center justify-between gap-3">
                <input
                  type="text"
                  placeholder="Section Title (e.g. Leadership, Patents, Volunteer Work)"
                  value={cs.sectionTitle || ''}
                  onChange={(e) => {
                    const updated = [...customSections];
                    updated[idx].sectionTitle = e.target.value;
                    setCustomSections(updated);
                  }}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] placeholder:text-[#6B6B6B] text-xs focus:ring-2 focus:ring-[#800021]"
                />
                <button
                  type="button"
                  onClick={() => setCustomSections((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-[#800021] hover:bg-[#FFE4D8] p-1.5 rounded text-xs"
                  title="Delete section"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Discovery Prompt Sidebar Panel */}
      <section className="bg-[#FFE4D8] border border-[#800021] rounded-xl p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-[#800021]">
          <Compass className="w-5 h-5 shrink-0" />
          <h3 className="font-display font-bold text-sm">Experience &amp; Activity Prompts</h3>
        </div>
        <p className="text-xs text-[#800021] leading-relaxed">
          The platform helps you recall valuable non-traditional experiences. Tap any prompt to add an empty record to your profile facts:
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {DISCOVERY_PROMPTS.slice(0, 5).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleApplyDiscoveryPrompt(p)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FFFFFF] border border-[#800021] text-[#800021] hover:bg-[#800021] hover:text-[#FFFFFF] transition-colors shadow-2xs"
            >
              + {p.title}
            </button>
          ))}
        </div>
      </section>

      {/* Bottom Save Action Panel */}
      <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-xl p-4 shadow-sm flex justify-end">
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saving}
          aria-busy={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#800021] hover:bg-[#881144] text-[#FFFFFF] text-xs font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2 transition-colors disabled:opacity-50 min-h-[44px]"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none flex-shrink-0" aria-hidden="true" />
              <span>Saving Profile...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>Save All Facts</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
