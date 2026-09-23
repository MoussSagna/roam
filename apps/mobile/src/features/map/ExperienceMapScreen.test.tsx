import { act, fireEvent, screen } from '@testing-library/react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { ExperienceMapScreen } from './ExperienceMapScreen';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => mockCanGoBack,
  }),
}));

describe('ExperienceMapScreen (D-73 — full-screen experience map)', () => {
  beforeEach(async () => {
    mockBack.mockClear();
    mockReplace.mockClear();
    mockCanGoBack = true;
    await act(() => i18n.changeLanguage('fr'));
  });

  it('renders the transparent header (back + name), a RoamMap with the experience pin, and the footer', async () => {
    await renderWithProviders(<ExperienceMapScreen experienceId="exp-rooftop-sunset" />);

    expect(await screen.findByTestId('roam-map')).toBeOnTheScreen();
    expect(screen.getByRole('header')).toHaveTextContent('Rooftop Sunset');
    // The single pin is the experience itself.
    expect(screen.getAllByRole('button', { name: 'Rooftop Sunset' }).length).toBeGreaterThan(0);
    expect(screen.getByTestId('experience-map-footer')).toBeOnTheScreen();
    expect(screen.getByText('Bars & Soirées · Paris')).toBeOnTheScreen();
  });

  it('has no picker: one pin, one footer, no card overlay', async () => {
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
});
