
import React, { useState } from 'react';
import { User } from '../types';
import { Button } from '../components/Button';
import { GraduationCap, Loader2, ShieldAlert, UserIcon, Lock } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface LoginProps {
  onLogin: (user: User) => void;
}

// Fallback staff credentials for testing (when Supabase staff table is empty)
// Using proper UUIDs that match the database CSV data
const FALLBACK_STAFF: Record<string, { id: string; name: string; password: string; role: 'professor' | 'hod'; department: string }> = {
  'afeefa': { id: '42a30a10-627b-48e4-b254-ecd8a254951c', name: 'Dr Afeefa Nazneen', password: 'staff123', role: 'professor', department: 'CSE-ICSB' },
  'shamna': { id: '812efc60-deaf-4920-902a-bb3634deef9b', name: 'Dr Shamna N V', password: 'admin123', role: 'hod', department: 'CSE-ICSB' },
  'thofa': { id: 'b7b3b93a-48a0-4df3-9314-0f13be6a52e4', name: 'Dr Thofa Aysha', password: 'staff123', role: 'professor', department: 'CSE-ICSB' },
  'arshad': { id: 'e4ac98a1-e873-448a-9230-03caef52355d', name: 'Dr Mohammed Arshad', password: 'staff123', role: 'professor', department: 'CSE-ICSB' },
};

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const inputClasses = "w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400 shadow-sm font-medium pl-11";

  // Generate email from username for Supabase Auth
  const generateEmail = (username: string, isStudent: boolean): string => {
    const cleanUsername = username.toLowerCase().replace(/\s+/g, '');
    return isStudent 
      ? `${cleanUsername}@student.unievent.com` 
      : `${cleanUsername}@staff.unievent.com`;
  };

  // Helper to upsert profile
  const upsertProfile = async (userId: string, profileData: {
    name: string;
    email: string;
    role: string;
    department?: string;
  }) => {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        name: profileData.name,
        email: profileData.email,
        role: profileData.role,
        department: profileData.department,
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('[Login] Profile upsert error:', error.message);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const trimmedUsername = username.trim().toLowerCase();
      const trimmedPassword = password.trim();
      console.log('[Login] Starting login for username:', trimmedUsername);
      
      // Step 1: Check students table by USN and password
      console.log('[Login] Checking students table for USN:', trimmedUsername);
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('usn', trimmedUsername.toUpperCase())
        .eq('password', trimmedPassword)
        .maybeSingle();

      if (studentError) {
        console.error('[Login] Student lookup error:', studentError.message);
      }

      if (studentData) {
        console.log('[Login] Found student:', studentData.name, 'USN:', studentData.usn);
        
        // Generate email and create/sign in with Supabase Auth
        const email = generateEmail(studentData.usn, true);
        
        // Try to sign in first
        let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: email,
          password: trimmedPassword,
        });

        // If sign in fails (user doesn't exist), create the user
        if (authError && (authError.message.includes('Invalid login credentials') || authError.message.includes('User not found'))) {
          console.log('[Login] User not found in auth, creating...');
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: email,
            password: trimmedPassword,
          });

          if (signUpError) {
            console.error('[Login] Sign up error:', signUpError.message);
            // Try sign in again in case user already exists
            const retry = await supabase.auth.signInWithPassword({
              email: email,
              password: trimmedPassword,
            });
            authData = retry.data;
            authError = retry.error;
          } else {
            authData = signUpData;
            authError = null;
          }
        }

        if (authError || !authData?.user) {
          console.error('[Login] Auth failed:', authError?.message);
          // Fallback: allow login without auth session (for testing)
          console.log('[Login] Using fallback login (no auth session)');
          
          // Update students table with user_id if not set
          const user: User = {
            id: studentData.id,
            user_id: null,
            name: studentData.name,
            usn: studentData.usn,
            role: 'student',
            department: studentData.department,
            year: studentData.year,
          };
          
          console.log('[Login] Student login successful (fallback)');
          onLogin(user);
          return;
        }

        // Update students table with user_id if not set
        if (!studentData.user_id && authData.user.id) {
          await supabase
            .from('students')
            .update({ user_id: authData.user.id })
            .eq('id', studentData.id);
        }

        // Create profile if not exists
        await upsertProfile(authData.user.id, {
          name: studentData.name,
          email: email,
          role: 'student',
          department: studentData.department,
        });

        const user: User = {
          id: studentData.id,
          user_id: authData.user.id,
          name: studentData.name,
          usn: studentData.usn,
          role: 'student',
          department: studentData.department,
          year: studentData.year,
        };
        
        console.log('[Login] Student login successful');
        onLogin(user);
        return;
      }

      // Step 2: Check staff table by username and password
      console.log('[Login] Checking staff table for username:', trimmedUsername);
      let { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('username', trimmedUsername)
        .eq('password', trimmedPassword)
        .maybeSingle();

      if (staffError) {
        console.error('[Login] Staff lookup error:', staffError.message);
      }

      // Step 3: Fallback to hardcoded staff credentials if table is empty
      if (!staffData && FALLBACK_STAFF[trimmedUsername]) {
        const fallback = FALLBACK_STAFF[trimmedUsername];
        if (fallback.password === trimmedPassword) {
          console.log('[Login] Using fallback credentials for:', trimmedUsername);
          staffData = {
            id: fallback.id, // Use proper UUID from CSV data
            name: fallback.name,
            username: trimmedUsername,
            password: fallback.password,
            role: fallback.role,
            department: fallback.department,
            is_active: true,
          };
        }
      }

      if (!staffData) {
        console.error('[Login] No profile found in students or staff tables');
        setError('Invalid username or password. Please try again.');
        setLoading(false);
        return;
      }

      // Check if staff is active
      if (staffData.is_active === false) {
        setError('Your account is deactivated. Please contact administrator.');
        setLoading(false);
        return;
      }

      // Determine role
      const role = String(staffData.role || '').trim().toLowerCase();
      console.log('[Login] Found staff/HoD:', staffData.name, 'Role:', role);

      if (role !== 'hod' && role !== 'professor' && role !== 'staff') {
        console.error('[Login] Invalid role detected:', role);
        setError('Your account role is not recognized. Please contact the administrator.');
        setLoading(false);
        return;
      }

      // Generate email and create/sign in with Supabase Auth
      const email = generateEmail(staffData.username || trimmedUsername, false);
      
      // Try to sign in first
      let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: trimmedPassword,
      });

      // If sign in fails (user doesn't exist), create the user
      if (authError && (authError.message.includes('Invalid login credentials') || authError.message.includes('User not found'))) {
        console.log('[Login] Staff not found in auth, creating...');
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email,
          password: trimmedPassword,
        });

        if (signUpError) {
          console.error('[Login] Sign up error:', signUpError.message);
          // Try sign in again
          const retry = await supabase.auth.signInWithPassword({
            email: email,
            password: trimmedPassword,
          });
          authData = retry.data;
          authError = retry.error;
        } else {
          authData = signUpData;
          authError = null;
        }
      }

      // Get auth user ID (or null for fallback)
      const authUserId = authData?.user?.id || null;

      // Update staff table with user_id if not set (skip for fallback staff)
      if (authUserId && staffData.id && !staffData.id.startsWith('fallback-')) {
        await supabase
          .from('staff')
          .update({ user_id: authUserId })
          .eq('id', staffData.id);
      }

      // Create profile if not exists (skip for fallback staff)
      if (authUserId && !staffData.id?.startsWith('fallback-')) {
        await upsertProfile(authUserId, {
          name: staffData.name,
          email: email,
          role: role === 'hod' ? 'hod' : 'professor',
          department: staffData.department,
        });
      }

      const userRole: 'professor' | 'hod' = role === 'hod' ? 'hod' : 'professor';
      const user: User = {
        id: staffData.id,
        user_id: authUserId,
        name: staffData.name,
        role: userRole,
        department: staffData.department,
        canApprove: userRole === 'hod',
      };

      console.log('[Login] Staff/HoD login successful. Role:', userRole);
      onLogin(user);

    } catch (err: any) {
      console.error('[Login] Unexpected error:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-0 w-full h-[60%] bg-gradient-to-br from-orange-500 to-orange-700 -z-10 rounded-b-[60px] shadow-2xl transition-all duration-700"></div>
      
      <div className="bg-white/95 backdrop-blur-md rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden z-10 border border-white/20 flex flex-col">
        
        {/* Header */}
        <div className="bg-gray-100/50 p-6 rounded-t-[32px] m-4 mb-0 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Welcome Back</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">
            Sign in to access your dashboard
          </p>
        </div>

        <div className="p-8 pt-6">
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
                Username
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  required
                  placeholder="Enter your username (USN for students)"
                  className={inputClasses}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5 ml-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
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
            </div>
            
            <Button 
              type="submit" 
              fullWidth 
              disabled={loading} 
              size="lg" 
              className="rounded-2xl py-4 shadow-xl mt-2 transition-all bg-orange-600 hover:bg-orange-700 shadow-orange-100"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              Students: Use your USN | Staff/HoD: Use your username
            </p>
            <p className="text-[10px] text-gray-300 mt-1">
              Demo: afeefa/staff123 (Staff) | shamna/admin123 (HoD) | 4PA24IC001/student123 (Student)
            </p>
          </div>
        </div>
      </div>
      
      {/* Version Tag */}
      <div className="absolute bottom-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        UniEvent Secure Portal
      </div>
    </div>
  );
};
