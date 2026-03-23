-- ============================================================
-- SUPABASE SETUP SCRIPT FOR EVENT MANAGEMENT SYSTEM
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. ADD MISSING COLUMNS (if they don't exist)
-- ============================================================

-- Add user_id column to students table if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'user_id') THEN
    ALTER TABLE students ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Add user_id column to staff table if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff' AND column_name = 'user_id') THEN
    ALTER TABLE staff ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Add user_id column to profiles table if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'user_id') THEN
    ALTER TABLE profiles ADD COLUMN user_id UUID REFERENCES auth.users(id) UNIQUE;
  END IF;
END $$;

-- Add user_id and certificate columns to applications table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'applications' AND column_name = 'user_id') THEN
    ALTER TABLE applications ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'applications' AND column_name = 'certificate_uploaded') THEN
    ALTER TABLE applications ADD COLUMN certificate_uploaded BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'applications' AND column_name = 'certificate_url') THEN
    ALTER TABLE applications ADD COLUMN certificate_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'applications' AND column_name = 'certificate_uploaded_at') THEN
    ALTER TABLE applications ADD COLUMN certificate_uploaded_at TIMESTAMP;
  END IF;
  
  -- Add index for faster queries
  CREATE INDEX IF NOT EXISTS idx_applications_user_id_status ON applications(user_id, status);
END $$;

-- 2. INSERT STAFF DATA
-- ============================================================

INSERT INTO staff (id, name, username, password, role, department, is_active)
VALUES
  ('42a30a10-627b-48e4-b254-ecd8a254951c', 'Dr Afeefa Nazneen', 'afeefa', 'staff123', 'professor', 'CSE-ICSB', true),
  ('812efc60-deaf-4920-902a-bb3634deef9b', 'Dr Shamna N V', 'shamna', 'admin123', 'hod', 'CSE-ICSB', true),
  ('b7b3b93a-48a0-4df3-9314-0f13be6a52e4', 'Dr Thofa Aysha', 'thofa', 'staff123', 'professor', 'CSE-ICSB', true),
  ('e4ac98a1-e873-448a-9230-03caef52355d', 'Dr Mohammed Arshad', 'arshad', 'staff123', 'professor', 'CSE-ICSB', true)
ON CONFLICT (id) DO NOTHING;

-- 3. UPDATE FEATURE FLAGS
-- ============================================================

INSERT INTO feature_flags (feature_name, enabled)
VALUES
  ('certificate_module', true),
  ('event_module', true),
  ('leave_module', true)
ON CONFLICT (feature_name) DO UPDATE SET enabled = EXCLUDED.enabled;

-- 4. CREATE AUTH USERS (requires service_role, may need to be done via API)
-- ============================================================

-- Note: auth.create_user() function may not be available in SQL Editor
-- Alternative: Use Supabase Dashboard > Authentication > Users to create users manually

-- For students (sample - run for each student):
-- auth.create_user('4PA24IC001@student.unievent.com', 'student123', '{"email_confirm": true}'::jsonb);

-- For staff:
-- auth.create_user('afeefa@staff.unievent.com', 'staff123', '{"email_confirm": true}'::jsonb);
-- auth.create_user('shamna@staff.unievent.com', 'admin123', '{"email_confirm": true}'::jsonb);
-- auth.create_user('thofa@staff.unievent.com', 'staff123', '{"email_confirm": true}'::jsonb);
-- auth.create_user('arshad@staff.unievent.com', 'staff123', '{"email_confirm": true}'::jsonb);

-- 5. RLS POLICIES
-- ============================================================

-- Disable RLS temporarily for setup (enable after testing)
-- ALTER TABLE students DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE staff DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE applications DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE certificates DISABLE ROW LEVEL SECURITY;

-- Or create proper RLS policies:

-- Drop existing policies if any
DROP POLICY IF EXISTS "Students can view own data" ON students;
DROP POLICY IF EXISTS "Students can update own data" ON students;
DROP POLICY IF EXISTS "Staff can view own data" ON staff;
DROP POLICY IF EXISTS "Staff can update own data" ON staff;
DROP POLICY IF EXISTS "Students can view own applications" ON applications;
DROP POLICY IF EXISTS "Students can insert own applications" ON applications;
DROP POLICY IF EXISTS "Students can update own applications" ON applications;
DROP POLICY IF EXISTS "Staff can view all applications" ON applications;
DROP POLICY IF EXISTS "Staff can update applications" ON applications;
DROP POLICY IF EXISTS "Students can view own certificates" ON certificates;
DROP POLICY IF EXISTS "Students can insert own certificates" ON certificates;
DROP POLICY IF EXISTS "Staff can view all certificates" ON certificates;
DROP POLICY IF EXISTS "Staff can update certificates" ON certificates;

-- Students table policies
CREATE POLICY "Students can view own data" ON students
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Students can update own data" ON students
  FOR UPDATE USING (auth.uid() = user_id);

-- Staff table policies
CREATE POLICY "Staff can view own data" ON staff
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Staff can update own data" ON staff
  FOR UPDATE USING (auth.uid() = user_id);

-- Applications table policies
CREATE POLICY "Students can view own applications" ON applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Students can insert own applications" ON applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update own applications" ON applications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all applications" ON applications
  FOR SELECT USING (EXISTS (SELECT 1 FROM staff WHERE staff.user_id = auth.uid()));

CREATE POLICY "Staff can update applications" ON applications
  FOR UPDATE USING (EXISTS (SELECT 1 FROM staff WHERE staff.user_id = auth.uid()));

-- Certificates table policies
CREATE POLICY "Students can view own certificates" ON certificates
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM students WHERE students.id = certificates.uid AND students.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM staff WHERE staff.user_id = auth.uid())
    OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Students can insert own certificates" ON certificates
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM students WHERE students.id = certificates.uid AND students.user_id = auth.uid())
    OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Staff can view all certificates" ON certificates
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM staff WHERE staff.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM staff WHERE staff.role = 'hod')
    OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Staff can update certificates" ON certificates
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM staff WHERE staff.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM staff WHERE staff.role = 'hod')
    OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid())
  );

-- Leave applications table policies
CREATE POLICY "Students can view own leave applications" ON leave_applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM students WHERE students.id = leave_applications.uid AND students.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM staff WHERE staff.user_id = auth.uid())
    OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Students can insert own leave applications" ON leave_applications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM students WHERE students.id = leave_applications.uid AND students.user_id = auth.uid())
    OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Staff can view all leave applications" ON leave_applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM staff WHERE staff.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM staff WHERE staff.role = 'hod')
    OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Staff can update leave applications" ON leave_applications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM staff WHERE staff.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM staff WHERE staff.role = 'hod')
    OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid())
  );

-- 6. CREATE INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_applications_student_id ON applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_action_by ON applications(action_by);
CREATE INDEX IF NOT EXISTS idx_certificates_uid ON certificates(uid);
CREATE INDEX IF NOT EXISTS idx_certificates_application_id ON certificates(application_id);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_uid ON leave_applications(uid);
CREATE INDEX IF NOT EXISTS idx_event_registrations_student_id ON event_registrations(student_id);

-- 7. FIX EXISTING APPLICATIONS WITH NULL USER_ID
-- ============================================================

-- Assign default test user to existing applications
UPDATE applications
SET user_id = '42a30a10-627b-48e4-b254-ecd8a254951c'
WHERE user_id IS NULL;

-- ============================================================
-- SETUP COMPLETE
-- After running this script:
-- 1. Create auth users via Supabase Dashboard > Authentication > Users
-- 2. Test login with student USN and password "student123"
-- 3. Test login with staff username and password "staff123"
-- ============================================================
