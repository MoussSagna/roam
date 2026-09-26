import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

export enum LogLevel {
  Error = 'error',
  Warn = 'warn',
  Log = 'log',
  Debug = 'debug',
  Verbose = 'verbose',
}

/** A number from the environment, `fallback` when unset. */
const positiveInt =
  (fallback: number) =>
  ({ value }: { value: unknown }) =>
    value === undefined || value === '' ? fallback : Number(value);

const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * Every environment variable the API reads, validated once at startup (`ConfigModule` → `validate`).
 * The rest of the code never reads `process.env`: it goes through `AppConfigService`.
 */
export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Transform(({ value }) => (value === undefined || value === '' ? 3000 : Number(value)))
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

  /** PostgreSQL connection string. Required, even when no database is reachable (the API still starts). */
  @Matches(/^postgres(ql)?:\/\/\S+$/, {
    message: 'DATABASE_URL must be a postgresql:// connection string',
  })
  DATABASE_URL!: string;

  /** Comma-separated browser origins allowed by CORS (e.g. Expo web, the future web app). */
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEnum(LogLevel)
  LOG_LEVEL?: LogLevel;

  /** Swagger UI on /docs. Defaults to on outside production. */
  @Transform(({ value }) => (value === undefined || value === '' ? undefined : value === 'true'))
  @IsOptional()
  @IsBoolean()
  SWAGGER_ENABLED?: boolean;

  // Providers (Data Foundation). Optional: the API starts without them; an adapter called without its key fails
  // with ProviderConfigurationError before any request (GOOGLE_PLACES_PROVIDER.md, GEOAPIFY_PROVIDER.md).
  /** Google Places API (New) key — backend only, restricted to that API. Never logged. */
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @Matches(/^[\w-]+$/, {
    message: 'GOOGLE_PLACES_API_KEY must be a single token (letters, digits, - or _)',
  })
  GOOGLE_PLACES_API_KEY?: string;

  /** Geoapify Places API key (GEOAPIFY_PROVIDER.md) — backend only. Never logged. */
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @Matches(/^[\w-]+$/, {
    message: 'GEOAPIFY_API_KEY must be a single token (letters, digits, - or _)',
  })
  GEOAPIFY_API_KEY?: string;

  // Future provider (DATA-3). Optional until its adapter exists.
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  TICKETMASTER_API_KEY?: string;

  /** Lifetime of a session (sign-in on a device), in days. Opaque sessions: no signing secret needed. */
  @Transform(({ value }) => (value === undefined || value === '' ? 30 : Number(value)))
  @IsInt()
  @Min(1)
  @Max(365)
  AUTH_SESSION_TTL_DAYS = 30;

  // Rate limiting (RATE_LIMITING.md). Limits are counted per process (in-memory store).
  /** Master switch; on by default in every environment (tests use high limits instead of turning it off). */
  @Transform(({ value }) => (value === undefined || value === '' ? true : value === 'true'))
  @IsBoolean()
  RATE_LIMIT_ENABLED = true;

  /** Every request, per client IP: a coarse ceiling (also caps clients that rotate fake tokens). */
  @Transform(positiveInt(300))
  @IsInt()
  @Min(1)
  RATE_LIMIT_IP_LIMIT = 300;

  @Transform(positiveInt(60))
  @IsInt()
  @Min(1)
  RATE_LIMIT_IP_TTL_SECONDS = 60;

  /** Every request, per session (bearer token) or, without one, per IP. */
  @Transform(positiveInt(120))
  @IsInt()
  @Min(1)
  RATE_LIMIT_CLIENT_LIMIT = 120;

  @Transform(positiveInt(60))
  @IsInt()
  @Min(1)
  RATE_LIMIT_CLIENT_TTL_SECONDS = 60;

  /** Login, register and password reset, together, per IP: brute force and enumeration guard. */
  @Transform(positiveInt(10))
  @IsInt()
  @Min(1)
  RATE_LIMIT_AUTH_LIMIT = 10;

  @Transform(positiveInt(900))
  @IsInt()
  @Min(1)
  RATE_LIMIT_AUTH_TTL_SECONDS = 900;

  /** Writes (POST, PATCH, PUT, DELETE) outside the auth routes, per session or IP. */
  @Transform(positiveInt(30))
  @IsInt()
  @Min(1)
  RATE_LIMIT_MUTATION_LIMIT = 30;

  @Transform(positiveInt(60))
  @IsInt()
  @Min(1)
  RATE_LIMIT_MUTATION_TTL_SECONDS = 60;

  /**
   * Reverse proxies in front of the API whose `X-Forwarded-For` is trusted (Express `trust proxy`, number of hops).
   * 0 (default): the client IP is the TCP peer — a client cannot pick its IP by sending the header.
   */
  @Transform(({ value }) => (value === undefined || value === '' ? 0 : Number(value)))
  @IsInt()
  @Min(0)
  @Max(10)
  TRUST_PROXY = 0;
}

/**
 * `ConfigModule`'s `validate` hook: converts and checks the raw environment. Throws one error naming
 * every invalid variable and the rule it breaks — never the value, so no secret ends up in a log.
 */
export function validateEnvironment(raw: Record<string, unknown>): EnvironmentVariables {
  const env = plainToInstance(EnvironmentVariables, raw, { exposeDefaultValues: true });
  const errors = validateSync(env, { skipMissingProperties: false, whitelist: false });
  if (errors.length > 0) {
    const problems = errors
      .map((error) => `  - ${error.property}: ${Object.values(error.constraints ?? {}).join('; ')}`)
      .join('\n');
    throw new Error(`Invalid API configuration:\n${problems}`);
  }
  return env;
}
