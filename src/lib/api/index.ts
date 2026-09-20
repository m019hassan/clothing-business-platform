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

export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "Something went wrong. Please try again.";
  }

  switch (error.status) {
    case 400:
      return error.message;
    case 401:
      return "Your session has expired. Please sign in again.";
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return "This item is no longer available.";
    case 409:
      return "Some items are no longer available in the requested quantity. Please review your cart.";
    default:
      return "Something went wrong. Please try again.";
  }
}
