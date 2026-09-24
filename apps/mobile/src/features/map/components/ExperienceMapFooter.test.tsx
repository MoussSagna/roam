import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { Experience } from '@/types';

import { ExperienceMapFooter } from './ExperienceMapFooter';

const EXPERIENCE: Experience = {
  id: 'exp-a',
  title: 'Café de la Fontaine',
  description: '',
  moods: [],
  categoryIds: [],
  placeIds: [],
  estimatedDurationMin: 60,
  estimatedBudget: '10to25',
  rating: 4.8,
  reviewCount: 124,
};

describe('ExperienceMapFooter (D-73)', () => {
  it('shows the name, category · place, rating and review count', async () => {
    await renderWithProviders(
      <ExperienceMapFooter
        experience={EXPERIENCE}
        subtitle="Café · Paris 3e"
        onPressView={jest.fn()}
      />,
    );

    expect(screen.getByTestId('experience-map-footer')).toBeOnTheScreen();
    expect(screen.getByText('Café de la Fontaine')).toBeOnTheScreen();
    expect(screen.getByText('Café · Paris 3e')).toBeOnTheScreen();
    expect(screen.getByText('4.8')).toBeOnTheScreen();
    expect(screen.getByText('(124 avis)')).toBeOnTheScreen();
  });

  it('the CTA reports the experience', async () => {
    const onPressView = jest.fn();
    await renderWithProviders(
      <ExperienceMapFooter experience={EXPERIENCE} onPressView={onPressView} />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Voir le lieu' }));

    expect(onPressView).toHaveBeenCalledWith(EXPERIENCE);
  });

  it('omits what the experience does not have (no rating, no subtitle) without crashing', async () => {
    await renderWithProviders(
      <ExperienceMapFooter
        experience={{ ...EXPERIENCE, rating: undefined, reviewCount: undefined }}
        onPressView={jest.fn()}
      />,
    );

    expect(screen.getByText('Café de la Fontaine')).toBeOnTheScreen();
    expect(screen.queryByText('4.8')).toBeNull();
  });
});
