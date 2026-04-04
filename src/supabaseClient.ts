import { createClient } from '@supabase/supabase-js';

// ඔයාගේ Supabase Project Settings -> API එකේ තියෙන URL සහ Anon Key එක මෙතන දාන්න
const supabaseUrl = 'https://ozbeyvqaxerstipdehkb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96YmV5dnFheGVyc3RpcGRlaGtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwODA2MTEsImV4cCI6MjA4NTY1NjYxMX0.TtNi2wGzeHpdSlJ1HI5mYiD7970yhpw9xyajRX5y5qk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);