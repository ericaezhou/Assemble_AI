'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { authenticatedFetch } from '@/utils/auth';
import imageCompression from 'browser-image-compression';
import EventCoverFallback from './EventCoverFallback';
import { useUserStore } from '@/store/userStore';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface CreateEventProps {
  userId: string;
  onClose: () => void;
  onSuccess: (eventId: string) => void;
}

type LocationType = 'in-person' | 'virtual' | 'hybrid';
type PriceType = 'free' | 'paid';
type Step = 'logistics' | 'description' | 'prelaunch';

type QuestionType = 'text' | 'options' | 'checkbox' | 'social';
type SelectionType = 'single' | 'multiple';

const SOCIAL_PLATFORMS = ['LinkedIn', 'Instagram', 'X (Twitter)', 'GitHub', 'YouTube', 'TikTok'] as const;
type SocialPlatform = typeof SOCIAL_PLATFORMS[number];

const SOCIAL_QUESTION_DEFAULTS: Record<SocialPlatform, string> = {
  'LinkedIn': 'What is your LinkedIn profile URL?',
  'Instagram': 'What is your Instagram username?',
  'X (Twitter)': 'What is your X (Twitter) username?',
  'GitHub': 'What is your GitHub username?',
  'YouTube': 'What is your YouTube channel URL?',
  'TikTok': 'What is your TikTok username?',
};

interface RSVPQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  selectionType?: SelectionType;
  platform?: SocialPlatform;
  required: boolean;
}

interface EventFormData {
  name: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  locationType: LocationType;
  location: string;
  locationPrivacy: 'exact' | 'city';
  virtualLink: string;
  priceType: PriceType;
  priceAmount: string;
  capacity: string;
  description: string;
  requireApproval: boolean;
  rsvpQuestions: RSVPQuestion[];
}

