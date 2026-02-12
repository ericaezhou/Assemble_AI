'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';

interface FileUploadQuestionProps {
  onFileSelect: (file: File) => void;
  onSkip: () => void;
  onContinue?: () => void;
  uploadStatus: 'idle' | 'uploading' | 'parsing' | 'done' | 'error';
  error?: string | null;
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
}: FileUploadQuestionProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="text-center space-y-10">
      {/* Question */}
      <div className="space-y-3">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
          Speed up your signup
        </h2>
        <p className="text-lg text-gray-500">
          Upload your resume or LinkedIn screenshot to auto-fill your profile
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isProcessing && inputRef.current?.click()}
        className={`relative w-full py-16 border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-50'
            : isProcessing
            ? 'border-gray-300 bg-gray-50 cursor-default'
            : selectedFile && uploadStatus === 'done'
            ? 'border-green-400 bg-green-50'
            : fileError || error
            ? 'border-red-300 bg-red-50'
            : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
        }`}
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
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <p className="text-base text-gray-600">
              Drag & drop your file here, or{' '}
              <span className="text-indigo-600 font-semibold">browse</span>
            </p>
            <p className="text-sm text-gray-400">
              PDF, PNG, or JPG up to 10MB
            </p>
          </div>
        )}

        {/* Uploading state */}
        {uploadStatus === 'uploading' && (
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
            <p className="text-base text-gray-600">Uploading...</p>
          </div>
        )}

        {/* Parsing state */}
        {uploadStatus === 'parsing' && (
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            </div>
            <p className="text-base text-gray-600">
              Parsing your profile...
            </p>
            <p className="text-sm text-gray-400">
              This usually takes a few seconds
            </p>
          </div>
        )}

        {/* Done state */}
        {uploadStatus === 'done' && selectedFile && (
          <div className="space-y-3">
            <div className="flex justify-center">
              <svg
                className="w-12 h-12 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-base text-gray-900 font-medium">
              {selectedFile.name}
            </p>
            <p className="text-sm text-green-600">
              Parsed successfully!
            </p>
          </div>
        )}

        {/* Error state */}
        {uploadStatus === 'error' && (
          <div className="space-y-3">
            <div className="flex justify-center">
              <svg
                className="w-12 h-12 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-base text-red-600">
              {error || 'Something went wrong'}
            </p>
            <p className="text-sm text-gray-500">
              Click to try again, or skip below
            </p>
          </div>
        )}

        {/* File selected but idle (shouldn't normally happen, fallback) */}
        {selectedFile && uploadStatus === 'idle' && (
          <div className="space-y-2">
            <p className="text-base text-gray-900 font-medium">
              {selectedFile.name}
            </p>
            <p className="text-sm text-gray-400">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
        )}
      </div>

      {/* Validation error */}
      {fileError && (
        <p className="text-sm text-red-500">{fileError}</p>
      )}

      {/* Continue button (shown when done) */}
      {uploadStatus === 'done' && onContinue && (
        <div className="flex justify-center">
          <button
            onClick={onContinue}
            className="px-8 py-4 text-lg font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:shadow-lg hover:scale-[1.02] transition-all duration-150 cursor-pointer"
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
          className="text-base text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
        >
          Skip &mdash; I&apos;ll fill it in manually
        </button>
      </div>
    </div>
  );
}
