
import { LeaveApplication, User } from '../types';
import { supabase } from './supabaseClient';
import { MOCK_STUDENTS, MOCK_TEACHER, MOCK_HOD, MOCK_JUNIOR_TEACHER } from '../constants';

export const storageService = {
  getUsers: async (): Promise<User[]> => {
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      return (data as User[]) || [];
    } catch (error) {
      console.warn("Supabase getUsers error:", error);
      return [];
    }
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
        // 1. Try finding user in Supabase with Role Filter
        let query = supabase.from('users').select('*');
        
        if (targetRole === 'STUDENT') {
            query = query.eq('role', 'STUDENT');
        } else {
            query = query.in('role', ['TEACHER', 'HOD']);
        }

        // Use a safe OR filter
        const { data, error } = await query.or(`name.ilike.%${searchId}%,usn.ilike.%${searchId}%`);

        if (!error && data && data.length > 0) {
            // Verify password (Case-Sensitive)
            const validUser = data.find(u => u.password === password);
            if (validUser) return validUser as User;
        }
    } catch (e) {
        console.error("Supabase login search failed:", e);
    }

    // 2. FALLBACK: Check Constants / Auto-Seed if not in DB yet
    const lowerSearch = searchId.toLowerCase();

    if (targetRole === 'FACULTY') {
        // Check HOD
        if ((MOCK_HOD.name.toLowerCase() === lowerSearch || lowerSearch === 'hod') && MOCK_HOD.password === password) {
            return await storageService.autoSeedUser(MOCK_HOD);
        }
        // Check Senior Teacher
        if ((MOCK_TEACHER.name.toLowerCase() === lowerSearch || lowerSearch === 'teacher') && MOCK_TEACHER.password === password) {
             return await storageService.autoSeedUser(MOCK_TEACHER);
        }
        // Check Junior Teacher
        if (MOCK_JUNIOR_TEACHER.name.toLowerCase() === lowerSearch && MOCK_JUNIOR_TEACHER.password === password) {
             return await storageService.autoSeedUser(MOCK_JUNIOR_TEACHER);
        }
    } else {
        // Check Students
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
      // Check if already exists by USN or Name+Role
      let query = supabase.from('users').select('*').eq('role', mockUser.role);
      if (mockUser.usn) {
          query = query.eq('usn', mockUser.usn);
      } else {
          query = query.eq('name', mockUser.name);
      }
      
      const { data: existing } = await query.maybeSingle();
      if (existing) return existing as User;

      // Ensure canApprove is set correctly for teachers
      let canApprove = mockUser.canApprove;
      if (canApprove === undefined) {
          canApprove = mockUser.role === 'HOD';
      }

      const { data: newUser, error } = await supabase.from('users').insert([{
             name: mockUser.name,
             usn: mockUser.usn,
             role: mockUser.role,
             password: mockUser.password,
             canApprove: canApprove
        }]).select().single();

      if (error) {
          console.error("Auto-seed insertion failed:", error);
          throw error;
      }
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

    const newUser = {
      name,
      usn,
      password,
      role: 'STUDENT',
      profilePic: ''
    };

    const { data, error } = await supabase
      .from('users')
      .insert([newUser])
      .select()
      .single();

    if (error) throw error;
    return data as User;
  },

  updateUser: async (updatedUser: User): Promise<void> => {
    const { error } = await supabase
      .from('users')
      .update({ profilePic: updatedUser.profilePic })
      .eq('id', updatedUser.id);
    if (error) throw error;
  },

  updateFacultyPermission: async (userId: string, canApprove: boolean): Promise<void> => {
    const { error } = await supabase
      .from('users')
      .update({ canApprove })
      .eq('id', userId);
    if (error) throw error;
  },

  getApplications: async (): Promise<LeaveApplication[]> => {
    const { data, error } = await supabase
      .from('applications')
      .select('*');
    if (error) throw error;
    return (data as LeaveApplication[]) || [];
  },

  saveApplication: async (app: LeaveApplication): Promise<void> => {
    const { id, ...appData } = app;
    const { error } = await supabase
      .from('applications')
      .insert([appData]); 
    if (error) throw error;
  },

  updateApplicationStatus: async (id: string, status: 'APPROVED' | 'REJECTED' | 'PENDING'): Promise<void> => {
    const { error } = await supabase
      .from('applications')
      .update({ 
        status: status,
        reviewedAt: status === 'PENDING' ? null : new Date().toISOString()
      })
      .eq('id', id);
    if (error) throw error;
  },

  togglePriority: async (id: string, isPriority: boolean): Promise<void> => {
    const { error } = await supabase
      .from('applications')
      .update({ isPriority })
      .eq('id', id);
    if (error) throw error;
  },

  assignApplication: async (appId: string, teacherId: string | null): Promise<void> => {
    const { error } = await supabase
      .from('applications')
      .update({ assignedTeacherId: teacherId })
      .eq('id', appId);
    if (error) throw error;
  },

  seedStudents: async (): Promise<string> => {
    // Seed core faculty first
    await storageService.upsertUser(MOCK_HOD);
    await storageService.upsertUser(MOCK_TEACHER);
    await storageService.upsertUser(MOCK_JUNIOR_TEACHER);

    // Seed Students in batches
    const BATCH_SIZE = 10;
    for (let i = 0; i < MOCK_STUDENTS.length; i += BATCH_SIZE) {
        const batch = MOCK_STUDENTS.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(s => storageService.upsertUser(s)));
    }
    
    return `System successfully initialized with all demo records.`;
  },

  upsertUser: async (user: Partial<User>) => {
      let query = supabase.from('users').select('id').eq('role', user.role);
      if (user.usn) {
          query = query.eq('usn', user.usn);
      } else if (user.name) {
          query = query.eq('name', user.name);
      }
      
      const { data: existing } = await query.maybeSingle();

      if (existing) {
          await supabase.from('users').update({ 
              password: user.password,
              canApprove: user.canApprove 
          }).eq('id', existing.id);
      } else {
          await supabase.from('users').insert([{
              name: user.name,
              usn: user.usn,
              role: user.role,
              password: user.password,
              canApprove: user.canApprove
          }]);
      }
  }
};
