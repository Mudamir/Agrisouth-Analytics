/**
 * Environment variable validation and configuration
 * Ensures all required environment variables are present
 */

/** Decode `role` from a Supabase API JWT (anon vs service_role). Returns undefined if not a JWT. */
function decodeSupabaseApiKeyRole(apiKey: string): string | undefined {
  const parts = apiKey.split('.');
  if (parts.length < 2) return undefined;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json) as { role?: string };
    return typeof payload.role === 'string' ? payload.role : undefined;
  } catch {
    return undefined;
  }
}

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

  // Never ship the service_role secret to the browser: login and all DB calls use this client.
  if (supabaseAnonKey) {
    const keyRole = decodeSupabaseApiKeyRole(supabaseAnonKey);
    if (keyRole === 'service_role') {
      throw new Error(
        'VITE_SUPABASE_ANON_KEY must be the anon (public) key from Supabase Project Settings > API. Remove the service_role secret from env files and hosting variables; it must not be used in the Vite app.'
      );
    }
  }

  return {
    supabaseUrl: supabaseUrl || '',
    supabaseAnonKey: supabaseAnonKey || '',
    isDevelopment,
    isProduction,
  };
}

export const env = validateEnv();


