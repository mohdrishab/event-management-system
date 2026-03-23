import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://gcezppsaozyvxqmhyrxi.supabase.co', 'sb_publishable_21qAGJE8YqjKjaKKfy2jsg_mnkk1UBN');

async function check() {
  console.log('=== Checking Staff Table ===');
  const { data, error } = await supabase.from('staff').select('*');
  
  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Staff count:', data?.length || 0);
    console.log('Staff data:', JSON.stringify(data, null, 2));
  }
  
  // Also test the exact login query
  console.log('\n=== Testing Login Query ===');
  const { data: loginData, error: loginError } = await supabase
    .from('staff')
    .select('*')
    .eq('name', 'afeefa')
    .eq('password', 'staff123')
    .maybeSingle();
    
  if (loginError) {
    console.log('Login Error:', loginError.message);
  } else if (loginData) {
    console.log('Login Success:', loginData);
  } else {
    console.log('No match found for afeefa/staff123');
  }
}
check();
