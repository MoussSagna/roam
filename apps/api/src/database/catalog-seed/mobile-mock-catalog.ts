/**
 * DATA-1 migration source: the catalog of the mobile app's mock data (`apps/mobile/src/services/mock/data.ts`),
 * transcribed field for field — the only catalog data in the repository. Only the fields the migration maps (or
 * explicitly reports as not migrated, like `moods`) are kept; display strings, images (`require()` bundler
 * assets), reviews, highlights, transport, similar ids and history fields are not (see
 * apidocs/DATA_1_MIGRATION_REPORT.md → "Fields not representable").
 *
 * `mobile-mock-catalog.spec.ts` parses the mobile file and checks this copy against it, so the two cannot drift
 * apart silently: a mock added, removed or edited on the mobile side fails the test until it is reported here.
 * Nothing in this file is invented: every value comes from the mobile file.
 */

export type MockBudget = 'free' | 'under10' | '10to25' | '25to50' | '50plus';

export type MockCoordinates = { latitude: number; longitude: number };

export type MockCategory = { id: string; slug: string };

export type MockPlace = {
  id: string;
  name: string;
  categoryId: string;
  description: string;
  address: string;
  coordinates: MockCoordinates;
  price: MockBudget;
  tags: string[];
};

export type MockExperience = {
  id: string;
  title: string;
  description: string;
  /** Mobile `Mood` values. Not migrated: no shared mood vocabulary with the catalog yet (product decision). */
  moods: string[];
  categoryIds: string[];
  /** Ordered. */
  placeIds: string[];
  estimatedDurationMin: number;
  estimatedBudget: MockBudget;
  coordinates?: MockCoordinates;
  address?: string;
  rating?: number;
  reviewCount?: number;
  tags?: string[];
};

export type MockCatalog = {
  categories: MockCategory[];
  places: MockPlace[];
  experiences: MockExperience[];
};

