'use client';

import { useState } from 'react';
import { setToken } from '@/utils/auth';
import { onboardingQuestions, getVisibleQuestions, QuestionConfig } from '@/utils/onboardingQuestions';
import { INTEREST_AREAS, SKILLS, HOBBIES } from '@/utils/profileOptions';
import QuestionContainer from './QuestionContainer';
import ImplicitProgress from './ImplicitProgress';
import WelcomeScreen from './questions/WelcomeScreen';
import TextQuestion from './questions/TextQuestion';
import CardSelectQuestion from './questions/CardSelectQuestion';
import ChipSelectQuestion from './questions/ChipSelectQuestion';
import VerificationQuestion from './questions/VerificationQuestion';
import CompletionScreen from './questions/CompletionScreen';

interface ConversationalOnboardingProps {
  onComplete: (userId: number) => void;
  onBackToLogin: () => void;
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
  });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);

  // Email verification state
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');

  const visibleQuestions = getVisibleQuestions(formData);
  const currentQuestion = visibleQuestions[currentIndex];
  const totalQuestions = visibleQuestions.length;

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
      const { confirmPassword, ...signupData } = formData;
      const response = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.token) {
          setToken(data.token);
        }
        onComplete(data.id);
      } else {
        setErrors({ completion: data.error || 'Failed to create profile' });
      }
    } catch (err) {
      setErrors({ completion: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const renderQuestion = () => {
    const q = currentQuestion;

    switch (q.type) {
      case 'welcome':
        return <WelcomeScreen onContinue={handleNext} />;

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
      <ImplicitProgress current={currentIndex + 1} total={totalQuestions} />

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
