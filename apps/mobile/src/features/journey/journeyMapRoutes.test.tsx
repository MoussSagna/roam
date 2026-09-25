import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { act, renderRouter } from 'expo-router/testing-library';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/auth';
import { AppRoutes } from '@/features/navigation/AppRoutes';
import i18n from '@/i18n';
import { repositories } from '@/services';
import { pressBareMap } from '@/test/reactNativeMapsMock';
import { ThemeProvider } from '@/theme';
import type { JourneyDraft } from '@/types';

import {
  completeCurrentStep,
  createJourney,
  resetJourneyStoreForTests,
  startJourney,
} from './journeyStore';

/** Real route tree (same harness as `journeyHubRoutes.test.tsx`): the active journey's map, sprint 12. */
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

const STEPS = ['exp-modern-art-museum', 'exp-slow-afternoon', 'exp-rooftop-sunset'];
const TITLES = ['Musée d’Art Moderne', 'Après-midi lente', 'Rooftop Sunset'];

const DRAFT: JourneyDraft = {
  context: { mood: 'culture', duration: 'halfDay', budget: 'medium' },
  startLocation: {
    kind: 'current',
    label: 'Ma position',
    coordinates: { latitude: 48.8674, longitude: 2.3637 },
  },
  startTime: '18:00',
  experienceIds: STEPS,
};

/** A 3-step journey, started, at its second step. */
async function journeyAtSecondStep() {
  const journey = await createJourney(DRAFT, 'Paris au coucher du soleil');
  await startJourney();
  await completeCurrentStep();
  return journey;
}

/** The screens under the one on top stay mounted: the last match is the visible one. */
const topButton = (name: string | RegExp) => screen.getAllByRole('button', { name }).at(-1)!;
const press = (name: string | RegExp) => fireEvent.press(topButton(name));
const footer = () => screen.getByTestId('experience-map-footer');
const stepMarkers = () => screen.getAllByRole('button', { name: /^\d\. / });

async function openMapFromHub() {
  const utils = await renderApp();
  await act(() => router.navigate('/journey'));
  const miniMap = await screen.findByTestId('journey-mini-map');
  await fireEvent.press(miniMap);
  await screen.findByTestId('journey-map-title');
  return utils;
}

jest.setTimeout(20_000);

