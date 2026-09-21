import type { BudgetRange, Coordinates } from './common';

export type Category = {
  id: string;
  /** Stable identifier, e.g. `cafe`, `park`. Display labels are resolved by the UI layer. */
  slug: string;
};

export type Place = {
  id: string;
  name: string;
  categoryId: string;
  description: string;
  address: string;
  coordinates: Coordinates;
  price: BudgetRange;
  imageUrl?: string;
  tags: string[];
};
