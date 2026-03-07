'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';

interface FileUploadQuestionProps {
  onFileSelect: (file: File) => void;
  onSkip: () => void;
  onContinue?: () => void;
  uploadStatus: 'idle' | 'uploading' | 'parsing' | 'done' | 'error';
  error?: string | null;
  attempts?: number;
  maxAttempts?: number;
  exhaustedPaths?: string[];
  onFallback?: (toPath: 'linkedin' | 'manual') => void;
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
];
const ACCEPTED_EXTENSIONS = '.pdf,.png,.jpg,.jpeg';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function FileUploadQuestion({
  onFileSelect,
  onSkip,
  onContinue,
  uploadStatus,
  error,
  attempts = 0,
  maxAttempts = 3,
  exhaustedPaths = [],
  onFallback,
}: FileUploadQuestionProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const exhausted = attempts >= maxAttempts && uploadStatus === 'error';
  const linkedinExhausted = exhaustedPaths.includes('linkedin');

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Please upload a PDF, PNG, or JPG file.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File is too large. Maximum size is 10MB.';
    }
    return null;
  };

  const handleFile = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setFileError(validationError);
      return;
    }
    setFileError(null);
    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isProcessing = uploadStatus === 'uploading' || uploadStatus === 'parsing';

  const getDropZoneStyle = () => {
    if (isDragOver) return { borderColor: 'var(--accent)', background: 'var(--accent-light)' };
    if (isProcessing) return { borderColor: 'var(--border-light)', background: 'var(--bg)', cursor: 'default' };
    if (selectedFile && uploadStatus === 'done') return { borderColor: '#4ade80', background: '#f0fdf4' };
    if (fileError || error) return { borderColor: '#f87171', background: '#fef2f2' };
    return { borderColor: 'var(--border-light)', background: 'var(--surface)' };
  };

  // Show fallback options when retries are exhausted
  if (exhausted && onFallback) {
    return (
      <div className="text-center space-y-10">
        <div className="space-y-3">
          <h2 className="text-3xl md:text-4xl font-black" style={{ color: 'var(--text)' }}>
            Upload your resume
          </h2>
        </div>

        <div className="space-y-6 max-w-md mx-auto">
          <div className="p-6 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border-light)' }}>
            <p className="text-base mb-1" style={{ color: 'var(--text)' }}>
              We weren&apos;t able to parse your resume.
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No worries — you can try another way to get started.
            </p>
          </div>

          <div className="space-y-3">
            {!linkedinExhausted && (
              <button
                onClick={() => onFallback('linkedin')}
                className="btn w-full"
                style={{
                  padding: '14px 24px',
                  fontSize: '1rem',
                  background: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                }}
              >
                Import from LinkedIn instead
              </button>
            )}
            <button
              onClick={() => onFallback('manual')}
              className="btn w-full"
              style={{
                padding: '14px 24px',
                fontSize: '1rem',
                background: 'var(--surface)',
                color: 'var(--text)',
                border: '1px solid var(--border-light)',
              }}
            >
              Fill in manually
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center space-y-10">
      {/* Question */}
      <div className="space-y-3">
        <h2 className="text-3xl md:text-4xl font-black" style={{ color: 'var(--text)' }}>
          Upload your resume
        </h2>
        <p className="text-lg" style={{ color: 'var(--text-muted)' }}>
          We&apos;ll extract your details to auto-fill your profile
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isProcessing && inputRef.current?.click()}
        className="relative w-full py-16 border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer"
        style={getDropZoneStyle()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleInputChange}
          className="hidden"
          disabled={isProcessing}
        />

        {/* Idle state */}
        {!selectedFile && uploadStatus === 'idle' && (
          <div className="space-y-3">
            <div className="flex justify-center">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--border-light)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-base" style={{ color: 'var(--text-muted)' }}>
              Drag & drop your file here, or{' '}
              <span className="font-bold" style={{ color: 'var(--accent)' }}>browse</span>
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              PDF, PNG, or JPG up to 10MB
            </p>
          </div>
        )}

        {/* Uploading state */}
        {uploadStatus === 'uploading' && (
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border-light)', borderTopColor: 'var(--accent)' }} />
            </div>
            <p className="text-base" style={{ color: 'var(--text-muted)' }}>Uploading...</p>
          </div>
        )}

        {/* Parsing state */}
        {uploadStatus === 'parsing' && (
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border-light)', borderTopColor: 'var(--accent)' }} />
            </div>
            <p className="text-base" style={{ color: 'var(--text-muted)' }}>Parsing your profile...</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>This usually takes a few seconds</p>
          </div>
        )}

        {/* Done state */}
        {uploadStatus === 'done' && selectedFile && (
          <div className="space-y-3">
            <div className="flex justify-center">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#16a34a' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-base font-semibold" style={{ color: 'var(--text)' }}>{selectedFile.name}</p>
            <p className="text-sm" style={{ color: '#16a34a' }}>Parsed successfully!</p>
          </div>
        )}

        {/* Error state */}
        {uploadStatus === 'error' && (
          <div className="space-y-3">
            <div className="flex justify-center">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#ef4444' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-base" style={{ color: '#ef4444' }}>{error || 'Something went wrong'}</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Click to try again
              {maxAttempts - attempts > 0 && ` (${maxAttempts - attempts} ${maxAttempts - attempts === 1 ? 'attempt' : 'attempts'} remaining)`}
            </p>
          </div>
        )}

        {/* File selected but idle (fallback) */}
        {selectedFile && uploadStatus === 'idle' && (
          <div className="space-y-2">
            <p className="text-base font-semibold" style={{ color: 'var(--text)' }}>{selectedFile.name}</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{formatFileSize(selectedFile.size)}</p>
          </div>
        )}
      </div>

      {/* Validation error */}
      {fileError && (
        <p className="text-sm" style={{ color: '#ef4444' }}>{fileError}</p>
      )}

      {/* Continue button (shown when done) */}
      {uploadStatus === 'done' && onContinue && (
        <div className="flex justify-center">
          <button
            onClick={onContinue}
            className="btn btn-primary"
            style={{ padding: '16px 32px', fontSize: '1.125rem' }}
          >
            Continue &rarr;
          </button>
        </div>
      )}

      {/* Skip link */}
      <div>
        <button
          onClick={onSkip}
          disabled={isProcessing}
          className="text-base transition-colors disabled:opacity-50"
          style={{ color: 'var(--text-muted)' }}
        >
          Skip &mdash; I&apos;ll fill it in manually
        </button>
      </div>
    </div>
  );
}
