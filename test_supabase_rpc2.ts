import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gcezppsaozyvxqmhyrxi.supabase.co';
const supabaseAnonKey = 'sb_publishable_21qAGJE8YqjKjaKKfy2jsg_mnkk1UBN';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.rpc('update_application_status', {
    p_app_id: '789e65b6-b08a-481d-a15a-f4464929665e',
    p_status: 'approved',
    p_action_by: '42a30a10-627b-48e4-b254-ecd8a254951c',
    p_action_by_name: 'Dr Afeefa Nazneen'
  });
  console.log('RPC Data:', data);
  console.log('RPC Error:', error);
}

test();
