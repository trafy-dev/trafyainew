-- Trafy LMS schema. Run once in the Supabase SQL editor (safe to re-run).
-- Hierarchy: admin > teacher > student. All access rules live in RLS below,
-- so the browser can talk to Supabase directly and still cannot exceed its role.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- profiles
-- Trafy's existing public.profiles table (created by the assessment schema) is
-- reused: same accounts, same login. The LMS only adds a role column.
alter table public.profiles add column if not exists role text not null default 'student';
do $$ begin
  alter table public.profiles add constraint profiles_role_check check (role in ('admin','teacher','student'));
exception when duplicate_object then null; end $$;

-- Same allowlist the assessment backend uses (ADMIN_EMAILS). Add more addresses here.
create or replace function public.lms_admin_emails() returns text[]
language sql immutable as $$ select array['build.trafy@gmail.com'] $$;

-- New profiles start as student (or admin if allowlisted); a client can never
-- choose its own role at insert time.
create or replace function public.profile_role_init() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.role := case when lower(new.email) = any (public.lms_admin_emails()) then 'admin' else 'student' end;
  return new;
end $$;
drop trigger if exists profile_role_init_trg on public.profiles;
create trigger profile_role_init_trg before insert on public.profiles
  for each row execute function public.profile_role_init();

update public.profiles set role = 'admin'
  where lower(email) = any (public.lms_admin_emails()) and role <> 'admin';

-- ---------------------------------------------------------- role helpers
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() = 'admin', false)
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() in ('admin','teacher'), false)
$$;

-- ---------------------------------------------------------------- courses
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  teacher_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (course_id, student_id)
);

create or replace function public.teaches(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.courses where id = cid and teacher_id = auth.uid())
$$;

create or replace function public.enrolled_in(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.enrollments where course_id = cid and student_id = auth.uid())
$$;

-- Can manage a course = admin, or the teacher who owns it.
create or replace function public.manages(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or public.teaches(cid)
$$;

-- Can see a course = manages it, or is enrolled in it.
create or replace function public.in_course(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.manages(cid) or public.enrolled_in(cid)
$$;

-- --------------------------------------------------------- chat channels
-- kind: 'general' (everyone), 'course' (course members), 'staff' (admin + teachers)
create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('general','course','staff')),
  course_id uuid references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((kind = 'course') = (course_id is not null))
);
create unique index if not exists channels_one_course on public.channels(course_id) where course_id is not null;

create or replace function public.can_see_channel(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.channels c
    where c.id = cid and (
      c.kind = 'general'
      or (c.kind = 'staff' and public.is_staff())
      or (c.kind = 'course' and public.in_course(c.course_id))
    )
  )
$$;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists messages_channel_time on public.messages(channel_id, created_at);

-- Every course automatically gets a chat channel.
create or replace function public.course_channel() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.channels (name, kind, course_id) values (new.title, 'course', new.id);
  return new;
end $$;
drop trigger if exists on_course_created on public.courses;
create trigger on_course_created after insert on public.courses
  for each row execute function public.course_channel();

create or replace function public.course_channel_rename() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.channels set name = new.title where course_id = new.id;
  return new;
end $$;
drop trigger if exists on_course_renamed on public.courses;
create trigger on_course_renamed after update of title on public.courses
  for each row execute function public.course_channel_rename();

insert into public.channels (name, kind)
select 'General', 'general' where not exists (select 1 from public.channels where kind = 'general');
insert into public.channels (name, kind)
select 'Staff room', 'staff' where not exists (select 1 from public.channels where kind = 'staff');

-- ------------------------------------------------------------- resources
-- A chat-style feed that only admins/teachers can post to. Students get
-- read-only access to the resources of courses they are enrolled in.
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade, -- null = staff-only
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null default '',
  body text not null default '',
  url text,
  file_path text,
  created_at timestamptz not null default now()
);
create index if not exists resources_time on public.resources(created_at);

-- --------------------------------------------- calendar / class schedule
-- kind: 'class' (schedule), 'deadline', 'event'. course_id null = global (admin only).
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  title text not null,
  kind text not null default 'event' check (kind in ('class','deadline','event')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text not null default '',
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists events_start on public.events(starts_at);

-- ----------------------------------------------- assignments / grading
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text not null default '',
  due_at timestamptz not null,
  max_points numeric not null default 100 check (max_points > 0),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  content text not null default '',
  file_path text,
  submitted_at timestamptz not null default now(),
  grade numeric,
  feedback text not null default '',
  graded_by uuid references public.profiles(id) on delete set null,
  graded_at timestamptz,
  unique (assignment_id, student_id)
);

