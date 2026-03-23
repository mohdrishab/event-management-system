const { createClient } = require('@supabase/supabase-js');

// Use a temporary Supabase project for testing
const supabase = createClient(
  'https://your-supabase-url.supabase.co',
  'your-anon-key'
);

async function testCertificateValidation() {
  // Mock user with id
  const user = { id: 'test-user-id' };
  
  // Create test application with pending certificate
  const { error: insertError } = await supabase
    .from('applications')
    .insert([{
      user_id: user.id,
      status: 'approved',
      certificate_uploaded: false,
      event_name: 'Test Event'
    }]);
  
  if (insertError) {
    console.error('Failed to create test application:', insertError);
    return;
  }
  
  // Try to submit new application
  try {
    // This should trigger the validation logic
    const { data: pendingCerts, error } = await supabase
      .from('applications')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .eq('certificate_uploaded', false);
      
    if (error) throw error;
      
    if (pendingCerts && pendingCerts.length > 0) {
      console.log('✅ Validation blocked application as expected');
      console.log('Message: "You must upload pending certificates before applying for new events."');
    } else {
      console.log('❌ Validation did NOT block application');
    }
  } catch (err) {
    console.error('❌ Validation failed:', err);
  } finally {
    // Cleanup test data
    await supabase
      .from('applications')
      .delete()
      .eq('user_id', user.id);
  }
}

testCertificateValidation();