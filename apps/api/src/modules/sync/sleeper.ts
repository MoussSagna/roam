import { Injectable } from '@nestjs/common';

/** Waiting, injectable so that rate limiting and retries run instantly in tests. */
@Injectable()
export class Sleeper {
  sleep(ms: number): Promise<void> {
    return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
  }
}
