import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gcezppsaozyvxqmhyrxi.supabase.co';
const supabaseAnonKey = 'sb_publishable_21qAGJE8YqjKjaKKfy2jsg_mnkk1UBN';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'afeefa@gmail.com',
    password: 'staff123',
  });
  console.log('Auth Data:', data);
  console.log('Auth Error:', error);
}

test();
