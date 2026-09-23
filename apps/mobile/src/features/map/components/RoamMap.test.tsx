import { fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { mockAnimateToRegion, pressBareMap, pressMapEcho } from '@/test/reactNativeMapsMock';
import { renderWithProviders } from '@/test/renderWithProviders';

import type { MapFocusInsets, MapMarkerData } from '../types/map.types';

import { RoamMap } from './RoamMap';

const MARKERS: MapMarkerData[] = [
  { id: 'a', title: 'Le Perchoir', coordinate: { latitude: 48.86, longitude: 2.3 } },
  { id: 'b', title: 'Buttes-Chaumont', coordinate: { latitude: 48.88, longitude: 2.38 } },
];

/** Owns the selection like a screen does: a marker tap selects it; two buttons force a selection
 * without a marker (`ghost`) and no selection at all. */
function FocusHarness({
  initial,
  focusInsets,
}: {
  initial: string | null;
  focusInsets?: MapFocusInsets;
}) {
  const [selected, setSelected] = useState<string | null>(initial);
  return (
    <>
      <RoamMap
        markers={MARKERS}
        selectedMarkerId={selected}
        onPressMarker={setSelected}
        focusInsets={focusInsets}
      />
      <Pressable testID="select-ghost" onPress={() => setSelected('ghost')} />
      <Pressable testID="select-none" onPress={() => setSelected(null)} />
    </>
  );
}

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

    await pressBareMap(screen.getByTestId('mock-map-view'));
    expect(onPressMap).toHaveBeenCalledTimes(1);
  });

  it('ignores the map press that echoes a marker tap (Apple Maps sends both)', async () => {
    const onPressMarker = jest.fn();
    const onPressMap = jest.fn();
    await renderWithProviders(
      <RoamMap markers={MARKERS} onPressMarker={onPressMarker} onPressMap={onPressMap} />,
    );
    const map = screen.getByTestId('mock-map-view');

    await fireEvent.press(screen.getByRole('button', { name: 'Le Perchoir' }));
    await pressMapEcho(map);
    expect(onPressMarker).toHaveBeenCalledWith('a');
    expect(onPressMap).not.toHaveBeenCalled();

    // Only that one echo is swallowed: the next bare-map tap counts.
    await pressMapEcho(map);
    expect(onPressMap).toHaveBeenCalledTimes(1);
  });

  it('ignores a map press flagged as a marker press, and a bare-map tap long after a marker tap counts', async () => {
    const onPressMap = jest.fn();
    await renderWithProviders(<RoamMap markers={MARKERS} onPressMap={onPressMap} />);
    const map = screen.getByTestId('mock-map-view');

    await fireEvent.press(map, { nativeEvent: { action: 'marker-press' } });
    expect(onPressMap).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Le Perchoir' }));
    await pressBareMap(map);
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

  it('is interactive by default, and a static preview when interactive=false', async () => {
    const { unmount } = await renderWithProviders(<RoamMap markers={MARKERS} />);
    expect(screen.getByTestId('roam-map').props.pointerEvents).toBe('auto');
    expect(screen.getByTestId('mock-map-view').props.scrollEnabled).toBe(true);
    expect(screen.getByTestId('mock-map-view').props.zoomEnabled).toBe(true);
    await unmount();

    await renderWithProviders(<RoamMap markers={MARKERS} interactive={false} />);
    expect(screen.getByTestId('roam-map').props.pointerEvents).toBe('none');
    expect(screen.getByTestId('mock-map-view').props.scrollEnabled).toBe(false);
    expect(screen.getByTestId('mock-map-view').props.zoomEnabled).toBe(false);
  });

  describe('round photo markers (sprint 9)', () => {
    const PHOTO_A = { uri: 'https://example.com/a.jpg' };
    const PHOTO_B = { uri: 'https://example.com/b.jpg' };
    const WITH_PHOTOS: MapMarkerData[] = [
      { ...MARKERS[0], image: PHOTO_A },
      { ...MARKERS[1], image: PHOTO_B },
    ];

    it('draws each marker with its own photo', async () => {
      await renderWithProviders(<RoamMap markers={WITH_PHOTOS} />);

      // expo-image normalizes `source` into a list.
      expect(screen.getByTestId('experience-marker-image-a').props.source).toEqual([PHOTO_A]);
      expect(screen.getByTestId('experience-marker-image-b').props.source).toEqual([PHOTO_B]);
    });

    it('falls back to a plain round marker without a photo', async () => {
      await renderWithProviders(<RoamMap markers={MARKERS} />);

      expect(screen.getByTestId('experience-marker-a')).toBeOnTheScreen();
      expect(screen.queryByTestId('experience-marker-image-a')).toBeNull();
    });

    it('marks only the selected marker as selected: primary ring, drawn on top', async () => {
      await renderWithProviders(<RoamMap markers={WITH_PHOTOS} selectedMarkerId="b" />);

      const selected = screen.getByRole('button', { name: 'Buttes-Chaumont' });
      const other = screen.getByRole('button', { name: 'Le Perchoir' });
      expect(selected).toBeSelected();
      expect(other).not.toBeSelected();
      expect(selected.props.zIndex).toBe(1);
      expect(other.props.zIndex).toBe(0);
      expect(screen.getByTestId('experience-marker-ring-b').props.style.borderColor).not.toBe(
        screen.getByTestId('experience-marker-ring-a').props.style.borderColor,
      );
    });
  });

  describe('camera focus (focusInsets, sprint 9)', () => {
    const INSETS = { top: 100, bottom: 300 };
    const layout = () =>
      fireEvent(screen.getByTestId('roam-map'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 800 } },
      });

    beforeEach(() => mockAnimateToRegion.mockClear());

    it('without focusInsets, never moves the camera by itself', async () => {
      await renderWithProviders(<FocusHarness initial="a" />);
      await layout();
      await fireEvent.press(screen.getByRole('button', { name: 'Buttes-Chaumont' }));
      await fireEvent.press(screen.getByRole('button', { name: 'Buttes-Chaumont' }));

      expect(mockAnimateToRegion).not.toHaveBeenCalled();
    });

    it('opens on the selected marker, then centers it for the insets once laid out (instantly)', async () => {
      await renderWithProviders(
        <RoamMap markers={MARKERS} selectedMarkerId="b" focusInsets={INSETS} />,
      );

      const { initialRegion } = screen.getByTestId('mock-map-view').props;
      expect(initialRegion.latitude).toBe(48.88);
      expect(initialRegion.longitude).toBe(2.38);
      expect(mockAnimateToRegion).not.toHaveBeenCalled();

      await layout();
      expect(mockAnimateToRegion).toHaveBeenCalledTimes(1);
      const [region, duration] = mockAnimateToRegion.mock.calls[0];
      expect(region.longitude).toBe(2.38);
      // Footer taller than header → the camera center sits below the marker.
      expect(region.latitude).toBeLessThan(48.88);
      expect(region.latitudeDelta).toBe(initialRegion.latitudeDelta);
      expect(duration).toBe(0);
    });

    it('glides to a newly selected marker, with its coordinates and the current zoom', async () => {
      await renderWithProviders(<FocusHarness initial="b" focusInsets={INSETS} />);
      await layout();
      const zoomed = {
        latitude: 48.87,
        longitude: 2.33,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      await fireEvent(screen.getByTestId('mock-map-view'), 'regionChangeComplete', zoomed);
      mockAnimateToRegion.mockClear();

      await fireEvent.press(screen.getByRole('button', { name: 'Le Perchoir' }));

      expect(mockAnimateToRegion).toHaveBeenCalledTimes(1);
      const [region, duration] = mockAnimateToRegion.mock.calls[0];
      expect(region.longitude).toBe(2.3);
      expect(region.latitude).toBeCloseTo(48.86 - (100 * 0.01) / 800, 6);
      expect(region.latitudeDelta).toBe(0.01);
      expect(region.longitudeDelta).toBe(0.01);
      expect(duration).toBeGreaterThan(0);
    });

    it('re-tapping the selected marker brings it back to the center', async () => {
      const onPressMarker = jest.fn();
      await renderWithProviders(
        <RoamMap
          markers={MARKERS}
          selectedMarkerId="a"
          focusInsets={INSETS}
          onPressMarker={onPressMarker}
        />,
      );
      await layout();
      mockAnimateToRegion.mockClear();

      await fireEvent.press(screen.getByRole('button', { name: 'Le Perchoir' }));

      expect(mockAnimateToRegion).toHaveBeenCalledTimes(1);
      expect(mockAnimateToRegion.mock.calls[0][0].longitude).toBe(2.3);
      expect(onPressMarker).toHaveBeenCalledWith('a');
    });

    it('does not crash nor move for a selection that has no marker (no coordinates)', async () => {
      await renderWithProviders(<FocusHarness initial="a" focusInsets={INSETS} />);
      await layout();
      mockAnimateToRegion.mockClear();

      await fireEvent.press(screen.getByTestId('select-ghost'));
      await fireEvent.press(screen.getByTestId('select-none'));

      expect(mockAnimateToRegion).not.toHaveBeenCalled();
      expect(screen.getByTestId('roam-map')).toBeOnTheScreen();
    });
  });
});
