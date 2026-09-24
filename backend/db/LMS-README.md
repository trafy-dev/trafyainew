# Classroom (LMS) schema

The Classroom lives inside the assessment app (sidebar > Classroom / Manage), on the same login and Supabase project.

1. Run `lms-schema.sql` in the Supabase SQL editor (idempotent). It adds a `role` column to `profiles` and creates the
   LMS tables, RLS policies, the `lms_people` view and the `lms-files` storage bucket.
2. Admin = `build.trafy@gmail.com` (edit `lms_admin_emails()` in the file to add more). Everyone else starts as a student;
   admins promote teachers under Users & roles.
3. Until the schema is applied the Classroom nav stays hidden.
