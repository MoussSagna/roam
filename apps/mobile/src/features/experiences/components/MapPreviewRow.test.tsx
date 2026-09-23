import { act, fireEvent, screen } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { Linking, Platform } from 'react-native';

import i18n from '@/i18n';
import { showToast } from '@/lib/toast';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { Experience } from '@/types';

import { MapPreviewRow } from './MapPreviewRow';

jest.mock('@/lib/toast', () => ({ showToast: jest.fn() }));

const EXPERIENCE: Experience = {
  id: 'exp-a',
  title: 'Café de la Fontaine',
  description: '',
  moods: [],
  categoryIds: [],
  placeIds: [],
  estimatedDurationMin: 60,
  estimatedBudget: '10to25',
  address: '12 rue de la Fontaine au Roi, 75011 Paris',
  coordinates: { latitude: 48.86, longitude: 2.37 },
};

describe('MapPreviewRow (D-73)', () => {
  it('draws a RoamMap with the experience pin, the "Voir sur la carte" pill and the address', async () => {
    await renderWithProviders(<MapPreviewRow experience={EXPERIENCE} onPress={jest.fn()} />);

    expect(screen.getByTestId('experience-detail-map')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Café de la Fontaine' })).toBeOnTheScreen();
    expect(screen.getByText('12 rue de la Fontaine au Roi, 75011 Paris')).toBeOnTheScreen();
    expect(screen.getAllByText('Voir sur la carte').length).toBeGreaterThan(0);
  });

  it('the whole block is one button that opens the full-screen map', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<MapPreviewRow experience={EXPERIENCE} onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Voir sur la carte' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('without coordinates there is no map and nothing to open: just the address', async () => {
    await renderWithProviders(
      <MapPreviewRow experience={{ ...EXPERIENCE, coordinates: undefined }} onPress={jest.fn()} />,
    );

    expect(screen.queryByTestId('experience-detail-map')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Voir sur la carte' })).toBeNull();
    expect(screen.getByText('12 rue de la Fontaine au Roi, 75011 Paris')).toBeOnTheScreen();
  });

  it('renders nothing at all without coordinates or address', async () => {
    await renderWithProviders(
      <MapPreviewRow
        experience={{ ...EXPERIENCE, coordinates: undefined, address: undefined }}
        onPress={jest.fn()}
      />,
    );

    expect(screen.queryByText(/rue de la Fontaine/)).toBeNull();
    expect(screen.queryByTestId('experience-detail-map')).toBeNull();
  });

  describe('address bubble (D-74)', () => {
    const ADDRESS = '12 rue de la Fontaine au Roi, 75011 Paris';

    async function openBubble(experience: Experience = EXPERIENCE) {
      await renderWithProviders(<MapPreviewRow experience={experience} onPress={jest.fn()} />);
      await fireEvent.press(screen.getByRole('button', { name: ADDRESS }));
    }

    beforeEach(async () => {
      jest.clearAllMocks();
      jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
      await act(() => i18n.changeLanguage('fr'));
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('is closed by default and opens when the address row is tapped, with the four actions', async () => {
      await renderWithProviders(<MapPreviewRow experience={EXPERIENCE} onPress={jest.fn()} />);
      expect(screen.queryByTestId('address-actions-bubble')).toBeNull();

      await fireEvent.press(screen.getByRole('button', { name: ADDRESS }));

      expect(screen.getByTestId('address-actions-bubble')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: "Copier l'adresse" })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Copier les coordonnées GPS' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Ouvrir dans Plans' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Ouvrir dans Google Maps' })).toBeOnTheScreen();
    });

    it('tapping the map opens the full-screen map, not the bubble', async () => {
      const onPress = jest.fn();
      await renderWithProviders(<MapPreviewRow experience={EXPERIENCE} onPress={onPress} />);

      await fireEvent.press(screen.getByRole('button', { name: 'Voir sur la carte' }));

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('address-actions-bubble')).toBeNull();
    });

    it('"Copier l\'adresse" copies the address, confirms with a toast and closes the bubble', async () => {
      await openBubble();

      await fireEvent.press(screen.getByRole('button', { name: "Copier l'adresse" }));

      expect(Clipboard.setStringAsync).toHaveBeenCalledWith(ADDRESS);
      await act(async () => {});
      expect(showToast).toHaveBeenCalledWith('success', { title: 'Adresse copiée' });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 250));
      });
      expect(screen.queryByTestId('address-actions-bubble')).toBeNull();
    });

    it('"Copier les coordonnées GPS" copies "lat, lng"', async () => {
      await openBubble();

      await fireEvent.press(screen.getByRole('button', { name: 'Copier les coordonnées GPS' }));

      expect(Clipboard.setStringAsync).toHaveBeenCalledWith('48.86, 2.37');
      await act(async () => {});
      expect(showToast).toHaveBeenCalledWith('success', { title: 'Coordonnées copiées' });
    });

    it('"Ouvrir dans Plans" opens an Apple Plans link at the coordinates', async () => {
      await openBubble();

      await fireEvent.press(screen.getByRole('button', { name: 'Ouvrir dans Plans' }));

      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://maps.apple.com/?ll=48.86,2.37&q=Caf%C3%A9%20de%20la%20Fontaine',
      );
    });

    it('"Ouvrir dans Google Maps" opens a Google Maps link at the coordinates', async () => {
      await openBubble();

      await fireEvent.press(screen.getByRole('button', { name: 'Ouvrir dans Google Maps' }));

      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://www.google.com/maps/search/?api=1&query=48.86,2.37',
      );
    });

    it('shows an error toast when the link cannot be opened', async () => {
      (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('no app'));
      await openBubble();

      await fireEvent.press(screen.getByRole('button', { name: 'Ouvrir dans Google Maps' }));
      await act(async () => {});

      expect(showToast).toHaveBeenCalledWith('error', {
        title: "Impossible d'ouvrir l'application",
      });
    });

    it('closes from the "×" button', async () => {
      await openBubble();

      await fireEvent.press(screen.getByRole('button', { name: 'Fermer' }));
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 250));
      });

      expect(screen.queryByTestId('address-actions-bubble')).toBeNull();
    });

    it('has no Apple Plans action on Android (Google Maps covers it)', async () => {
      jest.replaceProperty(Platform, 'OS', 'android');
      await openBubble();

      expect(screen.queryByRole('button', { name: 'Ouvrir dans Plans' })).toBeNull();
      expect(screen.getByRole('button', { name: 'Ouvrir dans Google Maps' })).toBeOnTheScreen();
    });

    it('without coordinates only offers to copy the address', async () => {
      await openBubble({ ...EXPERIENCE, coordinates: undefined });

      expect(screen.getByRole('button', { name: "Copier l'adresse" })).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Copier les coordonnées GPS' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Ouvrir dans Google Maps' })).toBeNull();
    });
  });
});