create or replace function public.assignment_course(aid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select course_id from public.assignments where id = aid
$$;

-- Students may resubmit (edit content) but can never touch grade fields, and
-- graders can never rewrite what a student submitted. Enforced here because
-- RLS cannot restrict individual columns.
create or replace function public.guard_submission() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  cid uuid := public.assignment_course(new.assignment_id);
  max_pts numeric;
begin
  if tg_op = 'INSERT' then
    if not public.enrolled_in(cid) then raise exception 'You are not enrolled in this course'; end if;
    new.student_id := auth.uid();
    new.grade := null; new.feedback := ''; new.graded_by := null; new.graded_at := null;
    new.submitted_at := now();
    return new;
  end if;

  if public.manages(cid) then
    -- grader: only grade/feedback may change
    select max_points into max_pts from public.assignments where id = new.assignment_id;
    if new.grade is not null and (new.grade < 0 or new.grade > max_pts) then
      raise exception 'Grade must be between 0 and %', max_pts;
    end if;
    new.content := old.content; new.file_path := old.file_path;
    new.student_id := old.student_id; new.assignment_id := old.assignment_id;
    new.submitted_at := old.submitted_at;
    new.graded_by := auth.uid(); new.graded_at := now();
  else
    -- student: content only, and only until it has been graded
    if old.grade is not null then raise exception 'This submission has already been graded'; end if;
    new.grade := old.grade; new.feedback := old.feedback;
    new.graded_by := old.graded_by; new.graded_at := old.graded_at;
    new.student_id := old.student_id; new.assignment_id := old.assignment_id;
    new.submitted_at := now();
  end if;
  return new;
end $$;
drop trigger if exists guard_submission_trg on public.submissions;
create trigger guard_submission_trg before insert or update on public.submissions
  for each row execute function public.guard_submission();

-- Keep profiles.role changes admin-only even if a policy is ever loosened.
create or replace function public.guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only an admin can change roles';
  end if;
  return new;
end $$;
drop trigger if exists guard_profile_trg on public.profiles;
create trigger guard_profile_trg before update on public.profiles
  for each row execute function public.guard_profile();

-- ================================================================== RLS
alter table public.courses     enable row level security;
alter table public.enrollments enable row level security;
alter table public.channels    enable row level security;
alter table public.messages    enable row level security;
alter table public.resources   enable row level security;
alter table public.events      enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;

-- profiles: Trafy's own policies stay. LMS adds one thing: admins can update any profile (to set roles).
-- Role changes by anyone else are blocked by guard_profile_trg.
drop policy if exists lms_profiles_admin_update on public.profiles;
create policy lms_profiles_admin_update on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Directory the LMS reads instead of profiles: names and roles for everyone
-- (chat needs them); emails only for admins/teachers. Runs with owner rights.
create or replace view public.lms_people as
  select id,
         coalesce(nullif(display_name, ''), split_part(email, '@', 1)) as full_name,
         role,
         case when public.is_staff() then email end as email,
         created_at
  from public.profiles;
grant select on public.lms_people to authenticated;

-- courses
drop policy if exists courses_read on public.courses;
create policy courses_read on public.courses for select to authenticated using (public.in_course(id));
drop policy if exists courses_insert on public.courses;
create policy courses_insert on public.courses for insert to authenticated with check (public.is_admin());
drop policy if exists courses_update on public.courses;
create policy courses_update on public.courses for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists courses_delete on public.courses;
create policy courses_delete on public.courses for delete to authenticated using (public.is_admin());

-- enrollments: admin or the course's teacher manage; students see their own
drop policy if exists enroll_read on public.enrollments;
create policy enroll_read on public.enrollments for select to authenticated
  using (student_id = auth.uid() or public.manages(course_id));
drop policy if exists enroll_write on public.enrollments;
create policy enroll_write on public.enrollments for insert to authenticated with check (public.manages(course_id));
drop policy if exists enroll_delete on public.enrollments;
create policy enroll_delete on public.enrollments for delete to authenticated using (public.manages(course_id));

-- channels: read only what you may see; nobody creates them by hand
drop policy if exists channels_read on public.channels;
create policy channels_read on public.channels for select to authenticated using (public.can_see_channel(id));

-- messages: read + post where you can see the channel; delete own (admin: any)
drop policy if exists messages_read on public.messages;
create policy messages_read on public.messages for select to authenticated using (public.can_see_channel(channel_id));
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (user_id = auth.uid() and public.can_see_channel(channel_id));
drop policy if exists messages_delete on public.messages;
create policy messages_delete on public.messages for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- resources: staff post; students read their courses' resources
drop policy if exists resources_read on public.resources;
create policy resources_read on public.resources for select to authenticated
  using ((course_id is null and public.is_staff()) or (course_id is not null and public.in_course(course_id)));
drop policy if exists resources_insert on public.resources;
create policy resources_insert on public.resources for insert to authenticated
  with check (author_id = auth.uid() and (
    (course_id is null and public.is_staff()) or (course_id is not null and public.manages(course_id))));
drop policy if exists resources_delete on public.resources;
create policy resources_delete on public.resources for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- events: course members read; managers write; global (course_id null) events are visible to all, admin-written
drop policy if exists events_read on public.events;
create policy events_read on public.events for select to authenticated
  using (course_id is null or public.in_course(course_id));
drop policy if exists events_insert on public.events;
create policy events_insert on public.events for insert to authenticated
  with check (created_by = auth.uid() and ((course_id is null and public.is_admin()) or (course_id is not null and public.manages(course_id))));
drop policy if exists events_update on public.events;
create policy events_update on public.events for update to authenticated
  using ((course_id is null and public.is_admin()) or (course_id is not null and public.manages(course_id)))
  with check ((course_id is null and public.is_admin()) or (course_id is not null and public.manages(course_id)));
drop policy if exists events_delete on public.events;
create policy events_delete on public.events for delete to authenticated
  using ((course_id is null and public.is_admin()) or (course_id is not null and public.manages(course_id)));

-- assignments
drop policy if exists assignments_read on public.assignments;
create policy assignments_read on public.assignments for select to authenticated using (public.in_course(course_id));
drop policy if exists assignments_insert on public.assignments;
create policy assignments_insert on public.assignments for insert to authenticated
  with check (created_by = auth.uid() and public.manages(course_id));
drop policy if exists assignments_update on public.assignments;
create policy assignments_update on public.assignments for update to authenticated
  using (public.manages(course_id)) with check (public.manages(course_id));
drop policy if exists assignments_delete on public.assignments;
create policy assignments_delete on public.assignments for delete to authenticated using (public.manages(course_id));

-- submissions: student sees/edits own; managers of the course see all + grade
drop policy if exists subs_read on public.submissions;
create policy subs_read on public.submissions for select to authenticated
  using (student_id = auth.uid() or public.manages(public.assignment_course(assignment_id)));
drop policy if exists subs_insert on public.submissions;
create policy subs_insert on public.submissions for insert to authenticated
  with check (student_id = auth.uid() and public.enrolled_in(public.assignment_course(assignment_id)));
drop policy if exists subs_update on public.submissions;
create policy subs_update on public.submissions for update to authenticated
  using (student_id = auth.uid() or public.manages(public.assignment_course(assignment_id)))
  with check (student_id = auth.uid() or public.manages(public.assignment_course(assignment_id)));

-- ------------------------------------------------------------- realtime
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------- file storage
insert into storage.buckets (id, name, public) values ('lms-files', 'lms-files', false)
on conflict (id) do nothing;

-- Path convention: <course_id>/<anything>. Course members can read; managers upload.
-- Student submission files live under <course_id>/submissions/<user_id>/...
drop policy if exists lms_files_read on storage.objects;
create policy lms_files_read on storage.objects for select to authenticated
  using (bucket_id = 'lms-files' and public.in_course(((storage.foldername(name))[1])::uuid) and (
    (storage.foldername(name))[2] is distinct from 'submissions'
    or (storage.foldername(name))[3] = auth.uid()::text
    or public.manages(((storage.foldername(name))[1])::uuid)
  ));
drop policy if exists lms_files_insert on storage.objects;
create policy lms_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'lms-files' and (
    public.manages(((storage.foldername(name))[1])::uuid)
    or ((storage.foldername(name))[2] = 'submissions'
        and (storage.foldername(name))[3] = auth.uid()::text
        and public.enrolled_in(((storage.foldername(name))[1])::uuid))
  ));
drop policy if exists lms_files_delete on storage.objects;
create policy lms_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'lms-files' and public.manages(((storage.foldername(name))[1])::uuid));
