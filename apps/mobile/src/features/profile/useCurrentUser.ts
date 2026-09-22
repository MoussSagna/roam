import { useEffect, useState } from 'react';

import { repositories } from '@/services';
import type { User } from '@/types';

/** Loads the signed-in user's profile (`Screen -> hook -> Repository -> mock`, `DEVELOPMENT.md`). */
export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void repositories.users.getCurrentUser().then((result) => {
      if (active) {
        setUser(result);
        setIsLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return { user, isLoading };
}
