import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { CollectionDetailPlaceholder } from '@/features/discover/CollectionDetailPlaceholder';
import { repositories } from '@/services';
import type { Collection } from '@/types';

export default function CollectionDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [collection, setCollection] = useState<Collection | null>(null);

  useEffect(() => {
    let active = true;
    void repositories.collections.getById(id).then((result) => {
      if (active) setCollection(result);
    });
    return () => {
      active = false;
    };
  }, [id]);

  return <CollectionDetailPlaceholder title={collection?.title} />;
}
