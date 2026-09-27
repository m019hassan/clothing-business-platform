import { logger } from "@/src/lib/logger";

import { Prisma } from "@prisma/client";

export type AppErrorCode =
  | "RATE_LIMITED"
  | "VALIDATION_ERROR"
  | "AUTHENTICATION_ERROR"
  | "AUTHORIZATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

const statusByCode: Record<AppErrorCode, number> = {
  RATE_LIMITED: 429,
  VALIDATION_ERROR: 400,
  AUTHENTICATION_ERROR: 401,
  AUTHORIZATION_ERROR: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  DATABASE_ERROR: 500,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(code: AppErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusByCode[code];
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super("VALIDATION_ERROR", message, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication is required.") {
    super("AUTHENTICATION_ERROR", message);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "You are not authorized to perform this action.") {
    super("AUTHORIZATION_ERROR", message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "The requested resource was not found.") {
    super("NOT_FOUND", message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super("CONFLICT", message, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, retryAfterSeconds = 0) {
    super("RATE_LIMITED", message, { retryAfterSeconds });

    this.retryAfterSeconds = retryAfterSeconds;
  }

  readonly retryAfterSeconds: number;
}

export class DatabaseError extends AppError {
  constructor(message = "A database operation failed.", details?: unknown) {
    super("DATABASE_ERROR", message, details);
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return new DatabaseError("A database operation failed.", { prismaCode: error.code });
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new DatabaseError("The database operation contained invalid data.");
  }

  return new AppError("INTERNAL_ERROR", "An unexpected error occurred.");
}

export async function withDatabaseError<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw toAppError(error);
  }
}

export type ErrorResponseBody = {
  error: {
    code: AppErrorCode;
    message: string;
    retryAfterSeconds?: number;
    /**
     * Correlation id present for server-side failures only; the matching detail
     * (stack, cause) is written to the structured log under the same id, so a
     * report from a user can be traced without leaking internals in the response.
     */
    errorId?: string;
  };
};

/** Short, readable correlation id for a server-side failure. */
export function createErrorId(): string {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 12);
}

/**
 * Turns any thrown value into the response body, and logs it once:
 * server-side failures are logged with a correlation id that is also returned to
 * the client (never the internals themselves), client mistakes at warn for the
 * interesting codes and at debug for ordinary validation misses.
 */
export function toErrorResponse(error: unknown): {
  status: number;
  body: ErrorResponseBody;
} {
  const appError = toAppError(error);
  const isServerFailure = appError.statusCode >= 500;

  if (isServerFailure) {
    const errorId = createErrorId();

    logger.error("request failed", {
      errorId,
      code: appError.code,
      detail: appError.message,
      details: appError.details,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      status: appError.statusCode,
      body: { error: { code: appError.code, message: appError.message, errorId } },
    };
  }

  const context = { code: appError.code, status: appError.statusCode, detail: appError.message };

  if (appError.statusCode === 401 || appError.statusCode === 403 || appError.statusCode === 409) {
    logger.warn("request rejected", context);
  } else {
    logger.debug("request rejected", context);
  }

  return {
    status: appError.statusCode,
    body: {
      error: {
        code: appError.code,
        message: appError.message,
        ...(appError instanceof RateLimitError && appError.retryAfterSeconds > 0
          ? { retryAfterSeconds: appError.retryAfterSeconds }
          : {}),
      },
    },
  };
}
