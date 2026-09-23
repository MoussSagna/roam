import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import type { MapMarkerData } from '../types/map.types';

import { RoamMap } from './RoamMap';

const MARKERS: MapMarkerData[] = [
  { id: 'a', title: 'Le Perchoir', coordinate: { latitude: 48.86, longitude: 2.3 } },
  { id: 'b', title: 'Buttes-Chaumont', coordinate: { latitude: 48.88, longitude: 2.38 } },
];

describe('RoamMap', () => {
  it('renders the map with one marker per point, named after its title', async () => {
    await renderWithProviders(<RoamMap markers={MARKERS} />);

    expect(screen.getByTestId('roam-map')).toBeOnTheScreen();
    expect(screen.getByTestId('mock-map-view')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Le Perchoir' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Buttes-Chaumont' })).toBeOnTheScreen();
  });

  it('frames the markers on first render', async () => {
    await renderWithProviders(<RoamMap markers={MARKERS} />);

    const { initialRegion } = screen.getByTestId('mock-map-view').props;
    expect(initialRegion.latitude).toBeCloseTo(48.87);
    expect(initialRegion.longitude).toBeCloseTo(2.34);
  });

  it('does not crash without markers and shows the default (Paris) region', async () => {
    await renderWithProviders(<RoamMap markers={[]} />);

    expect(screen.getByTestId('mock-map-view').props.initialRegion.latitude).toBeCloseTo(48.8566);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('reports a marker press with its id and a bare-map press separately', async () => {
    const onPressMarker = jest.fn();
    const onPressMap = jest.fn();
    await renderWithProviders(
      <RoamMap markers={MARKERS} onPressMarker={onPressMarker} onPressMap={onPressMap} />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Buttes-Chaumont' }));
    expect(onPressMarker).toHaveBeenCalledWith('b');
    expect(onPressMap).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('mock-map-view'));
    expect(onPressMap).toHaveBeenCalledTimes(1);
  });

  it('follows the theme (map user interface style)', async () => {
    await renderWithProviders(<RoamMap markers={MARKERS} />, { themePreference: 'dark' });
    expect(screen.getByTestId('mock-map-view').props.userInterfaceStyle).toBe('dark');
  });

  it('lets its own tests and callers render it without a press handler', async () => {
    await renderWithProviders(<RoamMap markers={MARKERS} selectedMarkerId="a" />);

    await fireEvent.press(screen.getByRole('button', { name: 'Le Perchoir' }));
    expect(screen.getByTestId('roam-map')).toBeOnTheScreen();
  });

  it('drops its rounded corners for an edge-to-edge map (rounded=false)', async () => {
    await renderWithProviders(<RoamMap markers={MARKERS} rounded={false} />);

    const classes = screen.getByTestId('roam-map').props.className as string;
    expect(classes).not.toMatch(/rounded-large/);
  });
});
