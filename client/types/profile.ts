/**
 * Shared Profile/Researcher type that matches the Supabase profiles table
 * Import this wherever you need to type a user profile
 */
export interface Profile {
  id: string; // UUID from Supabase Auth
  name: string;
  email: string;
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
  github?: string;
  linkedin?: string;
  created_at?: string;
  updated_at?: string;
  // Computed field for recommendations
  similarity_score?: number;
}

// Alias for backwards compatibility - Researcher and Participant are the same as Profile
export type Researcher = Profile;
export type Participant = Profile;

/**
 * Helper function to get institution (school or company)
 */
export const getInstitution = (profile: Profile): string => {
  return profile.school || profile.company || '';
};

/**
 * Helper function to get interests as a comma-separated string
 */
export const getInterestsString = (profile: Profile): string => {
  return profile.interest_areas?.join(', ') || '';
};
