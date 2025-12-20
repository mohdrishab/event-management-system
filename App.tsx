
import React, { useState, useEffect } from 'react';
import { Login } from './pages/Login';
import { StudentDashboard } from './pages/StudentDashboard';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { User } from './types';
import { storageService } from './services/storageService';
import { isSupabaseConfigured } from './services/supabaseClient';
import { Database, AlertTriangle, Terminal, CheckCircle, Copy } from 'lucide-react';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(true);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const startupCheck = async () => {
    setIsLoading(true);
    
    if (!isSupabaseConfigured()) {
      setIsConfigured(false);
      setIsLoading(false);
      return;
    }

    try {
      const dbCheck = await storageService.checkDatabaseConnection();
      
      // PGRST205 means table does not exist
      if (!dbCheck.ok && dbCheck.code === 'PGRST205') {
        setSchemaMissing(true);
      } else if (dbCheck.ok) {
        setSchemaMissing(false);
        const session = localStorage.getItem('unievent_session');
        if (session) {
          setUser(JSON.parse(session));
        }
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
    localStorage.setItem('unievent_session', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('unievent_session');
  };

  const copySql = () => {
    navigator.clipboard.writeText(storageService.REQUIRED_SQL);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // 1. Connection Required Screen
  if (!isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-orange-100 text-center">
          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Database className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Connect Database</h1>
          <p className="text-gray-600 mb-6">Connect your Supabase project to get started.</p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left mb-6">
            <p className="text-sm text-yellow-700">Open <b>services/supabaseClient.ts</b> and add your URL and Anon Key.</p>
          </div>
          <button onClick={() => window.location.reload()} className="w-full bg-orange-600 text-white font-bold py-3 rounded-xl shadow-lg">Refresh</button>
        </div>
      </div>
    );
  }

  // 2. Schema Missing Screen (Setup Wizard)
  if (schemaMissing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4 font-sans">
        <div className="max-w-2xl w-full bg-gray-800 rounded-3xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-8 bg-gradient-to-r from-orange-600 to-orange-500 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Terminal className="w-6 h-6" />
              <h1 className="text-2xl font-bold">SQL Setup Required</h1>
            </div>
            <p className="text-orange-100">Tables are missing in your Supabase database. Follow these steps:</p>
          </div>
          
          <div className="p-8 space-y-6 flex-1 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center font-bold shrink-0">1</div>
                <p className="text-gray-300">Open your <b>Supabase Dashboard</b> and go to the <b>SQL Editor</b>.</p>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center font-bold shrink-0">2</div>
                <p className="text-gray-300">Create a <b>New Query</b> and paste the code below.</p>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center font-bold shrink-0">3</div>
                <p className="text-gray-300">Click <b>Run</b> to create the tables and RLS policies.</p>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute top-4 right-4 z-10">
                <button 
                  onClick={copySql}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-all"
                >
                  {isCopied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  {isCopied ? 'Copied!' : 'Copy SQL'}
                </button>
              </div>
              <pre className="bg-gray-950 p-6 rounded-2xl text-orange-400 font-mono text-sm overflow-x-auto border border-gray-800 max-h-60">
                {storageService.REQUIRED_SQL.trim()}
              </pre>
            </div>
          </div>

          <div className="p-8 bg-gray-800/50 border-t border-gray-700">
             <button 
                onClick={startupCheck}
                className="w-full bg-white text-gray-900 font-bold py-4 rounded-2xl hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
              >
                I've Run the SQL, Re-check Connection
              </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
        <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
        <div className="text-gray-400 font-medium font-sans">Checking Connection...</div>
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
