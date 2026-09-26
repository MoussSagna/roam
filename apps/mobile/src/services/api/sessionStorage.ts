import * as SecureStore from 'expo-secure-store';

/**
 * Where the API session token lives on the device. Only the API repositories know it exists: screens,
 * hooks and the auth context never read the token (`apps/api/apidocs/AUTHENTICATION.md` → "Token handling
 * on the device": `expo-secure-store`, never AsyncStorage; dropped on 401 and on logout).
 *
 * The token is never logged, never put in an error, never written anywhere else. The password is never
 * stored at all.
 */
export interface SessionStorage {
  getToken(): Promise<string | null>;
  setToken(token: string): Promise<void>;
  clearToken(): Promise<void>;
}

const TOKEN_KEY = 'roam.session.token';

/**
 * Keychain (iOS) / Keystore-encrypted storage (Android), with an in-memory copy so each request does not
 * go back to the native store. `AFTER_FIRST_UNLOCK`: readable once the device was unlocked after boot, like
 * a mail app's credentials — requests made while the app is in the background still work.
 */
export function createSecureSessionStorage(): SessionStorage {
  // `undefined`: not read yet; `null`: read, no token.
  let cached: string | null | undefined;
  const options: SecureStore.SecureStoreOptions = {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  };

  return {
    async getToken() {
      if (cached !== undefined) return cached;
      try {
        cached = await SecureStore.getItemAsync(TOKEN_KEY, options);
      } catch {
        // An unreadable store (keychain reset, restored backup) means no usable session.
        cached = null;
      }
      return cached;
    },
    async setToken(token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token, options);
      cached = token;
    },
    async clearToken() {
      cached = null;
      try {
        await SecureStore.deleteItemAsync(TOKEN_KEY, options);
      } catch {
        // Already gone or unreadable: nothing left to forget.
      }
    },
  };
}

/** Tests only: same contract, nothing native. */
export function createMemorySessionStorage(initialToken: string | null = null): SessionStorage {
  let token = initialToken;
  return {
    getToken: async () => token,
    setToken: async (next) => {
      token = next;
    },
    clearToken: async () => {
      token = null;
    },
  };
}
