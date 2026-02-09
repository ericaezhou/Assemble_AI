'use client';

import { useState, useEffect, useRef } from 'react';
import { signUp } from '@/utils/auth';
import { getVisibleQuestions } from '@/utils/onboardingQuestions';
import { INTEREST_AREAS, SKILLS, HOBBIES, Option } from '@/utils/profileOptions';
import { uploadForParsing, pollForResult, claimParsingJob, confirmParsing, ParsedData } from '@/utils/parsingApi';
import { API_BASE_URL } from '@/utils/api';
import QuestionContainer from './QuestionContainer';
import ImplicitProgress from './ImplicitProgress';
import WelcomeScreen from './questions/WelcomeScreen';
import TextQuestion from './questions/TextQuestion';
import CardSelectQuestion from './questions/CardSelectQuestion';
import ChipSelectQuestion from './questions/ChipSelectQuestion';
import VerificationQuestion from './questions/VerificationQuestion';
import FileUploadQuestion from './questions/FileUploadQuestion';
import ParsedReviewQuestion from './questions/ParsedReviewQuestion';
import GitHubImportQuestion from './questions/GitHubImportQuestion';
import CompletionScreen from './questions/CompletionScreen';

interface ConversationalOnboardingProps {
  onComplete: (userId: string) => void;
  onBackToLogin: () => void;
}

function mapOccupation(data: ParsedData): string | null {
  const raw = (data.occupation || '').trim();
  if (!raw) {
    // Infer from other parsed fields
    if (data.major || data.year) return 'Student';
    if (data.company || data.title) return 'Professional';
    if (data.research_area) return 'Researcher';
    return null;
  }
  const lower = raw.toLowerCase();
  if (['student', 'professional', 'researcher', 'other'].includes(lower)) {
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }
  if (/student|undergrad/i.test(lower)) return 'Student';
  if (/research|professor|postdoc|phd.?candidate|academic/i.test(lower)) return 'Researcher';
  return 'Professional';
}

function mapYear(data: ParsedData): string | null {
  const raw = (data.year || '').trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const options = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'];
  const exact = options.find((o) => o.toLowerCase() === lower);
  if (exact) return exact;
  if (/fresh|1st|first/i.test(lower)) return 'Freshman';
  if (/soph|2nd|second/i.test(lower)) return 'Sophomore';
  if (/junior|3rd|third/i.test(lower)) return 'Junior';
  if (/senior|4th|fourth/i.test(lower)) return 'Senior';
  if (/grad|master|phd|doctoral|mba|post/i.test(lower)) return 'Graduate';
  return null;
}

function mapDegree(data: ParsedData): string | null {
  const raw = (data.degree || '').trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (/high.?school|hs\b|ged/i.test(lower)) return 'High School';
  if (/associate|aa\b|as\b/i.test(lower)) return 'Associate';
  if (/bachelor|bs\b|ba\b|b\.s|b\.a|bsc|undergrad/i.test(lower)) return "Bachelor's";
  if (/master|ms\b|ma\b|m\.s|m\.a|msc|mba/i.test(lower)) return "Master's";
  if (/ph\.?d|doctor/i.test(lower)) return 'PhD';
  if (/none|n\/a/i.test(lower)) return 'None';
  const options = ['High School', 'Associate', "Bachelor's", "Master's", 'PhD', 'None'];
  return options.find((o) => o.toLowerCase() === lower) || null;
}

