import type { ArgumentMetadata } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsString, Min, ValidateNested } from 'class-validator';

import { ApiException } from '../errors/api-error.js';
import { createValidationPipe } from './validation.pipe.js';

class PointDto {
  @IsInt()
  x!: number;
}

class SampleDto {
  @IsString()
  name!: string;

  @IsInt()
  @Min(1)
  count!: number;

  @ValidateNested()
  @Type(() => PointDto)
  point!: PointDto;
}

const body: ArgumentMetadata = { type: 'body', metatype: SampleDto };

describe('global validation pipe', () => {
  const pipe = createValidationPipe();

  it('returns a DTO instance for a valid payload', async () => {
    const result: unknown = await pipe.transform({ name: 'Café', count: 2, point: { x: 1 } }, body);

    expect(result).toBeInstanceOf(SampleDto);
    expect((result as SampleDto).point).toBeInstanceOf(PointDto);
  });

  it('rejects unknown properties instead of silently dropping them', async () => {
    await expect(
      pipe.transform({ name: 'Café', count: 2, point: { x: 1 }, isAdmin: true }, body),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      details: [{ field: 'isAdmin', messages: ['property isAdmin should not exist'] }],
    });
  });

  it('lists every invalid field, nested ones included, without echoing values', async () => {
    const error = (await pipe
      .transform({ name: 42, count: 0, point: { x: 'secret-value' } }, body)
      .catch((e: unknown) => e)) as ApiException;

    expect(error).toBeInstanceOf(ApiException);
    expect(error.getStatus()).toBe(400);
    expect((error.details as { field: string }[]).map((d) => d.field)).toEqual([
      'name',
      'count',
      'point.x',
    ]);
    expect(JSON.stringify(error.getResponse())).not.toContain('secret-value');
  });
});
