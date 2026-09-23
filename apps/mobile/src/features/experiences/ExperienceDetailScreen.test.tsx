import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { View } from 'react-native';

import i18n from '@/i18n';
import { renderWithProviders } from '@/test/renderWithProviders';

import { ExperienceDetailScreen } from './ExperienceDetailScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));

async function renderDetail(experienceId = 'exp-rooftop-sunset') {
  return renderWithProviders(<ExperienceDetailScreen experienceId={experienceId} />);
}

describe('ExperienceDetailScreen (sprint 5)', () => {
  beforeEach(async () => {
    mockPush.mockClear();
    await act(() => i18n.changeLanguage('fr'));
  });

  it('shows the title, rating, distance and description', async () => {
    await renderDetail();

    expect(screen.getByRole('header')).toHaveTextContent('Rooftop Sunset');
    // "4.8" appears twice (the header rating and the reviews summary use the same formatting).
    expect(screen.getAllByText('4.8').length).toBeGreaterThan(0);
    expect(screen.getByText('1,5 km')).toBeOnTheScreen();
    expect(screen.getByText('Cocktails et vue imprenable sur tout Paris.')).toBeOnTheScreen();
  });

  it('shows the category, nearby and loved badges', async () => {
    await renderDetail();

    expect(screen.getByText('Bars & Soirées')).toBeOnTheScreen();
    expect(screen.getByText('À proximité')).toBeOnTheScreen();
    expect(screen.getByText('Coup de cœur')).toBeOnTheScreen();
  });

  it('shows the essential info grid', async () => {
    await renderDetail();

    expect(screen.getByText('14 rue Crespin du Gast, 75011 Paris')).toBeOnTheScreen();
    expect(screen.getByText('18:00 – 02:00')).toBeOnTheScreen();
    expect(screen.getByText('25 €')).toBeOnTheScreen();
    expect(screen.getByText('Métro · Oberkampf')).toBeOnTheScreen();
    expect(screen.getByText('5 min à pied')).toBeOnTheScreen();
  });

  it('shows why ROAM recommends it, derived from the experience data', async () => {
    await renderDetail();

    // exp-rooftop-sunset: has moods, is within 5 km and has opening hours, but its budget bracket
    // (25to50) is outside the "in budget" reason (`lib/whyRecommended.ts`).
    expect(screen.getByText('Correspond à tes centres d’intérêt')).toBeOnTheScreen();
    expect(screen.getByText('À proximité de toi')).toBeOnTheScreen();
    expect(screen.getByText('Ouvert ce soir')).toBeOnTheScreen();
    expect(screen.queryByText('Dans ton budget')).toBeNull();
  });

  it('shows the mocked reviews', async () => {
    await renderDetail();

    expect(screen.getByText('Julie M.')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Un lieu incroyable ! La vue est magnifique, l’ambiance au top et les cocktails excellents. Parfait pour une soirée entre amis.',
      ),
    ).toBeOnTheScreen();
  });

  it('shows the highlights', async () => {
    await renderDetail();

    expect(screen.getByText('Vue panoramique sur Paris')).toBeOnTheScreen();
    expect(screen.getByText('Cocktails signature')).toBeOnTheScreen();
    expect(screen.getByText('Ambiance musicale')).toBeOnTheScreen();
    expect(screen.getByText('Terrasse couverte et chauffée')).toBeOnTheScreen();
  });

  it('shows the similar experiences', async () => {
    await renderDetail();

    expect(screen.getByText('Le Hasard Ludique')).toBeOnTheScreen();
    expect(screen.getByText('Mama Shelter')).toBeOnTheScreen();
    expect(screen.getByText('La Bellevilloise')).toBeOnTheScreen();
  });

  it('toggles the sticky header favorite button', async () => {
    await renderDetail();

    // Scoped to the header: the similar-experience cards have their own "Ajouter aux favoris" buttons.
    const header = within(screen.getByTestId('experience-detail-header'));
    await fireEvent.press(header.getByRole('button', { name: 'Ajouter aux favoris' }));

    expect(header.getByRole('button', { name: 'Retirer des favoris' })).toBeOnTheScreen();
  });

  it('does not show the removed "Envie d\'en faire plus" section', async () => {
    await renderDetail();

    expect(screen.queryByText('Envie d’en faire plus ?')).toBeNull();
    expect(
      screen.queryByText('ROAM peut te proposer un parcours complet autour de cette expérience.'),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'Créer un parcours personnalisé' })).toBeNull();
  });

  it('navigates to the create-journey placeholder from the sticky CTA', async () => {
    await renderDetail();

    await fireEvent.press(screen.getByRole('button', { name: 'Créer mon parcours' }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/itinerary/create',
      params: { experienceId: 'exp-rooftop-sunset' },
    });
  });

  it('hides the sticky CTA on a sustained downward scroll and brings it back once the scroll ends', async () => {
    await renderDetail();
    const scrollView = screen.getByTestId('experience-detail-scroll');

    expect(screen.getByRole('button', { name: 'Créer mon parcours' })).toBeOnTheScreen();

    await fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { y: 200 } } });
    expect(screen.queryByRole('button', { name: 'Créer mon parcours' })).toBeNull();

    await fireEvent(scrollView, 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { y: 200 } },
    });
    expect(screen.getByRole('button', { name: 'Créer mon parcours' })).toBeOnTheScreen();
  });

  it('brings the sticky CTA back on an upward scroll, without waiting for the scroll to end', async () => {
    await renderDetail();
    const scrollView = screen.getByTestId('experience-detail-scroll');

    await fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { y: 200 } } });
    expect(screen.queryByRole('button', { name: 'Créer mon parcours' })).toBeNull();

    await fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { y: 170 } } });
    expect(screen.getByRole('button', { name: 'Créer mon parcours' })).toBeOnTheScreen();
  });

  it('navigates to the gallery, with the measured hero rect, when the hero image is pressed', async () => {
    jest
      .spyOn(View.prototype, 'measureInWindow')
      .mockImplementation((callback: (x: number, y: number, w: number, h: number) => void) =>
        callback(0, 100, 390, 340),
      );

    await renderDetail();

    await act(async () => {
      fireEvent.press(screen.getByLabelText('1 / 5'));
    });

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/gallery/[id]',
      params: {
        id: 'exp-rooftop-sunset',
        index: '0',
        heroX: '0',
        heroY: '100',
        heroW: '390',
        heroH: '340',
      },
    });

    jest.restoreAllMocks();
  });

  it('navigates to another experience from "Suggestions similaires"', async () => {
    await renderDetail();

    await fireEvent.press(screen.getByRole('button', { name: 'Le Hasard Ludique' }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/experience/[id]',
      params: { id: 'exp-hasard-ludique' },
    });
  });

  it('shows a coming-soon fallback for an unknown experience id', async () => {
    await renderDetail('does-not-exist');

    expect(screen.getByText('Cet écran arrive bientôt.')).toBeOnTheScreen();
  });

  describe('map block (D-73)', () => {
    it('shows a real map with the experience pin and its address underneath', async () => {
      await renderDetail();

      expect(screen.getByTestId('experience-detail-map')).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Rooftop Sunset' })).toBeOnTheScreen();
      expect(screen.getByText('14 rue Crespin du Gast, 75011 Paris')).toBeOnTheScreen();
    });

    it('is a static preview: the map itself takes no touches, the block does', async () => {
      await renderDetail();

      expect(screen.getByTestId('experience-detail-map').props.pointerEvents).toBe('none');
      const mapView = screen.getByTestId('mock-map-view');
      expect(mapView.props.scrollEnabled).toBe(false);
      expect(mapView.props.zoomEnabled).toBe(false);
    });

    it('tapping the block opens the full-screen map of this experience', async () => {
      await renderDetail();

      await fireEvent.press(screen.getByRole('button', { name: 'Voir sur la carte' }));

      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/experience-map/[id]',
        params: { id: 'exp-rooftop-sunset' },
      });
    });
  });
});
