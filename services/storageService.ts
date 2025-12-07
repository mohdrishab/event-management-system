import { LeaveApplication, User } from '../types';
import { supabase } from './supabaseClient';
import { MOCK_STUDENTS, MOCK_TEACHER, MOCK_HOD, MOCK_JUNIOR_TEACHER } from '../constants';

export const storageService = {
  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return data as User[];
  },

  getFaculty: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .in('role', ['TEACHER', 'HOD']);
    if (error) throw error;
    return data as User[];
  },

  login: async (identifier: string, password: string): Promise<User | null> => {
    const searchId = identifier.trim();
    
    // 1. Try finding user in Supabase (Case-Insensitive for Name/USN)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`name.ilike.${searchId},usn.ilike.${searchId}`);

    if (!error && data && data.length > 0) {
        // Verify password (Case-Sensitive)
        const validUser = data.find(u => u.password === password);
        if (validUser) return validUser as User;
    }

    // 2. FALLBACK: Check Constants (Auto-Seed Feature)
    
    // Check HOD
    if ((MOCK_HOD.name.toLowerCase() === searchId.toLowerCase() || 'dr. strange' === searchId.toLowerCase()) && MOCK_HOD.password === password) {
        return await storageService.autoSeedUser(MOCK_HOD);
    }

    // Check Senior Teacher
    if ((MOCK_TEACHER.name.toLowerCase() === searchId.toLowerCase() || 't1' === searchId) && MOCK_TEACHER.password === password) {
         return await storageService.autoSeedUser(MOCK_TEACHER);
    }

    // Check Junior Teacher
    if ((MOCK_JUNIOR_TEACHER.name.toLowerCase() === searchId.toLowerCase()) && MOCK_JUNIOR_TEACHER.password === password) {
         return await storageService.autoSeedUser(MOCK_JUNIOR_TEACHER);
    }

    // Check Students
    const mockStudent = MOCK_STUDENTS.find(s => 
        (s.usn?.toLowerCase() === searchId.toLowerCase() || s.name.toLowerCase() === searchId.toLowerCase()) && 
        s.password === password
    );

    if (mockStudent) {
        return await storageService.autoSeedUser(mockStudent);
    }
    
    return null;
  },

  autoSeedUser: async (mockUser: User): Promise<User> => {
      console.log(`Auto-seeding ${mockUser.role} ${mockUser.name}...`);
      
      // Determine permission: Use explicit value if present, otherwise default to false for Teachers
      let canApprove = mockUser.canApprove;
      if (canApprove === undefined && mockUser.role === 'TEACHER') {
          canApprove = false;
      }

      const { data: newUser } = await supabase.from('users').insert([{
             name: mockUser.name,
             usn: mockUser.usn,
             role: mockUser.role,
             password: mockUser.password,
             canApprove: canApprove
        }]).select().single();
      return newUser as User;
  },

  registerStudent: async (name: string, usn: string, password: string): Promise<User> => {
    const { data: existing } = await supabase
        .from('users')
        .select('id')
        .ilike('usn', usn)
        .maybeSingle();

    if (existing) {
        throw new Error("Student with this USN already exists.");
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
    return data as LeaveApplication[];
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
    // 1. Seed HOD (Dr. Strange) - CAN APPROVE
    await storageService.upsertUser(MOCK_HOD);

    // 2. Seed Senior Teacher (Prof. Albus) - CAN APPROVE
    await storageService.upsertUser(MOCK_TEACHER);

    // 3. Seed Junior Teacher (Prof. Snape) - CANNOT APPROVE (View Only)
    await storageService.upsertUser(MOCK_JUNIOR_TEACHER);

    // 4. Seed Students
    let count = 0;
    for (const student of MOCK_STUDENTS) {
        await storageService.upsertUser(student);
        count++;
    }
    
    return `Initialized: Dr. Strange (HOD), Prof. Albus, Prof. Snape, and ${count} Students.`;
  },

  upsertUser: async (user: Partial<User>) => {
      // Helper to insert or update based on Name/USN
      let query = supabase.from('users').select('id');
      
      if (user.usn) query = query.ilike('usn', user.usn);
      else if (user.name) query = query.ilike('name', user.name);
      
      const { data: existing } = await query.maybeSingle();

      if (existing) {
          await supabase.from('users').update({ 
              password: user.password,
              role: user.role,
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