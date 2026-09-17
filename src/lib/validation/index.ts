import { ValidationError } from "@/src/lib/errors";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export type Pagination = {
  limit: number;
  offset: number;
};

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function parsePaginationParams(searchParams: URLSearchParams): Pagination {
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");

  const limit = limitParam === null ? DEFAULT_PAGE_SIZE : Number(limitParam);
  const offset = offsetParam === null ? 0 : Number(offsetParam);

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    throw new ValidationError(
      `limit must be a whole number between 1 and ${MAX_PAGE_SIZE}.`,
    );
  }

  if (!Number.isInteger(offset) || offset < 0) {
    throw new ValidationError("offset must be a whole number of 0 or greater.");
  }

  return { limit, offset };
}
