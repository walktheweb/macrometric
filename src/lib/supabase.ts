import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pmhzpztqhvxiadppuvkk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_oD2EnD2Iin1r6xsLJ8zdYg_G_fEXz5N';

const AUTH_STORAGE_MODE_KEY = 'macrometric_auth_storage_mode';

export type AuthStorageMode = 'local' | 'session';

export function getAuthStorageMode(): AuthStorageMode {
  if (typeof window === 'undefined') return 'local';
  const inSession = window.sessionStorage.getItem(AUTH_STORAGE_MODE_KEY);
  if (inSession === 'session') return 'session';
  return 'local';
}

export function setAuthStorageMode(mode: AuthStorageMode): void {
  if (typeof window === 'undefined') return;
  if (mode === 'session') {
    window.sessionStorage.setItem(AUTH_STORAGE_MODE_KEY, 'session');
    window.localStorage.removeItem(AUTH_STORAGE_MODE_KEY);
    return;
  }
  window.localStorage.setItem(AUTH_STORAGE_MODE_KEY, 'local');
  window.sessionStorage.removeItem(AUTH_STORAGE_MODE_KEY);
}

const authStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null;
    return getAuthStorageMode() === 'session'
      ? window.sessionStorage.getItem(key)
      : window.localStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    if (getAuthStorageMode() === 'session') {
      window.sessionStorage.setItem(key, value);
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, value);
    window.sessionStorage.removeItem(key);
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
  },
});
