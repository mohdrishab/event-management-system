import React, { useState } from 'react';
import { storageService } from '../services/storageService';
import { User, Role } from '../types';
import { Button } from '../components/Button';
import { GraduationCap, Briefcase, UserPlus, Loader2 } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<Role>('STUDENT');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regUsn, setRegUsn] = useState('');
  const [regPass, setRegPass] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const inputClasses = "w-full px-4 py-3 bg-white border border-gray-800 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400 shadow-sm";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    
    try {
      const user = await storageService.login(identifier.trim(), password);
      
      if (user) {
        // Validation Logic
        const isStudentTab = activeTab === 'STUDENT';
        const isTeacherTab = activeTab === 'TEACHER';
        
        // Allow HOD to login via Faculty tab (Role is HOD, but tab is TEACHER)
        const isStudentUser = user.role === 'STUDENT';
        const isStaffUser = user.role === 'TEACHER' || user.role === 'HOD';

        if (isStudentTab && isStudentUser) {
          onLogin(user);
        } else if (isTeacherTab && isStaffUser) {
          onLogin(user);
        } else {
          setError(`Found account but role is ${user.role}. Please switch tabs.`);
        }
      } else {
        // User not found or password incorrect
        const allUsers = await storageService.getUsers();
        if (allUsers.length === 0) {
             setError('Database is empty. Please contact system administrator.');
        } else {
             setError('Invalid credentials. Please check your inputs.');
        }
      }
    } catch (err) {
      setError('An error occurred during login. Check your connection.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (regName && regUsn && regPass) {
      setLoading(true);
      try {
        const newUser = await storageService.registerStudent(regName.trim(), regUsn.trim(), regPass);
        onLogin(newUser);
      } catch (err: any) {
        setError(err.message || 'Registration failed.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4 relative">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden z-10 border border-gray-100">
        
        {/* Header Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => { setActiveTab('STUDENT'); setIsRegistering(false); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'STUDENT' ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-600' : 'text-gray-500 hover:text-gray-700 bg-gray-50/50'
            }`}
          >
            <GraduationCap className="w-4 h-4" /> Student
          </button>
          <button
            onClick={() => { setActiveTab('TEACHER'); setIsRegistering(false); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'TEACHER' ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-600' : 'text-gray-500 hover:text-gray-700 bg-gray-50/50'
            }`}
          >
            <Briefcase className="w-4 h-4" /> Faculty / HOD
          </button>
        </div>

        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-800">
              {activeTab === 'STUDENT' ? (isRegistering ? 'Student Registration' : 'Student Login') : 'Faculty Portal'}
            </h1>
            <p className="text-gray-500 text-sm mt-2">
              {activeTab === 'STUDENT' 
                ? 'Manage your event leave applications' 
                : 'Review and manage student requests'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4 text-center border border-red-100 animate-fade-in">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="bg-green-50 text-green-600 text-sm p-3 rounded-lg mb-4 text-center border border-green-100 animate-fade-in">
              {successMsg}
            </div>
          )}

          {activeTab === 'STUDENT' && isRegistering ? (
            <form onSubmit={handleRegister} className="space-y-4">
               <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter Full Name"
                  className={inputClasses}
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">USN</label>
                <input
                  type="text"
                  required
                  placeholder="Enter USN"
                  className={inputClasses}
                  value={regUsn}
                  onChange={(e) => setRegUsn(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  placeholder="Create Password"
                  className={inputClasses}
                  value={regPass}
                  onChange={(e) => setRegPass(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button type="submit" fullWidth disabled={loading} className="mt-2">
                 {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
              </Button>
              <div className="text-center mt-4">
                <button type="button" onClick={() => setIsRegistering(false)} className="text-sm text-orange-600 hover:underline">
                  Already have an account? Login
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  {activeTab === 'STUDENT' ? 'USN / Name' : 'Faculty ID / Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={activeTab === 'STUDENT' ? 'Enter USN or Name' : 'Enter Faculty Name'}
                  className={inputClasses}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter Password"
                  className={inputClasses}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              
              <Button type="submit" fullWidth disabled={loading} className="mt-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
              </Button>

              {activeTab === 'STUDENT' && (
                <div className="text-center mt-3">
                  <button type="button" onClick={() => setIsRegistering(true)} className="text-sm text-orange-600 hover:underline flex items-center justify-center gap-1 mx-auto font-medium">
                    <UserPlus className="w-4 h-4" /> New Student? Register
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};