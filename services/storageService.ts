import { LeaveApplication, User, HodStudentRow, HodStaffRow } from '../types';
import { supabase } from '../lib/supabaseClient';
import { inferRequestKind } from '../lib/hodRequestHelpers';

function mapApplicationRow(app: Record<string, any>): LeaveApplication {
  return {
    id: app.id,
    uid: app.uid,
    studentId: app.student_id,
    eventId: app.event_id,
    eventName: app.event_name,
    startDate: app.start_date,
    endDate: app.end_date,
    status: app.status,
    studentName: app.student_name,
    studentUSN: app.student_usn,
    eventLocation: app.event_location,
    eventType: app.event_type,
    organizedBy: app.organized_by,
    sop: app.sop,
    reason: app.reason,
    timestamp: app.timestamp,
    reviewedAt: app.reviewed_at,
    approvedBy: app.approved_by,
    actionBy: app.action_by,
    actionByName: app.action_by_name,
    actionRole: app.action_role,
    actionAt: app.action_at,
    createdAt: app.created_at,
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
      canApprove: true,
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
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) throw error;
    const rows = (data || []).map((row: Record<string, any>) => mapApplicationRow(row));
    const studentIds = Array.from(new Set(rows.map(r => r.studentId).filter(Boolean))) as string[];
    if (studentIds.length === 0) return rows;
    const { data: students } = await supabase.from('students').select('id,name,usn').in('id', studentIds);
    const byId = new Map((students || []).map((s: any) => [String(s.id), s]));
    return rows.map(r => ({
      ...r,
      studentName: r.studentName || byId.get(String(r.studentId))?.name || '',
      studentUSN: r.studentUSN || byId.get(String(r.studentId))?.usn || '',
    }));
  },

  getStudentApplications: async (uid: string): Promise<LeaveApplication[]> => {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('uid', uid)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return (data || []).map((row: Record<string, any>) => mapApplicationRow(row));
  },

  saveApplication: async (app: Record<string, unknown>): Promise<void> => {
    const uid = String(app.uid || app.student_id || app.studentId || '');
    const eventId = String(app.event_id || app.eventId || '');
    if (!uid) throw new Error('Missing uid for application insert.');
    if (!eventId) throw new Error('Missing event_id for application insert.');

    const row: Record<string, unknown> = {
      uid,
      student_id: uid,
      event_id: eventId,
      event_name: app.event_name || app.eventName,
      event_type: app.event_type || app.eventType,
      start_date: app.start_date || app.startDate,
      end_date: app.end_date || app.endDate,
      sop: app.sop || app.reason || '',
      reason: null,
      event_location: app.eventLocation || app.event_location,
      organized_by: app.organizedBy || app.organized_by,
      timestamp: app.timestamp || new Date().toISOString(),
      status: 'pending',
      approved_by: null,
      action_by: null,
      action_by_name: null,
      action_role: null,
      reviewed_at: null,
      action_at: null,
    };

    const { error } = await supabase.from('applications').insert(row);
    if (error) {
      console.error('saveApplication insert failed:', error);
      throw error;
    }
  },

  updateApplicationStatus: async (
    appId: string,
    status: 'approved' | 'rejected' | 'pending',
    actionBy?: string,
    actionByName?: string
  ): Promise<void> => {
    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = {
      status,
      action_at: status === 'pending' ? null : now,
      reviewed_at: status === 'pending' ? null : now,
    };
    if (actionBy) {
      updateData.action_by = actionBy;
      updateData.approved_by = status === 'approved' ? actionBy : null;
    }
    if (actionByName) updateData.action_by_name = actionByName;
    if (actionBy) {
      const { data: staff } = await supabase.from('staff').select('role').eq('id', actionBy).maybeSingle();
      if (staff?.role) updateData.action_role = String(staff.role);
    }
    if (status === 'pending') {
      updateData.action_by = null;
      updateData.action_by_name = null;
      updateData.approved_by = null;
      updateData.action_role = null;
    }

    const { error } = await supabase.from('applications').update(updateData).eq('id', appId);
    if (error) throw error;
  },

  togglePriority: async (appId: string, isPriority: boolean): Promise<void> => {
    void appId;
    void isPriority;
  },

  assignApplication: async (appId: string, teacherId: string | null): Promise<void> => {
    void appId;
    void teacherId;
  },

  updateFacultyPermission: async (userId: string, canApprove: boolean): Promise<void> => {
    void userId;
    void canApprove;
  },

  /** HoD: students with aggregated request counts */
  getHodStudentRows: async (): Promise<HodStudentRow[]> => {
    const { data: students, error: e1 } = await supabase.from('students').select('*');
    if (e1) throw e1;
    const { data: apps, error: e2 } = await supabase.from('applications').select('uid, status');
    if (e2) throw e2;

    const byStudent = new Map<string, { total: number; pending: number }>();
    for (const a of apps || []) {
      const sid = (a as { uid: string }).uid;
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
      role: s.role === 'hod' ? 'HoD' : 'Professor',
      requestsReviewed: counts.get(s.id) || 0,
      isActive: s.is_active !== false,
      canApprove: true,
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
      .select('*')
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
        a.status === 'pending' ? 'pending' : 'reviewed',
        a.timestamp || '',
      ];
      lines.push(row.join(','));
    }
    return lines.join('\n');
  },
};
