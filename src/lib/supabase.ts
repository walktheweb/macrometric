import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pmhzpztqhvxiadppuvkk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_oD2EnD2Iin1r6xsLJ8zdYg_G_fEXz5N';

const AUTH_STORAGE_MODE_KEY = 'macrometric_auth_storage_mode';
const memoryStorage = new Map<string, string>();

const safeGet = (storage: Storage, key: string): string | null => {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (storage: Storage, key: string, value: string): void => {
  try {
    storage.setItem(key, value);
  } catch {
    // Ignore storage write failures (e.g. strict privacy mode)
  }
};

const safeRemove = (storage: Storage, key: string): void => {
  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage remove failures
  }
};

export type AuthStorageMode = 'local' | 'session';

export function getAuthStorageMode(): AuthStorageMode {
  if (typeof window === 'undefined') return 'local';
  const inSession = safeGet(window.sessionStorage, AUTH_STORAGE_MODE_KEY);
  if (inSession === 'session') return 'session';
  const inLocal = safeGet(window.localStorage, AUTH_STORAGE_MODE_KEY);
  if (inLocal === 'local') return 'local';
  return 'local';
}

export function setAuthStorageMode(mode: AuthStorageMode): void {
  if (typeof window === 'undefined') return;
  if (mode === 'session') {
    safeSet(window.sessionStorage, AUTH_STORAGE_MODE_KEY, 'session');
    safeRemove(window.localStorage, AUTH_STORAGE_MODE_KEY);
    return;
  }
  safeSet(window.localStorage, AUTH_STORAGE_MODE_KEY, 'local');
  safeRemove(window.sessionStorage, AUTH_STORAGE_MODE_KEY);
}

const authStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null;
    const value = getAuthStorageMode() === 'session'
      ? safeGet(window.sessionStorage, key)
      : safeGet(window.localStorage, key);
    return value ?? memoryStorage.get(key) ?? null;
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    memoryStorage.set(key, value);
    if (getAuthStorageMode() === 'session') {
      safeSet(window.sessionStorage, key, value);
      safeRemove(window.localStorage, key);
      return;
    }
    safeSet(window.localStorage, key, value);
    safeRemove(window.sessionStorage, key);
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return;
    memoryStorage.delete(key);
    safeRemove(window.localStorage, key);
    safeRemove(window.sessionStorage, key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
  },
});
