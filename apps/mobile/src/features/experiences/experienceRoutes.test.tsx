import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/auth';
import { AppRoutes } from '@/features/navigation/AppRoutes';
import i18n from '@/i18n';
import { ThemeProvider } from '@/theme';

/**
 * Mounts the real `src/app` route tree (see `tabsRoutes.test.tsx` / `authRoutes.test.tsx`), so a
 * broken route file (an "Unmatched Route") would actually fail here, unlike the mocked-`useRouter`
 * unit tests on each screen. Covers the sprint 5 navigation chain: Home -> Experience Detail ->
 * Gallery -> back -> Create Journey placeholder.
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
        <AuthProvider initialIsLoggedIn>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

async function renderApp() {
  const utils = renderRouter({ appDir: './src/app', overrides: { _layout: TestLayout } });
  await utils;
  return { getPathname: utils.getPathname };
}

function mockMeasure(rect: { x: number; y: number; width: number; height: number }) {
  return jest
    .spyOn(View.prototype, 'measureInWindow')
    .mockImplementation((callback: (x: number, y: number, w: number, h: number) => void) =>
      callback(rect.x, rect.y, rect.width, rect.height),
    );
}

describe('experience detail & gallery navigation (sprint 5)', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('fr'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Home -> Experience Detail, with no "Unmatched Route"', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/home'));

    await fireEvent.press(screen.getByRole('button', { name: "Voir l'expérience" }));

    expect(utils.getPathname()).toBe('/experience/exp-dinner-view');
    expect(screen.queryByText(/Unmatched Route/i)).toBeNull();
    expect(screen.getByRole('header')).toHaveTextContent('Dîners avec vue');
  });

  it('Experience Detail -> Gallery -> back to Experience Detail', async () => {
    mockMeasure({ x: 0, y: 100, width: 390, height: 340 });
    const utils = await renderApp();
    await act(() => router.navigate('/experience/exp-rooftop-sunset'));

    await act(async () => {
      fireEvent.press(screen.getByLabelText('1 / 5'));
    });

    expect(utils.getPathname()).toBe('/gallery/exp-rooftop-sunset');
    expect(screen.queryByText(/Unmatched Route/i)).toBeNull();
    expect(screen.getAllByRole('button', { name: /^\d \/ 5$/ })).toHaveLength(5);

    await fireEvent.press(screen.getByRole('button', { name: 'Fermer' }));

    expect(utils.getPathname()).toBe('/experience/exp-rooftop-sunset');
    expect(screen.getByRole('header')).toHaveTextContent('Rooftop Sunset');
  });

  it('Experience Detail -> Create Journey placeholder', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/experience/exp-rooftop-sunset'));

    await fireEvent.press(screen.getByRole('button', { name: 'Créer mon parcours' }));

    expect(utils.getPathname()).toBe('/itinerary/create');
    expect(screen.queryByText(/Unmatched Route/i)).toBeNull();
    expect(screen.getByText('Ta sortie est prête')).toBeOnTheScreen();
    expect(screen.getByText('Cet écran arrive bientôt.')).toBeOnTheScreen();
  });

  it('Experience Detail -> map block -> full-screen map -> back to the detail', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/experience/exp-rooftop-sunset'));

    await fireEvent.press(screen.getByRole('button', { name: 'Voir sur la carte' }));

    expect(utils.getPathname()).toBe('/experience-map/exp-rooftop-sunset');
    expect(screen.queryByText(/Unmatched Route/i)).toBeNull();
    expect(await screen.findByTestId('experience-map-footer')).toBeOnTheScreen();
    expect(screen.getByTestId('roam-map')).toBeOnTheScreen();

    await fireEvent.press(screen.getAllByRole('button', { name: 'Retour' }).at(-1)!);

    expect(utils.getPathname()).toBe('/experience/exp-rooftop-sunset');
    expect(screen.queryByText(/Unmatched Route/i)).toBeNull();
  });

  it('full-screen map footer: "Voir le lieu" returns to the detail instead of stacking a second one', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/experience/exp-rooftop-sunset'));
    await fireEvent.press(screen.getByRole('button', { name: 'Voir sur la carte' }));
    await screen.findByTestId('experience-map-footer');

    await fireEvent.press(screen.getByRole('button', { name: 'Voir le lieu' }));

    expect(utils.getPathname()).toBe('/experience/exp-rooftop-sunset');
  });
});
