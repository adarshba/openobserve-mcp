import { analyzeSql } from "./analyzer.js";
import type { QueryIntent, SampleStrategy } from "$types";

const HOUR_MS = 60 * 60 * 1000;
const SIX_HOURS_MS = 6 * HOUR_MS;
const SEVEN_DAYS_MS = 7 * 24 * HOUR_MS;

/**
 * Choose the most efficient query strategy based on SQL structure and time range.
 * @param sql - SQL query string used to detect aggregate patterns and error filters.
 * @param startTime - Query start time in milliseconds since epoch.
 * @param endTime - Query end time in milliseconds since epoch.
 * @returns A `QueryIntent` describing the selected strategy and any associated parameters.
 */
export function selectStrategy(
  sql: string,
  startTime: number,
  endTime: number,
): QueryIntent {
  const { isAggregate, filtersErrors } = analyzeSql(sql);

  if (isAggregate) {
    return { kind: "passthrough" };
  }

  const rangeMs = endTime - startTime;

  if (rangeMs > SEVEN_DAYS_MS) {
    return { kind: "aggregate", granularity: "day" };
  }

  if (rangeMs > SIX_HOURS_MS) {
    return { kind: "aggregate", granularity: "hour" };
  }

  if (rangeMs > HOUR_MS) {
    const strategy: SampleStrategy = filtersErrors ? "errors" : "diverse";
    return { kind: "sample", strategy };
  }

  return { kind: "raw" };
}
