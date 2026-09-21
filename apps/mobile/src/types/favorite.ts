export type FavoriteTarget = 'place' | 'experience' | 'itinerary';

export type Favorite = {
  id: string;
  userId: string;
  targetType: FavoriteTarget;
  targetId: string;
  /** ISO 8601 date. */
  createdAt: string;
};
