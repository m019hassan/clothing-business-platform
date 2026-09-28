export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type ErrorPayload = {
  error?: {
    code?: string;
    message?: string;
  };
};

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = (payload as ErrorPayload | null)?.error;

    throw new ApiError(
      response.status,
      error?.code ?? "UNKNOWN",
      error?.message ?? "The request could not be completed.",
    );
  }

  return payload as T;
}

/**
 * Translated API error text, keyed by the stable `error.code` the backend returns.
 * Validation is deliberately generic: the server's validation message names fields
 * in English, so a translated generic sentence reads better than half-translated
 * detail. Without labels the previous English behaviour is kept.
 */
export type ApiErrorLabels = {
  rateLimited: string;
  validation: string;
  authentication: string;
  authorization: string;
  notFound: string;
  conflict: string;
  database: string;
  internal: string;
};

const ENGLISH_BY_STATUS: Record<number, string> = {
  401: "Your session has expired. Please sign in again.",
  403: "You do not have permission to perform this action.",
  404: "This item is no longer available.",
  409: "Some items are no longer available in the requested quantity. Please review your cart.",
};

export function apiErrorMessage(error: unknown, labels?: ApiErrorLabels): string {
  if (!(error instanceof ApiError)) {
    return labels?.internal ?? "Something went wrong. Please try again.";
  }

  if (labels) {
    const byCode: Record<string, string | undefined> = {
      RATE_LIMITED: labels.rateLimited,
      VALIDATION_ERROR: labels.validation,
      AUTHENTICATION_ERROR: labels.authentication,
      AUTHORIZATION_ERROR: labels.authorization,
      NOT_FOUND: labels.notFound,
      CONFLICT: labels.conflict,
      DATABASE_ERROR: labels.database,
      INTERNAL_ERROR: labels.internal,
    };

    const translated = byCode[error.code];

    if (translated) {
      return translated;
    }
  }

  if (error.status === 400) {
    return error.message;
  }

  return ENGLISH_BY_STATUS[error.status] ?? labels?.internal ?? "Something went wrong. Please try again.";
}
