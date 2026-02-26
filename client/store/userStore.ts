import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authenticatedFetch, signOut } from '@/utils/auth';

export interface UserProfile {
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
  bio?: string;
  publications?: string[];
  github?: string;
  linkedin?: string;
  expected_grad_date?: string;
  created_at?: string;
}

interface UserState {
  // State
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  hiddenConversationIds: number[];

  // Actions
  setUser: (user: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  hideConversation: (id: number) => void;
  unhideConversation: (id: number) => void;

  // Async actions
  fetchUser: (userId: string) => Promise<UserProfile | null>;
  saveProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  logout: () => Promise<void>;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      hiddenConversationIds: [],

      setUser: (user) => set({ user, isAuthenticated: true, error: null }),

      hideConversation: (id) => set(state => ({
        hiddenConversationIds: [...new Set([...state.hiddenConversationIds, id])],
      })),

      unhideConversation: (id) => set(state => ({
        hiddenConversationIds: state.hiddenConversationIds.filter(x => x !== id),
      })),

      updateProfile: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      clearUser: () => set({ user: null, isAuthenticated: false }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      fetchUser: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authenticatedFetch(`/api/researchers/${userId}`);
          if (!response.ok) {
            throw new Error('Failed to fetch user');
          }
          const data = await response.json();
          set({ user: data, isAuthenticated: true, isLoading: false });
          return data;
        } catch (err) {
          set({ error: 'Failed to fetch user', isLoading: false });
          return null;
        }
      },

      saveProfile: async (updates: Partial<UserProfile>) => {
        const { user } = get();
        if (!user) return false;

        set({ isLoading: true, error: null });

        // Optimistic update
        const previousUser = user;
        set({ user: { ...user, ...updates } });

        try {
          const response = await authenticatedFetch(`/api/researchers/${user.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates),
          });

          if (!response.ok) {
            throw new Error('Failed to save profile');
          }

          const updatedUser = await response.json();
          set({ user: updatedUser, isLoading: false });
          return true;
        } catch (err) {
          // Rollback on error
          set({ user: previousUser, error: 'Failed to save profile', isLoading: false });
          return false;
        }
      },

      logout: async () => {
        try {
          await signOut(); // Sign out from Supabase
        } catch (err) {
          console.error('Error signing out:', err);
        }
        set({ user: null, isAuthenticated: false, error: null });
      },
    }),
    {
      name: 'assemble-user-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        hiddenConversationIds: state.hiddenConversationIds,
      }),
    }
  )
);
