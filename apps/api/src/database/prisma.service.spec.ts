import { Logger } from '@nestjs/common';

import type { AppConfigService } from '../config/app-config.service.js';
import { DATABASE_PING_TIMEOUT_MS, PrismaService } from './prisma.service.js';

function service(requiredAtStartup: boolean): PrismaService {
  const config = {
    database: { url: 'postgresql://roam:roam@127.0.0.1:1/roam_test', requiredAtStartup },
  } as AppConfigService;
  return new PrismaService(config);
}

describe('PrismaService (no database needed: queries are mocked)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('is one PrismaClient built from the configured URL', () => {
    const prisma = service(false);

    expect(typeof prisma.$queryRaw).toBe('function');
    expect(typeof prisma.$disconnect).toBe('function');
  });

  it('startup outside production: an unreachable database is a warning, not a crash', async () => {
    const prisma = service(false);
    vi.spyOn(prisma, '$queryRaw').mockRejectedValue(
      Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }),
    );
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    await expect(prisma.onModuleInit()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Error ECONNREFUSED'));
  });

  it('startup in production: an unreachable database stops the startup', async () => {
    const prisma = service(true);
    vi.spyOn(prisma, '$queryRaw').mockRejectedValue(
      Object.assign(new Error("Can't reach database server at db.internal:5432"), {
        code: 'P2010',
      }),
    );

    const failure = prisma.onModuleInit();
    await expect(failure).rejects.toThrow('Database unreachable at startup (Error P2010)');
    // The driver's message (host, port) is not carried into the startup error.
    await expect(failure).rejects.not.toThrow(/db\.internal/);
  });

  it('startup with a reachable database logs the connection', async () => {
    const prisma = service(true);
    vi.spyOn(prisma, '$queryRaw').mockResolvedValue([{ '?column?': 1 }] as never);
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    await prisma.onModuleInit();
    expect(log).toHaveBeenCalledWith('Database connection established');
  });

  it('isReachable: true when the database answers, false on error or timeout', async () => {
    const prisma = service(false);
    const query = vi.spyOn(prisma, '$queryRaw');

    query.mockResolvedValueOnce([] as never);
    expect(await prisma.isReachable()).toBe(true);

    query.mockRejectedValueOnce(new Error('down'));
    expect(await prisma.isReachable()).toBe(false);

    vi.useFakeTimers();
    query.mockReturnValueOnce(new Promise(() => {}) as never);
    const pending = prisma.isReachable();
    await vi.advanceTimersByTimeAsync(DATABASE_PING_TIMEOUT_MS);
    expect(await pending).toBe(false);
  });

  it('closes the connection pool on shutdown', async () => {
    const prisma = service(false);
    const disconnect = vi.spyOn(prisma, '$disconnect').mockResolvedValue();

    await prisma.onModuleDestroy();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
