'use client';

import useSWR, { SWRConfiguration } from 'swr';
import { authenticatedFetch } from '@/utils/auth';
import { API_BASE_URL } from '@/utils/api';

/**
 * SWR fetcher using authenticatedFetch (for protected endpoints).
 */
async function authFetcher<T = any>(endpoint: string): Promise<T> {
  const response = await authenticatedFetch(endpoint);
  if (!response.ok) {
    const error = new Error('API request failed');
    (error as any).status = response.status;
    throw error;
  }
  return response.json();
}

/**
 * SWR fetcher for unauthenticated endpoints (conversations/messages).
 */
async function publicFetcher<T = any>(endpoint: string): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url);
  if (!response.ok) {
    const error = new Error('API request failed');
    (error as any).status = response.status;
    throw error;
  }
  return response.json();
}

/**
 * Hook for authenticated API calls with SWR caching.
 * Pass null/undefined/false to skip fetching.
 */
export function useAuthSWR<T = any>(
  key: string | null | undefined | false,
  config?: SWRConfiguration
) {
  return useSWR<T>(key, authFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 2000,
    ...config,
  });
}

/**
 * Hook for unauthenticated API calls with SWR caching.
 * Used for conversation/message endpoints.
 */
export function usePublicSWR<T = any>(
  key: string | null | undefined | false,
  config?: SWRConfiguration
) {
  return useSWR<T>(key, publicFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 2000,
    ...config,
  });
}
