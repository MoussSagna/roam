import { act, fireEvent, screen } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { useState } from 'react';
import { Linking } from 'react-native';

import i18n from '@/i18n';
import { mockAnimateToRegion } from '@/test/reactNativeMapsMock';
import { renderWithProviders } from '@/test/renderWithProviders';

import { LocationScreen } from './LocationScreen';
import type { OnboardingLocation } from './onboardingAnswers';

jest.mock('expo-location', () => ({
  PermissionStatus: { GRANTED: 'granted', UNDETERMINED: 'undetermined', DENIED: 'denied' },
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const mocked = jest.mocked(Location);

const UNDETERMINED = { granted: false, status: 'undetermined', canAskAgain: true };
const GRANTED = { granted: true, status: 'granted', canAskAgain: true };
const DENIED = { granted: false, status: 'denied', canAskAgain: true };
const BLOCKED = { granted: false, status: 'denied', canAskAgain: false };

const LOUVRE = { latitude: 48.8606, longitude: 2.3376 };

/** Makes the permission read return `before`, and the system prompt answer `after`. */
function permission(before: object, after: object = before) {
  mocked.getForegroundPermissionsAsync.mockResolvedValue(before as never);
  mocked.requestForegroundPermissionsAsync.mockImplementation(async () => {
    mocked.getForegroundPermissionsAsync.mockResolvedValue(after as never);
    return after as never;
  });
}

function position(coords: object) {
  mocked.getCurrentPositionAsync.mockResolvedValue({ coords, timestamp: 0 } as never);
}

/** Every location the screen hands to the pager, in order. */
const onSelectSpy = jest.fn<void, [OnboardingLocation]>();

/** The last location handed over, i.e. the answer the pager holds; null when none yet. */
function lastSelected(): OnboardingLocation | null {
  return onSelectSpy.mock.calls.at(-1)?.[0] ?? null;
}

/** The pager holds the answer; this stands in for it. */
function LocationScreenWithState() {
  const [selected, setSelected] = useState<OnboardingLocation | null>(null);
  return (
    <LocationScreen
      selected={selected}
      onSelect={(location) => {
        onSelectSpy(location);
        setSelected(location);
      }}
    />
  );
}

async function renderScreen() {
  await renderWithProviders(<LocationScreenWithState />);
  // Lets the permission read of the mount settle, and gives the map its size (its camera needs it).
  await act(async () => {});
  await fireEvent(screen.getByTestId('onboarding-location-map'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 340, height: 240 } },
  });
}

async function pressCurrent() {
  await act(async () => {
    fireEvent.press(screen.getByRole('radio', { name: 'Ma position actuelle' }));
  });
}

describe('LocationScreen (onboarding 5, map-based location, D-89)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    permission(UNDETERMINED);
    await act(() => i18n.changeLanguage('fr'));
  });

  it('shows the title, the two choices of the journey and the map, with nothing selected', async () => {
    await renderScreen();

    expect(screen.getByRole('header')).toHaveTextContent('Où souhaites-tu sortir ?');
    expect(screen.getByText('On te propose des sorties près de toi.')).toBeOnTheScreen();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('radio', { name: 'Ma position actuelle' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Choisir un lieu' })).not.toBeChecked();
    expect(screen.getByTestId('onboarding-location-map')).toBeOnTheScreen();
    expect(lastSelected()).toBeNull();
  });

  it('is localized in English', async () => {
    await act(() => i18n.changeLanguage('en'));
    await renderScreen();

    expect(screen.getByRole('header')).toHaveTextContent('Where do you want to go out?');
    expect(screen.getByRole('radio', { name: 'My current location' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Choose a place' })).toBeOnTheScreen();
  });

  describe('permission', () => {
    it('is never asked on arrival; the screen explains why before the user asks', async () => {
      await renderScreen();

      expect(mocked.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
      expect(
        screen.getByText('Utilise ta position actuelle pour trouver des sorties près de toi.'),
      ).toBeOnTheScreen();
    });

    it('unknown → asked on "Ma position actuelle"; accepted → position selected, marker, map centred', async () => {
      permission(UNDETERMINED, GRANTED);
      position(LOUVRE);
      await renderScreen();

      await pressCurrent();

      expect(mocked.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(lastSelected()).toEqual({
        source: 'current',
        label: 'Ma position',
        coordinates: LOUVRE,
      });
      expect(screen.getByRole('radio', { name: 'Ma position actuelle' })).toBeChecked();
      expect(screen.getByRole('button', { name: 'Ma position' })).toBeOnTheScreen();
      expect(mockAnimateToRegion).toHaveBeenLastCalledWith(
        expect.objectContaining(LOUVRE),
        expect.any(Number),
      );
    });

    it('granted → a second use reads the position again without asking, and recentres', async () => {
      permission(UNDETERMINED, GRANTED);
      position(LOUVRE);
      await renderScreen();
      await pressCurrent();

      const moved = { latitude: 48.853, longitude: 2.3499 };
      position(moved);
      await pressCurrent();

      expect(mocked.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(mocked.getCurrentPositionAsync).toHaveBeenCalledTimes(2);
      expect(lastSelected()?.coordinates).toEqual(moved);
      expect(mockAnimateToRegion).toHaveBeenLastCalledWith(
        expect.objectContaining(moved),
        expect.any(Number),
      );
    });

    it('refused → no dead end: a message, and the spots to choose by hand', async () => {
      permission(UNDETERMINED, DENIED);
      await renderScreen();

      await pressCurrent();

      expect(lastSelected()).toBeNull();
      expect(
        screen.getByText('Pas de souci, tu peux choisir ton emplacement manuellement.'),
      ).toBeOnTheScreen();
      expect(screen.getByRole('radio', { name: 'Choisir un lieu' })).toBeChecked();

      await fireEvent.press(screen.getByRole('button', { name: 'Bastille' }));
      expect(lastSelected()).toMatchObject({ source: 'manual', label: 'Bastille' });
    });

    it('blocked → no prompt loop, offers the settings and the manual choice', async () => {
      permission(BLOCKED);
      const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
      await renderScreen();

      await pressCurrent();
      await pressCurrent();

      expect(mocked.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
      expect(
        screen.getByText(
          'La localisation est désactivée. Tu peux l’autoriser dans les réglages ou choisir un emplacement manuellement.',
        ),
      ).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Ouvrir les réglages' }));
      expect(openSettings).toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Bastille' })).toBeOnTheScreen();
      openSettings.mockRestore();
    });

    it('position unavailable → a clear message, and the button works again', async () => {
      permission(GRANTED);
      mocked.getCurrentPositionAsync.mockRejectedValueOnce(new Error('no fix'));
      await renderScreen();

      await pressCurrent();

      expect(lastSelected()).toBeNull();
      expect(
        screen.getByText(
          'Ta position est indisponible pour le moment. Réessaie ou choisis un emplacement.',
        ),
      ).toBeOnTheScreen();

      position(LOUVRE);
      await pressCurrent();
      expect(lastSelected()).toMatchObject({ source: 'current', coordinates: LOUVRE });
    });
  });

  describe('manual choice', () => {
    it('"Choisir un lieu" shows the journey spots; a spot becomes the location', async () => {
      await renderScreen();

      await fireEvent.press(screen.getByRole('radio', { name: 'Choisir un lieu' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Montmartre' }));

      expect(lastSelected()).toEqual({
        source: 'manual',
        label: 'Montmartre',
        coordinates: { latitude: 48.8867, longitude: 2.3431 },
      });
      expect(mocked.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    });

    it('after the position, a spot replaces it: the last choice is the location', async () => {
      permission(GRANTED);
      position(LOUVRE);
      await renderScreen();
      await pressCurrent();

      await fireEvent.press(screen.getByRole('radio', { name: 'Choisir un lieu' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Bastille' }));

      expect(lastSelected()).toMatchObject({ source: 'manual', label: 'Bastille' });
      expect(screen.getByRole('radio', { name: 'Ma position actuelle' })).not.toBeChecked();
      expect(screen.queryByRole('button', { name: 'Ma position' })).toBeNull();
      expect(mockAnimateToRegion).toHaveBeenLastCalledWith(
        expect.objectContaining({ latitude: 48.8532, longitude: 2.3691 }),
        expect.any(Number),
      );
    });
  });
});
