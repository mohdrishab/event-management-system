import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gcezppsaozyvxqmhyrxi.supabase.co';
const supabaseAnonKey = 'sb_publishable_21qAGJE8YqjKjaKKfy2jsg_mnkk1UBN';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('=== Testing Students Table ===');
  const { data: students, error: studentError } = await supabase
    .from('students')
    .select('*')
    .limit(3);

  if (studentError) {
    console.log('Students Error:', studentError);
  } else {
    console.log('Students Data:', JSON.stringify(students, null, 2));
  }

  console.log('\n=== Testing Staff Table ===');
  const { data: staff, error: staffError } = await supabase
    .from('staff')
    .select('*')
    .limit(3);

  if (staffError) {
    console.log('Staff Error:', staffError);
  } else {
    console.log('Staff Data:', JSON.stringify(staff, null, 2));
  }
}

test();
