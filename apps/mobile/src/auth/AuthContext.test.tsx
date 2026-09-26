import { act, renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';

import i18n from '@/i18n';
import { showToast } from '@/lib/toast';
import { ApiError, repositories } from '@/services';

import { AuthProvider, useAuth } from './AuthContext';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('@/lib/toast', () => ({ showToast: jest.fn() }));

/** DATA-8: the auth context over `repositories.auth`, whatever the data source. */
describe('AuthProvider', () => {
  let expire: () => void = () => {};

  beforeEach(async () => {
    jest.mocked(router.replace).mockClear();
    jest.mocked(showToast).mockClear();
    jest.spyOn(repositories.auth, 'onSessionExpired').mockImplementation((listener) => {
      expire = listener;
      return () => {};
    });
    await act(() => i18n.changeLanguage('fr'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const render = (initialIsLoggedIn: boolean) =>
    renderHook(() => useAuth(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <AuthProvider initialIsLoggedIn={initialIsLoggedIn}>{children}</AuthProvider>
      ),
    });

  it('login and logout go through the repository and flip isLoggedIn', async () => {
    const login = jest.spyOn(repositories.auth, 'login').mockResolvedValue();
    const logout = jest.spyOn(repositories.auth, 'logout').mockResolvedValue();
    const { result } = await render(false);

    await act(() => result.current.login({ email: 'a@b.c', password: 'secret123' }));
    expect(login).toHaveBeenCalledWith({ email: 'a@b.c', password: 'secret123' });
    expect(result.current.isLoggedIn).toBe(true);

    await act(() => result.current.logout());
    expect(logout).toHaveBeenCalled();
    expect(result.current.isLoggedIn).toBe(false);
  });

  it('a failed login rejects and stays signed out', async () => {
    jest
      .spyOn(repositories.auth, 'login')
      .mockRejectedValue(
        new ApiError({ status: 401, code: 'AUTH_INVALID_CREDENTIALS', message: '' }),
      );
    const { result } = await render(false);

    await act(async () => {
      await expect(result.current.login({ email: 'a@b.c', password: 'x' })).rejects.toMatchObject({
        code: 'AUTH_INVALID_CREDENTIALS',
      });
    });
    expect(result.current.isLoggedIn).toBe(false);
  });

  it('register goes through the repository and signs in', async () => {
    const register = jest.spyOn(repositories.auth, 'register').mockResolvedValue();
    const { result } = await render(false);

    await act(() =>
      result.current.register({ displayName: 'Léa', email: 'a@b.c', password: 'secret123' }),
    );

    expect(register).toHaveBeenCalledWith({
      displayName: 'Léa',
      email: 'a@b.c',
      password: 'secret123',
    });
    expect(result.current.isLoggedIn).toBe(true);
  });

  it('a session refused by the server signs out once, back to Login, with a message', async () => {
    const { result } = await render(true);

    await act(async () => {
      // Two requests failing together report twice: one sign-out, one redirect.
      expire();
      expire();
    });

    expect(result.current.isLoggedIn).toBe(false);
    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith('/auth/login');
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith('error', {
      title: 'Ta session a expiré. Reconnecte-toi.',
    });
  });

  it('a session expiry while signed out does nothing', async () => {
    await render(false);

    await act(async () => expire());

    expect(router.replace).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });
});
