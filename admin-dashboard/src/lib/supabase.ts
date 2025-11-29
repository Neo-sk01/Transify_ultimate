
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ijmfblfreogkcoxyoqcb.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqbWZibGZyZW9na2NveHlvcWNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MDQyMzIsImV4cCI6MjA3OTk4MDIzMn0.roeBFzsKfaPDsMWr1146QKUWL4NtTHps-HkSXi3hCFY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
