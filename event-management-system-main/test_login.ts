import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gcezppsaozyvxqmhyrxi.supabase.co';
const supabaseAnonKey = 'sb_publishable_21qAGJE8YqjKjaKKfy2jsg_mnkk1UBN';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
  console.log('=== Testing Login Flow ===\n');
  
  // Test 1: Student login with USN
  console.log('Test 1: Student login with USN 4PA24IC001');
  const { data: student1, error: studentErr1 } = await supabase
    .from('students')
    .select('*')
    .eq('usn', '4PA24IC001')
    .eq('password', 'student123')
    .maybeSingle();
  
  if (studentErr1) {
    console.log('Error:', studentErr1.message);
  } else if (student1) {
    console.log('Success! Student:', student1.name);
    console.log('Role: student');
  } else {
    console.log('No match found');
  }
  
  console.log('\n---\n');
  
  // Test 2: Wrong password
  console.log('Test 2: Student login with wrong password');
  const { data: student2 } = await supabase
    .from('students')
    .select('*')
    .eq('usn', '4PA24IC001')
    .eq('password', 'wrongpassword')
    .maybeSingle();
  
  console.log(student2 ? 'Found (unexpected)' : 'No match (expected)');
  
  console.log('\n---\n');
  
  // Test 3: Staff login (should fail since staff table is empty)
  console.log('Test 3: Staff login (table empty)');
  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .eq('name', 'Dr. Strange')
    .eq('password', 'staff123')
    .maybeSingle();
  
  console.log(staff ? 'Found staff' : 'No staff found (expected - table empty)');
  
  console.log('\n=== Test Complete ===');
}

testLogin();
