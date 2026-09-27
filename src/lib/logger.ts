/**
 * Structured logging.
 *
 * One JSON object per line keeps the logs greppable and ready for a collector
 * (CloudWatch, Loki, Datadog…) without adding a dependency. `LOG_LEVEL` controls
 * the threshold; anything below it is dropped before the line is written.
 */
export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export type LogContext = Record<string, unknown>;

function activeLevel(): LogLevel {
  const configured = (process.env.LOG_LEVEL ?? "").toLowerCase();

  return (LOG_LEVELS as readonly string[]).includes(configured) ? (configured as LogLevel) : "info";
}

/** Redacts values that should never reach a log line. */
const SENSITIVE_KEYS = ["password", "passwordHash", "token", "refreshToken", "authorization", "cookie", "secret"];

function sanitize(context: LogContext): LogContext {
  const clean: LogContext = {};

  for (const [key, value] of Object.entries(context)) {
    if (SENSITIVE_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive))) {
      clean[key] = "[redacted]";
      continue;
    }

    if (value instanceof Error) {
      clean[key] = { name: value.name, message: value.message };
      continue;
    }

    clean[key] = value;
  }

  return clean;
}

function write(level: LogLevel, message: string, context: LogContext = {}): void {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[activeLevel()]) {
    return;
  }

  const line = JSON.stringify({
    level,
    time: new Date().toISOString(),
    message,
    ...sanitize(context),
  });

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export const logger = {
  debug: (message: string, context?: LogContext) => write("debug", message, context),
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
};
