'use client';

import { useRef, useState } from 'react';
import AvatarCropModal from '@/components/AvatarCropModal';

interface AvatarUploadQuestionProps {
  question: string;
  subtitle?: string;
  currentUrl: string;
  onUpload: (blob: Blob) => Promise<void>;
  onSkip: () => void;
  onContinue: () => void;
  uploading: boolean;
  error?: string | null;
  name?: string;
}

export default function AvatarUploadQuestion({
  question,
  subtitle,
  currentUrl,
  onUpload,
  onSkip,
  onContinue,
  uploading,
  error,
  name,
}: AvatarUploadQuestionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>(currentUrl || '');
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setCropSrc(URL.createObjectURL(file));
  };

  const handleCropConfirm = async (blob: Blob) => {
    setCropSrc(null);
    setPreview(URL.createObjectURL(blob));
    await onUpload(blob);
  };

  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div>
        <h2 className="text-2xl font-black" style={{ color: 'var(--text)' }}>{question}</h2>
        {subtitle && <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>

      {/* Avatar circle */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative w-28 h-28 rounded-full flex items-center justify-center overflow-hidden transition-opacity"
        style={{
          background: preview ? 'transparent' : 'var(--accent-light)',
          border: '3px solid var(--accent)',
          cursor: uploading ? 'not-allowed' : 'pointer',
          opacity: uploading ? 0.7 : 1,
        }}
      >
        {preview ? (
          <img src={preview} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl font-black" style={{ color: 'var(--accent)' }}>{initials}</span>
        )}

        {!uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full opacity-0 hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(0,0,0,0.4)' }}>
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full"
            style={{ background: 'rgba(0,0,0,0.4)' }}>
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: '#fff', borderTopColor: 'transparent' }} />
          </div>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>}

      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {preview ? 'Click the photo to change it' : 'Click to upload a photo'}
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onContinue}
          disabled={uploading}
          className="btn btn-primary w-full justify-center"
          style={{ opacity: uploading ? 0.6 : 1 }}
        >
          {currentUrl ? 'Continue' : 'Continue without photo'}
        </button>
        {!currentUrl && (
          <button onClick={onSkip} className="btn btn-ghost w-full justify-center text-sm"
            style={{ color: 'var(--text-muted)' }}>
            Skip for now
          </button>
        )}
      </div>

      {cropSrc && (
        <AvatarCropModal
          imageSrc={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </div>
  );
}
