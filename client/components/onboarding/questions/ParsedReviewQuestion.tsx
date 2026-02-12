'use client';

import { useState, useEffect } from 'react';
import { ParsedData } from '@/utils/parsingApi';
import { API_BASE_URL } from '@/utils/api';

interface ParsedReviewQuestionProps {
  parsedData: ParsedData;
  onAccept: (reviewed: ParsedData) => void;
  onSkip: () => void;
}

// Extract username from various GitHub URL formats
function extractGitHubUsername(value: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();

  // Check if it looks like a URL (contains github.com or protocol)
  if (trimmed.includes('github.com') || trimmed.includes('://')) {
    // Must be a properly formatted URL with ^ anchor to prevent partial matches
    // Only allow: github.com/user, www.github.com/user, http://github.com/user, https://github.com/user
    const urlMatch = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9][a-zA-Z0-9-]{0,38})\/?$/i);
    if (urlMatch && !urlMatch[1].endsWith('-')) {
      return urlMatch[1];
    }
    return null; // Invalid URL format
  }

  // Just a username (alphanumeric and hyphens, 1-39 chars)
  if (/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/.test(trimmed) && !trimmed.endsWith('-')) {
    return trimmed;
  }

  return null;
}

type GitHubValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid' | 'not-found';
type EmailValidationStatus = 'idle' | 'checking' | 'available' | 'taken';

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
  { key: 'github', label: 'GitHub', group: 'Links' },
  { key: 'linkedin', label: 'LinkedIn', group: 'Links' },
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
  const [editedData, setEditedData] = useState<ParsedData>({ ...parsedData });
  const [githubStatus, setGithubStatus] = useState<GitHubValidationStatus>('idle');
  const [emailStatus, setEmailStatus] = useState<EmailValidationStatus>('idle');

  // Validate email on mount and when it changes (with debounce)
  useEffect(() => {
    const email = editedData.email;
    if (!email) {
      setEmailStatus('idle');
      return;
    }

    // Basic format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailStatus('idle');
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

  // Validate GitHub link on mount and when it changes (with debounce)
  useEffect(() => {
    const github = editedData.github;
    if (!github) {
      setGithubStatus('idle');
      return;
    }

    const username = extractGitHubUsername(github);
    if (!username) {
      // Debounce showing "invalid" to avoid flashing while typing
      const timeout = setTimeout(() => {
        setGithubStatus('invalid');
      }, 500);
      return () => clearTimeout(timeout);
    }

    // Debounce API call to avoid spamming while typing
    setGithubStatus('validating');
    const timeout = setTimeout(() => {
      fetch(`${API_BASE_URL}/api/github/profile/${encodeURIComponent(username)}`)
        .then((res) => {
          if (res.ok) {
            setGithubStatus('valid');
          } else if (res.status === 404) {
            setGithubStatus('not-found');
          } else {
            setGithubStatus('invalid');
          }
        })
        .catch(() => {
          setGithubStatus('invalid');
        });
    }, 500);

    return () => clearTimeout(timeout);
  }, [editedData.github]);

  // Only show fields that have values
  const fieldsWithValues = FIELD_CONFIGS.filter((f) =>
    hasValue(parsedData[f.key])
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
    const field = FIELD_CONFIGS.find((f) => f.key === key);
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
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            We couldn&apos;t extract much
          </h2>
          <p className="text-lg text-gray-500">
            No worries, you can fill everything in manually.
          </p>
        </div>
        <button
          onClick={onSkip}
          className="px-8 py-4 text-lg font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-lg hover:scale-[1.02] transition-all duration-150 cursor-pointer"
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
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
          We found your details!
        </h2>
        <p className="text-lg text-gray-500">
          Review what we extracted. You can edit any field.
        </p>
      </div>

      {/* Parsed fields grouped */}
      <div className="text-left space-y-6 max-w-lg mx-auto max-h-[50vh] overflow-y-auto px-1">
        {Object.entries(groups).map(([groupName, fields]) => (
          <div key={groupName} className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              {groupName}
            </h3>
            {fields.map((field) => (
              <div key={field.key} className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  {field.label}
                </label>
                <input
                  type="text"
                  value={displayValue(editedData[field.key])}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  className={`w-full px-4 py-2.5 text-sm text-gray-900 bg-white border-2 rounded-xl transition-all duration-200 focus:outline-none focus:border-indigo-500 focus:shadow-lg focus:shadow-indigo-100 ${
                    (field.key === 'github' && (githubStatus === 'invalid' || githubStatus === 'not-found')) ||
                    (field.key === 'email' && emailStatus === 'taken')
                      ? 'border-amber-400'
                      : 'border-gray-200'
                  }`}
                />
                {/* GitHub validation warning */}
                {field.key === 'github' && githubStatus === 'validating' && (
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
                    Checking GitHub profile...
                  </p>
                )}
                {field.key === 'github' && githubStatus === 'valid' && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <span>✓</span> GitHub profile verified
                  </p>
                )}
                {field.key === 'github' && githubStatus === 'not-found' && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <span>⚠</span> GitHub user not found. Please check the username.
                  </p>
                )}
                {field.key === 'github' && githubStatus === 'invalid' && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <span>⚠</span> Invalid GitHub link format. Use: github.com/username
                  </p>
                )}
                {/* Email validation warning */}
                {field.key === 'email' && emailStatus === 'taken' && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
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
          onClick={() => onAccept(editedData)}
          className="px-8 py-4 text-lg font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-lg hover:scale-[1.02] transition-all duration-150 cursor-pointer"
        >
          Looks good! &rarr;
        </button>
        <div>
          <button
            onClick={onSkip}
            className="text-base text-gray-500 hover:text-gray-700 transition-colors"
          >
            I&apos;ll fill it in myself
          </button>
        </div>
      </div>
    </div>
  );
}