function mapExperience(data: ParsedData): string | null {
  const raw = (data.work_experience_years || '').trim();
  if (!raw) return null;
  const options = ['0-1 years', '1-3 years', '3-5 years', '5-10 years', '10+ years'];
  const exact = options.find((o) => o.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;
  const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return null;
  if (num <= 1) return '0-1 years';
  if (num <= 3) return '1-3 years';
  if (num <= 5) return '3-5 years';
  if (num <= 10) return '5-10 years';
  return '10+ years';
}

export default function ConversationalOnboarding({
  onComplete,
  onBackToLogin,
}: ConversationalOnboardingProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [formData, setFormData] = useState<any>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    verificationCode: '',
    occupation: '',
    school: '',
    major: '',
    year: '',
    company: '',
    title: '',
    work_experience_years: '',
    degree: '',
    research_area: '',
    other_description: '',
    interest_areas: [],
    current_skills: [],
    hobbies: [],
    github: '',
    _parsedData: null,
  });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);

  // Email verification state
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');

  // Parsing state
  const [parsingJobId, setParsingJobId] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'parsing' | 'done' | 'error'>('idle');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const pollerRef = useRef<{ cancel: () => void } | null>(null);
  const maxProgressRef = useRef(0);

  // GitHub import state
  const [githubStatus, setGithubStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [githubData, setGithubData] = useState<{ name?: string; bio?: string; company?: string; languages: string[]; topics: string[] } | null>(null);
  const [githubUsername, setGithubUsername] = useState('');

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      pollerRef.current?.cancel();
    };
  }, []);

  const matchToOptions = (parsed: string[], options: Option[]): string[] => {
    return parsed
      .map((p) => {
        const lower = p.toLowerCase().trim();
        const exact = options.find(
          (o) => o.value === lower || o.label.toLowerCase() === lower
        );
        if (exact) return exact.value;
        const partial = options.find(
          (o) =>
            o.label.toLowerCase().includes(lower) ||
            lower.includes(o.label.toLowerCase())
        );
        return partial?.value ?? null;
      })
      .filter(Boolean) as string[];
  };

  const handleFileUpload = async (file: File) => {
    setUploadStatus('uploading');
    try {
      const { job_id } = await uploadForParsing(file);
      setParsingJobId(job_id);
      setUploadStatus('parsing');

      pollerRef.current = pollForResult(
        job_id,
        (data) => {
          setParsedData(data);
          setUploadStatus('done');
          setFormData((prev: any) => ({ ...prev, _parsedData: data }));
        },
        (errorMsg) => {
          setUploadStatus('error');
          setErrors((prev) => ({ ...prev, 'resume-upload': errorMsg }));
        }
      );
    } catch (err: any) {
      setUploadStatus('error');
      setErrors((prev) => ({
        ...prev,
        'resume-upload': err.message || 'Upload failed',
      }));
    }
  };

  const handleGitHubFetch = async (username: string) => {
    setGithubStatus('loading');
    setErrors((prev) => ({ ...prev, 'github-import': null }));
    setGithubUsername(username);

    try {
      const response = await fetch(`${API_BASE_URL}/api/github/profile/${encodeURIComponent(username)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch GitHub profile');
      }

      setGithubData(data);
      setGithubStatus('success');
    } catch (err: any) {
      setGithubStatus('error');
      setErrors((prev) => ({ ...prev, 'github-import': err.message || 'Failed to fetch GitHub profile' }));
    }
  };

  const handleGitHubContinue = () => {
    if (!githubData) {
      handleNext();
      return;
    }

    const updates: any = {};

    // Store the full GitHub profile URL
    if (githubUsername) {
      updates.github = `https://github.com/${githubUsername}`;
    }

    if (githubData.name && !formData.name) updates.name = githubData.name;
    if (githubData.company && !formData.company) updates.company = githubData.company;

    // Map languages to skills
    if (githubData.languages.length > 0) {
      const matched = matchToOptions(githubData.languages, SKILLS);
      if (matched.length) updates.current_skills = matched;
    }

    // Map topics to interests
    if (githubData.topics.length > 0) {
      const matched = matchToOptions(githubData.topics, INTEREST_AREAS);
      if (matched.length) updates.interest_areas = matched;
    }

    setFormData((prev: any) => ({ ...prev, ...updates }));
    handleNext();
  };

  const buildParsedUpdates = (data: ParsedData) => {
    const updates: any = {};
    if (data.name) updates.name = data.name;
    if (data.email) updates.email = data.email;
    if (data.bio) updates.bio = data.bio;
    if (data.school) updates.school = data.school;
    if (data.major) updates.major = data.major;
    if (data.company) updates.company = data.company;
    if (data.title) updates.title = data.title;
    if (data.research_area) updates.research_area = data.research_area;
    if (data.other_description) updates.other_description = data.other_description;

    // Map card-select fields to exact option values
    const occupation = mapOccupation(data);
    if (occupation) updates.occupation = occupation;
    const year = mapYear(data);
    if (year) updates.year = year;
    const degree = mapDegree(data);
    if (degree) updates.degree = degree;
    const experience = mapExperience(data);
    if (experience) updates.work_experience_years = experience;

    if (data.interest_areas?.length) {
      const matched = matchToOptions(data.interest_areas, INTEREST_AREAS);
      if (matched.length) updates.interest_areas = matched;
    }
    if (data.current_skills?.length) {
      const matched = matchToOptions(data.current_skills, SKILLS);
      if (matched.length) updates.current_skills = matched;
    }
    if (data.hobbies?.length) {
      const matched = matchToOptions(data.hobbies, HOBBIES);
      if (matched.length) updates.hobbies = matched;
    }

    return updates;
  };

  const visibleQuestions = getVisibleQuestions(formData);
  const currentQuestion = visibleQuestions[currentIndex];
  const totalQuestions = visibleQuestions.length;

  // Progress tracking — only moves forward, never backward
  const rawProgress = totalQuestions > 1 ? (currentIndex / (totalQuestions - 1)) * 100 : 0;
  maxProgressRef.current = Math.max(maxProgressRef.current, rawProgress);

  const handleSendVerificationCode = async () => {
    if (!formData.email) {
      setErrors({ ...errors, email: 'Please enter your email first' });
      return;
    }

    setSendingCode(true);
    setVerificationMessage('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();

      if (response.ok) {
        setCodeSent(true);
        if (data.devMode) {
          setVerificationMessage(`Development mode: Your code is ${data.code}`);
        } else {
          setVerificationMessage('Verification code sent! Check your email.');
        }
      } else {
        setErrors({ ...errors, verification: data.error || 'Failed to send code' });
      }
    } catch (err) {
      setErrors({ ...errors, verification: 'Network error. Please try again.' });
    } finally {
      setSendingCode(false);
    }
  };

  const validateCurrent = (): boolean => {
    if (!currentQuestion.validation) return true;

    const error = currentQuestion.validation(
      formData[currentQuestion.field || ''],
      formData
    );

    if (error) {
      setErrors({ ...errors, [currentQuestion.id]: error });
      return false;
    }

    setErrors({ ...errors, [currentQuestion.id]: null });
    return true;
  };

  const handleNext = () => {
    if (currentQuestion.optional || validateCurrent()) {
      if (currentIndex < totalQuestions - 1) {
        setCurrentIndex(currentIndex + 1);
        setErrors({});
      }
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setErrors({});
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    setErrors({ ...errors, [currentQuestion.id]: null });
  };

  const handleComplete = async () => {
    setLoading(true);

    try {
      const {
        confirmPassword,
        verificationCode,
        _parsedData,
        ...profileFields
      } = formData;

      // Use Supabase auth signUp
      const result = await signUp(
        formData.email,
        formData.password,
        {
          name: profileFields.name,
          occupation: profileFields.occupation,
          school: profileFields.school,
          major: profileFields.major,
          year: profileFields.year,
          company: profileFields.company,
          title: profileFields.title,
          work_experience_years: profileFields.work_experience_years,
          degree: profileFields.degree,
          research_area: profileFields.research_area,
          other_description: profileFields.other_description,
          interest_areas: profileFields.interest_areas,
          current_skills: profileFields.current_skills,
          hobbies: profileFields.hobbies,
          github: profileFields.github,
        }
      );

      // Check if email confirmation is required
      if (result.needsEmailConfirmation) {
        setErrors({ completion: 'Please check your email to confirm your account, then sign in.' });
        // Optionally redirect to login after a delay
        setTimeout(() => onBackToLogin(), 3000);
        return;
      }

      // If we have a parsing job, claim it with the real user_id and confirm
      if (parsingJobId) {
        try {
          await claimParsingJob(parsingJobId, result.user.id);
          await confirmParsing(parsingJobId, profileFields);
        } catch {
          // Non-blocking — profile was already saved by signUp
          console.warn('Failed to confirm parsing job');
        }
      }

      // Success - pass the UUID to parent
      onComplete(result.user.id);
    } catch (err: any) {
      setErrors({ completion: err.message || 'Failed to create profile. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const renderQuestion = () => {
    const q = currentQuestion;

    switch (q.type) {
      case 'welcome':
        return <WelcomeScreen onContinue={handleNext} />;

      case 'file-upload':
        return (
          <FileUploadQuestion
            onFileSelect={handleFileUpload}
            onSkip={handleNext}
            onContinue={handleNext}
            uploadStatus={uploadStatus}
            error={errors['resume-upload']}
          />
        );

      case 'parsed-review':
        return (
          <ParsedReviewQuestion
            parsedData={parsedData!}
            onAccept={(reviewed) => {
              const updates = buildParsedUpdates(reviewed);
              const newFormData = { ...formData, ...updates };
              // Compute next index against the NEW visible list so we skip
              // straight past all pre-filled questions — no intermediate render
              const newVisible = getVisibleQuestions(newFormData);
              const reviewIdx = newVisible.findIndex((q) => q.id === 'parsed-review');
              setFormData(newFormData);
              setCurrentIndex(Math.min(reviewIdx + 1, newVisible.length - 1));
              setErrors({});
            }}
            onSkip={handleNext}
          />
        );

      case 'github-import':
        return (
          <GitHubImportQuestion
            question={q.question!}
            subtitle={q.subtitle}
            onFetch={handleGitHubFetch}
            onSkip={handleNext}
            onContinue={handleGitHubContinue}
            fetchStatus={githubStatus}
            fetchedData={githubData}
            error={errors['github-import']}
          />
        );

      case 'text':
      case 'email':
      case 'password':
        return (
          <TextQuestion
            question={q.question!}
            subtitle={q.subtitle}
            placeholder={q.placeholder}
            value={formData[q.field!] || ''}
            onChange={(value) => handleFieldChange(q.field!, value)}
            onContinue={handleNext}
            type={q.type}
            error={errors[q.id]}
          />
        );

      case 'verification':
        return (
          <VerificationQuestion
            question={q.question!}
            subtitle={q.subtitle!}
            email={formData.email}
            value={formData.verificationCode || ''}
            onChange={(value) => handleFieldChange('verificationCode', value)}
            onContinue={handleNext}
            onSendCode={handleSendVerificationCode}
            codeSent={codeSent}
            sending={sendingCode}
            message={verificationMessage}
            error={errors[q.id]}
          />
        );

      case 'card-select':
        return (
          <CardSelectQuestion
            question={q.question!}
            options={q.options!}
            value={formData[q.field!] || ''}
            onChange={(value) => handleFieldChange(q.field!, value)}
            onContinue={handleNext}
          />
        );

      case 'chip-select':
        const optionsMap: any = {
          interest_areas: INTEREST_AREAS,
          current_skills: SKILLS,
          hobbies: HOBBIES,
        };
        return (
          <ChipSelectQuestion
            question={q.question!}
            subtitle={q.subtitle}
            options={optionsMap[q.field!] || []}
            selectedValues={formData[q.field!] || []}
            onChange={(values) => handleFieldChange(q.field!, values)}
            onContinue={handleNext}
            maxSelections={q.maxSelections}
            optional={q.optional}
          />
        );

      case 'completion':
        return (
          <CompletionScreen
            onComplete={handleComplete}
            name={formData.name}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Implicit progress */}
      <ImplicitProgress progress={maxProgressRef.current} />

      {/* Question content */}
      <QuestionContainer
        onBack={handleBack}
        showBack={currentIndex > 0 && currentQuestion.type !== 'completion'}
      >
        {renderQuestion()}
      </QuestionContainer>

      {/* Back to login link */}
      {currentIndex === 0 && (
        <div className="fixed bottom-8 left-0 right-0 text-center">
          <button
            onClick={onBackToLogin}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Already have an account? <span className="font-semibold">Sign in</span>
          </button>
        </div>
      )}

      {/* Error message for completion */}
      {errors.completion && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-red-50 text-red-600 px-6 py-3 rounded-lg shadow-lg">
          {errors.completion}
        </div>
      )}
    </div>
  );
}
