import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ufaiyxnpxnxhvdhimvop.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmYWl5eG5weG54aHZkaGltdm9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMjY4NDMsImV4cCI6MjA4MDcwMjg0M30.Id218k7vwDC13AdhJzMAkSRM0bZg2rdeXtIawnUe_Q4';

// Helper to check if keys have been set
export const isSupabaseConfigured = () => {
  // Check if URL contains supabase.co and key is of sufficient length
  return SUPABASE_URL.includes('supabase.co') && SUPABASE_ANON_KEY.length > 20;
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);