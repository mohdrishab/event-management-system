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
  studentId: string;
  eventName: string;
  startDate: string;
  endDate: string;
  status: ApplicationStatus;
  // Additional fields for UI
  studentName?: string;
  studentUSN?: string;
  studentProfilePic?: string;
  eventLocation?: string;
  eventType?: string;
  organizedBy?: string;
  reason?: string;
  timestamp?: string; // ISO string
  reviewedAt?: string;
  updatedAt?: string;
  actionBy?: string; // ID of the user who approved/rejected
  actionByName?: string; // Name of the user who approved/rejected
  imageUrl?: string; // URL or Base64 string of the event image
  isPriority?: boolean; // Marked by teachers for HOD attention
  assignedTeacherId?: string | null; // Teacher assigned to review this application
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