interface NominatimResult {
  display_name: string;
  address: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

const STEPS: Step[] = ['logistics', 'description', 'prelaunch'];

const LOCATION_OPTIONS = [
  { value: 'in-person' as LocationType, label: 'In Person', icon: '📍' },
  { value: 'virtual' as LocationType, label: 'Virtual', icon: '💻' },
  { value: 'hybrid' as LocationType, label: 'Hybrid', icon: '🌐' },
];

// Generate time options with 30-minute intervals
const TIME_OPTIONS = (() => {
  const options: { value: string; label: string }[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const value = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const displayHour = hour % 12 || 12;
      const ampm = hour < 12 ? 'AM' : 'PM';
      const label = `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
      options.push({ value, label });
    }
  }
  return options;
})();

export default function CreateEvent({ userId, onClose, onSuccess }: CreateEventProps) {
  const [currentStep, setCurrentStep] = useState<Step>('logistics');
  const [formData, setFormData] = useState<EventFormData>({
    name: '',
    startDate: '',
    startTime: '09:00',
    endDate: '',
    endTime: '17:00',
    locationType: 'in-person',
    location: '',
    locationPrivacy: 'exact',
    virtualLink: '',
    priceType: 'free',
    priceAmount: '',
    capacity: '',
    description: '',
    requireApproval: false,
    rsvpQuestions: [],
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [addQuestionStep, setAddQuestionStep] = useState<'type' | 'build'>('type');
  const [draftQuestionType, setDraftQuestionType] = useState<QuestionType>('text');
  const [draftQuestionText, setDraftQuestionText] = useState('');
  const [draftQuestionOptions, setDraftQuestionOptions] = useState(['', '']);
  const [draftSelectionType, setDraftSelectionType] = useState<SelectionType>('single');
  const [draftSocialPlatform, setDraftSocialPlatform] = useState<SocialPlatform>('LinkedIn');
  const [draftQuestionRequired, setDraftQuestionRequired] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(null);
  const [coverSeed] = useState(() => Math.random().toString(36).slice(2));
  const coverInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<NominatimResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locationCity, setLocationCity] = useState('');
  const [locationState, setLocationState] = useState('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentStepIndex = STEPS.indexOf(currentStep);
  const { user } = useUserStore();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const validateCurrentStep = (): boolean => {
    setError('');

    switch (currentStep) {
      case 'logistics':
        if (!formData.name.trim()) {
          setError('Event name is required');
          return false;
        }
        if (!formData.startDate) {
          setError('Start date is required');
          return false;
        }
        if (formData.endDate && formData.startDate > formData.endDate) {
          setError('End date must be after start date');
          return false;
        }
        if (formData.locationType === 'in-person' || formData.locationType === 'hybrid') {
          if (!formData.location.trim()) {
            setError('Location address is required');
            return false;
          }
        }
        if (formData.locationType === 'virtual' || formData.locationType === 'hybrid') {
          if (!formData.virtualLink.trim()) {
            setError('Virtual link is required');
            return false;
          }
        }
        break;
      case 'description':
        if (!formData.description.trim()) {
          setError('Event description is required');
          return false;
        }
        break;
      case 'prelaunch':
        break;
    }
    return true;
  };

  const handleContinue = () => {
    if (!validateCurrentStep()) return;

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
      setError('');
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
      setError('');
    }
  };

  const openAddQuestionModal = () => {
    setAddQuestionStep('type');
    setDraftQuestionType('text');
    setDraftQuestionText('');
    setDraftQuestionOptions(['', '']);
    setDraftSelectionType('single');
    setDraftSocialPlatform('LinkedIn');
    setDraftQuestionRequired(true);
    setShowAddQuestionModal(true);
  };

  const submitAddQuestion = () => {
    if (!draftQuestionText.trim()) return;
    const newQ: RSVPQuestion = {
      id: Date.now().toString(),
      type: draftQuestionType,
      question: draftQuestionText.trim(),
      required: draftQuestionRequired,
      ...(draftQuestionType === 'options' ? { options: draftQuestionOptions.filter(o => o.trim()), selectionType: draftSelectionType } : {}),
      ...(draftQuestionType === 'social' ? { platform: draftSocialPlatform } : {}),
    };
    setFormData(prev => ({ ...prev, rsvpQuestions: [...prev.rsvpQuestions, newQ] }));
    setShowAddQuestionModal(false);
  };

  const removeRSVPQuestion = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      rsvpQuestions: prev.rsvpQuestions.filter((q) => q.id !== id),
    }));
  };

  const toggleQuestionRequired = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      rsvpQuestions: prev.rsvpQuestions.map((q) =>
        q.id === id ? { ...q, required: !q.required } : q
      ),
    }));
  };

  const handleCoverPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Compress image if it's larger than 1MB
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 2000,
        useWebWorker: true,
      };
      const compressedFile = file.size > 1 * 1024 * 1024
        ? await imageCompression(file, options)
        : file;

      setCoverPhotoFile(compressedFile);
      setCoverPhotoPreview(URL.createObjectURL(compressedFile));
    } catch {
      // If compression fails, use original file
      setCoverPhotoFile(file);
      setCoverPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleLocationInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, location: value }));
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (value.length < 3) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=5&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data: NominatimResult[] = await res.json();
        setLocationSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch {
        // silently fail
      }
    }, 400);
  };


  const handleSelectSuggestion = (suggestion: NominatimResult) => {
    const city = suggestion.address.city || suggestion.address.town || suggestion.address.village || '';
    const state = suggestion.address.state || '';
    setFormData((prev) => ({ ...prev, location: suggestion.display_name }));
    setLocationCity(city);
    setLocationState(state);
    setShowSuggestions(false);
    setLocationSuggestions([]);
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setLoading(true);

    try {
      // Upload cover photo first if one was selected
      let coverPhotoUrl: string | null = null;
      if (coverPhotoFile) {
        const fd = new FormData();
        fd.append('cover', coverPhotoFile);
        const uploadRes = await authenticatedFetch('/api/upload/event-cover', {
          method: 'POST',
          body: fd,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          coverPhotoUrl = uploadData.url;
        }
      }

      const response = await authenticatedFetch('/api/conferences', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          location: formData.location || null,
          location_privacy: formData.locationPrivacy,
          location_type: formData.locationType,
          virtual_link: formData.virtualLink || null,
          start_date: formData.startDate,
          start_time: formData.startTime,
          end_date: formData.endDate || formData.startDate,
          end_time: formData.endTime,
          price_type: formData.priceType,
          price_amount: formData.priceType === 'paid' ? parseFloat(formData.priceAmount) || 0 : null,
          capacity: formData.capacity ? parseInt(formData.capacity) : null,
          description: formData.description || null,
          require_approval: formData.requireApproval,
          rsvp_questions: formData.rsvpQuestions.length > 0 ? formData.rsvpQuestions.map(q => JSON.stringify(q)) : null,
          cover_photo_url: coverPhotoUrl,
          host_id: userId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess(data.id);
      } else {
        setError(data.error || 'Failed to create event');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeForDisplay = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getLocationDisplay = () => {
    if (formData.locationType === 'virtual') return 'Virtual Event';
    if (formData.locationPrivacy === 'city' && (locationCity || locationState)) {
      const cityDisplay = [locationCity, locationState].filter(Boolean).join(', ');
      if (formData.locationType === 'hybrid') return `${cityDisplay} + Virtual`;
      return cityDisplay;
    }
    if (formData.locationType === 'hybrid') return `${formData.location || 'TBD'} + Virtual`;
    return formData.location || 'Location TBD';
  };

  const getStepLabel = (step: Step) => {
    switch (step) {
      case 'logistics':
        return 'Logistics';
      case 'description':
        return 'Description';
      case 'prelaunch':
        return 'Pre-Launch';
    }
  };

  // State for live preview sync (separate from formData to avoid cursor issues)
  const [liveDescription, setLiveDescription] = useState('');

  // WYSIWYG formatting functions using document.execCommand
  const handleBold = () => {
    document.execCommand('bold', false);
    syncDescription();
  };
  const handleItalic = () => {
    document.execCommand('italic', false);
    syncDescription();
  };
  const handleUnderline = () => {
    document.execCommand('underline', false);
    syncDescription();
  };
  const handleBulletList = () => {
    document.execCommand('insertUnorderedList', false);
    syncDescription();
  };
  const handleNumberedList = () => {
    document.execCommand('insertOrderedList', false);
    syncDescription();
  };
  const handleHeading = () => {
    document.execCommand('formatBlock', false, 'h3');
    syncDescription();
  };

  const handleInsertLink = () => {
    if (!linkUrl) return;
    const text = linkText || linkUrl;

    const editor = descriptionRef.current;
    if (editor) {
      editor.focus();
      document.execCommand('insertHTML', false, `<a href="${linkUrl}" style="color:var(--accent);text-decoration:underline" target="_blank" rel="noopener noreferrer">${text}</a>`);
      syncDescription();
    }

    setShowLinkModal(false);
    setLinkUrl('');
    setLinkText('');
  };

  const handleColor = (color: string) => {
    document.execCommand('foreColor', false, color);
    syncDescription();
    setShowColorPicker(false);
  };
  const handleFont = (font: string) => {
    document.execCommand('fontName', false, font);
    syncDescription();
    setShowFontPicker(false);
  };
  const handleSize = (size: string) => {
    document.execCommand('fontSize', false, size);
    syncDescription();
    setShowSizePicker(false);
  };
  const handleEmoji = (emoji: string) => {
    const editor = descriptionRef.current;
    if (editor) {
      editor.focus();
      const sel = window.getSelection();
      if (savedRangeRef.current && sel) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      }
      document.execCommand('insertText', false, emoji);
      syncDescription();
    }
    setShowEmojiPicker(false);
  };

  // Sync editor content to live preview (doesn't trigger re-render of editor)
  const syncDescription = () => {
    const editor = descriptionRef.current;
    if (editor) {
      setLiveDescription(editor.innerHTML);
    }
  };

  // Save to formData when leaving editor (for form submission)
  const handleDescriptionBlur = () => {
    const editor = descriptionRef.current;
    if (editor) {
      setFormData((prev) => ({ ...prev, description: editor.innerHTML }));
    }
  };

  // Render formatted description for preview
  const renderFormattedDescription = (html: string) => {
    if (!html) return null;
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="flex-shrink-0" style={{ background: 'var(--surface)', borderBottom: '2px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-2 transition-colors btn-ghost px-3 py-2 rounded"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="font-medium">Cancel</span>
          </button>

          {/* Step Labels */}
          <div className="flex items-center gap-6">
            {STEPS.map((step, index) => (
              <div key={step} className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={
                    index < currentStepIndex
                      ? { background: 'var(--accent)', color: '#fff' }
                      : index === currentStepIndex
                      ? { background: 'var(--accent-light)', color: 'var(--accent)', border: '2px solid var(--accent)' }
                      : { background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border-light)' }
                  }
                >
                  {index < currentStepIndex ? (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className="text-sm font-semibold transition-colors"
                  style={{ color: index === currentStepIndex ? 'var(--accent)' : 'var(--text-muted)', cursor: index !== currentStepIndex ? 'default' : 'default' }}
                  onMouseEnter={e => { if (index !== currentStepIndex) e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseLeave={e => { if (index !== currentStepIndex) e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  {getStepLabel(step)}
                </span>
                {index < STEPS.length - 1 && (
                  <div className="w-8 h-px ml-2" style={{ background: 'var(--border-light)' }} />
                )}
              </div>
            ))}
          </div>

          <div className="w-24" />
        </div>
      </header>

      {/* Main Content - Split Layout */}
      <main className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: Live Preview (45%) */}
        <div className="w-[45%] p-8 overflow-hidden flex flex-col" style={{ background: 'var(--bg)', borderRight: '2px solid var(--border)' }}>
          <div className="flex flex-col min-h-0 flex-1">
            <div className="mb-6">
              <span className="section-heading">
                {currentStep === 'description' ? 'Event Detail Preview' : 'Event Card Preview'}
              </span>
            </div>

            <div className="flex-1 min-h-0 flex items-center justify-center">
              {/* EventCard-style preview — Logistics and Pre-Launch steps */}
              {currentStep !== 'description' && (
                <div className="w-full">
                  {/* EventCard layout — 1.5x scale */}
                  <div className="card overflow-hidden flex flex-col">
                    <div className="flex">
                      {/* Cover photo */}
                      <div
                        className="w-64 flex-shrink-0 overflow-hidden cursor-pointer relative group/cover"
                        style={{ borderRight: '2px solid var(--border-light)' }}
                        onClick={() => coverInputRef.current?.click()}
                      >
                        <div className="w-full h-full min-h-[260px]">
                          {coverPhotoPreview ? (
                            <img src={coverPhotoPreview} alt="Cover" className="w-full h-full object-cover" />
                          ) : (
                            <EventCoverFallback eventName={coverSeed} />
                          )}
                        </div>
                        <div className="absolute bottom-0 inset-x-0 bg-black/40 group-hover/cover:bg-black/60 transition-colors flex items-center justify-center py-2">
                          <span className="text-white text-xs font-semibold tracking-wide">Upload cover photo</span>
                        </div>
                      </div>
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleCoverPhotoChange}
                      />

                      {/* Event info */}
                      <div className="flex-1 min-w-0 px-6 py-6 space-y-2.5">
                        {formData.startTime && (
                          <p className="text-base font-semibold" style={{ color: 'var(--accent)' }}>{formatTimeForDisplay(formData.startTime)}</p>
                        )}
                        <h3 className="text-2xl font-bold leading-snug" style={{ color: formData.name ? 'var(--text)' : 'var(--border-light)' }}>
                          {formData.name || 'Event name'}
                        </h3>
                        <div className="flex items-center gap-1.5">
                          {user?.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white" style={{ background: 'var(--accent)' }}>
                              {user?.name?.[0]?.toUpperCase() || 'Y'}
                            </div>
                          )}
                          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>By <span className="font-semibold" style={{ color: 'var(--text)' }}>{user?.name || 'You'}</span></p>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="truncate" style={{ color: (formData.location || formData.locationType === 'virtual') ? 'var(--text-muted)' : 'var(--border-light)' }}>
                            {getLocationDisplay()}
                          </span>
                        </div>
                        {formData.locationType === 'virtual' && (
                          <div className="flex items-center gap-2 pt-0.5">
                            <span className="tag">Virtual</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Full Event Page Preview - for Description step */}
              {currentStep === 'description' && (
                <div className="card overflow-hidden flex flex-col w-full" style={{ height: '80%' }}>
                  {/* Tab bar */}
                  <div className="flex px-2 flex-shrink-0" style={{ borderBottom: '2px solid var(--border-light)' }}>
                    {['About', 'Announcement', 'Participants (0)'].map((label, i) => (
                      <button
                        key={label}
                        className="relative px-5 py-4 text-sm font-bold whitespace-nowrap"
                        style={{ color: i === 0 ? 'var(--accent)' : 'var(--text-muted)' }}
                      >
                        {label}
                        {i === 0 && (
                          <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ background: 'var(--accent)' }} />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    <div>
                      <h2 className="section-heading mb-3">About the Event</h2>
                      {liveDescription ? (
                        <div className="text-sm leading-relaxed break-words overflow-hidden" style={{ color: 'var(--text)' }}>
                          {renderFormattedDescription(liveDescription)}
                        </div>
                      ) : (
                        <p className="italic text-sm" style={{ color: 'var(--text-muted)' }}>Your event description will appear here as you type...</p>
                      )}
                    </div>

                    {(formData.capacity || formData.priceType !== 'free') && (
                      <div className="flex flex-wrap gap-3">
                        {formData.capacity && (
                          <div className="rounded-lg px-4 py-3 flex-1 min-w-[120px]" style={{ background: 'var(--bg)', border: '2px solid var(--border-light)' }}>
                            <p className="section-heading mb-1">Capacity</p>
                            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>0 / {formData.capacity} registered</p>
                          </div>
                        )}
                        {formData.priceType !== 'free' && (
                          <div className="rounded-lg px-4 py-3 flex-1 min-w-[120px]" style={{ background: 'var(--bg)', border: '2px solid var(--border-light)' }}>
                            <p className="section-heading mb-1">Admission</p>
                            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                              {formData.priceAmount ? `$${formData.priceAmount}` : 'Paid'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Edit Panel (55%) */}
        <div className="w-[55%] flex flex-col overflow-hidden" style={{ background: 'var(--surface)' }}>
          {/* Content */}
          <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
            <div className="w-full max-w-lg">
              {/* Logistics Step */}
              {currentStep === 'logistics' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--text)' }}>Event Logistics</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Set up the basic details for your event.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Event Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g., AI Research Symposium 2025"
                      className="input w-full"
                      style={{ borderColor: 'var(--border-light)' }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Start</label>
                      <div className="grid gap-2" style={{ gridTemplateColumns: '1fr auto' }}>
                        <input
                          type="date"
                          name="startDate"
                          value={formData.startDate}
                          onChange={handleChange}
                          className="input text-sm"
                          style={{ borderColor: 'var(--border-light)', color: 'var(--text)', colorScheme: 'light', width: '100%' }}
                          onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                          onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}
                        />
                        <select
                          name="startTime"
                          value={formData.startTime}
                          onChange={handleChange}
                          className="input text-sm cursor-pointer"
                          style={{ borderColor: 'var(--border-light)', color: 'var(--text)', width: 'auto' }}
                          onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                          onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}
                        >
                          {TIME_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>End</label>
                      <div className="grid gap-2" style={{ gridTemplateColumns: '1fr auto' }}>
                        <input
                          type="date"
                          name="endDate"
                          value={formData.endDate}
                          onChange={handleChange}
                          className="input text-sm"
                          style={{ borderColor: 'var(--border-light)', color: 'var(--text)', colorScheme: 'light', width: '100%' }}
                          onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                          onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}
                        />
                        <select
                          name="endTime"
                          value={formData.endTime}
                          onChange={handleChange}
                          className="input text-sm cursor-pointer"
                          style={{ borderColor: 'var(--border-light)', color: 'var(--text)', width: 'auto' }}
                          onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                          onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}
                        >
                          {TIME_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Location</label>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {LOCATION_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, locationType: option.value }))}
                          className="btn flex items-center justify-center gap-2 text-sm transition-colors"
                          style={formData.locationType === option.value
                            ? { background: 'var(--accent-light)', color: 'var(--accent)', borderColor: 'var(--accent)' }
                            : { background: 'var(--surface)', color: 'var(--text-muted)', borderColor: 'var(--border-light)' }
                          }
                          onMouseEnter={e => { if (formData.locationType !== option.value) { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-light)'; }}}
                          onMouseLeave={e => { if (formData.locationType !== option.value) { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'var(--surface)'; }}}
                        >
                          <span>{option.icon}</span>
                          {option.label}
                        </button>
                      ))}
                    </div>

                    {(formData.locationType === 'in-person' || formData.locationType === 'hybrid') && (
                      <div className="mb-2">
                        <div className="relative">
                          <input
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleLocationInput}
                            onBlur={e => { setTimeout(() => setShowSuggestions(false), 150); e.currentTarget.style.borderColor = 'var(--border-light)'; }}
                            onFocus={e => { locationSuggestions.length > 0 && setShowSuggestions(true); e.currentTarget.style.borderColor = 'var(--accent)'; }}
                            placeholder="Search for a venue address..."
                            className="input w-full text-sm"
                            style={{ borderColor: 'var(--border-light)' }}
                            autoComplete="off"
                          />
                          {showSuggestions && locationSuggestions.length > 0 && (
                            <ul className="absolute z-50 top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                              {locationSuggestions.map((s, i) => (
                                <li
                                  key={i}
                                  onMouseDown={() => handleSelectSuggestion(s)}
                                  className="px-4 py-2.5 cursor-pointer leading-snug"
                                  style={{ color: 'var(--text)', borderBottom: '1px solid var(--border-light)' }}
                                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-light)')}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                  {s.display_name}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {/* Vague location toggle */}
                        <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--border-light)' }}>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Hide exact address publicly</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, locationPrivacy: prev.locationPrivacy === 'exact' ? 'city' : 'exact' }))}
                            className="relative flex-shrink-0 ml-4 w-10 h-6 rounded-full transition-colors"
                            style={{ background: formData.locationPrivacy === 'city' ? 'var(--accent)' : 'var(--border-light)' }}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                formData.locationPrivacy === 'city' ? 'translate-x-4' : ''
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    )}
                    {(formData.locationType === 'virtual' || formData.locationType === 'hybrid') && (
                      <input
                        type="url"
                        name="virtualLink"
                        value={formData.virtualLink}
                        onChange={handleChange}
                        placeholder="Video conference link"
                        className="input w-full text-sm"
                        style={{ borderColor: 'var(--border-light)' }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Tickets</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, priceType: 'free' }))}
                          className="btn flex-1 text-sm transition-colors"
                          style={formData.priceType === 'free'
                            ? { background: 'var(--accent-light)', color: 'var(--accent)', borderColor: 'var(--accent)' }
                            : { background: 'var(--surface)', color: 'var(--text-muted)', borderColor: 'var(--border-light)' }
                          }
                          onMouseEnter={e => { if (formData.priceType !== 'free') { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-light)'; }}}
                          onMouseLeave={e => { if (formData.priceType !== 'free') { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'var(--surface)'; }}}
                        >
                          Free
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, priceType: 'paid' }))}
                          className="btn flex-1 text-sm transition-colors"
                          style={formData.priceType === 'paid'
                            ? { background: 'var(--accent-light)', color: 'var(--accent)', borderColor: 'var(--accent)' }
                            : { background: 'var(--surface)', color: 'var(--text-muted)', borderColor: 'var(--border-light)' }
                          }
                          onMouseEnter={e => { if (formData.priceType !== 'paid') { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-light)'; }}}
                          onMouseLeave={e => { if (formData.priceType !== 'paid') { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'var(--surface)'; }}}
                        >
                          Paid
                        </button>
                      </div>
                      {formData.priceType === 'paid' && (
                        <div className="mt-2 relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>$</span>
                          <input
                            type="number"
                            name="priceAmount"
                            value={formData.priceAmount}
                            onChange={handleChange}
                            placeholder="0.00"
                            className="input w-full pl-8 text-sm"
                            style={{ borderColor: 'var(--border-light)' }}
                            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Capacity</label>
                      <input
                        type="number"
                        name="capacity"
                        value={formData.capacity}
                        onChange={handleChange}
                        placeholder="Unlimited"
                        className="input w-full text-sm"
                        style={{ borderColor: 'var(--border-light)' }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                        onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}
                      />
                    </div>
                  </div>

                </div>
              )}

              {/* Description Step */}
              {currentStep === 'description' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--text)' }}>Event Description</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Share more details about what attendees can expect.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
                      About this event
                    </label>

                    {/* Formatting Toolbar */}
                    <div className="flex items-center flex-wrap gap-1 p-2" style={{ border: '1px solid var(--border-light)', borderBottom: 'none', borderRadius: 'var(--radius) var(--radius) 0 0', background: 'var(--surface)' }}>

                      {/* Font family */}
                      <div className="relative">
                        <button
                          type="button"
                          onMouseDown={e => { e.preventDefault(); setShowFontPicker(v => !v); setShowSizePicker(false); setShowColorPicker(false); setShowEmojiPicker(false); }}
                          className="btn-ghost px-2 py-1 rounded text-xs font-bold flex items-center gap-1"
                          title="Font"
                          style={{ color: 'var(--text)' }}
                        >
                          Aa
                          <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {showFontPicker && (
                          <div className="absolute top-full left-0 mt-1 z-50 py-1 flex flex-col min-w-[160px]" style={{ background: 'var(--surface)', border: '2px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: '4px 4px 0 var(--border)' }}>
                            {[
                              { label: 'Default', value: 'sans-serif' },
                              { label: 'Arial', value: 'Arial, sans-serif' },
                              { label: 'Times New Roman', value: 'Times New Roman, serif' },
                              { label: 'Courier New', value: 'Courier New, monospace' },
                              { label: 'Georgia', value: 'Georgia, serif' },
                              { label: 'Verdana', value: 'Verdana, sans-serif' },
                              { label: 'Trebuchet MS', value: 'Trebuchet MS, sans-serif' },
                            ].map(({ label, value }) => (
                              <button
                                key={value}
                                type="button"
                                onMouseDown={e => { e.preventDefault(); handleFont(value); }}
                                className="px-3 py-1.5 text-sm text-left transition-colors"
                                style={{ fontFamily: value, color: 'var(--text)' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-light)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Font size */}
                      <div className="relative">
                        <button
                          type="button"
                          onMouseDown={e => { e.preventDefault(); setShowSizePicker(v => !v); setShowFontPicker(false); setShowColorPicker(false); setShowEmojiPicker(false); }}
                          className="btn-ghost px-2 py-1 rounded text-xs font-bold flex items-center gap-1"
                          title="Size"
                          style={{ color: 'var(--text)' }}
                        >
                          Size
                          <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {showSizePicker && (
                          <div className="absolute top-full left-0 mt-1 z-50 py-1 flex flex-col min-w-[120px]" style={{ background: 'var(--surface)', border: '2px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: '4px 4px 0 var(--border)' }}>
                            {[
                              { label: 'Small', value: '1' },
                              { label: 'Normal', value: '3' },
                              { label: 'Large', value: '5' },
                              { label: 'Huge', value: '7' },
                            ].map(({ label, value }) => (
                              <button
                                key={value}
                                type="button"
                                onMouseDown={e => { e.preventDefault(); handleSize(value); }}
                                className="px-3 py-1.5 text-left transition-colors"
                                style={{ fontSize: ['10px','','13px','','20px','','32px'][+value - 1], color: 'var(--text)' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-light)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Text color */}
                      <div className="relative">
                        <button
                          type="button"
                          onMouseDown={e => { e.preventDefault(); setShowColorPicker(v => !v); setShowFontPicker(false); setShowSizePicker(false); setShowEmojiPicker(false); }}
                          className="btn-ghost p-2 rounded flex flex-col items-center gap-0.5"
                          title="Text Color"
                        >
                          <span className="text-sm font-black leading-none" style={{ color: 'var(--text)' }}>A</span>
                          <span className="w-3.5 h-1 rounded-sm" style={{ background: '#000000' }} />
                        </button>
                        {showColorPicker && (
                          <div className="absolute top-full left-0 mt-1 z-50 p-3 flex flex-col gap-2" style={{ background: 'var(--surface)', border: '2px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: '4px 4px 0 var(--border)', minWidth: '180px' }}>
                            <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Standard colors</p>
                            <div className="grid grid-cols-8 gap-1">
                              {['#000000','#434343','#666666','#999999','#b7b7b7','#cccccc','#d9d9d9','#ffffff',
                                '#ff0000','#ff9900','#ffff00','#00ff00','#00ffff','#4a86e8','#0000ff','#9900ff',
                                '#ff00ff','#e6b8a2','#f9cb9c','#ffe599','#b6d7a8','#a2c4c9','#9fc5e8','#b4a7d6','#ea9999'].map(color => (
                                <button
                                  key={color}
                                  type="button"
                                  onMouseDown={e => { e.preventDefault(); handleColor(color); }}
                                  className="w-5 h-5 rounded-sm transition-transform hover:scale-110"
                                  style={{ background: color, border: color === '#ffffff' ? '1px solid var(--border-light)' : 'none' }}
                                  title={color}
                                />
                              ))}
                            </div>
                            <div className="flex items-center gap-2 pt-1" style={{ borderTop: '1px solid var(--border-light)' }}>
                              <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Custom</label>
                              <input
                                type="color"
                                defaultValue="#000000"
                                className="w-7 h-7 rounded cursor-pointer border"
                                style={{ borderColor: 'var(--border-light)', padding: '1px' }}
                                onMouseDown={e => e.stopPropagation()}
                                onChange={e => handleColor(e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="w-px h-5 mx-1" style={{ background: 'var(--border-light)' }} />

                      {/* Bold */}
                      <button type="button" onClick={handleBold} className="btn-ghost p-2 rounded" title="Bold">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24" style={{ color: 'var(--text)' }}>
                          <path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6V4zm0 8h9a4 4 0 014 4 4 4 0 01-4 4H6v-8z" />
                        </svg>
                      </button>

                      {/* Italic */}
                      <button type="button" onClick={handleItalic} className="btn-ghost p-2 rounded" title="Italic">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: 'var(--text)' }}>
                          <path d="M10 4h4m-2 0v16m-4 0h8" transform="skewX(-10)" />
                        </svg>
                      </button>

                      {/* Underline */}
                      <button type="button" onClick={handleUnderline} className="btn-ghost p-2 rounded" title="Underline">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: 'var(--text)' }}>
                          <path d="M6 3v7a6 6 0 0012 0V3M4 21h16" />
                        </svg>
                      </button>

                      <div className="w-px h-5 mx-1" style={{ background: 'var(--border-light)' }} />

                      {/* Heading */}
                      <button type="button" onClick={handleHeading} className="btn-ghost p-2 rounded" title="Heading">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: 'var(--text)' }}>
                          <path d="M4 6h16M4 12h10" />
                        </svg>
                      </button>

                      {/* Bullet list */}
                      <button type="button" onClick={handleBulletList} className="btn-ghost p-2 rounded" title="Bullet List">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: 'var(--text)' }}>
                          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                        </svg>
                      </button>

                      {/* Numbered list */}
                      <button type="button" onClick={handleNumberedList} className="btn-ghost p-2 rounded" title="Numbered List">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text)' }}>
                          <path d="M2 5h2v1H3v1h1v1H2v1h3V4H2v1zm0 7h1.8L2 14.1v.9h3v-1H3.2L5 11.9V11H2v1zm0 5h2v1h-1v1h1v1H2v1h3v-5H2v1zm5-12v2h14V5H7zm0 7h14v-2H7v2zm0 7h14v-2H7v2z" />
                        </svg>
                      </button>

                      <div className="w-px h-5 mx-1" style={{ background: 'var(--border-light)' }} />

                      {/* Link */}
                      <button type="button" onClick={() => setShowLinkModal(true)} className="btn-ghost p-2 rounded" title="Insert Link">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: 'var(--text)' }}>
                          <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </button>

                      <div className="w-px h-5 mx-1" style={{ background: 'var(--border-light)' }} />

                      {/* Emoji picker */}
                      <div className="relative">
                        <button
                          type="button"
                          onMouseDown={e => {
                            e.preventDefault();
                            const sel = window.getSelection();
                            if (sel && sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange();
                            setShowEmojiPicker(v => !v);
                            setShowColorPicker(false);
                            setShowFontPicker(false);
                            setShowSizePicker(false);
                          }}
                          className="btn-ghost p-2 rounded text-base leading-none"
                          title="Insert Emoji"
                        >
                          😊
                        </button>
                        {showEmojiPicker && (
                          <div className="absolute top-full left-0 mt-1 z-50">
                            <EmojiPicker
                              onEmojiClick={emojiData => handleEmoji(emojiData.emoji)}
                              width={300}
                              height={380}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      ref={descriptionRef}
                      contentEditable
                      onInput={syncDescription}
                      onBlur={handleDescriptionBlur}
                      className="w-full min-h-[320px] max-h-[400px] overflow-y-auto px-4 py-3 text-sm leading-relaxed outline-none [&:empty]:before:content-['Tell_potential_attendees_what_makes_this_event_special...'] [&:empty]:before:text-[var(--text-muted)] [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-3 [&_h3]:mb-1 [&_a]:underline [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5"
                      style={{
                        border: '1px solid var(--border-light)',
                        borderTop: 'none',
                        borderRadius: '0 0 var(--radius) var(--radius)',
                        color: 'var(--text)',
                        background: 'var(--surface)',
                      }}
                      suppressContentEditableWarning
                    />
                    <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      Select text and click a formatting button to apply styles. 
                    </p>
                  </div>
                </div>
              )}

              {/* Link Modal */}
              {showLinkModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="card p-6 w-full max-w-sm">
                    <h3 className="text-lg font-black mb-4" style={{ color: 'var(--text)' }}>Insert Link</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>Link Text</label>
                        <input
                          type="text"
                          value={linkText}
                          onChange={(e) => setLinkText(e.target.value)}
                          placeholder="Display text (optional)"
                          className="input w-full text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>URL</label>
                        <input
                          type="url"
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                          placeholder="https://example.com"
                          className="input w-full text-sm"
                        />
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowLinkModal(false);
                            setLinkUrl('');
                            setLinkText('');
                          }}
                          className="btn btn-secondary flex-1 text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleInsertLink}
                          disabled={!linkUrl}
                          className="btn btn-primary flex-1 text-sm disabled:opacity-50"
                        >
                          Insert
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pre-Launch Step */}
              {currentStep === 'prelaunch' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--text)' }}>Pre-Launch Settings</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Configure attendance approval and RSVP questions.</p>
                  </div>

                  <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--text)' }}>Require approval to join</p>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Review attendees before they can access the event</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, requireApproval: !prev.requireApproval }))}
                      className="relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ml-4"
                      style={{ background: formData.requireApproval ? 'var(--accent)' : 'var(--border-light)' }}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                          formData.requireApproval ? 'translate-x-5' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {formData.requireApproval && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>
                          Registration Questions <span className="font-normal" style={{ color: 'var(--text-muted)' }}>(optional)</span>
                        </label>
                        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                          Ask attendees questions when they register. Answers help you decide who to approve.
                        </p>

                        {formData.rsvpQuestions.length > 0 && (
                          <div className="space-y-2 mb-3">
                            {formData.rsvpQuestions.map((q) => {
                              const typeLabel: Record<QuestionType, string> = { text: 'Text', options: 'Options', checkbox: 'Checkbox', social: 'Social Profile' };
                              return (
                                <div key={q.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--surface)', border: '2px solid var(--border-light)' }}>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{q.question}</p>
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                      {typeLabel[q.type]}
                                      {q.type === 'options' && q.options && q.options.length > 0 ? ` · ${q.options.length} options · ${q.selectionType === 'multiple' ? 'Multiple' : 'Single'}` : ''}
                                      {q.type === 'social' && q.platform ? ` · ${q.platform}` : ''}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => toggleQuestionRequired(q.id)}
                                    className="tag text-xs flex-shrink-0"
                                    style={q.required
                                      ? { background: '#fef2f2', borderColor: '#fca5a5', color: '#dc2626' }
                                      : { background: 'var(--bg)', borderColor: 'var(--border-light)', color: 'var(--text-muted)' }
                                    }
                                  >
                                    {q.required ? 'Required' : 'Optional'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeRSVPQuestion(q.id)}
                                    className="btn-ghost p-1 rounded flex-shrink-0"
                                    style={{ color: 'var(--text-muted)' }}
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={openAddQuestionModal}
                          className="flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
                          style={{ color: 'var(--accent)', border: '2px dashed var(--accent)', background: 'var(--accent-light)' }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Question
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Add Question Modal */}
                  {showAddQuestionModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                      <div className="card p-6 w-full max-w-md mx-4">
                        {addQuestionStep === 'type' ? (
                          <>
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-black" style={{ color: 'var(--text)' }}>Add Question</h3>
                              <button type="button" onClick={() => setShowAddQuestionModal(false)} className="btn-ghost p-1 rounded">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Choose the type of question to ask guests when they register.</p>
                            <div className="grid grid-cols-2 gap-2">
                              {([
                                { type: 'text' as QuestionType, label: 'Text', desc: 'Short answer', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h12M4 14h8" /> },
                                { type: 'options' as QuestionType, label: 'Options', desc: 'Single or multiple choice', icon: <><circle cx="5" cy="7" r="1.5" fill="currentColor"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h11M9 12h11M9 17h11"/><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="5" cy="17" r="1.5" fill="currentColor"/></> },
                                { type: 'checkbox' as QuestionType, label: 'Checkbox', desc: 'Yes / No agreement', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> },
                                { type: 'social' as QuestionType, label: 'Social Profile', desc: 'Social IDs', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
                              ] as { type: QuestionType; label: string; desc: string; icon: React.ReactNode }[]).map(({ type, label, desc, icon }) => (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => { setDraftQuestionType(type); if (type === 'social') setDraftQuestionText(SOCIAL_QUESTION_DEFAULTS['LinkedIn']); setAddQuestionStep('build'); }}
                                  className="flex items-center gap-3 p-3 rounded-lg text-left transition-all"
                                  style={{ border: '2px solid var(--border-light)', background: 'var(--surface)' }}
                                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-light)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'var(--surface)'; }}
                                >
                                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--accent)' }}>{icon}</svg>
                                  <div>
                                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{label}</p>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-4">
                              <button type="button" onClick={() => setAddQuestionStep('type')} className="btn-ghost p-1 rounded flex items-center gap-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                Back
                              </button>
                              <button type="button" onClick={() => setShowAddQuestionModal(false)} className="btn-ghost p-1 rounded">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>

                            <div className="space-y-4">
                              {/* Social: platform picker first */}
                              {draftQuestionType === 'social' && (
                                <div>
                                  <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>Platform</label>
                                  <select
                                    className="input w-full text-sm"
                                    value={draftSocialPlatform}
                                    onChange={e => {
                                      const p = e.target.value as SocialPlatform;
                                      setDraftSocialPlatform(p);
                                      setDraftQuestionText(SOCIAL_QUESTION_DEFAULTS[p]);
                                    }}
                                  >
                                    {SOCIAL_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                                  </select>
                                </div>
                              )}

                              <div>
                                <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>Question</label>
                                <input
                                  type="text"
                                  className="input w-full text-sm"
                                  placeholder={
                                    draftQuestionType === 'text' ? 'e.g., What do you hope to learn?' :
                                    draftQuestionType === 'options' ? 'e.g., How did you hear about us?' :
                                    'e.g., Are you 18 or older?'
                                  }
                                  value={draftQuestionText}
                                  onChange={e => setDraftQuestionText(e.target.value)}
                                  autoFocus={draftQuestionType !== 'social'}
                                />
                              </div>

                              {draftQuestionType === 'options' && (
                                <>
                                  <div>
                                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Options</label>
                                    <div className="space-y-2">
                                      {draftQuestionOptions.map((opt, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                          <input
                                            type="text"
                                            className="input flex-1 text-sm"
                                            placeholder={`Option ${i + 1}`}
                                            value={opt}
                                            onChange={e => {
                                              const updated = [...draftQuestionOptions];
                                              updated[i] = e.target.value;
                                              setDraftQuestionOptions(updated);
                                            }}
                                          />
                                          {draftQuestionOptions.length > 2 && (
                                            <button type="button" onClick={() => setDraftQuestionOptions(draftQuestionOptions.filter((_, j) => j !== i))} className="btn-ghost p-1 rounded" style={{ color: 'var(--text-muted)' }}>
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                      <button type="button" onClick={() => setDraftQuestionOptions([...draftQuestionOptions, ''])} className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                                        + Add option
                                      </button>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Selection Type</label>
                                    <div className="flex rounded-lg overflow-hidden" style={{ border: '2px solid var(--border-light)' }}>
                                      {(['single', 'multiple'] as SelectionType[]).map(t => (
                                        <button
                                          key={t}
                                          type="button"
                                          onClick={() => setDraftSelectionType(t)}
                                          className="flex-1 py-2 text-sm font-semibold transition-colors capitalize"
                                          style={{
                                            background: draftSelectionType === t ? 'var(--accent)' : 'var(--surface)',
                                            color: draftSelectionType === t ? 'white' : 'var(--text-muted)',
                                          }}
                                        >
                                          {t === 'single' ? 'Single' : 'Multiple'}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </>
                              )}

                              <div className="flex items-center justify-between py-2" style={{ borderTop: '1px solid var(--border-light)' }}>
                                <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Required</span>
                                <button
                                  type="button"
                                  onClick={() => setDraftQuestionRequired(v => !v)}
                                  className="relative w-10 h-6 rounded-full transition-colors"
                                  style={{ background: draftQuestionRequired ? 'var(--accent)' : 'var(--border-light)' }}
                                >
                                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${draftQuestionRequired ? 'translate-x-4' : ''}`} />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={submitAddQuestion}
                                disabled={!draftQuestionText.trim()}
                                className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Add Question
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {!formData.requireApproval && (
                    <div className="rounded-lg p-4" style={{ background: '#f0fdf4', border: '2px solid #86efac' }}>
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#16a34a' }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <div>
                          <p className="font-semibold" style={{ color: '#15803d' }}>Open registration</p>
                          <p className="text-sm" style={{ color: '#16a34a' }}>Anyone with the event link can join instantly.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mt-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2" style={{ background: '#fef2f2', color: '#dc2626', border: '2px solid #fca5a5' }}>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex items-center justify-between mt-6">
                {currentStepIndex > 0 ? (
                  <button
                    onClick={handleBack}
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>
                ) : (
                  <div />
                )}

                {currentStep === 'prelaunch' ? (
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="btn btn-primary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ padding: '10px 32px' }}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Creating...
                      </>
                    ) : (
                      'Create Event'
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleContinue}
                    className="btn btn-primary flex items-center gap-2"
                    style={{ padding: '10px 32px' }}
                  >
                    Continue
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
