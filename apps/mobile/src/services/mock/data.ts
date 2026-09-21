import type { Category, Experience, Place } from '@/types';

/** Tiny fixture set: just enough to exercise the repository layer. Real mock content comes with the features. */

export const categories: Category[] = [
  { id: 'cat-cafe', slug: 'cafe' },
  { id: 'cat-park', slug: 'park' },
];

export const places: Place[] = [
  {
    id: 'place-cafe',
    name: 'Café de la Place',
    categoryId: 'cat-cafe',
    description: 'Un café calme pour commencer la sortie.',
    address: '12 place de la République, Paris',
    coordinates: { latitude: 48.8674, longitude: 2.3637 },
    price: 'under10',
    tags: ['calm'],
  },
  {
    id: 'place-park',
    name: 'Parc des Buttes',
    categoryId: 'cat-park',
    description: 'Un grand parc pour se promener.',
    address: 'Rue Botzaris, Paris',
    coordinates: { latitude: 48.8809, longitude: 2.3828 },
    price: 'free',
    tags: ['nature'],
  },
];

export const experiences: Experience[] = [
  {
    id: 'exp-slow-afternoon',
    title: 'Après-midi lente',
    description: 'Un café, puis une promenade au parc.',
    moods: ['calm'],
    categoryIds: ['cat-cafe', 'cat-park'],
    placeIds: ['place-cafe', 'place-park'],
    estimatedDurationMin: 120,
    estimatedBudget: 'under10',
  },
];
