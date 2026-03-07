'use client';

import { useState, useEffect } from 'react';
import { ParsedData } from '@/utils/parsingApi';
import { API_BASE_URL } from '@/utils/api';

interface ParsedReviewQuestionProps {
  parsedData: ParsedData;
  onAccept: (reviewed: ParsedData) => void;
  onSkip: () => void;
}

// Extract username from various GitHub URL formats (used for initial parsing)
function extractGitHubUsername(value: string): string {
  if (!value) return '';
  const trimmed = value.trim();

  // Try to extract from URL format
  const urlMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/\s]+)\/?$/i);
  if (urlMatch) {
    return urlMatch[1];
  }

  // Remove @ prefix if present
  if (trimmed.startsWith('@')) {
    return trimmed.slice(1);
  }

  // Assume it's already just a username
  return trimmed;
}

// Validate GitHub username format
function isValidGitHubUsername(username: string): boolean {
  if (!username) return true; // Empty is valid (optional field)
  // GitHub usernames: alphanumeric and hyphens, 1-39 chars, can't start/end with hyphen
  return /^[a-zA-Z0-9][a-zA-Z0-9-]{0,37}[a-zA-Z0-9]$/.test(username) ||
         /^[a-zA-Z0-9]$/.test(username); // Single char username
}

// Extract slug from various LinkedIn URL formats
function extractLinkedInSlug(value: string): string {
  if (!value) return '';
  const trimmed = value.trim();

  // Try to extract from URL format (linkedin.com/in/username)
  const urlMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)\/?$/i);
  if (urlMatch) {
    return urlMatch[1];
  }

  // If it looks like a bare slug (alphanumeric, hyphens, underscores), use as-is
  if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed;
}

// Validate LinkedIn profile slug format
function isValidLinkedInSlug(slug: string): boolean {
  if (!slug) return true; // Empty is valid (optional field)
  // LinkedIn slugs: alphanumeric, hyphens, underscores, 3-100 chars
  return /^[a-zA-Z0-9_-]{3,100}$/.test(slug);
}

type GitHubValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid' | 'not-found';
type LinkedInValidationStatus = 'idle' | 'valid' | 'invalid';
type EmailValidationStatus = 'idle' | 'invalid' | 'checking' | 'available' | 'taken';

interface FieldConfig {
  key: keyof ParsedData;
  label: string;
  group: string;
}

const FIELD_CONFIGS: FieldConfig[] = [
  { key: 'name', label: 'Name', group: 'Personal' },
  { key: 'email', label: 'Email', group: 'Personal' },
  { key: 'bio', label: 'Bio', group: 'Personal' },
  { key: 'school', label: 'School', group: 'Education' },
  { key: 'major', label: 'Major', group: 'Education' },
  { key: 'degree', label: 'Degree', group: 'Education' },
  { key: 'year', label: 'Year', group: 'Education' },
  { key: 'expected_grad_date', label: 'Expected Graduation', group: 'Education' },
  { key: 'company', label: 'Company', group: 'Work' },
  { key: 'title', label: 'Title', group: 'Work' },
  { key: 'work_experience_years', label: 'Experience', group: 'Work' },
  { key: 'research_area', label: 'Research Area', group: 'Research' },
  { key: 'publications', label: 'Publications', group: 'Research' },
  { key: 'interest_areas', label: 'Interests', group: 'Skills & Interests' },
  { key: 'current_skills', label: 'Skills', group: 'Skills & Interests' },
  { key: 'hobbies', label: 'Hobbies', group: 'Skills & Interests' },
  { key: 'linkedin', label: 'LinkedIn', group: 'Links' },
  { key: 'github', label: 'GitHub (optional)', group: 'Links' },
];

function hasValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return false;
}

function displayValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ');
  return String(value ?? '');
}

