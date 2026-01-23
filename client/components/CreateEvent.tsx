'use client';

import { useState, useRef } from 'react';
import { authenticatedFetch } from '@/utils/auth';

interface CreateEventProps {
  userId: number;
  onClose: () => void;
  onSuccess: (eventId: string) => void;
}

type LocationType = 'in-person' | 'virtual' | 'hybrid';
type PriceType = 'free' | 'paid';
type Step = 'logistics' | 'description' | 'prelaunch';

interface RSVPQuestion {
  id: string;
  question: string;
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
  virtualLink: string;
  priceType: PriceType;
  priceAmount: string;
  capacity: string;
  description: string;
  requireApproval: boolean;
  rsvpQuestions: RSVPQuestion[];
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
  const [newQuestion, setNewQuestion] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const descriptionRef = useRef<HTMLDivElement>(null);

  const currentStepIndex = STEPS.indexOf(currentStep);

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

  const addRSVPQuestion = () => {
    if (!newQuestion.trim()) return;
    setFormData((prev) => ({
      ...prev,
      rsvpQuestions: [
        ...prev.rsvpQuestions,
        { id: Date.now().toString(), question: newQuestion, required: true },
      ],
    }));
    setNewQuestion('');
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

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setLoading(true);

    try {
      const response = await authenticatedFetch('/api/conferences', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          location: formData.location || null,
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
          rsvp_questions: formData.rsvpQuestions.length > 0 ? JSON.stringify(formData.rsvpQuestions) : null,
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

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
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
      document.execCommand('insertHTML', false, `<a href="${linkUrl}" class="text-indigo-600 underline" target="_blank" rel="noopener noreferrer">${text}</a>`);
      syncDescription();
    }

    setShowLinkModal(false);
    setLinkUrl('');
    setLinkText('');
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
    <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col h-screen">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
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
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    index < currentStepIndex
                      ? 'bg-indigo-600 text-white'
                      : index === currentStepIndex
                      ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-600'
                      : 'bg-gray-200 text-gray-500'
                  }`}
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
                  className={`text-sm font-medium ${
                    index === currentStepIndex ? 'text-indigo-700' : 'text-gray-500'
                  }`}
                >
                  {getStepLabel(step)}
                </span>
                {index < STEPS.length - 1 && (
                  <div className="w-8 h-px bg-gray-300 ml-2" />
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
        <div className="w-[45%] bg-gradient-to-br from-gray-100 to-gray-50 p-8 overflow-auto">
          <div className="h-full flex flex-col">
            <div className="mb-6">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                {currentStep === 'description' ? 'Full Event Page Preview' : 'Live Preview'}
              </span>
            </div>

            <div className="flex-1 flex items-center justify-center">
              {/* Mini Card Preview - for Logistics and Pre-Launch steps */}
              {currentStep !== 'description' && (
                <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
                  <div className="h-24 bg-gradient-to-r from-indigo-500 via-purple-500 to-purple-600" />

                  <div className="p-6">
                    <h3 className={`text-xl font-bold mb-3 ${formData.name ? 'text-gray-900' : 'text-gray-300'}`}>
                      {formData.name || 'Event Name'}
                    </h3>

                    {formData.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{formData.description}</p>
                    )}

                    <div className="flex items-center gap-3 mb-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className={`font-medium ${formData.startDate ? 'text-gray-900' : 'text-gray-300'}`}>
                          {formData.startDate ? formatDateForDisplay(formData.startDate) : 'Date TBD'}
                        </p>
                        {formData.startTime && (
                          <p className="text-gray-500 text-xs">
                            {formatTimeForDisplay(formData.startTime)}
                            {formData.endTime && ` - ${formatTimeForDisplay(formData.endTime)}`}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mb-4 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                        {formData.locationType === 'virtual' ? (
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                      </div>
                      <p className={`font-medium ${formData.location || formData.locationType === 'virtual' ? 'text-gray-900' : 'text-gray-300'}`}>
                        {getLocationDisplay()}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {formData.priceType === 'free' ? (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                          Free
                        </span>
                      ) : formData.priceAmount ? (
                        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium">
                          ${formData.priceAmount}
                        </span>
                      ) : null}
                      {formData.capacity && (
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                          {formData.capacity} spots
                        </span>
                      )}
                      {formData.requireApproval && (
                        <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-medium">
                          Approval required
                        </span>
                      )}
                      {formData.rsvpQuestions.length > 0 && (
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                          {formData.rsvpQuestions.length} RSVP question{formData.rsvpQuestions.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Full Event Page Preview - for Description step */}
              {currentStep === 'description' && (
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col h-full max-h-[600px]">
                  {/* Header gradient */}
                  <div className="h-16 bg-gradient-to-r from-indigo-500 via-purple-500 to-purple-600 flex-shrink-0" />

                  {/* Content */}
                  <div className="p-6 flex flex-col flex-1 overflow-hidden">
                    {/* Title and host */}
                    <div className="mb-4 flex-shrink-0">
                      <h3 className={`text-2xl font-bold ${formData.name ? 'text-gray-900' : 'text-gray-300'}`}>
                        {formData.name || 'Event Name'}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">Hosted by You</p>
                    </div>

                    {/* Time and Location row */}
                    <div className="flex items-center gap-6 mb-5 py-3 border-y border-gray-100 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-sm">
                          <span className={formData.startDate ? 'text-gray-900' : 'text-gray-300'}>
                            {formData.startDate ? formatDateForDisplay(formData.startDate) : 'Date TBD'}
                          </span>
                          {formData.startTime && (
                            <span className="text-gray-500 ml-1">
                              {formatTimeForDisplay(formData.startTime)}
                              {formData.endTime && ` - ${formatTimeForDisplay(formData.endTime)}`}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className={`text-sm ${formData.location || formData.locationType === 'virtual' ? 'text-gray-900' : 'text-gray-300'}`}>
                          {getLocationDisplay()}
                        </span>
                      </div>
                    </div>

                    {/* Description area */}
                    <div className="flex-1 overflow-auto">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">About this event</h4>
                      <div className={`text-sm leading-relaxed ${liveDescription ? 'text-gray-600' : 'text-gray-300 italic'}`}>
                        {liveDescription ? (
                          renderFormattedDescription(liveDescription)
                        ) : (
                          'Your event description will appear here as you type...'
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Edit Panel (55%) */}
        <div className="w-[55%] bg-white flex flex-col overflow-hidden">
          {/* Content */}
          <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
            <div className="w-full max-w-lg">
              {/* Logistics Step */}
              {currentStep === 'logistics' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Logistics</h2>
                    <p className="text-gray-500">Set up the basic details for your event.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Event Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g., AI Research Symposium 2025"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start</label>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          name="startDate"
                          value={formData.startDate}
                          onChange={handleChange}
                          className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <select
                          name="startTime"
                          value={formData.startTime}
                          onChange={handleChange}
                          className="w-28 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-white cursor-pointer"
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">End</label>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          name="endDate"
                          value={formData.endDate}
                          onChange={handleChange}
                          className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <select
                          name="endTime"
                          value={formData.endTime}
                          onChange={handleChange}
                          className="w-28 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-white cursor-pointer"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {LOCATION_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, locationType: option.value }))}
                          className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                            formData.locationType === option.value
                              ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <span>{option.icon}</span>
                          {option.label}
                        </button>
                      ))}
                    </div>

                    {(formData.locationType === 'in-person' || formData.locationType === 'hybrid') && (
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        placeholder="Venue address"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 mb-2"
                      />
                    )}
                    {(formData.locationType === 'virtual' || formData.locationType === 'hybrid') && (
                      <input
                        type="url"
                        name="virtualLink"
                        value={formData.virtualLink}
                        onChange={handleChange}
                        placeholder="Video conference link"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tickets</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, priceType: 'free' }))}
                          className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                            formData.priceType === 'free'
                              ? 'bg-green-100 text-green-700 ring-2 ring-green-500'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          Free
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, priceType: 'paid' }))}
                          className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                            formData.priceType === 'paid'
                              ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          Paid
                        </button>
                      </div>
                      {formData.priceType === 'paid' && (
                        <div className="mt-2 relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                          <input
                            type="number"
                            name="priceAmount"
                            value={formData.priceAmount}
                            onChange={handleChange}
                            placeholder="0.00"
                            className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Capacity</label>
                      <input
                        type="number"
                        name="capacity"
                        value={formData.capacity}
                        onChange={handleChange}
                        placeholder="Unlimited"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Description Step */}
              {currentStep === 'description' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Description</h2>
                    <p className="text-gray-500">Share more details about what attendees can expect.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      About this event <span className="text-gray-400 font-normal">(optional)</span>
                    </label>

                    {/* Formatting Toolbar */}
                    <div className="flex items-center gap-1 p-2 border border-gray-200 border-b-0 rounded-t-xl bg-gray-50">
                      <button
                        type="button"
                        onClick={handleBold}
                        className="p-2 hover:bg-gray-200 rounded transition-colors"
                        title="Bold"
                      >
                        <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6V4zm0 8h9a4 4 0 014 4 4 4 0 01-4 4H6v-8z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={handleItalic}
                        className="p-2 hover:bg-gray-200 rounded transition-colors"
                        title="Italic"
                      >
                        <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M10 4h4m-2 0v16m-4 0h8" transform="skewX(-10)" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={handleUnderline}
                        className="p-2 hover:bg-gray-200 rounded transition-colors"
                        title="Underline"
                      >
                        <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M6 3v7a6 6 0 0012 0V3M4 21h16" />
                        </svg>
                      </button>

                      <div className="w-px h-5 bg-gray-300 mx-1" />

                      <button
                        type="button"
                        onClick={handleHeading}
                        className="p-2 hover:bg-gray-200 rounded transition-colors"
                        title="Heading"
                      >
                        <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M4 6h16M4 12h10" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={handleBulletList}
                        className="p-2 hover:bg-gray-200 rounded transition-colors"
                        title="Bullet List"
                      >
                        <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={handleNumberedList}
                        className="p-2 hover:bg-gray-200 rounded transition-colors"
                        title="Numbered List"
                      >
                        <svg className="w-4 h-4 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M2 5h2v1H3v1h1v1H2v1h3V4H2v1zm0 7h1.8L2 14.1v.9h3v-1H3.2L5 11.9V11H2v1zm0 5h2v1h-1v1h1v1H2v1h3v-5H2v1zm5-12v2h14V5H7zm0 7h14v-2H7v2zm0 7h14v-2H7v2z" />
                        </svg>
                      </button>

                      <div className="w-px h-5 bg-gray-300 mx-1" />

                      <button
                        type="button"
                        onClick={() => setShowLinkModal(true)}
                        className="p-2 hover:bg-gray-200 rounded transition-colors"
                        title="Insert Link"
                      >
                        <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </button>
                    </div>

                    <div
                      ref={descriptionRef}
                      contentEditable
                      onInput={syncDescription}
                      onBlur={handleDescriptionBlur}
                      className="w-full min-h-[320px] max-h-[400px] overflow-y-auto px-4 py-3 border border-gray-200 rounded-b-xl text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm leading-relaxed [&:empty]:before:content-['Tell_potential_attendees_what_makes_this_event_special...'] [&:empty]:before:text-gray-400 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-gray-800 [&_h3]:mt-3 [&_h3]:mb-1 [&_a]:text-indigo-600 [&_a]:underline [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5"
                      suppressContentEditableWarning
                    />
                    <p className="mt-2 text-xs text-gray-400">
                      Select text and click a formatting button to apply styles. What you see is what attendees will see.
                    </p>
                  </div>
                </div>
              )}

              {/* Link Modal */}
              {showLinkModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Insert Link</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Link Text</label>
                        <input
                          type="text"
                          value={linkText}
                          onChange={(e) => setLinkText(e.target.value)}
                          placeholder="Display text (optional)"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                        <input
                          type="url"
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                          placeholder="https://example.com"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
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
                          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleInsertLink}
                          disabled={!linkUrl}
                          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
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
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Pre-Launch Settings</h2>
                    <p className="text-gray-500">Configure attendance approval and RSVP questions.</p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-900">Require approval to join</p>
                      <p className="text-sm text-gray-500">Review attendees before they can access the event</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, requireApproval: !prev.requireApproval }))}
                      className={`relative w-12 h-7 rounded-full transition-colors ${
                        formData.requireApproval ? 'bg-indigo-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                          formData.requireApproval ? 'translate-x-5' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {formData.requireApproval && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          RSVP Questions <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <p className="text-xs text-gray-500 mb-3">
                          Ask questions to help you decide who to approve.
                        </p>

                        {formData.rsvpQuestions.length > 0 && (
                          <div className="space-y-2 mb-4">
                            {formData.rsvpQuestions.map((q) => (
                              <div key={q.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                                <span className="flex-1 text-sm text-gray-900">{q.question}</span>
                                <button
                                  type="button"
                                  onClick={() => toggleQuestionRequired(q.id)}
                                  className={`text-xs px-2 py-1 rounded ${
                                    q.required
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  {q.required ? 'Required' : 'Optional'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeRSVPQuestion(q.id)}
                                  className="text-gray-400 hover:text-red-500 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newQuestion}
                            onChange={(e) => setNewQuestion(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addRSVPQuestion();
                              }
                            }}
                            placeholder="e.g., What do you hope to learn from this event?"
                            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                          />
                          <button
                            type="button"
                            onClick={addRSVPQuestion}
                            disabled={!newQuestion.trim()}
                            className="px-4 py-2.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {!formData.requireApproval && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <div>
                          <p className="font-medium text-green-800">Open registration</p>
                          <p className="text-sm text-green-700">Anyone with the event link can join instantly.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mt-4 bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-gray-100 px-8 py-5">
            <div className="max-w-lg mx-auto flex items-center justify-between">
              {currentStepIndex > 0 ? (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors font-medium"
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
                  className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
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
                  className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2"
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
      </main>
    </div>
  );
}
