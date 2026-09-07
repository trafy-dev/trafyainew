-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Users are managed by Supabase Auth (auth.users), but we can create a profile table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Assessments (Master Assessment)
CREATE TABLE public.assessments (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 120
);

-- Questions (MCQ and DSA)
CREATE TABLE public.questions (
  id SERIAL PRIMARY KEY,
  assessment_id INTEGER REFERENCES public.assessments(id),
  type TEXT NOT NULL, -- 'mcq' or 'dsa'
  title TEXT NOT NULL,
  description TEXT, -- Problem statement or Question text
  options JSONB, -- For MCQ: ["option A", "option B"]
  correct_answer TEXT, -- For MCQ
  test_cases JSONB, -- For DSA: [{"input": "...", "expected": "..."}]
  points INTEGER DEFAULT 1
);

-- Submissions
CREATE TABLE public.submissions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id),
  assessment_id INTEGER REFERENCES public.assessments(id),
  total_score INTEGER DEFAULT 0,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Leaderboard
CREATE VIEW public.leaderboard AS
SELECT 
  p.id as user_id, 
  p.display_name, 
  s.total_score,
  s.submitted_at
FROM 
  public.submissions s
JOIN 
  public.profiles p ON s.user_id = p.id
ORDER BY 
  s.total_score DESC, 
  s.submitted_at ASC;
