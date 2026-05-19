/**
 * Firebase has been replaced by Supabase.
 * This file is kept so any stale import paths don't crash the bundler
 * with a hard "module not found" error.
 *
 * All real database / auth / storage logic now lives in:
 *   src/config/supabase.js
 *   src/services/databaseService.js
 *   src/services/authService.js
 *   src/services/storageService.js
 */
export const auth    = null;
export const db      = null;
export const storage = null;
