
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

  const startupCheck = async () => {
    setIsLoading(true);
    try {
      const session = localStorage.getItem('user');
      if (session) {
        setUser(JSON.parse(session));
      }
    } catch (err) {
      console.error("Startup check failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    startupCheck();
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    
    if (loggedInUser.role === 'student') {
      navigate('/student-dashboard');
    } else if (loggedInUser.role === 'professor') {
      navigate('/teacher-dashboard');
    } else if (loggedInUser.role === 'hod') {
      navigate('/hod-dashboard');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
        <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
        <div className="text-gray-400 font-medium font-sans">Loading...</div>
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
