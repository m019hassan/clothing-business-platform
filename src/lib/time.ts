/**
 * Timezone-aware day/month boundaries.
 *
 * "Sales today" has to mean today in the distributor's own timezone, so the
 * boundaries are derived from the IANA zone on the account instead of the
 * server clock. The offset is read from Intl at the reference instant, which is
 * accurate for the current period (DST changes inside a day are not modelled).
 */
export function timezoneOffsetMinutes(timeZone: string, at: Date): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(at).map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );

  return (asUtc - at.getTime()) / 60000;
}

function localDateParts(timeZone: string, at: Date): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const [year, month, day] = formatter.format(at).split("-").map(Number);

  return { year, month, day };
}

/** The UTC instant of local midnight for the given zone. */
export function startOfDayInTimeZone(timeZone: string, at: Date = new Date()): Date {
  const { year, month, day } = localDateParts(timeZone, at);
  const localMidnightAsUtc = Date.UTC(year, month - 1, day, 0, 0, 0);
  const offsetMinutes = timezoneOffsetMinutes(timeZone, at);

  return new Date(localMidnightAsUtc - offsetMinutes * 60_000);
}

/** The UTC instant of the first day of the local month for the given zone. */
export function startOfMonthInTimeZone(timeZone: string, at: Date = new Date()): Date {
  const { year, month } = localDateParts(timeZone, at);
  const firstDayAsUtc = Date.UTC(year, month - 1, 1, 0, 0, 0);
  const offsetMinutes = timezoneOffsetMinutes(timeZone, new Date(firstDayAsUtc));

  return new Date(firstDayAsUtc - offsetMinutes * 60_000);
}
