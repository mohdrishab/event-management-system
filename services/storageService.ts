
import { LeaveApplication, User } from '../types';
import { supabase } from './supabaseClient';
import { MOCK_STUDENTS, MOCK_TEACHER, MOCK_HOD, MOCK_JUNIOR_TEACHER } from '../constants';

export const storageService = {
  // SQL Schema for the user to copy-paste into Supabase SQL Editor
  REQUIRED_SQL: `
-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    usn text UNIQUE,
    role text NOT NULL CHECK (role IN ('STUDENT', 'TEACHER', 'HOD')),
    password text NOT NULL,
    "profilePic" text,
    "canApprove" boolean DEFAULT false
);

-- 2. Create Applications Table
CREATE TABLE IF NOT EXISTS public.applications (
    id text PRIMARY KEY,
    "studentId" text NOT NULL,
    "studentName" text NOT NULL,
    "studentUSN" text NOT NULL,
    "studentProfilePic" text,
    "eventName" text NOT NULL,
    "startDate" date NOT NULL,
    "endDate" date NOT NULL,
    reason text NOT NULL,
    status text NOT NULL DEFAULT 'PENDING',
    "timestamp" timestamptz DEFAULT now(),
    "reviewedAt" timestamptz,
    "imageUrl" text,
    "isPriority" boolean DEFAULT false,
    "assignedTeacherId" text
);

-- 3. Enable Public Access (Robust RLS Policies)
-- This allows the app to function for demo purposes without auth setup
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access users" ON public.users;
DROP POLICY IF EXISTS "Allow public access apps" ON public.applications;

CREATE POLICY "Allow public access users" ON public.users 
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access apps" ON public.applications 
FOR ALL USING (true) WITH CHECK (true);
  `,

  checkDatabaseConnection: async (): Promise<{ ok: boolean; error?: string; code?: string }> => {
    try {
      // Check for users table
      const { error: userError } = await supabase.from('users').select('id').limit(1);
      if (userError) {
        return { ok: false, error: userError.message, code: userError.code };
      }
      
      // Check for applications table
      const { error: appError } = await supabase.from('applications').select('id').limit(1);
      if (appError) {
        return { ok: false, error: appError.message, code: appError.code };
      }
      
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: 'Database connection failed', code: 'CONNECTION_ERROR' };
    }
  },

  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return (data as User[]) || [];
  },

  getFaculty: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .in('role', ['TEACHER', 'HOD']);
    if (error) throw error;
    return data as User[];
  },

  login: async (identifier: string, password: string, targetRole: 'STUDENT' | 'FACULTY'): Promise<User | null> => {
    const searchId = identifier.trim();
    if (!searchId) return null;

    try {
        const { data: anyUser } = await supabase.from('users')
          .select('role')
          .or(`name.ilike.%${searchId}%,usn.ilike.%${searchId}%`)
          .maybeSingle();

        if (anyUser) {
          const isActuallyFaculty = anyUser.role === 'TEACHER' || anyUser.role === 'HOD';
          const wantsStudent = targetRole === 'STUDENT';
          
          if (wantsStudent && isActuallyFaculty) {
            throw new Error("This is a Faculty account. Please use the Faculty tab.");
          }
          if (!wantsStudent && !isActuallyFaculty) {
            throw new Error("This is a Student account. Please use the Student tab.");
          }
        }

        let query = supabase.from('users').select('*');
        if (targetRole === 'STUDENT') {
            query = query.eq('role', 'STUDENT');
        } else {
            query = query.in('role', ['TEACHER', 'HOD']);
        }

        const { data, error } = await query.or(`name.ilike.%${searchId}%,usn.ilike.%${searchId}%`);

        if (!error && data && data.length > 0) {
            const validUser = data.find(u => u.password === password);
            if (validUser) return validUser as User;
        }
    } catch (e: any) {
        if (e.message && e.message.includes("tab")) throw e;
        console.error("Supabase login search failed:", e);
    }

    const lowerSearch = searchId.toLowerCase();
    if (targetRole === 'FACULTY') {
        if ((MOCK_HOD.name.toLowerCase() === lowerSearch || lowerSearch === 'hod') && MOCK_HOD.password === password) {
            return await storageService.autoSeedUser(MOCK_HOD);
        }
        if ((MOCK_TEACHER.name.toLowerCase() === lowerSearch || lowerSearch === 'teacher') && MOCK_TEACHER.password === password) {
             return await storageService.autoSeedUser(MOCK_TEACHER);
        }
        if (MOCK_JUNIOR_TEACHER.name.toLowerCase() === lowerSearch && MOCK_JUNIOR_TEACHER.password === password) {
             return await storageService.autoSeedUser(MOCK_JUNIOR_TEACHER);
        }
    } else {
        const mockStudent = MOCK_STUDENTS.find(s => 
            (s.usn?.toLowerCase() === lowerSearch || s.name.toLowerCase() === lowerSearch) && 
            s.password === password
        );
        if (mockStudent) {
            return await storageService.autoSeedUser(mockStudent);
        }
    }
    return null;
  },

  autoSeedUser: async (mockUser: User): Promise<User> => {
      let query = supabase.from('users').select('*').eq('role', mockUser.role);
      if (mockUser.usn) {
          query = query.eq('usn', mockUser.usn);
      } else {
          query = query.eq('name', mockUser.name);
      }
      
      const { data: existing } = await query.maybeSingle();
      if (existing) return existing as User;

      const { data: newUser, error } = await supabase.from('users').insert([{
             name: mockUser.name,
             usn: mockUser.usn,
             role: mockUser.role,
             password: mockUser.password,
             canApprove: mockUser.role === 'HOD' ? true : !!mockUser.canApprove
        }]).select().single();

      if (error) throw error;
      return newUser as User;
  },

  registerStudent: async (name: string, usn: string, password: string): Promise<User> => {
    const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'STUDENT')
        .eq('usn', usn)
        .maybeSingle();

    if (existing) {
        throw new Error("A student with this USN is already registered.");
    }

    const { data, error } = await supabase
      .from('users')
      .insert([{ name, usn, password, role: 'STUDENT' }])
      .select()
      .single();

    if (error) throw error;
    return data as User;
  },

  updateUser: async (updatedUser: User): Promise<void> => {
    const { error } = await supabase
      .from('users')
      .update({
        name: updatedUser.name,
        profilePic: updatedUser.profilePic,
        canApprove: updatedUser.canApprove
      })
      .eq('id', updatedUser.id);
    if (error) throw error;
  },

  seedStudents: async (): Promise<void> => {
    const studentsToSeed = MOCK_STUDENTS.map(s => ({
      name: s.name,
      usn: s.usn,
      role: s.role,
      password: s.password,
      canApprove: false
    }));
    
    const { error } = await supabase.from('users').upsert(studentsToSeed, { onConflict: 'usn' });
    if (error) throw error;
  },

  getApplications: async (): Promise<LeaveApplication[]> => {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .order('timestamp', { ascending: false });
    if (error) throw error;
    return (data as LeaveApplication[]) || [];
  },

  saveApplication: async (app: LeaveApplication): Promise<void> => {
    // Ensure data is flat and null for optional fields
    const payload = {
      ...app,
      studentProfilePic: app.studentProfilePic || null,
      imageUrl: app.imageUrl || null,
      reviewedAt: app.reviewedAt || null,
      assignedTeacherId: app.assignedTeacherId || null
    };
    
    const { error } = await supabase.from('applications').insert([payload]);
    if (error) {
        console.error("Supabase Save Error:", error);
        throw error;
    }
  },

  updateApplicationStatus: async (appId: string, status: 'APPROVED' | 'REJECTED' | 'PENDING'): Promise<void> => {
    const { error } = await supabase
      .from('applications')
      .update({ status, reviewedAt: new Date().toISOString() })
      .eq('id', appId);
    if (error) throw error;
  },

  togglePriority: async (appId: string, isPriority: boolean): Promise<void> => {
    const { error } = await supabase
      .from('applications')
      .update({ isPriority })
      .eq('id', appId);
    if (error) throw error;
  },

  assignApplication: async (appId: string, teacherId: string | null): Promise<void> => {
    const { error } = await supabase
      .from('applications')
      .update({ assignedTeacherId: teacherId })
      .eq('id', appId);
    if (error) throw error;
  },

  updateFacultyPermission: async (userId: string, canApprove: boolean): Promise<void> => {
    const { error } = await supabase
      .from('users')
      .update({ canApprove })
      .eq('id', userId);
    if (error) throw error;
  }
};
