import { createClient } from '@supabase/supabase-js';
import { env } from './env';
import { logger } from './logger';

// Ensure URL has https:// protocol
let supabaseUrl = env.supabaseUrl;
if (supabaseUrl && !supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
  supabaseUrl = `https://${supabaseUrl}`;
}

if (!supabaseUrl || !env.supabaseAnonKey) {
  if (env.isProduction) {
    logger.error('Supabase credentials are required in production');
    throw new Error('Missing Supabase configuration');
  } else {
    logger.warn('Supabase credentials not found. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
  }
}

export const supabase = supabaseUrl && env.supabaseAnonKey
  ? createClient(supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// Type for database record (matches Supabase schema)
export type DatabaseShippingRecord = {
  id: string;
  year: number;
  week: number;
  etd: string;
  pol: string;
  item: 'BANANAS' | 'PINEAPPLES';
  destination: string;
  supplier: string;
  s_line: string;
  container: string;
  pack: string;
  l_cont: number;
  cartons: number;
  price: number;
  type: 'CONTRACT' | 'SPOT';
  customer_name?: string | null;
  invoice_no?: string | null;
  invoice_date?: string | null;
  vessel?: string | null;
  billing_no?: string | null;
  created_at: string;
  updated_at: string;
};

