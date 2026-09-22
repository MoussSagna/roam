import { readStorage, STORAGE_KEYS, writeStorage } from '@/lib/storage';

/**
 * Persists the mocked session across app restarts, reusing the same storage abstraction as the
 * theme/language preferences (`theme/preferences.ts`) — no backend yet, so this boolean is the
 * closest thing to "being logged in" (`docs/DECISIONS.md`).
 */
export async function getStoredSession(): Promise<boolean> {
  return (await readStorage(STORAGE_KEYS.session)) === 'true';
}

export async function storeSession(isLoggedIn: boolean): Promise<void> {
  await writeStorage(STORAGE_KEYS.session, isLoggedIn ? 'true' : 'false');
}
