import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gcezppsaozyvxqmhyrxi.supabase.co';
const supabaseAnonKey = 'sb_publishable_21qAGJE8YqjKjaKKfy2jsg_mnkk1UBN';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const appId = '1db5823b-2899-4ec3-870a-3ed9902e44aa';
  const { data, error } = await supabase
    .from('applications')
    .update({ is_priority: true })
    .eq('id', appId)
    .select();
  console.log('Update Data:', data);
  console.log('Update Error:', error);
}

test();
