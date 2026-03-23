import { LeaveApplication, User, HodStudentRow, HodStaffRow } from '../types';
import { supabase } from '../lib/supabaseClient';
import { inferRequestKind } from '../lib/hodRequestHelpers';

// Helper function to get current auth user ID
const getCurrentAuthUserId = async (): Promise<string | null> => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('[Storage] Error getting auth user:', error.message);
    return null;
  }
  return user?.id || null;
};

// Helper to create or find an event and return its UUID
// This ensures applications.event_id always references a valid events.id
const getOrCreateEventId = async (params: {
  eventName: string;
  eventType?: string;
  startDate: string;
  endDate: string;
  eventLocation?: string;
  organizedBy?: string;
}): Promise<string> => {
  const { eventName, eventType, startDate, endDate, eventLocation, organizedBy } = params;
  
  // First, try to find an existing event with the same name and dates
  const { data: existingEvent } = await supabase
    .from('events')
    .select('id')
    .eq('title', eventName)
    .maybeSingle();

  if (existingEvent) {
    console.log('[Storage] Found existing event:', existingEvent.id);
    return existingEvent.id;
  }

  // Create a new event
  const { data: newEvent, error } = await supabase
    .from('events')
    .insert({
      title: eventName,
      description: `${eventType || 'Event'} - ${organizedBy || 'Unknown'}`,
      event_date: startDate,
    })
    .select('id')
    .single();

  if (error || !newEvent) {
    console.error('[Storage] Failed to create event:', error?.message);
    throw new Error('Failed to create event record');
  }

  console.log('[Storage] Created new event:', newEvent.id);
  return newEvent.id;
};

