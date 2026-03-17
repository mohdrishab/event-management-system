import { LeaveApplication, User } from '../types';
import { supabase } from '../lib/supabaseClient';

export const storageService = {
  checkDatabaseConnection: async (): Promise<{ ok: boolean; error?: string; code?: string }> => {
    return { ok: true };
  },

  getUsers: async (): Promise<User[]> => {
    const { data: students } = await supabase.from('students').select('*');
    const { data: profiles } = await supabase.from('profiles').select('*');
    
    const users: User[] = [];
    if (students) {
      users.push(...students.map(s => ({ ...s, role: 'student' as const })));
    }
    if (profiles) {
      users.push(...profiles.map(p => ({ ...p, role: p.role as any })));
    }
    return users;
  },

  getFaculty: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['professor', 'hod']);
    if (error) throw error;
    return data || [];
  },

  login: async (identifier: string, password: string, targetRole: 'student' | 'professor' | 'hod'): Promise<User | null> => {
    // Login is now handled directly in Login.tsx
    return null;
  },

  registerStudent: async (name: string, usn: string, password: string): Promise<User> => {
    throw new Error("Registration is disabled.");
  },

  updateUser: async (updatedUser: User): Promise<void> => {
    // Not implemented for Supabase yet
  },

  seedStudents: async (): Promise<void> => {
    // Not needed
  },

  getApplications: async (): Promise<LeaveApplication[]> => {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        students (
          name,
          usn
        )
      `)
      .order('start_date', { ascending: false });
      
    if (error) throw error;
    
    return (data || []).map(app => ({
      ...app,
      eventName: app.event_name,
      startDate: app.start_date,
      endDate: app.end_date,
      studentId: app.student_id,
      studentName: app.students?.name,
      studentUSN: app.students?.usn,
      eventLocation: app.event_location,
      organizedBy: app.organized_by,
      isPriority: app.is_priority,
      assignedTeacherId: app.assigned_teacher_id,
      actionBy: app.action_by,
      actionByName: app.action_by_name,
    }));
  },

  getStudentApplications: async (studentId: string): Promise<LeaveApplication[]> => {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('student_id', studentId)
      .order('start_date', { ascending: false });
      
    if (error) throw error;
    return (data || []).map(app => ({
      ...app,
      eventName: app.event_name,
      startDate: app.start_date,
      endDate: app.end_date,
      studentId: app.student_id,
      eventLocation: app.event_location,
      organizedBy: app.organized_by,
      isPriority: app.is_priority,
      assignedTeacherId: app.assigned_teacher_id,
      actionBy: app.action_by,
      actionByName: app.action_by_name,
    }));
  },

  saveApplication: async (app: any): Promise<void> => {
    const { error } = await supabase
      .from('applications')
      .insert([{
        student_id: app.student_id || app.studentId,
        event_name: app.event_name || app.eventName,
        start_date: app.start_date || app.startDate,
        end_date: app.end_date || app.endDate,
        reason: app.reason,
        event_location: app.eventLocation || app.event_location,
        organized_by: app.organizedBy || app.organized_by,
        timestamp: app.timestamp || new Date().toISOString(),
        status: 'pending'
      }]);
    if (error) throw error;
  },

  updateApplicationStatus: async (appId: string, status: 'approved' | 'rejected' | 'pending', actionBy?: string, actionByName?: string): Promise<void> => {
    const updateData: any = { status };
    if (actionBy) updateData.action_by = actionBy;
    if (actionByName) updateData.action_by_name = actionByName;
    if (status === 'pending') {
      updateData.action_by = null;
      updateData.action_by_name = null;
    }
    
    const { error } = await supabase
      .from('applications')
      .update(updateData)
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
      .from('profiles')
      .update({ canApprove })
      .eq('id', userId);
    if (error) throw error;
  }
};
