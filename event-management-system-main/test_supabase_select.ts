import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gcezppsaozyvxqmhyrxi.supabase.co';
const supabaseAnonKey = 'sb_publishable_21qAGJE8YqjKjaKKfy2jsg_mnkk1UBN';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const appId = '789e65b6-b08a-481d-a15a-f4464929665e';
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('id', appId);
  console.log('Select Data:', data);
  console.log('Select Error:', error);
}

test();
