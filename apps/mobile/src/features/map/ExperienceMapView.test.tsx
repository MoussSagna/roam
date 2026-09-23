import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { Experience } from '@/types';

import { ExperienceMapView } from './ExperienceMapView';

const EXPERIENCES: Experience[] = [
  {
    id: 'exp-a',
    title: 'Le Perchoir',
    description: 'Vue panoramique sur Paris.',
    moods: ['festive'],
    categoryIds: ['cat-bar'],
    placeIds: [],
    estimatedDurationMin: 90,
    estimatedBudget: '25to50',
    rating: 4.7,
    distanceLabel: '1,2 km',
  },
  {
    id: 'exp-b',
    title: 'TOO Hôtel Rooftop',
    description: 'Rooftop et restaurant.',
    moods: ['discover'],
    categoryIds: ['cat-restaurant'],
    placeIds: [],
    estimatedDurationMin: 90,
    estimatedBudget: '50plus',
    rating: 4.5,
    distanceLabel: '2,4 km',
  },
];

describe('ExperienceMapView', () => {
  it('renders one pin per experience', async () => {
    await renderWithProviders(
      <ExperienceMapView experiences={EXPERIENCES} onPressExperience={jest.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Le Perchoir' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'TOO Hôtel Rooftop' })).toBeOnTheScreen();
    expect(screen.queryByTestId('experience-map-card')).toBeNull();
  });

  it('shows a bottom card with rating/distance when a pin is selected', async () => {
    await renderWithProviders(
      <ExperienceMapView experiences={EXPERIENCES} onPressExperience={jest.fn()} />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Le Perchoir' }));

    const card = screen.getByTestId('experience-map-card');
    expect(card).toBeOnTheScreen();
    expect(screen.getByText('4.7')).toBeOnTheScreen();
    expect(screen.getByText('· 1,2 km')).toBeOnTheScreen();
  });

  it('calls onPressExperience when the card CTA is pressed', async () => {
    const onPressExperience = jest.fn();
    await renderWithProviders(
      <ExperienceMapView experiences={EXPERIENCES} onPressExperience={onPressExperience} />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Le Perchoir' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Voir le lieu' }));

    expect(onPressExperience).toHaveBeenCalledWith(EXPERIENCES[0]);
  });

  it('closes the card when its close button is pressed', async () => {
    await renderWithProviders(
      <ExperienceMapView experiences={EXPERIENCES} onPressExperience={jest.fn()} />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Le Perchoir' }));
    expect(screen.getByTestId('experience-map-card')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Fermer' }));
    expect(screen.queryByTestId('experience-map-card')).toBeNull();
  });
});
