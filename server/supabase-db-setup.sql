-- PROFILES TABLE
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamptz,

  -- required
  name text not null,
  email text not null,
  occupation text not null,

  -- optional basics
  github text,
  linkedin text,

  school text,
  major text,
  year text,
  expected_grad_date text,

  current_company text,
  current_title text,
  yoe text,

  area_of_research text,
  institution text,
  publications text,
  short_answer text

  -- -- optional fun
  -- mbti text,
  -- pick_a_character text
);

-- Set up Row Level Security (RLS)
-- See https://supabase.com/docs/guides/auth/row-level-security for more details.
alter table public.profiles enable row level security;

create policy "Profiles viewable by everyone" on public.profiles
  for select using (true);

--  If we ever want to change the policy above to only show profiles to users who are logged in, we can use the following:

-- drop policy if exists "Profiles viewable by everyone" on public.profiles;
-- create policy "Profiles viewable by authenticated users" on public.profiles
--   for select to authenticated using (true);

create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);


-- This trigger automatically creates a profile entry when a new user signs up via Supabase Auth.
-- See https://supabase.com/docs/guides/auth/managing-user-data#using-triggers for more details.
create or replace function public.handle_new_user()
returns trigger
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Unnamed'),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Set up Storage!
insert into storage.buckets (id, name)
  values ('avatars', 'avatars')
  on conflict (id) do nothing;

-- Set up access controls for storage.
-- See https://supabase.com/docs/guides/storage#policy-examples for more details.
create policy "Avatar images are publicly accessible." on storage.objects
  for select using (bucket_id = 'avatars');

create policy "Anyone can upload an avatar." on storage.objects
  for insert with check (bucket_id = 'avatars');


-- Update profiles table to match backend expectations:
-- Rename area_of_research to research_areas
ALTER TABLE public.profiles
RENAME COLUMN area_of_research TO research_areas;

-- Add missing columns
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS interests text,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();



-- Fix occupation and add missing tables:
-- 1. Fix occupation column to be optional
ALTER TABLE public.profiles ALTER COLUMN occupation DROP NOT NULL;

-- 2. Add missing tables for conferences, conversations, and messages

-- CONFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.conferences (
  id text PRIMARY KEY,
  name text NOT NULL,
  location text NOT NULL,
  start_date text NOT NULL,
  end_date text NOT NULL,
  host_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- CONFERENCE_PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS public.conference_participants (
  conference_id text NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  researcher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (conference_id, researcher_id)
);

-- CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS public.conversations (
  id bigserial PRIMARY KEY,
  participant1_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant2_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  last_message_at timestamptz DEFAULT now(),
  UNIQUE(participant1_id, participant2_id)
);

-- MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
  id bigserial PRIMARY KEY,
  conversation_id bigint NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_system_message boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 3. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_conference_participants_conference ON public.conference_participants(conference_id);
CREATE INDEX IF NOT EXISTS idx_conference_participants_researcher ON public.conference_participants(researcher_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON public.conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON public.conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);

-- 4. Enable RLS on new tables
ALTER TABLE public.conferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conference_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 5. Add RLS policies for new tables
-- Note: Using "IF NOT EXISTS" equivalent by dropping first to avoid conflicts

-- Conferences policies
DROP POLICY IF EXISTS "Service role can manage conferences" ON public.conferences;
CREATE POLICY "Service role can manage conferences" ON public.conferences
  FOR ALL USING (true);

-- Conference participants policies
DROP POLICY IF EXISTS "Service role can manage conference_participants" ON public.conference_participants;
CREATE POLICY "Service role can manage conference_participants" ON public.conference_participants
  FOR ALL USING (true);

-- Conversations policies
DROP POLICY IF EXISTS "Service role can manage conversations" ON public.conversations;
CREATE POLICY "Service role can manage conversations" ON public.conversations
  FOR ALL USING (true);

-- Messages policies
DROP POLICY IF EXISTS "Service role can manage messages" ON public.messages;
CREATE POLICY "Service role can manage messages" ON public.messages
  FOR ALL USING (true);

-- Rename columns to match DATABASE_SCHEMA.md
ALTER TABLE public.profiles RENAME COLUMN current_company TO company;
ALTER TABLE public.profiles RENAME COLUMN current_title TO title;
ALTER TABLE public.profiles RENAME COLUMN yoe TO work_experience_years;

-- Add missing columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS degree text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS other_description text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS research_area text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interest_areas text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_skills text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hobbies text[];

-- PARSING_JOBS TABLE
CREATE TABLE IF NOT EXISTS public.parsing_jobs (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  file_path text NOT NULL,
  status text NOT NULL,
  error text,
  parsed_data jsonb,
  parsed_raw jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parsing_jobs_user_id ON public.parsing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_parsing_jobs_status ON public.parsing_jobs(status);

ALTER TABLE public.parsing_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage parsing_jobs" ON public.parsing_jobs;
CREATE POLICY "Service role can manage parsing_jobs" ON public.parsing_jobs
  FOR ALL USING (true);

-- Add extra conference fields
ALTER TABLE public.conferences ADD COLUMN IF NOT EXISTS location_type text DEFAULT 'in-person';
ALTER TABLE public.conferences ADD COLUMN IF NOT EXISTS virtual_link text;
ALTER TABLE public.conferences ADD COLUMN IF NOT EXISTS start_time text;
ALTER TABLE public.conferences ADD COLUMN IF NOT EXISTS end_time text;
ALTER TABLE public.conferences ADD COLUMN IF NOT EXISTS price_type text DEFAULT 'free';
ALTER TABLE public.conferences ADD COLUMN IF NOT EXISTS price_amount numeric;
ALTER TABLE public.conferences ADD COLUMN IF NOT EXISTS capacity integer;
ALTER TABLE public.conferences ADD COLUMN IF NOT EXISTS require_approval boolean DEFAULT false;
ALTER TABLE public.conferences ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.conferences ADD COLUMN IF NOT EXISTS rsvp_questions text;

-- Remove legacy columns from profiles
ALTER TABLE public.profiles 
  DROP COLUMN IF EXISTS interests,
  DROP COLUMN IF EXISTS research_areas,
  DROP COLUMN IF EXISTS institution,
  DROP COLUMN IF EXISTS short_answer;

-- Move rsvp response to conference_participants table
ALTER TABLE public.conference_participants 
  ADD COLUMN IF NOT EXISTS rsvp_responses text[],
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'registered';

ALTER TABLE public.conferences 
  ALTER COLUMN rsvp_questions TYPE text[] 
  USING CASE 
    WHEN rsvp_questions IS NULL THEN NULL 
    ELSE ARRAY[rsvp_questions] 
  END;

-- Convert publications from text to text[]
ALTER TABLE public.profiles ALTER COLUMN publications TYPE text[] USING
  CASE
    WHEN publications IS NULL THEN NULL
    ELSE ARRAY[publications]
  END;

-- Enable pgvector extension for storing embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Add user embedding column (1024 dimensions)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_embedding vector(1024);