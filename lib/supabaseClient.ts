import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gcezppsaozyvxqmhyrxi.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_21qAGJE8YqjKjaKKfy2jsg_mnkk1UBN';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
