import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  (import.meta as any).env?.EXPO_PUBLIC_SUPABASE_URL ||
  'https://ohaartcdjulywktqjzqp.supabase.co';

const supabaseAnonKey =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  (import.meta as any).env?.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oYWFydGNkanVseXdrdHFqenFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NTQ1ODIsImV4cCI6MjEwMzMzMDU4Mn0.yHiweBzFjowP7BbnLqRxh1Ytc61C91dZ0YK6ZBqM-mI';

/**
 * Web Admin Authoritative Supabase Client
 * Uses standard browser LocalStorage and autoRefreshToken for secure session persistence.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
