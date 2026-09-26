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

  // Future providers (Data Foundation). Optional until their adapters exist.
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  GOOGLE_PLACES_API_KEY?: string;

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
