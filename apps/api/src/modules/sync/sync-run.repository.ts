import { Injectable } from '@nestjs/common';

import { jsonInput, jsonOutput } from '../../database/json.js';
import { persist, UniqueConstraintError } from '../../database/persistence-errors.js';
import { PrismaService } from '../../database/prisma.service.js';
import type { SyncCursor, SyncStatus } from './sync.types.js';

export type SyncCounters = {
  fetched: number;
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
  failed: number;
};

/** Another run of the same provider holds the lease (in this process or another one). */
export class SyncAlreadyRunningError extends Error {
  constructor(readonly provider: string) {
    super(`a ${provider} synchronization is already running`);
    this.name = 'SyncAlreadyRunningError';
  }
}

/**
 * `sync_runs` (DATA-6): one row per run — lease, counters, aggregated errors, resume cursor. The partial unique index
 * `sync_runs_one_running_per_provider` guarantees that two runs of one provider never overlap, across processes; a run
 * whose lease expired (crashed process) is closed as FAILED before a new one starts.
 */
@Injectable()
export class SyncRunRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Opens a RUNNING run, or throws `SyncAlreadyRunningError` while another run of the provider holds its lease. */
  acquire(input: {
    jobKey: string;
    providerKey: string;
    now: Date;
    leaseUntil: Date;
  }): Promise<{ id: string }> {
    return persist(async () => {
      await this.prisma.syncRun.updateMany({
        where: { providerKey: input.providerKey, status: 'RUNNING', leaseUntil: { lt: input.now } },
        data: { status: 'FAILED', finishedAt: input.now, errors: { lease_expired: 1 } },
      });
      try {
        return await persist(() =>
          this.prisma.syncRun.create({
            data: {
              jobKey: input.jobKey,
              providerKey: input.providerKey,
              startedAt: input.now,
              leaseUntil: input.leaseUntil,
            },
            select: { id: true },
          }),
        );
      } catch (error) {
        if (error instanceof UniqueConstraintError)
          throw new SyncAlreadyRunningError(input.providerKey);
        throw error;
      }
    });
  }

  /** Saves progress after a batch: counters, resume cursor, extended lease. */
  progress(
    id: string,
    input: SyncCounters & { cursor: SyncCursor | null; leaseUntil: Date },
  ): Promise<void> {
    const { cursor, ...rest } = input;
    return persist(async () => {
      await this.prisma.syncRun.update({
        where: { id },
        data: { ...rest, cursor: jsonInput(cursor) },
      });
    });
  }

  finish(
    id: string,
    input: SyncCounters & {
      status: SyncStatus;
      finishedAt: Date;
      cursor: SyncCursor | null;
      errors: Record<string, number>;
    },
  ): Promise<void> {
    const { cursor, errors, ...rest } = input;
    return persist(async () => {
      await this.prisma.syncRun.update({
        where: { id },
        data: {
          ...rest,
          cursor: jsonInput(cursor),
          errors: jsonInput(Object.keys(errors).length ? errors : null),
        },
      });
    });
  }

  /** Start of the job's last successful run (incremental sources ask for changes since then). */
  lastSuccessAt(jobKey: string): Promise<Date | null> {
    return persist(async () => {
      const run = await this.prisma.syncRun.findFirst({
        where: { jobKey, status: 'SUCCEEDED' },
        orderBy: { finishedAt: 'desc' },
        select: { startedAt: true },
      });
      return run?.startedAt ?? null;
    });
  }

  /** The cursor to resume from: the job's latest run, when it stopped before the end (PARTIAL/FAILED). */
  resumeCursor(jobKey: string): Promise<SyncCursor | null> {
    return persist(async () => {
      const run = await this.prisma.syncRun.findFirst({
        where: { jobKey, status: { not: 'RUNNING' } },
        orderBy: { startedAt: 'desc' },
        select: { status: true, cursor: true },
      });
      if (!run || run.status === 'SUCCEEDED') return null;
      return jsonOutput(run.cursor) ?? null;
    });
  }
}