// Helper to map application row to LeaveApplication type
function mapApplicationRow(app: Record<string, any>): LeaveApplication {
  return {
    id: app.id,
    uid: app.uid || app.student_id,
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
    const { data: staff } = await supabase.from('staff').select('*');

    const users: User[] = [];
    if (students) {
      users.push(...students.map(s => ({ ...s, role: 'student' as const })));
    }
    if (staff) {
      users.push(...staff.map(s => ({
        ...s,
        role: s.role === 'hod' ? 'hod' as const : 'professor' as const,
        canApprove: s.role === 'hod',
      })));
    }
    return users;
  },

  /** Faculty assigned by HoD — uses `staff` table. */
  getFaculty: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .in('role', ['professor', 'hod']);
    if (error) throw error;
    return (data || []).map(s => ({
      id: s.id,
      name: s.name,
      role: s.role === 'hod' ? 'hod' as const : 'professor' as const,
      department: s.department,
      canApprove: true,
    }));
  },

  login: async (_identifier: string, _password: string, _targetRole: 'student' | 'professor' | 'hod'): Promise<User | null> => {
    // Login is now handled in Login.tsx with Supabase Auth
    return null;
  },

  registerStudent: async (_name: string, _usn: string, _password: string): Promise<User> => {
    throw new Error('Registration is disabled.');
  },

  updateUser: async (updatedUser: User): Promise<void> => {
    if (updatedUser.role === 'student') {
      const { error } = await supabase
        .from('students')
        .update({
          name: updatedUser.name,
          department: updatedUser.department,
        })
        .eq('id', updatedUser.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('staff')
        .update({
          name: updatedUser.name,
          department: updatedUser.department,
        })
        .eq('id', updatedUser.id);
      if (error) throw error;
    }
  },

  seedStudents: async (): Promise<void> => {},

  // Get all applications (for HoD/Staff)
  getApplications: async (): Promise<LeaveApplication[]> => {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) throw error;
    
    const rows = (data || []).map((row: Record<string, any>) => mapApplicationRow(row));
    
    // Fetch student names and USNs
    const studentIds = Array.from(new Set(rows.map(r => r.studentId).filter(Boolean))) as string[];
    if (studentIds.length === 0) return rows;
    
    const { data: students } = await supabase
      .from('students')
      .select('id, name, usn')
      .in('id', studentIds);
    
    const byId = new Map((students || []).map((s: any) => [String(s.id), s]));
    
    return rows.map(r => ({
      ...r,
      studentName: r.studentName || byId.get(String(r.studentId))?.name || '',
      studentUSN: r.studentUSN || byId.get(String(r.studentId))?.usn || '',
    }));
  },

  // Get applications for a specific student
  getStudentApplications: async (studentId: string): Promise<LeaveApplication[]> => {
    // Verify the current auth user owns this student ID
    const authUserId = await getCurrentAuthUserId();
    if (authUserId) {
      // Check ownership if user is logged in via Supabase Auth
      const { data: student } = await supabase
        .from('students')
        .select('id, user_id')
        .eq('id', studentId)
        .maybeSingle();

      if (student && student.user_id && student.user_id !== authUserId) {
        console.error('[Storage] Auth mismatch:', authUserId, 'vs', student.user_id);
        throw new Error('Unauthorized: You can only view your own applications');
      }
    }

    // Query by student_id (not uid) - this is the primary foreign key
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('student_id', studentId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    
    // Get student info for the applications
    const { data: studentInfo } = await supabase
      .from('students')
      .select('id, name, usn')
      .eq('id', studentId)
      .maybeSingle();

    return (data || []).map((row: Record<string, any>) => {
      const mapped = mapApplicationRow(row);
      if (studentInfo) {
        mapped.studentName = studentInfo.name;
        mapped.studentUSN = studentInfo.usn;
      }
      return mapped;
    });
  },

  // Save a new application
  saveApplication: async (app: Record<string, unknown>): Promise<void> => {
    const studentId = String(app.student_id || app.uid || app.studentId || '');
    
    if (!studentId) throw new Error('Missing student_id for application insert.');

    // Certificate validation: Check for pending certificates
    const { data: pendingCerts, error: certError } = await supabase
      .from('applications')
      .select('id')
      .eq('student_id', studentId)
      .eq('status', 'approved')
      .eq('certificate_uploaded', false);
    
    if (certError) {
      console.error('[Storage] Certificate validation failed:', certError.message);
      throw new Error('Failed to validate certificate status');
    }
    
    if (pendingCerts && pendingCerts.length > 0) {
      throw new Error('You must upload pending certificates before applying for new events.');
    }

    // Get or create the event in the events table to get a valid UUID
    const eventName = String(app.event_name || app.eventName || '');
    const eventType = String(app.event_type || app.eventType || '');
    const startDate = String(app.start_date || app.startDate || '');
    const endDate = String(app.end_date || app.endDate || '');
    const eventLocation = String(app.eventLocation || app.event_location || '');
    const organizedBy = String(app.organizedBy || app.organized_by || '');

    if (!eventName) throw new Error('Missing event_name for application insert.');
    if (!startDate) throw new Error('Missing start_date for application insert.');
    if (!endDate) throw new Error('Missing end_date for application insert.');

    // Get or create event and get its UUID
    const eventUuid = await getOrCreateEventId({
      eventName,
      eventType,
      startDate,
      endDate,
      eventLocation,
      organizedBy,
    });

    // Verify ownership if logged in via Supabase Auth
    const authUserId = await getCurrentAuthUserId();
    if (authUserId) {
      const { data: student } = await supabase
        .from('students')
        .select('id, user_id, name, usn')
        .eq('id', studentId)
        .maybeSingle();

      if (!student) {
        throw new Error('Student not found');
      }

      if (student.user_id && student.user_id !== authUserId) {
        console.error('[Storage] Auth mismatch during save:', authUserId, 'vs', student.user_id);
        throw new Error('Unauthorized: You can only submit applications for yourself');
      }

      // Insert with student info (only student_id, uid has FK constraint issues)
      const row: Record<string, unknown> = {
        student_id: studentId,
        event_id: eventUuid, // Use the UUID from events table
        event_name: eventName,
        event_type: eventType,
        start_date: startDate,
        end_date: endDate,
        sop: app.sop || app.reason || '',
        reason: app.reason || null,
        event_location: eventLocation,
        organized_by: organizedBy,
        timestamp: app.timestamp || new Date().toISOString(),
        status: 'pending',
        approved_by: null,
        action_by: null,
        action_by_name: null,
        action_role: null,
        reviewed_at: null,
        action_at: null,
        user_id: authUserId, // Store auth user ID
        certificate_uploaded: false, // Initialize certificate fields
        certificate_url: null,
        certificate_uploaded_at: null,
      };

      const { error } = await supabase.from('applications').insert(row);
      if (error) {
        console.error('[Storage] saveApplication insert failed:', error);
        throw error;
      }
    } else {
      // No auth check - direct insert (only student_id, uid has FK constraint issues)
      const row: Record<string, unknown> = {
        student_id: studentId,
        event_id: eventUuid, // Use the UUID from events table
        event_name: eventName,
        event_type: eventType,
        start_date: startDate,
        end_date: endDate,
        sop: app.sop || app.reason || '',
        reason: app.reason || null,
        event_location: eventLocation,
        organized_by: organizedBy,
        timestamp: app.timestamp || new Date().toISOString(),
        status: 'pending',
        certificate_uploaded: false, // Initialize certificate fields
        certificate_url: null,
        certificate_uploaded_at: null,
      };

      const { error } = await supabase.from('applications').insert(row);
      if (error) {
        console.error('[Storage] saveApplication insert failed:', error);
        throw error;
      }
    }
  },

  // Update application status (for approval/rejection)
  updateApplicationStatus: async (
    appId: string,
    status: 'approved' | 'rejected' | 'pending',
    actionBy?: string,
    actionByName?: string
  ): Promise<void> => {
    console.log('[Storage] Updating application status:', appId, 'to', status);

    // Build update data - avoid FK columns that may cause constraint errors
    const updateData: Record<string, unknown> = {
      status,
      action_at: status === 'pending' ? null : new Date().toISOString(),
      reviewed_at: status === 'pending' ? null : new Date().toISOString(),
    };

    // Only set action info if provided
    // Note: action_by and approved_by have FK constraints to staff table
    // If staff table is empty or staff ID doesn't exist, these will fail
    if (actionBy) {
      // Check if staff exists in database
      const { data: staff } = await supabase
        .from('staff')
        .select('id, role')
        .eq('id', actionBy)
        .maybeSingle();

      if (staff) {
        // Staff exists in DB - can set FK columns
        updateData.action_by = actionBy;
        updateData.action_by_name = actionByName;
        updateData.action_role = staff.role || 'professor';
        if (status === 'approved') {
          updateData.approved_by = actionBy;
        }
      } else {
        // Staff not in DB (e.g., using fallback credentials)
        // Only set non-FK columns
        updateData.action_by_name = actionByName;
        updateData.action_role = 'professor'; // Default role
      }
    }

    const { error } = await supabase
      .from('applications')
      .update(updateData)
      .eq('id', appId);

    if (error) {
      console.error('[Storage] Update error:', error.message);
      throw error;
    }
    
    console.log('[Storage] Update successful');
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

  // HoD: students with aggregated request counts
  getHodStudentRows: async (): Promise<HodStudentRow[]> => {
    const { data: students, error: e1 } = await supabase.from('students').select('*');
    if (e1) throw e1;
    
    // Query by student_id (not uid) for aggregation
    const { data: apps, error: e2 } = await supabase
      .from('applications')
      .select('student_id, status');
    if (e2) throw e2;

    const byStudent = new Map<string, { total: number; pending: number }>();
    for (const a of apps || []) {
      const sid = (a as { student_id: string }).student_id;
      if (!sid) continue;
      const cur = byStudent.get(sid) || { total: 0, pending: 0 };
      cur.total += 1;
      if (String((a as { status: string }).status).toUpperCase() === 'PENDING') {
        cur.pending += 1;
      }
      byStudent.set(sid, cur);
    }

    return (students || []).map((s: Record<string, any>) => {
      const agg = byStudent.get(s.id) || { total: 0, pending: 0 };
      return {
        id: s.id,
        name: s.name,
        department: s.department,
        rollNumber: s.usn || '—',
        year: s.year != null ? String(s.year) : undefined,
        totalRequests: agg.total,
        pendingRequests: agg.pending,
      };
    });
  },

  // HoD: staff list with review counts
  getHodStaffRows: async (): Promise<HodStaffRow[]> => {
    const { data: staff, error: e1 } = await supabase.from('staff').select('*');
    if (e1) throw e1;
    
    const { data: apps, error: e2 } = await supabase
      .from('applications')
      .select('action_by, status');
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
    
    const mapped = mapApplicationRow(data);
    
    // Get student info
    if (mapped.studentId) {
      const { data: student } = await supabase
        .from('students')
        .select('name, usn')
        .eq('id', mapped.studentId)
        .maybeSingle();
      if (student) {
        mapped.studentName = student.name;
        mapped.studentUSN = student.usn;
      }
    }
    
    return mapped;
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
