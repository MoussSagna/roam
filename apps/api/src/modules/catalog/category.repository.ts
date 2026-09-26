import { Injectable } from '@nestjs/common';

import { persist } from '../../database/persistence-errors.js';
import { PrismaService } from '../../database/prisma.service.js';

/** A ROAM category (mobile `Category`): a stable slug; labels are resolved by the apps. */
export type Category = { id: string; slug: string };

/** Categories (mobile `CategoryRepository.list`). Written with the catalog seed (DATA-1). */
@Injectable()
export class CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<Category[]> {
    return persist(() =>
      this.prisma.category.findMany({ select: { id: true, slug: true }, orderBy: { slug: 'asc' } }),
    );
  }
}
