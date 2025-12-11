/**
 * Environment variable validation and configuration
 * Ensures all required environment variables are present
 */

interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

function validateEnv(): EnvConfig {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const isDevelopment = import.meta.env.DEV;
  const isProduction = import.meta.env.PROD;

  // In production, fail fast if required env vars are missing
  if (isProduction) {
    if (!supabaseUrl) {
      throw new Error('VITE_SUPABASE_URL is required but not set');
    }
    if (!supabaseAnonKey) {
      throw new Error('VITE_SUPABASE_ANON_KEY is required but not set');
    }
  }

  // Validate URL format
  if (supabaseUrl && !supabaseUrl.match(/^https?:\/\//)) {
    throw new Error('VITE_SUPABASE_URL must be a valid HTTP/HTTPS URL');
  }

  return {
    supabaseUrl: supabaseUrl || '',
    supabaseAnonKey: supabaseAnonKey || '',
    isDevelopment,
    isProduction,
  };
}

export const env = validateEnv();

