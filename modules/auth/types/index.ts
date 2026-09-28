export type LoginInput = {
  identifier: string;
  password: string;
};

export type LoginResult = {
  success: boolean;
  message?: string;
  /** Stable failure reason so the interface can translate it. */
  reason?: "MISSING_FIELDS" | "INVALID_CREDENTIALS" | "RATE_LIMITED" | "UNAVAILABLE";
};
