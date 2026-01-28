import ConversationalOnboarding from './onboarding/ConversationalOnboarding';

interface OnboardingFormProps {
  onComplete: (userId: string) => void;
  onBackToLogin: () => void;
}

export default function OnboardingForm({ onComplete, onBackToLogin }: OnboardingFormProps) {
  return <ConversationalOnboarding onComplete={onComplete} onBackToLogin={onBackToLogin} />;
}
