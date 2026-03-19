import { analyzeSql } from "./analyzer.js";
import type { QueryIntent, SampleStrategy } from "./types.js";

const HOUR_MS = 60 * 60 * 1000;
const SIX_HOURS_MS = 6 * HOUR_MS;
const SEVEN_DAYS_MS = 7 * 24 * HOUR_MS;

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
