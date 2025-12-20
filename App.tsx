
import React, { useState, useEffect } from 'react';
import { Login } from './pages/Login';
import { StudentDashboard } from './pages/StudentDashboard';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { User } from './types';
import { storageService } from './services/storageService';
import { isSupabaseConfigured } from './services/supabaseClient';
import { Database, AlertTriangle } from 'lucide-react';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(true);

  // Check session and configuration on mount
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsConfigured(false);
      setIsLoading(false);
      return;
    }

    const startupCheck = async () => {
      try {
        // Check for existing session
        const session = localStorage.getItem('unievent_session');
        if (session) {
          setUser(JSON.parse(session));
        }
      } catch (err) {
        console.error("Startup check failed", err);
      } finally {
        setIsLoading(false);
      }
    };
    startupCheck();
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('unievent_session', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('unievent_session');
  };

  // Setup Screen (Shown if keys are missing)
  if (!isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-orange-100 text-center">
          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Database className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Connect Database</h1>
          <p className="text-gray-600 mb-6">
            To use UniEvent, you need to connect your Supabase database.
          </p>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left mb-6">
            <div className="flex gap-2 text-yellow-800 font-semibold mb-2 items-center">
              <AlertTriangle className="w-4 h-4" /> Action Required
            </div>
            <p className="text-sm text-yellow-700 mb-2">
              Open <code className="bg-yellow-100 px-1 py-0.5 rounded font-mono text-yellow-900">services/supabaseClient.ts</code>
            </p>
            <ol className="list-decimal list-inside text-sm text-yellow-700 space-y-1">
              <li>Paste your <b>Project URL</b></li>
              <li>Paste your <b>Anon Key</b></li>
            </ol>
          </div>
          
          <button 
            onClick={() => window.location.reload()} 
            className="w-full bg-orange-600 text-white font-bold py-3 rounded-xl hover:bg-orange-700 transition-colors shadow-lg shadow-orange-200"
          >
            I've Updated the Code
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
        <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
        <div className="text-gray-400 font-medium font-sans">Loading UniEvent...</div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <>
      {user.role === 'STUDENT' ? (
        <StudentDashboard user={user} onLogout={handleLogout} />
      ) : (
        <TeacherDashboard user={user} onLogout={handleLogout} />
      )}
    </>
  );
}

export default App;
