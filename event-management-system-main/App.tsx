
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { StudentDashboard } from './pages/StudentDashboard';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { HodDashboardLayout } from './pages/hod/HodDashboardLayout';
import { HodOverviewPage } from './pages/hod/HodOverviewPage';
import { HodRequestsPage } from './pages/hod/HodRequestsPage';
import { HodRequestDetailPage } from './pages/hod/HodRequestDetailPage';
import { HodStudentsPage } from './pages/hod/HodStudentsPage';
import { HodStudentProfilePage } from './pages/hod/HodStudentProfilePage';
import { HodStaffPage } from './pages/hod/HodStaffPage';
import { HodReportsPage } from './pages/hod/HodReportsPage';
import { HodNotificationsPage } from './pages/hod/HodNotificationsPage';
import { HodSettingsPage } from './pages/hod/HodSettingsPage';
import { HodCertificatesPage } from './pages/hod/HodCertificatesPage';
import { User } from './types';
import { supabase } from './lib/supabaseClient';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-500 mb-6 text-sm">We've encountered an unexpected error. Please try refreshing the page.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2.5 px-6 rounded-xl transition-colors"
            >
              Refresh Page
            </button>
            {this.state.error && (
              <div className="mt-6 text-left bg-gray-50 p-4 rounded-lg overflow-auto max-h-40 text-xs text-gray-600 font-mono border border-gray-200">
                {this.state.error.toString()}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function AppRoutes() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Function to fetch user profile from database based on auth user ID or email
  const fetchUserProfile = async (authUserId: string, email?: string): Promise<User | null> => {
    console.log('[Auth] Fetching profile for user_id:', authUserId, 'email:', email);
    
    try {
      // First, try to find by user_id
      // Check students table by user_id
      let { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', authUserId)
        .maybeSingle();

      if (studentError) {
        console.error('[Auth] Student lookup by user_id error:', studentError.message);
      }

      // If not found by user_id, try by email pattern
      if (!studentData && email) {
        // Extract USN from email (format: usn@student.unievent.com)
        const usnMatch = email.match(/^([^@]+)@student\.unievent\.com$/i);
        if (usnMatch) {
          const usn = usnMatch[1].toUpperCase();
          console.log('[Auth] Trying to find student by USN:', usn);
          const result = await supabase
            .from('students')
            .select('*')
            .eq('usn', usn)
            .maybeSingle();
          studentData = result.data;
          studentError = result.error;
          
          // If found, update user_id
          if (studentData && !studentData.user_id) {
            await supabase
              .from('students')
              .update({ user_id: authUserId })
              .eq('id', studentData.id);
            console.log('[Auth] Updated student user_id');
          }
        }
      }

      if (studentData) {
        console.log('[Auth] Found student profile:', studentData.name);
        return {
          id: studentData.id,
          user_id: authUserId,
          name: studentData.name,
          usn: studentData.usn,
          role: 'student',
          department: studentData.department,
          year: studentData.year,
        };
      }

      // Check staff table by user_id
      let { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', authUserId)
        .maybeSingle();

      if (staffError) {
        console.error('[Auth] Staff lookup by user_id error:', staffError.message);
      }

      // If not found by user_id, try by email pattern
      if (!staffData && email) {
        // Extract username from email (format: username@staff.unievent.com)
        const usernameMatch = email.match(/^([^@]+)@staff\.unievent\.com$/i);
        if (usernameMatch) {
          const staffUsername = usernameMatch[1].toLowerCase();
          console.log('[Auth] Trying to find staff by username:', staffUsername);
          const result = await supabase
            .from('staff')
            .select('*')
            .eq('username', staffUsername)
            .maybeSingle();
          staffData = result.data;
          staffError = result.error;
          
          // If found, update user_id
          if (staffData && !staffData.user_id) {
            await supabase
              .from('staff')
              .update({ user_id: authUserId })
              .eq('id', staffData.id);
            console.log('[Auth] Updated staff user_id');
          }
        }
      }

      if (staffData) {
        const role = String(staffData.role || '').trim().toLowerCase();
        console.log('[Auth] Found staff profile:', staffData.name, 'Role:', role);
        
        if (role === 'hod' || role === 'professor' || role === 'staff') {
          const userRole: 'professor' | 'hod' = role === 'hod' ? 'hod' : 'professor';
          return {
            id: staffData.id,
            user_id: authUserId,
            name: staffData.name,
            role: userRole,
            department: staffData.department,
            canApprove: userRole === 'hod', // HoD can always approve
          };
        }
      }

      console.log('[Auth] No profile found for user_id:', authUserId);
      return null;
    } catch (err) {
      console.error('[Auth] Error fetching profile:', err);
      return null;
    }
  };

  // Check session on startup
  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true);
      console.log('[Auth] Checking session on startup...');
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[Auth] Session error:', error.message);
          setIsLoading(false);
          return;
        }

        if (session?.user) {
          console.log('[Auth] Session found. User ID:', session.user.id, 'Email:', session.user.email);
          const profile = await fetchUserProfile(session.user.id, session.user.email);
          
          if (profile) {
            console.log('[Auth] Profile loaded. Role:', profile.role);
            setUser(profile);
          } else {
            console.log('[Auth] No profile found for this account');
            // Don't sign out - let user try again or create profile
          }
        } else {
          console.log('[Auth] No active session');
        }
      } catch (err) {
        console.error('[Auth] Session check failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('[Auth] User signed in. User ID:', session.user.id);
        const profile = await fetchUserProfile(session.user.id);
        
        if (profile) {
          setUser(profile);
          if (profile.role === 'student') {
            navigate('/student-dashboard');
          } else if (profile.role === 'professor') {
            navigate('/teacher-dashboard');
          } else if (profile.role === 'hod') {
            navigate('/hod-dashboard');
          }
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('[Auth] User signed out');
        setUser(null);
        navigate('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogin = (loggedInUser: User) => {
    console.log('[Auth] handleLogin called with role:', loggedInUser.role);
    setUser(loggedInUser);
    
    // Note: Session is already set by Supabase Auth, no need to store in localStorage
    
    if (loggedInUser.role === 'student') {
      navigate('/student-dashboard');
    } else if (loggedInUser.role === 'professor') {
      navigate('/teacher-dashboard');
    } else if (loggedInUser.role === 'hod') {
      navigate('/hod-dashboard');
    }
  };

  const handleLogout = async () => {
    console.log('[Auth] Logging out...');
    
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('[Auth] Logout error:', error.message);
      } else {
        console.log('[Auth] Logout successful');
      }
    } catch (err) {
      console.error('[Auth] Logout failed:', err);
    }
    
    setUser(null);
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
        <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
        <div className="text-gray-400 font-medium font-sans">Loading...</div>
        <div className="text-xs text-gray-300">Checking authentication...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to={user.role === 'student' ? '/student-dashboard' : user.role === 'professor' ? '/teacher-dashboard' : '/hod-dashboard'} />} />
      <Route path="/student-dashboard" element={user?.role === 'student' ? <StudentDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
      <Route path="/teacher-dashboard" element={user?.role === 'professor' ? <TeacherDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
      <Route
        path="/hod-dashboard"
        element={user?.role === 'hod' ? <HodDashboardLayout user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
      >
        <Route index element={<HodOverviewPage />} />
        <Route path="requests" element={<HodRequestsPage />} />
        <Route path="requests/:id" element={<HodRequestDetailPage />} />
        <Route path="students" element={<HodStudentsPage />} />
        <Route path="students/:studentId" element={<HodStudentProfilePage />} />
        <Route path="staff" element={<HodStaffPage />} />
        <Route path="certificates" element={<HodCertificatesPage />} />
        <Route path="reports" element={<HodReportsPage />} />
        <Route path="notifications" element={<HodNotificationsPage />} />
        <Route path="settings" element={<HodSettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </Router>
  );
}

export default App;
