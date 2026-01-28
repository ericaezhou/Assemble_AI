export type QuestionType =
  | 'welcome'
  | 'text'
  | 'email'
  | 'verification'
  | 'password'
  | 'card-select'
  | 'chip-select'
  | 'completion';

export interface QuestionConfig {
  id: string;
  type: QuestionType;
  question?: string;
  subtitle?: string;
  placeholder?: string;
  field?: string;
  options?: any[];
  maxSelections?: number;
  optional?: boolean;
  validation?: (value: any, allData: any) => string | null;
  shouldShow?: (data: any) => boolean;
}

export const onboardingQuestions: QuestionConfig[] = [
  // Welcome screen
  {
    id: 'welcome',
    type: 'welcome',
  },

  // Name
  {
    id: 'name',
    type: 'text',
    question: 'What should we call you?',
    placeholder: 'Your name',
    field: 'name',
    validation: (value) => {
      if (!value || value.trim().length === 0) return 'Please enter your name';
      return null;
    },
  },

  // Email
  {
    id: 'email',
    type: 'email',
    question: "What's your email?",
    placeholder: 'you@example.com',
    field: 'email',
    validation: (value) => {
      if (!value) return 'Please enter your email';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) return 'Please enter a valid email';
      return null;
    },
  },

  // Password
  {
    id: 'password',
    type: 'password',
    question: 'Choose a password',
    subtitle: 'Make it memorable',
    placeholder: '••••••••',
    field: 'password',
    validation: (value) => {
      if (!value) return 'Please enter a password';
      if (value.length < 6) return 'Password must be at least 6 characters';
      return null;
    },
  },

  // Confirm password
  {
    id: 'confirmPassword',
    type: 'password',
    question: 'Confirm your password',
    subtitle: 'One more time',
    placeholder: '••••••••',
    field: 'confirmPassword',
    validation: (value, allData) => {
      if (!value) return 'Please confirm your password';
      if (value !== allData.password) return 'Passwords do not match';
      return null;
    },
  },

  // Occupation
  {
    id: 'occupation',
    type: 'card-select',
    question: 'What do you do?',
    field: 'occupation',
    options: [
      { value: 'Student', icon: '🧑‍🎓', label: 'Student' },
      { value: 'Professional', icon: '💼', label: 'Professional' },
      { value: 'Researcher', icon: '🧠', label: 'Researcher' },
      { value: 'Other', icon: '✨', label: 'Other' },
    ],
  },

  // Conditional: School/Company/Institution
  {
    id: 'school',
    type: 'text',
    question: 'Where do you go to school?',
    placeholder: 'MIT, Stanford University...',
    field: 'school',
    shouldShow: (data) => data.occupation === 'Student',
    validation: (value) => {
      if (!value || value.trim().length === 0) return 'Please enter your school';
      return null;
    },
  },
  {
    id: 'company',
    type: 'text',
    question: 'Where you spend that 9-5?',
    placeholder: 'Google, Microsoft, Startup Inc...',
    field: 'company',
    shouldShow: (data) => data.occupation === 'Professional',
    validation: (value) => {
      if (!value || value.trim().length === 0) return 'Please enter your company';
      return null;
    },
  },
  {
    id: 'institution-researcher',
    type: 'text',
    question: 'Which institution are you with?',
    placeholder: 'MIT, Stanford University, Research Lab...',
    field: 'school',
    shouldShow: (data) => data.occupation === 'Researcher',
    validation: (value) => {
      if (!value || value.trim().length === 0) return 'Please enter your institution';
      return null;
    },
  },
  {
    id: 'other-description',
    type: 'text',
    question: 'What have you been up to lately?',
    placeholder: 'Reveal your secrets in progress...',
    field: 'other_description',
    shouldShow: (data) => data.occupation === 'Other',
    validation: (value) => {
      if (!value || value.trim().length === 0) return 'Please tell us about yourself';
      return null;
    },
  },

  // Conditional: Major/Role/Research Area
  {
    id: 'major',
    type: 'text',
    question: 'What are you studying?',
    placeholder: 'Computer Science, Electrical Engineering...',
    field: 'major',
    shouldShow: (data) => data.occupation === 'Student',
    validation: (value) => {
      if (!value || value.trim().length === 0) return 'Please enter your major';
      return null;
    },
  },
  {
    id: 'title',
    type: 'text',
    question: "What's your role?",
    placeholder: 'Software Engineer, Product Manager...',
    field: 'title',
    shouldShow: (data) => data.occupation === 'Professional',
    validation: (value) => {
      if (!value || value.trim().length === 0) return 'Please enter your role';
      return null;
    },
  },
  {
    id: 'research-area',
    type: 'text',
    question: "What's your research area?",
    placeholder: 'Machine Learning, Quantum Computing...',
    field: 'research_area',
    shouldShow: (data) => data.occupation === 'Researcher',
    validation: (value) => {
      if (!value || value.trim().length === 0) return 'Please enter your research area';
      return null;
    },
  },

  // Conditional: Year/Experience
  {
    id: 'year',
    type: 'card-select',
    question: 'What year are you in?',
    field: 'year',
    shouldShow: (data) => data.occupation === 'Student',
    options: [
      { value: 'Freshman', icon: '🌱', label: 'Freshman' },
      { value: 'Sophomore', icon: '🌿', label: 'Sophomore' },
      { value: 'Junior', icon: '🌳', label: 'Junior' },
      { value: 'Senior', icon: '🏔️', label: 'Senior' },
      { value: 'Graduate', icon: '🦉', label: 'Graduate' },
    ],
  },
  {
    id: 'experience',
    type: 'card-select',
    question: 'How long have you been in the industry?',
    field: 'work_experience_years',
    shouldShow: (data) => data.occupation === 'Professional',
    options: [
      { value: '0-1 years', label: '0-1 years' },
      { value: '1-3 years', label: '1-3 years' },
      { value: '3-5 years', label: '3-5 years' },
      { value: '5-10 years', label: '5-10 years' },
      { value: '10+ years', label: '10+ years' },
    ],
  },

  // Educational background
  {
    id: 'degree',
    type: 'card-select',
    question: "What's your educational background?",
    field: 'degree',
    shouldShow: (data) =>
      data.occupation === 'Professional' ||
      data.occupation === 'Researcher' ||
      data.occupation === 'Other',
    options: [
      { value: 'High School', label: 'High School' },
      { value: 'Associate', label: 'Associate' },
      { value: "Bachelor's", label: "Bachelor's" },
      { value: "Master's", label: "Master's" },
      { value: 'PhD', label: 'PhD' },
      { value: 'None', label: 'None' },
    ],
  },

  // Last school (for Professional/Other)
  {
    id: 'last-school',
    type: 'text',
    question: 'Where did you last study?',
    placeholder: 'MIT, Stanford University... (optional for Other)',
    field: 'school',
    optional: true,
    shouldShow: (data) =>
      (data.occupation === 'Professional' || data.occupation === 'Other') &&
      data.degree &&
      data.degree !== 'None',
  },

  // Interests
  {
    id: 'interests',
    type: 'chip-select',
    question: 'What gets you excited?',
    subtitle: 'Pick your top 5 interests',
    field: 'interest_areas',
    maxSelections: 5,
    validation: (value) => {
      if (!value || value.length === 0) return 'Please select at least one interest';
      return null;
    },
  },

  // Skills
  {
    id: 'skills',
    type: 'chip-select',
    question: 'What are you good at?',
    subtitle: 'Choose up to 5 skills (optional)',
    field: 'current_skills',
    maxSelections: 5,
    optional: true,
  },

  // Hobbies
  {
    id: 'hobbies',
    type: 'chip-select',
    question: 'What do you do for fun?',
    subtitle: 'Select up to 5 hobbies (optional)',
    field: 'hobbies',
    maxSelections: 5,
    optional: true,
  },

  // Completion
  {
    id: 'completion',
    type: 'completion',
  },
];

export function getVisibleQuestions(formData: any): QuestionConfig[] {
  return onboardingQuestions.filter((q) => {
    if (!q.shouldShow) return true;
    return q.shouldShow(formData);
  });
}
