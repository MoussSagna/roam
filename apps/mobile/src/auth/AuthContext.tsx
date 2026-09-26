import { router } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import i18n from '@/i18n';
import { showToast } from '@/lib/toast';
import { type LoginCredentials, type RegisterInput, repositories } from '@/services';

type AuthContextValue = {
  isLoggedIn: boolean;
  /** Signs in through `repositories.auth` (API or mock) and flips `isLoggedIn`. Rejects with the
   * repository's error (e.g. an `ApiError` `AUTH_INVALID_CREDENTIALS`) for the screen to show. */
  login: (credentials: LoginCredentials) => Promise<void>;
  /** Creates the account and signs in (the Register screen lands on Home). */
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
  /** Restored before the first screen renders (`useBootstrap` → `repositories.auth.restoreSession()`),
   * so a returning user lands directly in the authenticated app instead of Welcome/Login again. */
  initialIsLoggedIn?: boolean;
};

/**
 * The single source of truth for `isLoggedIn`, which `AppRoutes`'s `Stack.Protected` guards read to
 * decide which screens are reachable. Screens never touch `repositories.auth`, a token or storage directly
 * — they call `login`/`register`/`logout` here. How the session is kept (secure-store token for the API, a
 * flag for the mock) is the repository's business (DATA-8).
 */
export function AuthProvider({ children, initialIsLoggedIn = false }: AuthProviderProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(initialIsLoggedIn);
  // Several requests can fail with 401 together: only the first one signs out and redirects.
  const isLoggedInRef = useRef(initialIsLoggedIn);
  useEffect(() => {
    isLoggedInRef.current = isLoggedIn;
  }, [isLoggedIn]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    await repositories.auth.login(credentials);
    setIsLoggedIn(true);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    await repositories.auth.register(input);
    setIsLoggedIn(true);
  }, []);

  const logout = useCallback(async () => {
    await repositories.auth.logout();
    setIsLoggedIn(false);
  }, []);

  // The server refused the session (expired, revoked): the repository already forgot it; leave the
  // authenticated app the way a logout does (D-62) — `Stack.Protected` drops the authenticated history,
  // so back cannot return to it.
  useEffect(
    () =>
      repositories.auth.onSessionExpired(() => {
        if (!isLoggedInRef.current) return;
        isLoggedInRef.current = false;
        setIsLoggedIn(false);
        router.replace('/auth/login');
        showToast('error', { title: i18n.t('errors.sessionExpired') });
      }),
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ isLoggedIn, login, register, logout }),
    [isLoggedIn, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
