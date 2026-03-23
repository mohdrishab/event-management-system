export type Role = 'student' | 'professor' | 'hod';

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  name: string;
  usn?: string; // University Seat Number for students
  role: Role;
  password?: string; // Mock password
  profilePic?: string; // Base64 string of profile picture
  canApprove?: boolean; // Determines if the user can approve applications
  department?: string;
  year?: string;
  phone?: string;
  skills?: string[];
  interests?: string[];
}

/** HoD / analytics: classify application (DB column `request_type` or derived from `event_type`). */
export type RequestKind = 'leave' | 'late_entry';

export interface LeaveApplication {
  id: string;
  uid: string;
  studentId?: string;
  eventId?: string | null;
  eventName: string;
  eventType?: string;
  startDate: string;
  endDate: string;
  status: ApplicationStatus;
  sop?: string;
  reason?: string;
  approvedBy?: string | null;
  actionRole?: string | null;
  actionAt?: string | null;
  createdAt?: string | null;
  // Additional fields for UI
  studentName?: string;
  studentUSN?: string;
  eventLocation?: string;
  organizedBy?: string;
  timestamp?: string; // ISO string
  reviewedAt?: string;
  actionBy?: string; // ID of the user who approved/rejected
  actionByName?: string; // Name of the user who approved/rejected
  /** Derived or from `request_type` column */
  requestKind?: RequestKind;
}

export interface HodStudentRow {
  id: string;
  name: string;
  department?: string;
  rollNumber: string;
  year?: string;
  totalRequests: number;
  pendingRequests: number;
}

export interface HodStaffRow {
  id: string;
  name: string;
  department?: string;
  role: string;
  requestsReviewed: number;
  isActive: boolean;
  canApprove?: boolean;
}

export interface HodNotificationItem {
  id: string;
  type: 'pending' | 'approved' | 'rejected';
  studentName: string;
  description: string;
  time: string;
}

export interface HodSettingsState {
  emailNotifications: boolean;
  smsNotifications: boolean;
  requestAlerts: boolean;
  weeklyReports: boolean;
  activityLogging: boolean;
}

export interface TeacherViewMode {
  mode: 'TRADITIONAL' | 'SWIPE' | 'HISTORY';
}