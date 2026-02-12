const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export interface ParsedData {
  name?: string;
  email?: string;
  occupation?: string;
  bio?: string;
  school?: string;
  major?: string;
  degree?: string;
  year?: string;
  expected_grad_date?: string;
  company?: string;
  title?: string;
  work_experience_years?: string;
  research_area?: string;
  interest_areas?: string[];
  publications?: string[];
  current_skills?: string[];
  hobbies?: string[];
  github?: string;
  linkedin?: string;
  other_description?: string;
}

interface UploadResponse {
  job_id: string;
  status: string;
}

interface ResultResponse {
  job_id: string;
  parsed_data: ParsedData;
}

export async function uploadForParsing(
  file: File,
  userId?: string
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  if (userId) {
    formData.append('user_id', userId);
  }

  const res = await fetch(`${API_URL}/api/parsing/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Upload failed');
  }
  return res.json();
}

export async function getParsingResult(
  jobId: string
): Promise<ResultResponse> {
  const res = await fetch(
    `${API_URL}/api/parsing/result?job_id=${encodeURIComponent(jobId)}`
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to get result');
  }
  return res.json();
}

export async function confirmParsing(
  jobId: string,
  overrides?: Record<string, unknown>
): Promise<unknown> {
  const res = await fetch(`${API_URL}/api/parsing/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: jobId, overrides }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to confirm');
  }
  return res.json();
}

export async function claimParsingJob(
  jobId: string,
  userId: string
): Promise<void> {
  const res = await fetch(`${API_URL}/api/parsing/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: jobId, user_id: userId }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to claim job');
  }
}

export function pollForResult(
  jobId: string,
  onResult: (data: ParsedData) => void,
  onError: (error: string) => void,
  options: { interval?: number; maxAttempts?: number } = {}
): { cancel: () => void } {
  const { interval = 2000, maxAttempts = 30 } = options;
  let attempts = 0;
  let cancelled = false;
  let timeoutId: ReturnType<typeof setTimeout>;

  const poll = async () => {
    if (cancelled) return;
    attempts++;

    try {
      const result = await getParsingResult(jobId);
      if (!cancelled) {
        onResult(result.parsed_data);
      }
    } catch {
      // Result not ready yet (409) or other error
      if (cancelled) return;

      if (attempts >= maxAttempts) {
        onError('Parsing timed out. You can continue filling in manually.');
        return;
      }

      timeoutId = setTimeout(poll, interval);
    }
  };

  timeoutId = setTimeout(poll, interval);

  return {
    cancel: () => {
      cancelled = true;
      clearTimeout(timeoutId);
    },
  };
}