export const MOBILE_MOCK_CATALOG: MockCatalog = {
  categories: [
    { id: 'cat-cafe', slug: 'cafe' },
    { id: 'cat-park', slug: 'park' },
    { id: 'cat-restaurant', slug: 'restaurant' },
    { id: 'cat-bar', slug: 'bar' },
    { id: 'cat-culture', slug: 'culture' },
    { id: 'cat-nature', slug: 'nature' },
    { id: 'cat-experience', slug: 'experience' },
  ],
  places: [
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
  ],
  experiences: [
    {
      id: 'exp-slow-afternoon',
      title: 'Après-midi lente',
      description: 'Un café, puis une promenade au parc.',
      moods: ['calm'],
      categoryIds: ['cat-cafe', 'cat-park'],
      placeIds: ['place-cafe', 'place-park'],
      estimatedDurationMin: 120,
      estimatedBudget: 'under10',
      coordinates: { latitude: 48.8674, longitude: 2.3637 },
      address: '12 place de la République, 75011 Paris',
      rating: 4.5,
      reviewCount: 64,
    },
    {
      id: 'exp-dinner-view',
      title: 'Dîners avec vue',
      description: 'Les plus belles terrasses de Paris pour des soirées inoubliables.',
      moods: ['romantic', 'food'],
      categoryIds: ['cat-restaurant'],
      placeIds: [],
      estimatedDurationMin: 120,
      estimatedBudget: '25to50',
      coordinates: { latitude: 48.8517, longitude: 2.3563 },
      address: '8 quai de Bourbon, 75004 Paris',
      rating: 4.8,
      reviewCount: 412,
      tags: ['food', 'romantic'],
    },
    {
      id: 'exp-panoramic-walk',
      title: 'Balade panoramique',
      description: 'Une marche au coucher du soleil avec vue sur toute la ville.',
      moods: ['discover', 'calm'],
      categoryIds: ['cat-nature'],
      placeIds: [],
      estimatedDurationMin: 90,
      estimatedBudget: 'free',
      coordinates: { latitude: 48.8867, longitude: 2.3431 },
      address: 'Parvis du Sacré-Cœur, 75018 Paris',
      rating: 4.7,
      reviewCount: 265,
      tags: ['discover', 'nature'],
    },
    {
      id: 'exp-jazz-night',
      title: 'Soirée jazz',
      description: 'Une ambiance feutrée et des standards de jazz jusqu’au bout de la nuit.',
      moods: ['festive', 'culture'],
      categoryIds: ['cat-bar'],
      placeIds: [],
      estimatedDurationMin: 120,
      estimatedBudget: '10to25',
      coordinates: { latitude: 48.854, longitude: 2.3339 },
      address: '5 rue Saint-Benoît, 75006 Paris',
      rating: 4.6,
      reviewCount: 198,
      tags: ['festive', 'culture'],
    },
    {
      id: 'exp-nature-getaway',
      title: 'Escapade nature',
      description: 'Une parenthèse verte à moins d’une heure de la ville.',
      moods: ['calm', 'discover'],
      categoryIds: ['cat-nature'],
      placeIds: [],
      estimatedDurationMin: 240,
      estimatedBudget: 'free',
      coordinates: { latitude: 48.8049, longitude: 2.1204 },
      address: 'Route de Saint-Cyr, 78000 Versailles',
      rating: 4.7,
      reviewCount: 234,
      tags: ['calm', 'nature'],
    },
    {
      id: 'exp-night-museum',
      title: 'Musée nocturne',
      description: 'Expositions et œuvres à découvrir dans une ambiance tamisée.',
      moods: ['culture', 'discover'],
      categoryIds: ['cat-culture'],
      placeIds: [],
      estimatedDurationMin: 90,
      estimatedBudget: 'under10',
      coordinates: { latitude: 48.8638, longitude: 2.337 },
      address: '1 place du Palais-Royal, 75001 Paris',
      rating: 4.5,
      reviewCount: 143,
      tags: ['culture', 'discover'],
    },
    {
      id: 'exp-rooftop-sunset',
      title: 'Rooftop Sunset',
      description: 'Cocktails et vue imprenable sur tout Paris.',
      moods: ['food', 'romantic'],
      categoryIds: ['cat-bar'],
      placeIds: [],
      estimatedDurationMin: 120,
      estimatedBudget: '25to50',
      coordinates: { latitude: 48.8671, longitude: 2.3812 },
      address: '14 rue Crespin du Gast, 75011 Paris',
      rating: 4.8,
      reviewCount: 320,
      tags: ['food', 'festive'],
    },
    {
      id: 'exp-lake-hike',
      title: 'Randonnée au lac bleu',
      description: 'Une parenthèse nature à moins d’1 h de Paris.',
      moods: ['calm', 'discover'],
      categoryIds: ['cat-nature'],
      placeIds: [],
      estimatedDurationMin: 240,
      estimatedBudget: 'free',
      coordinates: { latitude: 48.7845, longitude: 2.0335 },
      address: 'Île de loisirs, 78190 Trappes',
      rating: 4.7,
      reviewCount: 278,
      tags: ['nature', 'discover'],
    },
    {
      id: 'exp-modern-art-museum',
      title: 'Musée d’Art Moderne',
      description: 'Une immersion dans l’art contemporain.',
      moods: ['culture'],
      categoryIds: ['cat-culture'],
      placeIds: [],
      estimatedDurationMin: 90,
      estimatedBudget: 'under10',
      coordinates: { latitude: 48.8643, longitude: 2.2977 },
      address: '11 avenue du Président Wilson, 75116 Paris',
      rating: 4.6,
      reviewCount: 192,
      tags: ['culture'],
    },
    {
      id: 'exp-picnic-park',
      title: 'Pique-nique au parc',
      description: 'Un moment simple et gourmand à l’ombre des arbres.',
      moods: ['calm', 'food'],
      categoryIds: ['cat-park'],
      placeIds: [],
      estimatedDurationMin: 90,
      estimatedBudget: 'free',
      coordinates: { latitude: 48.8809, longitude: 2.3828 },
      address: 'Parc des Buttes-Chaumont, 75019 Paris',
      rating: 4.5,
      reviewCount: 87,
      tags: ['calm', 'food'],
    },
    {
      id: 'exp-live-concert',
      title: 'Concert intimiste',
      description: 'Un set acoustique dans une salle à taille humaine.',
      moods: ['festive', 'energetic'],
      categoryIds: ['cat-bar'],
      placeIds: [],
      estimatedDurationMin: 120,
      estimatedBudget: '10to25',
      coordinates: { latitude: 48.8815, longitude: 2.3378 },
      address: '19 rue Victor Massé, 75009 Paris',
      rating: 4.4,
      reviewCount: 56,
      tags: ['festive', 'energetic'],
    },
    {
      id: 'exp-hasard-ludique',
      title: 'Le Hasard Ludique',
      description: 'Bar à jeux et concerts dans une ancienne gare rénovée.',
      moods: ['festive', 'discover'],
      categoryIds: ['cat-bar'],
      placeIds: [],
      estimatedDurationMin: 120,
      estimatedBudget: '10to25',
      coordinates: { latitude: 48.8969, longitude: 2.3277 },
      address: '128 avenue de Saint-Ouen, 75018 Paris',
      rating: 4.5,
      reviewCount: 210,
      tags: ['festive'],
    },
    {
      id: 'exp-mama-shelter',
      title: 'Mama Shelter',
      description: 'Restaurant et rooftop dans un hôtel design.',
      moods: ['food', 'festive'],
      categoryIds: ['cat-restaurant'],
      placeIds: [],
      estimatedDurationMin: 120,
      estimatedBudget: '25to50',
      coordinates: { latitude: 48.8616, longitude: 2.4003 },
      address: '109 rue de Bagnolet, 75020 Paris',
      rating: 4.4,
      reviewCount: 380,
      tags: ['food'],
    },
    {
      id: 'exp-bellevilloise',
      title: 'La Bellevilloise',
      description: 'Lieu culturel indépendant : concerts, expos et brunchs.',
      moods: ['culture', 'festive'],
      categoryIds: ['cat-culture'],
      placeIds: [],
      estimatedDurationMin: 150,
      estimatedBudget: '10to25',
      coordinates: { latitude: 48.8698, longitude: 2.3927 },
      address: '19-21 rue Boyer, 75020 Paris',
      rating: 4.6,
      reviewCount: 265,
      tags: ['culture'],
    },
  ],
};
