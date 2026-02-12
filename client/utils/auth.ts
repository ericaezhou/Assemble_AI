/**
 * Authentication utility using Supabase Auth
 * Auth happens directly in the browser - no Express proxy needed
 */

import { supabase } from './supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

/**
 * Sign up a new user with Supabase Auth
 * The backend will automatically create a profile via database trigger
 */
export async function signUp(
  email: string,
  password: string,
  profileData: {
    name: string;
    occupation?: string;
    school?: string;
    major?: string;
    year?: string;
    company?: string;
    title?: string;
    work_experience_years?: string;
    degree?: string;
    research_area?: string;
    other_description?: string;
    interest_areas?: string[];
    current_skills?: string[];
    hobbies?: string[];
    bio?: string;
    publications?: string[];
    github?: string;
    linkedin?: string;
    expected_grad_date?: string;
  }
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: profileData.name
      }
    }
  });

  if (error) throw error;
  if (!data.user) throw new Error('Failed to create user');

  // If there's no session, email confirmation is required
  if (!data.session) {
    return {
      user: data.user,
      session: null,
      needsEmailConfirmation: true
    };
  }

  // Session exists, user can access immediately - update profile with additional fields
  // Small delay to ensure the trigger has created the profile row
  await new Promise(resolve => setTimeout(resolve, 500));

  // Check if profile exists (created by database trigger)
  const { data: existingProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', data.user.id)
    .single();

  if (fetchError || !existingProfile) {
    throw new Error('Profile creation failed. Please try again.');
  }

  // Update profile with additional fields from onboarding
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      occupation: profileData.occupation,
      school: profileData.school,
      major: profileData.major,
      year: profileData.year,
      company: profileData.company,
      title: profileData.title,
      work_experience_years: profileData.work_experience_years,
      degree: profileData.degree,
      research_area: profileData.research_area,
      other_description: profileData.other_description,
      interest_areas: profileData.interest_areas,
      current_skills: profileData.current_skills,
      hobbies: profileData.hobbies,
      bio: profileData.bio,
      publications: profileData.publications,
      github: profileData.github,
      linkedin: profileData.linkedin,
      expected_grad_date: profileData.expected_grad_date,
    })
    .eq('id', data.user.id);

  if (profileError) throw profileError;

  return {
    user: data.user,
    session: data.session,
    needsEmailConfirmation: false
  };
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  if (!data.user) throw new Error('Failed to sign in');

  return { user: data.user, session: data.session };
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Get the current session
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

/**
 * Get JWT token for backend API calls
 */
export async function getToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token || null;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}

/**
 * Get current user
 * Returns null if no session exists (not an error)
 */
export async function getCurrentUser() {
  // First check if there's a session to avoid AuthSessionMissingError
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return null; // No session, user not logged in
  }

  // Session exists, get the user
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

/**
 * Make an authenticated API request to your Express backend
 *
 * Flow: Gets JWT token from Supabase → Sends to Express with Authorization header
 * Your Express middleware verifies the token and grants access to protected routes
 *
 * Use this for: /api/researchers, /api/conferences, /api/messages, etc.
 */
export async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getToken();

  if (!token) {
    throw new Error('No authentication token found. Please sign in.');
  }

  // Add Authorization header with Supabase JWT
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

      // Sign out to clear the session
      await signOut();

      const error = new Error(data.error || 'Session expired. Please sign in again.');
      (error as any).isAuthError = true;
      (error as any).status = response.status;
      throw error;
    }

    if (response.status === 403) {
      // 403 = Token is valid but user doesn't have permission
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
 * Make an unauthenticated API request to your Express backend
 * Use this for public endpoints that don't require authentication
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
 * Legacy function for backwards compatibility
 * Just calls signOut() - use signOut() directly in new code
 */
export async function logout(): Promise<void> {
  await signOut();
}
