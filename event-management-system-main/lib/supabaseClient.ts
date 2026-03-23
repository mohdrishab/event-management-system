import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gcezppsaozyvxqmhyrxi.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_21qAGJE8YqjKjaKKfy2jsg_mnkk1UBN';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Debug helper for authentication state
export const debugAuthState = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  console.log('[Auth Debug] Session:', session ? 'EXISTS' : 'NULL');
  console.log('[Auth Debug] User ID:', session?.user?.id || 'N/A');
  console.log('[Auth Debug] Error:', error?.message || 'None');
  return { session, error };
};
