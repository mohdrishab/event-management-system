import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gcezppsaozyvxqmhyrxi.supabase.co';
const supabaseAnonKey = 'sb_publishable_21qAGJE8YqjKjaKKfy2jsg_mnkk1UBN';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase
    .from('applications')
    .insert({
      student_id: '4c78547e-06cd-4eb2-a0cb-987884c5519c',
      start_date: '2026-05-10',
      end_date: '2026-05-12',
      event_name: 'Test Event',
      status: 'pending'
    })
    .select();
  console.log('Insert Data:', data);
  console.log('Insert Error:', error);
}

test();
