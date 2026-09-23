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

  it('renders the header, a RoamMap with the experience pin, and the footer', async () => {
    await renderWithProviders(<ExperienceMapScreen experienceId="exp-rooftop-sunset" />);

    expect(await screen.findByTestId('roam-map')).toBeOnTheScreen();
    expect(screen.getByRole('header')).toHaveTextContent('Rooftop Sunset');
    expect(screen.getByText('14 rue Crespin du Gast, 75011 Paris')).toBeOnTheScreen();
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
});
