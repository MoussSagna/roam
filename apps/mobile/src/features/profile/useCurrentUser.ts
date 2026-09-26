import { useEffect, useState } from 'react';

import { repositories } from '@/services';
import type { User } from '@/types';

/** Loads the signed-in user's profile (`Screen -> hook -> Repository`, `DEVELOPMENT.md`; API: `GET /auth/me`). */
export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    repositories.users
      .getCurrentUser()
      .then((result) => {
        if (!active) return;
        setUser(result);
        setIsLoading(false);
      })
      .catch(() => {
        // A failed request ends loading without a user; a refused session (401) already signed out.
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { user, isLoading };
}
