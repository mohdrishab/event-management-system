import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gcezppsaozyvxqmhyrxi.supabase.co';
const supabaseAnonKey = 'sb_publishable_21qAGJE8YqjKjaKKfy2jsg_mnkk1UBN';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .limit(1);
  console.log('Select Data:', data);
  console.log('Select Error:', error);
}

test();
