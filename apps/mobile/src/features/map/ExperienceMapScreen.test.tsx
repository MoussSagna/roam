import { act, fireEvent, screen, within } from '@testing-library/react-native';

import i18n from '@/i18n';
import { mockAnimateToRegion, pressBareMap, pressMapEcho } from '@/test/reactNativeMapsMock';
import { renderWithProviders } from '@/test/renderWithProviders';

import { ExperienceMapScreen } from './ExperienceMapScreen';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => mockCanGoBack,
  }),
}));

describe('ExperienceMapScreen (D-73 — full-screen experience map)', () => {
  beforeEach(async () => {
    mockPush.mockClear();
    mockBack.mockClear();
    mockReplace.mockClear();
    mockCanGoBack = true;
    await act(() => i18n.changeLanguage('fr'));
  });

  it('renders the transparent header (back button only, no title), a RoamMap with the experience pin, and the footer', async () => {
    await renderWithProviders(<ExperienceMapScreen experienceId="exp-rooftop-sunset" />);

    expect(await screen.findByTestId('roam-map')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Retour' })).toBeOnTheScreen();
    expect(screen.queryByRole('header')).toBeNull();
    // The name only appears once, in the footer — not next to the back button.
    expect(screen.getAllByText('Rooftop Sunset')).toHaveLength(1);
    // The opened experience has its own pin (among the others, sprint 9).
    expect(screen.getAllByRole('button', { name: 'Rooftop Sunset' }).length).toBeGreaterThan(0);
    expect(screen.getByTestId('experience-map-footer')).toBeOnTheScreen();
    expect(screen.getByText('Bars & Soirées · Oberkampf, Paris 11e')).toBeOnTheScreen();
  });

  it('has no picker: one map, one footer, no card overlay', async () => {
    await renderWithProviders(<ExperienceMapScreen experienceId="exp-rooftop-sunset" />);
    await screen.findByTestId('roam-map');

    expect(screen.getAllByTestId('mock-map-view')).toHaveLength(1);
    expect(screen.queryByTestId('experience-map-card')).toBeNull();
    expect(screen.queryByRole('radio')).toBeNull();
  });

  it('fills the map area, edge to edge (no rounded corners)', async () => {
    await renderWithProviders(<ExperienceMapScreen experienceId="exp-rooftop-sunset" />);

    const map = await screen.findByTestId('roam-map');
    expect(map.props.className).not.toMatch(/rounded-large/);
    expect(map.props.pointerEvents).toBe('auto');
  });

  it('back goes back; with nothing behind it, replaces with the experience', async () => {
    await renderWithProviders(<ExperienceMapScreen experienceId="exp-rooftop-sunset" />);
    await screen.findByTestId('roam-map');

    await fireEvent.press(screen.getByRole('button', { name: 'Retour' }));
    expect(mockBack).toHaveBeenCalledTimes(1);

    mockCanGoBack = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Retour' }));
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/experience/[id]',
      params: { id: 'exp-rooftop-sunset' },
    });
  });

  it('shows a way back (no crash) for an unknown experience', async () => {
    await renderWithProviders(<ExperienceMapScreen experienceId="nope" />);

    expect(await screen.findByRole('button', { name: 'Retour' })).toBeOnTheScreen();
    expect(screen.queryByTestId('roam-map')).toBeNull();
  });

  it('the map fills the whole screen behind the header (absolute fill), so the header has no background of its own', async () => {
    await renderWithProviders(<ExperienceMapScreen experienceId="exp-rooftop-sunset" />);

    const map = await screen.findByTestId('roam-map');
    const flat = Object.assign({}, ...[map.props.style].flat(Infinity).filter(Boolean));
    expect(flat).toMatchObject({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 });
  });

  describe('footer hide / show (D-74)', () => {
    const slot = () =>
      screen.getByTestId('experience-map-footer-slot', { includeHiddenElements: true });

    it('starts with the footer visible and no "show" button', async () => {
      await renderWithProviders(<ExperienceMapScreen experienceId="exp-rooftop-sunset" />);
      await screen.findByTestId('roam-map');

      expect(screen.getByTestId('experience-map-footer')).toBeOnTheScreen();
      expect(slot().props.pointerEvents).toBe('auto');
      expect(
        screen.queryByRole('button', { name: 'Afficher les informations du lieu' }),
      ).toBeNull();
    });

    it('a tap on the bare map slides the footer away and shows the small button', async () => {
      await renderWithProviders(<ExperienceMapScreen experienceId="exp-rooftop-sunset" />);
      await fireEvent.press(await screen.findByTestId('mock-map-view'));

      expect(slot().props.pointerEvents).toBe('none');
      expect(slot().props.accessibilityElementsHidden).toBe(true);
      expect(
        screen.getByRole('button', { name: 'Afficher les informations du lieu' }),
      ).toBeOnTheScreen();
    });

    it('the small button slides the footer back and disappears; the cycle repeats', async () => {
      await renderWithProviders(<ExperienceMapScreen experienceId="exp-rooftop-sunset" />);
      const map = await screen.findByTestId('mock-map-view');

      for (let round = 0; round < 2; round += 1) {
        await fireEvent.press(map);
        await fireEvent.press(
          screen.getByRole('button', { name: 'Afficher les informations du lieu' }),
        );

        expect(slot().props.pointerEvents).toBe('auto');
        expect(slot().props.accessibilityElementsHidden).toBe(false);
        expect(
          screen.queryByRole('button', { name: 'Afficher les informations du lieu' }),
        ).toBeNull();
      }
    });

    it('a tap on the marker or on the footer does not hide it', async () => {
      await renderWithProviders(<ExperienceMapScreen experienceId="exp-rooftop-sunset" />);
      await screen.findByTestId('roam-map');

      await fireEvent.press(screen.getAllByRole('button', { name: 'Rooftop Sunset' })[0]);
      expect(slot().props.pointerEvents).toBe('auto');

      await fireEvent.press(screen.getByTestId('experience-map-footer'));
      expect(slot().props.pointerEvents).toBe('auto');
    });

    it('keeps the map gestures: pan and zoom stay enabled', async () => {
      await renderWithProviders(<ExperienceMapScreen experienceId="exp-rooftop-sunset" />);

      const map = await screen.findByTestId('mock-map-view');
      expect(map.props.scrollEnabled).toBe(true);
      expect(map.props.zoomEnabled).toBe(true);
    });
  });

  describe('several experiences: photo markers, selection, camera (sprint 9)', () => {
    const marker = (name: string) => screen.getByRole('button', { name });
    const footer = () => within(screen.getByTestId('experience-map-footer'));
    const layout = async () => {
      await fireEvent(screen.getByTestId('roam-map'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 844 } },
      });
      await fireEvent(
        screen.getByTestId('experience-map-footer-slot', { includeHiddenElements: true }),
        'layout',
        { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 260 } } },
      );
    };

    beforeEach(() => mockAnimateToRegion.mockClear());

    it('pins the other experiences too, each with its own photo', async () => {
      await renderWithProviders(<ExperienceMapScreen experienceId="exp-rooftop-sunset" />);
      await screen.findByTestId('roam-map');

      expect(marker('Rooftop Sunset')).toBeOnTheScreen();
      expect(marker('Soirée jazz')).toBeOnTheScreen();
      expect(marker('Dîners avec vue')).toBeOnTheScreen();
      expect(screen.getByTestId('experience-marker-image-exp-rooftop-sunset')).toBeOnTheScreen();
      expect(screen.getByTestId('experience-marker-image-exp-jazz-night').props.source).not.toEqual(
        screen.getByTestId('experience-marker-image-exp-dinner-view').props.source,
      );
    });

    it('starts with the opened experience selected, and the footer showing it', async () => {
      await renderWithProviders(<ExperienceMapScreen experienceId="exp-rooftop-sunset" />);
      await screen.findByTestId('roam-map');

      expect(marker('Rooftop Sunset')).toBeSelected();
      expect(marker('Soirée jazz')).not.toBeSelected();
      expect(footer().getByText('Rooftop Sunset')).toBeOnTheScreen();
    });

    it('a marker tap selects that experience alone and the footer follows it', async () => {
      await renderWithProviders(<ExperienceMapScreen experienceId="exp-rooftop-sunset" />);
      await screen.findByTestId('roam-map');

      await fireEvent.press(marker('Soirée jazz'));

      expect(marker('Soirée jazz')).toBeSelected();
      expect(marker('Rooftop Sunset')).not.toBeSelected();
      expect(screen.getAllByRole('button', { selected: true })).toHaveLength(1);
      expect(footer().getByText('Soirée jazz')).toBeOnTheScreen();
      expect(footer().queryByText('Rooftop Sunset')).toBeNull();
      // No title next to the back button that could name another experience.
      expect(screen.queryByRole('header')).toBeNull();
    });

    it('recenters the camera on the tapped experience, clear of the header and the footer', async () => {
      await renderWithProviders(<ExperienceMapScreen experienceId="exp-rooftop-sunset" />);
      await screen.findByTestId('roam-map');
      await layout();
      mockAnimateToRegion.mockClear();

      await fireEvent.press(marker('Soirée jazz'));

      expect(mockAnimateToRegion).toHaveBeenCalledTimes(1);
      const [region, duration] = mockAnimateToRegion.mock.calls[0];
      // exp-jazz-night's own coordinates (48.854, 2.3339).
      expect(region.longitude).toBe(2.3339);
      // Header (47 + 56 px) is shorter than the footer (260 px): the camera center sits below the
      // marker, so the marker lands in the middle of the visible map, not under the footer.
      expect(region.latitude).toBeLessThan(48.854);
      expect(duration).toBeGreaterThan(0);
    });

    it('a marker tap brings a hidden footer back, for the tapped experience', async () => {
      await renderWithProviders(<ExperienceMapScreen experienceId="exp-rooftop-sunset" />);
      await fireEvent.press(await screen.findByTestId('mock-map-view'));
      expect(
        screen.getByTestId('experience-map-footer-slot', { includeHiddenElements: true }).props
          .pointerEvents,
      ).toBe('none');

      await fireEvent.press(marker('Soirée jazz'));

      expect(screen.getByTestId('experience-map-footer-slot').props.pointerEvents).toBe('auto');
      expect(footer().getByText('Soirée jazz')).toBeOnTheScreen();
      expect(
        screen.queryByRole('button', { name: 'Afficher les informations du lieu' }),
      ).toBeNull();
    });

    it('a bare-map tap hides the footer but keeps the selection', async () => {
      await renderWithProviders(<ExperienceMapScreen experienceId="exp-rooftop-sunset" />);
      await screen.findByTestId('roam-map');
      await fireEvent.press(marker('Soirée jazz'));

      await pressBareMap(screen.getByTestId('mock-map-view'));
      await fireEvent.press(
        screen.getByRole('button', { name: 'Afficher les informations du lieu' }),
      );

      expect(marker('Soirée jazz')).toBeSelected();
      expect(footer().getByText('Soirée jazz')).toBeOnTheScreen();
    });

    it('the footer CTA opens the selected experience (back for the opened one)', async () => {
      await renderWithProviders(<ExperienceMapScreen experienceId="exp-rooftop-sunset" />);
      await screen.findByTestId('roam-map');

      await fireEvent.press(footer().getByRole('button', { name: /Voir le lieu/ }));
      expect(mockBack).toHaveBeenCalledTimes(1);
      expect(mockPush).not.toHaveBeenCalled();

      await fireEvent.press(marker('Soirée jazz'));
      await fireEvent.press(footer().getByRole('button', { name: /Voir le lieu/ }));
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/experience/[id]',
        params: { id: 'exp-jazz-night' },
      });
    });
  });

  describe('picker A → B → C with the real iOS tap sequence (marker press, then map echo)', () => {
    const marker = (name: string) => screen.getByRole('button', { name });
    const footerSlot = () =>
      screen.getByTestId('experience-map-footer-slot', { includeHiddenElements: true });
    const footer = () => within(screen.getByTestId('experience-map-footer'));

    /** Taps a marker the way Apple Maps reports it: marker `onPress`, then the map's `onPress`. */
    const tapMarker = async (name: string) => {
      await fireEvent.press(marker(name));
      await pressMapEcho(screen.getByTestId('mock-map-view'));
    };

    const STEPS = [
      {
        name: 'Soirée jazz',
        subtitle: /Saint-Germain, Paris/,
        longitude: 2.3339,
      },
      {
        name: 'Dîners avec vue',
        subtitle: /Île Saint-Louis, Paris 4e/,
        longitude: 2.3563,
      },
      {
        name: 'Concert intimiste',
        subtitle: /Pigalle, Paris 9e/,
        longitude: 2.3378,
      },
    ];

    beforeEach(() => mockAnimateToRegion.mockClear());

    it('each tap selects that experience, keeps the footer up with its data only, and recenters on it', async () => {
      await renderWithProviders(<ExperienceMapScreen experienceId="exp-rooftop-sunset" />);
      await screen.findByTestId('roam-map');
      await fireEvent(screen.getByTestId('roam-map'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 844 } },
      });

      const seen = ['Rooftop Sunset'];
      for (const step of STEPS) {
        mockAnimateToRegion.mockClear();
        await tapMarker(step.name);

        // Selected alone.
        expect(marker(step.name)).toBeSelected();
        expect(screen.getAllByRole('button', { selected: true })).toHaveLength(1);
        // Footer still up (the echo did not hide it), no "show" button.
        expect(footerSlot().props.pointerEvents).toBe('auto');
        expect(
          screen.queryByRole('button', { name: 'Afficher les informations du lieu' }),
        ).toBeNull();
        // Footer shows this experience, and nothing of the previous ones.
        expect(footer().getByText(step.name)).toBeOnTheScreen();
        expect(footer().getByText(step.subtitle)).toBeOnTheScreen();
        for (const previous of seen) expect(footer().queryByText(previous)).toBeNull();
        // Camera on this experience.
        expect(mockAnimateToRegion).toHaveBeenCalledTimes(1);
        expect(mockAnimateToRegion.mock.calls[0][0].longitude).toBe(step.longitude);

        seen.push(step.name);
      }
    });

    it('the footer CTA then opens the last tapped experience', async () => {
      await renderWithProviders(<ExperienceMapScreen experienceId="exp-rooftop-sunset" />);
      await screen.findByTestId('roam-map');
      for (const step of STEPS) await tapMarker(step.name);

      await fireEvent.press(footer().getByRole('button', { name: /Voir le lieu/ }));
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/experience/[id]',
        params: { id: 'exp-live-concert' },
      });
    });
  });
});
