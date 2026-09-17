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

function toNumericParam(raw: string | null, fallback: number): number {
  if (raw === null) {
    return fallback;
  }

  if (raw.trim() === "") {
    return Number.NaN;
  }

  return Number(raw);
}

export function parsePaginationParams(searchParams: URLSearchParams): Pagination {
  const limit = toNumericParam(searchParams.get("limit"), DEFAULT_PAGE_SIZE);
  const offset = toNumericParam(searchParams.get("offset"), 0);

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
