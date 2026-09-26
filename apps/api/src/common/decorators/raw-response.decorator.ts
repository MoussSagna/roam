import { SetMetadata } from '@nestjs/common';

export const RAW_RESPONSE_KEY = 'roam:rawResponse';

/**
 * Opts a controller or handler out of the `{ data }` success envelope — for infrastructure endpoints
 * whose shape is fixed by their consumers (the health check read by probes).
 */
export const RawResponse = () => SetMetadata(RAW_RESPONSE_KEY, true);
