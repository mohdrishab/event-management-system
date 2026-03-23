import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gcezppsaozyvxqmhyrxi.supabase.co';
const supabaseAnonKey = 'sb_publishable_21qAGJE8YqjKjaKKfy2jsg_mnkk1UBN';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
  // Try to select with different column names to discover the schema
  console.log('=== Checking Staff Table Columns ===');
  
  // First, let's see the structure of students table since we know it works
  const { data: studentSample } = await supabase
    .from('students')
    .select('*')
    .limit(1);
  
  console.log('Students columns:', studentSample?.[0] ? Object.keys(studentSample[0]) : 'no data');
  
  // Try basic insert without can_approve
  const staffData = [
    {
      id: 'h1',
      name: 'Dr. Strange',
      role: 'hod',
      password: 'staff123',
      department: 'Computer Science',
      is_active: true
    }
  ];

  const { data, error } = await supabase.from('staff').insert(staffData).select();

  if (error) {
    console.log('Insert Error:', error);
  } else {
    console.log('Inserted Staff:', JSON.stringify(data, null, 2));
  }
}

checkColumns();
