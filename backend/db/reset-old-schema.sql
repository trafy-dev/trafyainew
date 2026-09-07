-- =====================================================================
-- ONE-TIME RESET — run this BEFORE schema.sql, only once.
--
-- Drops the old pre-existing tables/view (questions, submissions,
-- assessments, leaderboard, profiles) so schema.sql can create the new
-- versions cleanly. Confirmed empty of real data before running this.
--
-- Safe to skip entirely on a brand-new project that has none of these
-- objects yet — the DROPs below are all "if exists".
-- =====================================================================

drop view  if exists public.leaderboard          cascade;
drop table if exists public.submissions          cascade;
drop table if exists public.assessment_attempts  cascade;
drop table if exists public.questions            cascade;
drop table if exists public.assessments          cascade;
drop table if exists public.profiles             cascade;

-- The old handle_new_user trigger/function (if the old schema had one)
-- so schema.sql's version replaces it cleanly rather than conflicting.
drop trigger  if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
