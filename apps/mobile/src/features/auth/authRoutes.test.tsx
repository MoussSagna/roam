import { router, Stack } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import i18n from '@/i18n';
import { ThemeProvider } from '@/theme';

/**
 * Mounts the real `src/app` route tree (see `onboardingRoutes.test.tsx`), because mocking
 * `useRouter` cannot tell whether a path has a route file.
 */
function TestLayout() {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <ThemeProvider initialPreference="light">
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const SPLASH_DURATION_MS = 2600;

async function renderApp() {
  const utils = renderRouter({ appDir: './src/app', overrides: { _layout: TestLayout } });
  await utils;
  return { getPathname: utils.getPathname };
}

describe('authentication routes', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    await act(() => i18n.changeLanguage('fr'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reaches the entry screen from the welcome screen\'s "Se connecter" link', async () => {
    const utils = await renderApp();
    await act(() => jest.advanceTimersByTimeAsync(SPLASH_DURATION_MS));
    expect(utils.getPathname()).toBe('/welcome');

    await fireEvent.press(screen.getByRole('button', { name: 'Se connecter' }));

    expect(utils.getPathname()).toBe('/auth');
    expect(screen.getByRole('header')).toHaveTextContent('ROAM');
    expect(screen.queryByText(/Unmatched Route/i)).toBeNull();
  });

  it('"Se connecter" on the entry screen opens the login screen', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/auth'));

    await fireEvent.press(screen.getByRole('button', { name: 'Se connecter' }));

    expect(utils.getPathname()).toBe('/auth/login');
    expect(screen.queryByText(/Unmatched Route/i)).toBeNull();
    expect(screen.getByRole('header')).toHaveTextContent('Bon retour !');
  });

  it('logging in with valid credentials enters the app', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/auth/login'));

    await fireEvent.changeText(screen.getByLabelText('Email'), 'moussa@email.com');
    await fireEvent.changeText(screen.getByLabelText('Mot de passe'), 'password123');
    await fireEvent.press(screen.getByRole('button', { name: 'Se connecter' }));
    await act(() => jest.advanceTimersByTimeAsync(1000));

    expect(utils.getPathname()).toBe('/home');
  });

  it('"Mot de passe oublié ?" opens the forgot-password screen', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/auth/login'));

    await fireEvent.press(screen.getByRole('button', { name: 'Mot de passe oublié ?' }));

    expect(utils.getPathname()).toBe('/auth/forgot-password');
    expect(screen.queryByText(/Unmatched Route/i)).toBeNull();
    expect(screen.getByRole('header')).toHaveTextContent('Mot de passe oublié ?');
  });

  it('sending the reset code opens the reset-code screen with the email carried over', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/auth/forgot-password'));

    await fireEvent.changeText(screen.getByLabelText('Email'), 'moussa@email.com');
    await fireEvent.press(screen.getByRole('button', { name: 'Envoyer le code' }));
    await act(() => jest.advanceTimersByTimeAsync(1000));

    expect(utils.getPathname()).toBe('/auth/reset-code');
    expect(screen.queryByText(/Unmatched Route/i)).toBeNull();
    expect(screen.getByRole('header')).toHaveTextContent('Vérifie ton email');
    expect(screen.getByText('moussa@email.com')).toBeOnTheScreen();
  });

  it('entering the mock valid code moves on to the new-password screen', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/auth/reset-code'));

    await fireEvent.changeText(screen.getByLabelText('Chiffre 1 sur 6'), '123456');
    await fireEvent.press(screen.getByRole('button', { name: 'Continuer' }));
    await act(() => jest.advanceTimersByTimeAsync(1000));

    expect(utils.getPathname()).toBe('/auth/new-password');
    expect(screen.queryByText(/Unmatched Route/i)).toBeNull();
    expect(screen.getByRole('header')).toHaveTextContent('Nouveau mot de passe');
  });

  it('setting a valid new password moves on to the success screen', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/auth/new-password'));

    await fireEvent.changeText(screen.getByLabelText('Nouveau mot de passe'), 'password123');
    await fireEvent.changeText(screen.getByLabelText('Confirmer le mot de passe'), 'password123');
    await fireEvent.press(screen.getByRole('button', { name: 'Mettre à jour' }));
    await act(() => jest.advanceTimersByTimeAsync(1000));

    expect(utils.getPathname()).toBe('/auth/reset-success');
    expect(screen.queryByText(/Unmatched Route/i)).toBeNull();
    expect(screen.getByRole('header')).toHaveTextContent('Mot de passe mis à jour !');
  });

  it('"Se connecter" on the success screen ends the sub-flow at the login screen', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/auth/reset-success'));

    await fireEvent.press(screen.getByRole('button', { name: 'Se connecter' }));

    expect(utils.getPathname()).toBe('/auth/login');
  });

  it('entering a wrong code stays on the reset-code screen with an error', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/auth/reset-code'));

    await fireEvent.changeText(screen.getByLabelText('Chiffre 1 sur 6'), '000000');
    await fireEvent.press(screen.getByRole('button', { name: 'Continuer' }));
    await act(() => jest.advanceTimersByTimeAsync(1000));

    expect(utils.getPathname()).toBe('/auth/reset-code');
    expect(
      screen.getByText('Ce code est incorrect. Vérifie-le ou clique sur « Renvoyer le code ».'),
    ).toBeOnTheScreen();
  });

  it('"Créer un compte" on the entry screen opens the register screen', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/auth'));

    await fireEvent.press(screen.getByRole('button', { name: 'Créer un compte' }));

    expect(utils.getPathname()).toBe('/auth/register');
    expect(screen.queryByText(/Unmatched Route/i)).toBeNull();
    expect(screen.getByRole('header')).toHaveTextContent('Créer un compte');
  });

  it('registering with a valid submission enters the app', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/auth/register'));

    await fireEvent.changeText(screen.getByLabelText('Prénom'), 'Moussa');
    await fireEvent.changeText(screen.getByLabelText('Email'), 'moussa@email.com');
    await fireEvent.changeText(screen.getByLabelText('Mot de passe'), 'password123');
    await fireEvent.changeText(screen.getByLabelText('Confirmer le mot de passe'), 'password123');
    await fireEvent.press(screen.getByRole('button', { name: 'Créer mon compte' }));
    await act(() => jest.advanceTimersByTimeAsync(1000));

    expect(utils.getPathname()).toBe('/home');
  });

  it('register ↔ login cross-links work both ways', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/auth/register'));

    await fireEvent.press(screen.getByRole('button', { name: 'Se connecter' }));
    expect(utils.getPathname()).toBe('/auth/login');

    await fireEvent.press(screen.getByRole('button', { name: 'Créer un compte' }));
    expect(utils.getPathname()).toBe('/auth/register');
  });

  it("the login screen's back button returns to the entry screen", async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/auth'));
    await fireEvent.press(screen.getByRole('button', { name: 'Se connecter' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Retour' }));

    expect(utils.getPathname()).toBe('/auth');
  });
});
