import { ConflictException, InternalServerErrorException } from '@nestjs/common';

interface PostgresError {
  code: string;
  detail?: string;
}

/**
 * Call this in a catch block after any DB write operation.
 * Converts known PostgreSQL error codes into meaningful NestJS exceptions.
 * Re-throws the original error for anything unrecognised.
 */
export function handleDbError(error: unknown, context?: string): never {
  const pg = error as PostgresError;

  if (pg?.code === '23505') {
    // Unique constraint violation
    const detail = pg.detail ?? '';

    if (detail.includes('email')) {
      throw new ConflictException(
        context
          ? `A ${context} with this email already exists in your organization.`
          : 'A record with this email already exists.',
      );
    }

    throw new ConflictException(
      context
        ? `A ${context} with these details already exists.`
        : 'A record with these details already exists.',
    );
  }

  if (pg?.code === '23503') {
    // Foreign key violation
    throw new ConflictException('Referenced record does not exist.');
  }

  throw new InternalServerErrorException('An unexpected database error occurred.');
}
