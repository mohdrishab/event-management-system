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
  actionBy?: string; // ID of the user who approved/rejected
  actionByName?: string; // Name of the user who approved/rejected
  imageUrl?: string; // URL or Base64 string of the event image
  isPriority?: boolean; // Marked by teachers for HOD attention
  assignedTeacherId?: string | null; // Teacher assigned to review this application
}

export interface TeacherViewMode {
  mode: 'TRADITIONAL' | 'SWIPE' | 'HISTORY';
}