import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { repositories } from '@/services';

import { storeSession } from './session';

type AuthContextValue = {
  isLoggedIn: boolean;
  /** Simulates a login request (`repositories.auth`, no backend yet) and flips `isLoggedIn`. */
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
  /** Restored from storage before the first screen renders (`useBootstrap`), so a returning user
   * lands directly in the authenticated app instead of being sent through Welcome/Login again. */
  initialIsLoggedIn?: boolean;
};

/**
 * Mocked session (no backend yet, `docs/DECISIONS.md`): the single source of truth for `isLoggedIn`,
 * which `AppRoutes`'s `Stack.Protected` guards read to decide which screens are reachable. Screens
 * never touch `repositories.auth` or storage directly — they call `login`/`logout` here.
 */
export function AuthProvider({ children, initialIsLoggedIn = false }: AuthProviderProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(initialIsLoggedIn);

  const login = useCallback(async () => {
    await repositories.auth.login();
    setIsLoggedIn(true);
    void storeSession(true);
  }, []);

  const logout = useCallback(async () => {
    await repositories.auth.logout();
    setIsLoggedIn(false);
    void storeSession(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ isLoggedIn, login, logout }),
    [isLoggedIn, login, logout],
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
