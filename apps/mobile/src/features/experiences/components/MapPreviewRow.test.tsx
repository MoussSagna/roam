import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { Experience } from '@/types';

import { MapPreviewRow } from './MapPreviewRow';

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
});
