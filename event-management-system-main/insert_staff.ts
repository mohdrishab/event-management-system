import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gcezppsaozyvxqmhyrxi.supabase.co';
const supabaseAnonKey = 'sb_publishable_21qAGJE8YqjKjaKKfy2jsg_mnkk1UBN';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function insertStaff() {
  console.log('=== Inserting Staff Data ===');
  
  const staffData = [
    {
      id: 'h1',
      name: 'Dr. Strange',
      role: 'hod',
      password: 'staff123',
      department: 'Computer Science',
      can_approve: true,
      is_active: true
    },
    {
      id: 't1',
      name: 'Prof. Albus',
      role: 'professor',
      password: 'staff123',
      department: 'Computer Science',
      can_approve: true,
      is_active: true
    },
    {
      id: 't2',
      name: 'Prof. Snape',
      role: 'professor',
      password: 'staff123',
      department: 'Computer Science',
      can_approve: false,
      is_active: true
    },
    {
      id: 't3',
      name: 'Prof. McGonagall',
      role: 'professor',
      password: 'staff123',
      department: 'Computer Science',
      can_approve: false,
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

insertStaff();
