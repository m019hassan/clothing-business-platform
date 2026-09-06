import { Prisma } from "@prisma/client";

export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "AUTHENTICATION_ERROR"
  | "AUTHORIZATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "DATABASE_ERROR"
  | "INTERNAL_ERROR";

const statusByCode: Record<AppErrorCode, number> = {
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