export default function ParsedReviewQuestion({
  parsedData,
  onAccept,
  onSkip,
}: ParsedReviewQuestionProps) {
  // Initialize with GitHub/LinkedIn as just the username/slug (extracted from any URL format)
  const [editedData, setEditedData] = useState<ParsedData>(() => ({
    ...parsedData,
    github: parsedData.github ? extractGitHubUsername(parsedData.github) : undefined,
    linkedin: parsedData.linkedin ? extractLinkedInSlug(parsedData.linkedin) : undefined,
  }));
  const [githubStatus, setGithubStatus] = useState<GitHubValidationStatus>('idle');
  const [linkedinStatus, setLinkedinStatus] = useState<LinkedInValidationStatus>('idle');
  const [emailStatus, setEmailStatus] = useState<EmailValidationStatus>('idle');

  // Validate email on mount and when it changes (with debounce)
  useEffect(() => {
    const email = editedData.email;
    if (!email) {
      setEmailStatus('idle');
      return;
    }

    // Format validation — require a 2–10 char alphabetic TLD (e.g. .com, .edu, .co.uk)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}$/;
    if (!emailRegex.test(email)) {
      setEmailStatus('invalid');
      return;
    }

    // Debounce API call
    setEmailStatus('checking');
    const timeout = setTimeout(() => {
      fetch(`${API_BASE_URL}/api/auth/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
        .then((res) => res.json())
        .then((data) => {
          setEmailStatus(data.exists ? 'taken' : 'available');
        })
        .catch(() => {
          setEmailStatus('idle');
        });
    }, 500);

    return () => clearTimeout(timeout);
  }, [editedData.email]);

  // Validate GitHub username on mount and when it changes (with debounce)
  useEffect(() => {
    const username = editedData.github;
    if (!username) {
      setGithubStatus('idle');
      return;
    }

    // Check username format first
    if (!isValidGitHubUsername(username)) {
      const timeout = setTimeout(() => {
        setGithubStatus('invalid');
      }, 500);
      return () => clearTimeout(timeout);
    }

    // Debounce API call to verify the user exists
    setGithubStatus('validating');
    const timeout = setTimeout(() => {
      fetch(`${API_BASE_URL}/api/github/profile/${encodeURIComponent(username)}`)
        .then((res) => {
          if (res.ok) {
            setGithubStatus('valid');
          } else if (res.status === 404) {
            setGithubStatus('not-found');
          } else {
            setGithubStatus('idle'); // API error, don't block the user
          }
        })
        .catch(() => {
          setGithubStatus('idle'); // Network error, don't block the user
        });
    }, 500);

    return () => clearTimeout(timeout);
  }, [editedData.github]);

  // Validate LinkedIn slug format when it changes
  useEffect(() => {
    const slug = editedData.linkedin;
    if (!slug) {
      setLinkedinStatus('idle');
      return;
    }

    const timeout = setTimeout(() => {
      setLinkedinStatus(isValidLinkedInSlug(slug) ? 'valid' : 'invalid');
    }, 500);

    return () => clearTimeout(timeout);
  }, [editedData.linkedin]);

  // Show fields that have values, but always include email (required) and github (optional)
  const fieldsWithValues = FIELD_CONFIGS.filter((f) =>
    f.key === 'email' || f.key === 'github' || hasValue(parsedData[f.key])
  );

  // Group fields
  const groups = fieldsWithValues.reduce<Record<string, FieldConfig[]>>(
    (acc, field) => {
      if (!acc[field.group]) acc[field.group] = [];
      acc[field.group].push(field);
      return acc;
    },
    {}
  );

  const handleFieldChange = (key: keyof ParsedData, value: string) => {
    const isListField = key === 'interest_areas' || key === 'current_skills' || key === 'hobbies';

    if (isListField) {
      setEditedData({
        ...editedData,
        [key]: value.split(',').map((s) => s.trim()).filter(Boolean),
      });
    } else {
      setEditedData({ ...editedData, [key]: value });
    }
  };

  if (fieldsWithValues.length === 0) {
    return (
      <div className="text-center space-y-8">
        <div className="space-y-3">
          <h2 className="text-3xl md:text-4xl font-black" style={{ color: 'var(--text)' }}>
            We couldn&apos;t extract much
          </h2>
          <p className="text-lg" style={{ color: 'var(--text-muted)' }}>
            No worries, you can fill everything in manually.
          </p>
        </div>
        <button
          onClick={onSkip}
          className="btn btn-primary"
          style={{ padding: '16px 32px', fontSize: '1.125rem' }}
        >
          Continue &rarr;
        </button>
      </div>
    );
  }

  return (
    <div className="text-center space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <h2 className="text-3xl md:text-4xl font-black" style={{ color: 'var(--text)' }}>
          We found your details!
        </h2>
        <p className="text-lg" style={{ color: 'var(--text-muted)' }}>
          Review what we extracted. You can edit any field.
        </p>
      </div>

      {/* Parsed fields grouped */}
      <div className="text-left space-y-6 max-w-lg mx-auto max-h-[50vh] overflow-y-auto px-1">
        {Object.entries(groups).map(([groupName, fields]) => (
          <div key={groupName} className="space-y-3">
            <h3 className="section-heading">
              {groupName}
            </h3>
            {fields.map((field) => (
              <div key={field.key} className="space-y-1">
                <label className="block text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {field.label}
                </label>
                {/* Special input for GitHub with prefix */}
                {field.key === 'github' ? (
                  <div
                    className="flex items-center w-full rounded-lg transition-all duration-200"
                    style={{
                      background: 'var(--surface)',
                      border: `2px solid ${githubStatus === 'invalid' || githubStatus === 'not-found' ? '#f59e0b' : 'var(--border-light)'}`,
                    }}
                  >
                    <span className="pl-4 text-sm select-none" style={{ color: 'var(--text-muted)' }}>github.com/</span>
                    <input
                      type="text"
                      value={editedData.github || ''}
                      onChange={(e) => handleFieldChange('github', e.target.value)}
                      placeholder="username"
                      className="flex-1 px-1 py-2.5 text-sm bg-transparent outline-none"
                      style={{ color: 'var(--text)' }}
                    />
                  </div>
                ) : field.key === 'linkedin' ? (
                  <div
                    className="flex items-center w-full rounded-lg transition-all duration-200"
                    style={{
                      background: parsedData.linkedin ? 'var(--bg)' : 'var(--surface)',
                      border: `2px solid ${linkedinStatus === 'invalid' ? '#f59e0b' : 'var(--border-light)'}`,
                      opacity: parsedData.linkedin ? 0.6 : 1,
                    }}
                  >
                    <span className="pl-4 text-sm select-none" style={{ color: 'var(--text-muted)' }}>linkedin.com/in/</span>
                    <input
                      type="text"
                      value={editedData.linkedin || ''}
                      onChange={(e) => handleFieldChange('linkedin', e.target.value)}
                      placeholder="johnny-tsunami-6767"
                      readOnly={!!parsedData.linkedin}
                      className="flex-1 px-1 py-2.5 text-sm bg-transparent outline-none"
                      style={{ color: 'var(--text-muted)', cursor: parsedData.linkedin ? 'default' : undefined }}
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={displayValue(editedData[field.key])}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    className="input w-full text-sm"
                    style={field.key === 'email' && (emailStatus === 'taken' || emailStatus === 'invalid' || !editedData.email?.trim())
                      ? { borderColor: '#f59e0b' }
                      : {}
                    }
                  />
                )}
                {/* GitHub validation feedback */}
                {field.key === 'github' && githubStatus === 'validating' && (
                  <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                    <span className="inline-block w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border-light)', borderTopColor: 'var(--accent)' }} />
                    Checking GitHub profile...
                  </p>
                )}
                {field.key === 'github' && githubStatus === 'valid' && (
                  <p className="text-xs flex items-center gap-1" style={{ color: '#16a34a' }}>
                    <span>✓</span> GitHub profile verified
                  </p>
                )}
                {field.key === 'github' && githubStatus === 'not-found' && (
                  <p className="text-xs flex items-center gap-1" style={{ color: '#d97706' }}>
                    <span>⚠</span> GitHub user not found. Please check the username.
                  </p>
                )}
                {field.key === 'github' && githubStatus === 'invalid' && (
                  <p className="text-xs flex items-center gap-1" style={{ color: '#d97706' }}>
                    <span>⚠</span> Invalid username format.
                  </p>
                )}
                {/* LinkedIn validation feedback (only when user-editable) */}
                {field.key === 'linkedin' && !parsedData.linkedin && linkedinStatus === 'valid' && (
                  <p className="text-xs flex items-center gap-1" style={{ color: '#16a34a' }}>
                    <span>✓</span> Valid LinkedIn profile format
                  </p>
                )}
                {field.key === 'linkedin' && !parsedData.linkedin && linkedinStatus === 'invalid' && (
                  <p className="text-xs flex items-center gap-1" style={{ color: '#d97706' }}>
                    <span>⚠</span> Invalid LinkedIn profile format.
                  </p>
                )}
                {/* Email validation warnings */}
                {field.key === 'email' && !editedData.email?.trim() && (
                  <p className="text-xs flex items-center gap-1" style={{ color: '#d97706' }}>
                    <span>⚠</span> Email is required.
                  </p>
                )}
                {field.key === 'email' && emailStatus === 'invalid' && (
                  <p className="text-xs flex items-center gap-1" style={{ color: '#d97706' }}>
                    <span>⚠</span> Please enter a valid email address.
                  </p>
                )}
                {field.key === 'email' && emailStatus === 'taken' && (
                  <p className="text-xs flex items-center gap-1" style={{ color: '#d97706' }}>
                    <span>⚠</span> This email is already registered. Try signing in instead.
                  </p>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-4">
        <button
          onClick={() => {
            // Construct full URLs from username/slug before passing up
            const finalData = {
              ...editedData,
              github: editedData.github ? `https://github.com/${editedData.github}` : undefined,
              linkedin: editedData.linkedin && isValidLinkedInSlug(editedData.linkedin)
                ? `https://www.linkedin.com/in/${editedData.linkedin}`
                : undefined,
            };
            onAccept(finalData);
          }}
          disabled={!editedData.email?.trim() || emailStatus === 'taken' || emailStatus === 'checking' || emailStatus === 'invalid' || linkedinStatus === 'invalid'}
          className="btn btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ padding: '16px 32px', fontSize: '1.125rem' }}
        >
          {emailStatus === 'checking' ? 'Checking email...' : 'Looks good! →'}
        </button>
        <div>
          <button
            onClick={onSkip}
            className="text-base transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            I&apos;ll fill it in myself
          </button>
        </div>
      </div>
    </div>
  );
}
