/**
 * Authentication utility for managing JWT tokens and making authenticated API calls
 */

const TOKEN_KEY = 'research_connect_token';
const API_BASE_URL = 'http://localhost:5000';

/**
 * Store JWT token in localStorage
 */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Get JWT token from localStorage
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Remove JWT token from localStorage
 */
export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Check if user is authenticated (has a token)
 */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/**
 * Make an authenticated API request
 * Automatically includes Authorization header and handles authentication errors
 */
export async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();

  if (!token) {
    throw new Error('No authentication token found');
  }

  // Add Authorization header
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle authentication errors
    if (response.status === 401) {
      // 401 = Token is missing, expired, or invalid
      const data = await response.json().catch(() => ({ error: 'Authentication failed' }));

      // Clear the token and throw auth error
      removeToken();

      const error = new Error(data.error || 'Session expired. Please log in again.');
      (error as any).isAuthError = true;
      (error as any).status = response.status;
      throw error;
    }

    if (response.status === 403) {
      // 403 = Token is valid but user doesn't have permission
      // Don't clear token - just throw error
      const data = await response.json().catch(() => ({ error: 'Access denied' }));

      const error = new Error(data.error || 'Access denied.');
      (error as any).status = response.status;
      throw error;
    }

    return response;
  } catch (error) {
    // Re-throw auth errors (401) and permission errors (403) as-is
    if ((error as any).isAuthError || (error as any).status === 403) {
      throw error;
    }

    // Network errors or other issues
    throw new Error('Network error. Please check your connection.');
  }
}

/**
 * Make an unauthenticated API request (for login, signup, etc.)
 */
export async function unauthenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Logout user by removing token
 */
export function logout(): void {
  removeToken();
}