describe('Active journey map (sprint 12)', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('fr'));
    await repositories.journeys.clear();
    resetJourneyStoreForTests();
  });

  it("the hub's mini-map draws the journey (steps, numbers, route) and is a button", async () => {
    await journeyAtSecondStep();
    await renderApp();
    await act(() => router.navigate('/journey'));

    const miniMap = await screen.findByTestId('journey-mini-map');
    expect(miniMap).toHaveProp('accessibilityRole', 'button');
    expect(within(miniMap).getByText('Voir la carte du parcours')).toBeOnTheScreen();
    expect(
      within(miniMap)
        .getAllByRole('button', { name: /^\d\. / })
        .map((marker) => marker.props.accessibilityLabel),
    ).toEqual(TITLES.map((title, index) => `${index + 1}. ${title}`));
    expect(within(miniMap).getByTestId('roam-map-route').props.coordinates).toHaveLength(4);
  });

  it('tapping it opens the full-screen map, titled "Parcours en cours"', async () => {
    const journey = await journeyAtSecondStep();
    const utils = await openMapFromHub();

    expect(utils.getPathname()).toBe(`/journey/${journey.id}/map`);
    expect(screen.getByTestId('journey-map-title')).toHaveTextContent('Parcours en cours');
    expect(screen.getByRole('button', { name: 'Retour' })).toBeOnTheScreen();
  });

  it('every step is on the map, in order, with its number and photo, joined by the route', async () => {
    const journey = await journeyAtSecondStep();
    await openMapFromHub();

    const markers = stepMarkers();
    expect(markers.map((marker) => marker.props.accessibilityLabel)).toEqual(
      TITLES.map((title, index) => `${index + 1}. ${title}`),
    );
    STEPS.forEach((id, index) => {
      const badges = screen.getAllByTestId(`experience-marker-badge-${id}`);
      expect(badges.at(-1)).toHaveTextContent(String(index + 1));
      expect(screen.getAllByTestId(`experience-marker-image-${id}`).length).toBeGreaterThan(0);
    });

    const experiences = await repositories.experiences.list();
    const coordinatesOf = (id: string) => experiences.find((item) => item.id === id)!.coordinates;
    const routes = screen.getAllByTestId('roam-map-route');
    expect(routes.at(-1)!.props.coordinates).toEqual([
      journey.startLocation.coordinates,
      ...STEPS.map(coordinatesOf),
    ]);
  });

  it('opens on the current step: selected marker, "Étape actuelle" footer', async () => {
    await journeyAtSecondStep();
    await openMapFromHub();

    const current = topButton(`2. ${TITLES[1]}`);
    expect(current).toBeSelected();
    expect(within(footer()).getByText(TITLES[1])).toBeOnTheScreen();
    expect(within(footer()).getByTestId('experience-map-footer-badge')).toHaveTextContent(
      'Étape actuelle',
    );
  });

  it('marker 1 → footer 1, marker 3 → footer 3, marker 2 → footer 2: always the tapped one', async () => {
    await journeyAtSecondStep();
    await openMapFromHub();

    for (const index of [0, 2, 1]) {
      await press(`${index + 1}. ${TITLES[index]}`);
      expect(topButton(`${index + 1}. ${TITLES[index]}`)).toBeSelected();
      // No stale content: the other steps are not in the footer.
      TITLES.filter((_, other) => other !== index).forEach((title) =>
        expect(within(footer()).queryByText(title)).toBeNull(),
      );
      expect(within(footer()).getByText(TITLES[index])).toBeOnTheScreen();
      expect(within(footer()).getByTestId('experience-map-footer-badge')).toHaveTextContent(
        index === 1 ? 'Étape actuelle' : `Étape ${index + 1}`,
      );
      // Only one selected step marker at a time.
      expect(
        stepMarkers().filter((marker) => marker.props.accessibilityState?.selected),
      ).toHaveLength(1);
    }
  });

  it('the start point is not a step: tapping it keeps the selection', async () => {
    await journeyAtSecondStep();
    await openMapFromHub();

    await press('Point de départ');
    expect(within(footer()).getByText(TITLES[1])).toBeOnTheScreen();
  });

  it('a bare-map tap hides the footer, "info" brings it back; its CTA opens the experience', async () => {
    await journeyAtSecondStep();
    const utils = await openMapFromHub();

    await pressBareMap(screen.getAllByTestId('mock-map-view').at(-1)!);
    expect(
      screen.getByTestId('journey-map-footer-slot', { includeHiddenElements: true }),
    ).toHaveProp('pointerEvents', 'none');
    await press('Afficher les informations du lieu');
    expect(
      screen.getByTestId('journey-map-footer-slot', { includeHiddenElements: true }),
    ).toHaveProp('pointerEvents', 'auto');

    await press(`3. ${TITLES[2]}`);
    await fireEvent.press(within(footer()).getByRole('button', { name: 'Voir le lieu' }));
    expect(utils.getPathname()).toBe('/experience/exp-rooftop-sunset');
  });

  it('back returns to the hub, with the journey still in progress', async () => {
    const journey = await journeyAtSecondStep();
    const utils = await openMapFromHub();

    await press('Retour');

    await waitFor(() => expect(utils.getPathname()).toBe('/journey'));
    expect(screen.getByTestId('current-journey-card')).toBeOnTheScreen();
    const saved = await repositories.journeys.getCurrent();
    expect(saved).toMatchObject({ id: journey.id, status: 'active', currentStep: 1 });
  });

  it('an unknown journey shows a way back, no crash', async () => {
    const utils = await renderApp();
    await act(() => router.navigate('/journey'));
    await act(() => router.push({ pathname: '/journey/[id]/map', params: { id: 'nope' } }));

    expect(await screen.findByText("Ce parcours n'existe plus.")).toBeOnTheScreen();
    await press('Retour');
    expect(utils.getPathname()).toBe('/journey');
  });
});
