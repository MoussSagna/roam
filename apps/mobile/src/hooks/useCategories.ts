import { useEffect, useState } from 'react';

import { repositories } from '@/services';
import type { Category } from '@/types';

/** Loads the category list once (`Screen -> hook -> Repository -> mock`, `DEVELOPMENT.md`). Used to
 * resolve a `Category.slug` to a display label (`experience.categories.<slug>`). */
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    let active = true;
    void repositories.categories.list().then((result) => {
      if (active) setCategories(result);
    });
    return () => {
      active = false;
    };
  }, []);

  return categories;
}
