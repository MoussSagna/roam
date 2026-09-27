import { Injectable } from '@nestjs/common';

import { persist } from '../../database/persistence-errors.js';
import { PrismaService } from '../../database/prisma.service.js';

/**
 * Provenance rows as the sync sees them (DATA-6 freshness): which provider records are STALE — fetched before their
 * TTL, not declared obsolete — oldest first (index `(providerId, fetchedAt)`).
 */
@Injectable()
export class ExternalSourceRepository {
  constructor(private readonly prisma: PrismaService) {}

  listStale(input: {
    providerKey: string;
    entity: 'PLACE' | 'EVENT';
    fetchedBefore: Date;
    limit: number;
  }): Promise<{ externalId: string; fetchedAt: Date }[]> {
    return persist(() =>
      this.prisma.externalSource.findMany({
        where: {
          provider: { key: input.providerKey },
          entityType: input.entity,
          obsoleteAt: null,
          fetchedAt: { lt: input.fetchedBefore },
        },
        orderBy: [{ fetchedAt: 'asc' }, { id: 'asc' }],
        take: input.limit,
        select: { externalId: true, fetchedAt: true },
      }),
    );
  }
}
