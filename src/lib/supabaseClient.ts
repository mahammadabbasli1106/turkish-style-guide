import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Hardcoded external Supabase project credentials
const SUPABASE_URL = "https://bqlynbxecgnrhfvkpvyz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxbHluYnhlY2ducmhmdmtwdnl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NTY2MzEsImV4cCI6MjA4NjIzMjYzMX0.HPLfdshYk3VZYwI5wM4G5b2L5bpOthNU2fHkNNDzVD8";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
