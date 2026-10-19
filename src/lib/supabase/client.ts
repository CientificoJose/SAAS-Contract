import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://contract-db.press-cloud.com';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3OTI0NDEzNTYsImV4cCI6MTg5MzQ1NjAwMCwicm9sZSI6ImFub24iLCJpc3MiOiJzdXBhYmFzZSJ9.gQfq3u7FQ1QxL9ZFYN01lt4P89T5rlPgv2bf_Br4Je4';

  return createBrowserClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        apikey: supabaseKey
      }
    }
  });
}
