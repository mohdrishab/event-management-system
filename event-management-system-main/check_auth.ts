import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gcezppsaozyvxqmhyrxi.supabase.co';
const supabaseAnonKey = 'sb_publishable_21qAGJE8YqjKjaKKfy2jsg_mnkk1UBN';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAuth() {
  // Try to list users - this might not work with anon key
  console.log('=== Testing Auth Login ===');
  
  // Test with a student USN pattern
  const testEmails = [
    '4PA24IC001@student.com',
    'afeefa@example.com',
    'afeefa@gmail.com'
  ];

  for (const email of testEmails) {
    console.log(`\nTrying: ${email}`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: 'student123'
    });
    
    if (error) {
      console.log(`Error: ${error.message}`);
    } else {
      console.log(`Success! User ID: ${data.user?.id}`);
      // Sign out immediately
      await supabase.auth.signOut();
    }
  }
}

checkAuth();
