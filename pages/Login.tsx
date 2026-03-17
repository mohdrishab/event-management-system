
import React, { useState } from 'react';
import { User } from '../types';
import { Button } from '../components/Button';
import { GraduationCap, Briefcase, Loader2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<'student' | 'professor' | 'hod'>('student');
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const inputClasses = "w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400 shadow-sm font-medium";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (activeTab === 'student') {
        const { data, error: dbError } = await supabase
          .from('students')
          .select('*')
          .eq('usn', identifier.trim())
          .eq('password', password)
          .single();

        if (dbError || !data) {
          setError('Invalid USN/Password. Please try again.');
        } else {
          onLogin({
            id: data.id,
            name: data.name,
            usn: data.usn,
            role: 'student'
          });
        }
      } else {
        const { data, error: dbError } = await supabase
          .from('staff')
          .select('*')
          .eq('username', identifier.trim())
          .eq('password', password.trim())
          .eq('role', activeTab)
          .maybeSingle();

        if (dbError || !data) {
          setError(`Invalid professor credentials. Please try again.`);
        } else {
          onLogin({
            id: data.id,
            name: data.name,
            role: data.role
          });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className={`absolute top-0 left-0 w-full h-[60%] bg-gradient-to-br ${activeTab === 'student' ? 'from-orange-500 to-orange-700' : 'from-blue-600 to-blue-800'} -z-10 rounded-b-[60px] shadow-2xl transition-all duration-700`}></div>
      
      <div className="bg-white/95 backdrop-blur-md rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden z-10 border border-white/20 flex flex-col">
        
        {/* Navigation Tabs */}
        <div className="flex bg-gray-100/50 p-2 rounded-t-[32px] m-4 mb-0">
          <button
            onClick={() => { setActiveTab('student'); setError(''); setIdentifier(''); setPassword(''); }}
            className={`flex-1 py-3.5 text-sm font-bold flex items-center justify-center gap-2 rounded-2xl transition-all ${
              activeTab === 'student' ? 'bg-white text-orange-600 shadow-lg' : 'text-gray-500 hover:bg-gray-100/80'
            }`}
          >
            <GraduationCap className="w-4 h-4" /> Student
          </button>
          <button
            onClick={() => { setActiveTab('professor'); setError(''); setIdentifier(''); setPassword(''); }}
            className={`flex-1 py-3.5 text-sm font-bold flex items-center justify-center gap-2 rounded-2xl transition-all ${
              activeTab === 'professor' ? 'bg-white text-blue-600 shadow-lg' : 'text-gray-500 hover:bg-gray-100/80'
            }`}
          >
            <Briefcase className="w-4 h-4" /> Staff
          </button>
          <button
            onClick={() => { setActiveTab('hod'); setError(''); setIdentifier(''); setPassword(''); }}
            className={`flex-1 py-3.5 text-sm font-bold flex items-center justify-center gap-2 rounded-2xl transition-all ${
              activeTab === 'hod' ? 'bg-white text-blue-600 shadow-lg' : 'text-gray-500 hover:bg-gray-100/80'
            }`}
          >
            <ShieldAlert className="w-4 h-4" /> HoD
          </button>
        </div>

        <div className="p-8 pt-6">
          <div className="mb-8 text-center sm:text-left">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {activeTab === 'student' ? 'Welcome back' : activeTab === 'professor' ? 'Staff Portal' : 'HoD Portal'}
            </h1>
            <p className="text-gray-500 text-sm mt-1.5 font-medium">
              {activeTab === 'student' 
                ? 'Sign in to your student dashboard' 
                : 'Enter your credentials to manage applications'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-4 rounded-2xl mb-6 border border-red-100 animate-fade-in flex flex-col gap-3">
              <div className="flex items-center gap-2 font-bold">
                <ShieldAlert className="w-4 h-4" />
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">
                {activeTab === 'student' ? 'USN' : 'Username'}
              </label>
              <input
                type="text"
                required
                placeholder={activeTab === 'student' ? 'Enter USN' : 'Enter Username'}
                className={inputClasses}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                className={inputClasses}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            
            <Button 
              type="submit" 
              fullWidth 
              disabled={loading} 
              size="lg" 
              className={`rounded-2xl py-4 shadow-xl mt-2 transition-all ${activeTab === 'student' ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-100' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'}`}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
            </Button>
          </form>
        </div>
      </div>
      
      {/* Version Tag */}
      <div className="absolute bottom-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        UniEvent Secure Portal
      </div>
    </div>
  );
};
