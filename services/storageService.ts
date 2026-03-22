import { LeaveApplication, User, HodStudentRow, HodStaffRow } from '../types';
import { supabase } from '../lib/supabaseClient';
import { inferRequestKind } from '../lib/hodRequestHelpers';

function mapApplicationRow(app: Record<string, any>): LeaveApplication {
  const students = app.students as { name?: string; usn?: string } | undefined;
  return {
    id: app.id,
    studentId: app.student_id,
    eventName: app.event_name,
    startDate: app.start_date,
    endDate: app.end_date,
    status: app.status,
    studentName: students?.name ?? app.student_name,
    studentUSN: students?.usn ?? app.student_usn,
    studentProfilePic: app.student_profile_pic ?? app.image_url,
    eventLocation: app.event_location,
    eventType: app.event_type,
    organizedBy: app.organized_by,
    reason: app.reason,
    timestamp: app.timestamp,
    reviewedAt: app.reviewed_at,
    updatedAt: app.updated_at,
    actionBy: app.action_by,
    actionByName: app.action_by_name,
    imageUrl: app.image_url,
    isPriority: app.is_priority,
    assignedTeacherId: app.assigned_teacher_id,
    requestKind: inferRequestKind(app),
  };
}

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

  /** Faculty assigned by HoD — uses `staff` table (same as login). */
  getFaculty: async (): Promise<User[]> => {
    const { data, error } = await supabase.from('staff').select('*').eq('role', 'professor');
    if (error) throw error;
    return (data || []).map(s => ({
      id: s.id,
      name: s.name,
      role: 'professor' as const,
      department: s.department,
      canApprove: s.can_approve !== false,
    }));
  },

  login: async (_identifier: string, _password: string, _targetRole: 'student' | 'professor' | 'hod'): Promise<User | null> => {
    return null;
  },

  registerStudent: async (_name: string, _usn: string, _password: string): Promise<User> => {
    throw new Error('Registration is disabled.');
  },

  updateUser: async (_updatedUser: User): Promise<void> => {},

  seedStudents: async (): Promise<void> => {},

  getApplications: async (): Promise<LeaveApplication[]> => {
    const { data, error } = await supabase
      .from('applications')
      .select(
        `
        *,
        students (
          name,
          usn
        )
      `
      )
      .order('start_date', { ascending: false });

    if (error) throw error;
    return (data || []).map((row: Record<string, any>) => mapApplicationRow(row));
  },

  getStudentApplications: async (studentId: string): Promise<LeaveApplication[]> => {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('student_id', studentId)
      .order('start_date', { ascending: false });

    if (error) throw error;
    return (data || []).map((row: Record<string, any>) => mapApplicationRow(row));
  },

  saveApplication: async (app: Record<string, unknown>): Promise<void> => {
    const row: Record<string, unknown> = {
      student_id: app.student_id || app.studentId,
      event_name: app.event_name || app.eventName,
      start_date: app.start_date || app.startDate,
      end_date: app.end_date || app.endDate,
      reason: app.reason,
      event_location: app.eventLocation || app.event_location,
      organized_by: app.organizedBy || app.organized_by,
      timestamp: app.timestamp || new Date().toISOString(),
      status: 'pending',
    };

    const { error } = await supabase.from('applications').insert([row]);
    if (error) throw error;
  },

  updateApplicationStatus: async (
    appId: string,
    status: 'approved' | 'rejected' | 'pending',
    actionBy?: string,
    actionByName?: string
  ): Promise<void> => {
    const updateData: Record<string, unknown> = { status };
    if (actionBy) updateData.action_by = actionBy;
    if (actionByName) updateData.action_by_name = actionByName;
    if (status === 'pending') {
      updateData.action_by = null;
      updateData.action_by_name = null;
    }

    const { error } = await supabase.from('applications').update(updateData).eq('id', appId);
    if (error) throw error;
  },

  togglePriority: async (appId: string, isPriority: boolean): Promise<void> => {
    const { error } = await supabase.from('applications').update({ is_priority: isPriority }).eq('id', appId);
    if (error) throw error;
  },

  assignApplication: async (appId: string, teacherId: string | null): Promise<void> => {
    const { error } = await supabase
      .from('applications')
      .update({ assigned_teacher_id: teacherId })
      .eq('id', appId);
    if (error) throw error;
  },

  updateFacultyPermission: async (userId: string, canApprove: boolean): Promise<void> => {
    const { error } = await supabase.from('staff').update({ can_approve: canApprove }).eq('id', userId);
    if (error) throw error;
  },

  /** HoD: students with aggregated request counts */
  getHodStudentRows: async (): Promise<HodStudentRow[]> => {
    const { data: students, error: e1 } = await supabase.from('students').select('*');
    if (e1) throw e1;
    const { data: apps, error: e2 } = await supabase.from('applications').select('student_id, status');
    if (e2) throw e2;

    const byStudent = new Map<string, { total: number; pending: number }>();
    for (const a of apps || []) {
      const sid = (a as { student_id: string }).student_id;
      const cur = byStudent.get(sid) || { total: 0, pending: 0 };
      cur.total += 1;
      if (String((a as { status: string }).status).toUpperCase() === 'PENDING') cur.pending += 1;
      byStudent.set(sid, cur);
    }

    return (students || []).map((s: Record<string, any>) => {
      const agg = byStudent.get(s.id) || { total: 0, pending: 0 };
      return {
        id: s.id,
        name: s.name,
        department: s.department,
        rollNumber: s.usn || s.roll_number || '—',
        year: s.year != null ? String(s.year) : undefined,
        totalRequests: agg.total,
        pendingRequests: agg.pending,
      };
    });
  },

  /** HoD: staff list with review counts */
  getHodStaffRows: async (): Promise<HodStaffRow[]> => {
    const { data: staff, error: e1 } = await supabase.from('staff').select('*');
    if (e1) throw e1;
    const { data: apps, error: e2 } = await supabase.from('applications').select('action_by, status');
    if (e2) throw e2;

    const counts = new Map<string, number>();
    for (const a of apps || []) {
      const row = a as { action_by: string | null; status: string };
      if (!row.action_by) continue;
      if (['approved', 'rejected'].includes(String(row.status).toLowerCase())) {
        counts.set(row.action_by, (counts.get(row.action_by) || 0) + 1);
      }
    }

    return (staff || []).map((s: Record<string, any>) => ({
      id: s.id,
      name: s.name,
      department: s.department,
      role: s.role === 'hod' ? 'HoD' : 'Counselor',
      requestsReviewed: counts.get(s.id) || 0,
      isActive: s.is_active !== false,
      canApprove: s.can_approve !== false,
    }));
  },

  updateStaffActive: async (staffId: string, isActive: boolean): Promise<void> => {
    const { error } = await supabase.from('staff').update({ is_active: isActive }).eq('id', staffId);
    if (error) throw error;
  },

  updateStaffPassword: async (staffId: string, newPassword: string): Promise<void> => {
    const { error } = await supabase.from('staff').update({ password: newPassword }).eq('id', staffId);
    if (error) throw error;
  },

  getApplicationById: async (id: string): Promise<LeaveApplication | null> => {
    const { data, error } = await supabase
      .from('applications')
      .select(
        `
        *,
        students (
          name,
          usn
        )
      `
      )
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapApplicationRow(data as Record<string, any>);
  },

  getStudentRecord: async (studentId: string): Promise<Record<string, any> | null> => {
    const { data, error } = await supabase.from('students').select('*').eq('id', studentId).maybeSingle();
    if (error) throw error;
    return data;
  },

  exportApplicationsCsv: (apps: LeaveApplication[]): string => {
    const headers = [
      'id',
      'student',
      'usn',
      'request_type',
      'event',
      'start',
      'end',
      'status',
      'counselor_status',
      'submitted',
    ];
    const lines = [headers.join(',')];
    for (const a of apps) {
      const ck = a.requestKind === 'late_entry' ? 'late_entry' : 'leave';
      const row = [
        a.id,
        JSON.stringify(a.studentName || ''),
        JSON.stringify(a.studentUSN || ''),
        ck,
        JSON.stringify(a.eventName || ''),
        a.startDate,
        a.endDate,
        a.status,
        a.status === 'pending' ? (a.assignedTeacherId ? 'reviewed' : 'pending') : '—',
        a.timestamp || '',
      ];
      lines.push(row.join(','));
    }
    return lines.join('\n');
  },
};
