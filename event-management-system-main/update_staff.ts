import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gcezppsaozyvxqmhyrxi.supabase.co';
const supabaseAnonKey = 'sb_publishable_21qAGJE8YqjKjaKKfy2jsg_mnkk1UBN';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function updateStaff() {
  console.log('=== Checking and Updating Staff ===');

  // First check if afeefa exists
  const { data: existing } = await supabase
    .from('staff')
    .select('*')
    .eq('name', 'afeefa')
    .maybeSingle();

  if (existing) {
    console.log('Found existing afeefa record, updating password...');
    const { data, error } = await supabase
      .from('staff')
      .update({ password: 'staff123' })
      .eq('name', 'afeefa')
      .select();

    if (error) {
      console.log('Update Error:', error.message);
    } else {
      console.log('Updated:', data);
    }
  } else {
    console.log('No existing record. Staff table is empty.');
    console.log('You need to add staff data via Supabase dashboard or SQL.');
    console.log('\nRun this SQL in Supabase SQL Editor:');
    console.log(`
INSERT INTO staff (id, name, role, password, department, is_active)
VALUES 
  (gen_random_uuid(), 'afeefa', 'professor', 'staff123', 'Computer Science', true),
  (gen_random_uuid(), 'Dr. Strange', 'hod', 'staff123', 'Computer Science', true);
    `);
  }

  // Verify current staff data
  console.log('\n=== Current Staff Table ===');
  const { data: allStaff } = await supabase.from('staff').select('*');
  console.log('Staff records:', allStaff);
}

updateStaff();
