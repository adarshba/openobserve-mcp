/**
 * Parse a time value string into a Unix timestamp in milliseconds.
 * @param value - A numeric string (interpreted as milliseconds) or an ISO 8601 date string.
 * @returns Unix timestamp in milliseconds.
 */
export function parseTime(value: string): number {
  const num = Number(value);
  if (!isNaN(num)) return num;
  return new Date(value).getTime();
}
