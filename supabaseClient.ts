import { createClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://ejjobdbywnolopistcvs.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqam9iZGJ5d25vbG9waXN0Y3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyODc4MDYsImV4cCI6MjA4Njg2MzgwNn0.SO1AcS_ULSQUbvRjhJVu0_Ptx6Z2YhJqTJ8KMJV51pw';

const getSafeEnv = (val: any): string | null => {
  if (!val) return null;
  const s = String(val).trim();
  if (s === '' || s === 'undefined' || s === 'null' || s.startsWith('PLACEHOLDER') || s.startsWith('__')) {
    return null;
  }
  return s;
};

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const envUrl = getSafeEnv(rawUrl);
const envKey = getSafeEnv(rawKey);

// Validar que comience con http:// o https://
const supabaseUrl = (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://')))
  ? envUrl
  : DEFAULT_URL;

const supabaseAnonKey = envKey ? envKey : DEFAULT_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

