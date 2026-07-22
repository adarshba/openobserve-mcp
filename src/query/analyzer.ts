const GROUP_BY_RE = /\bgroup\s+by\b/i;
const AGGREGATE_FN_RE = /\b(count|sum|avg|min|max|histogram)\s*\(/i;

/**
 * Regular expression matching common error-level filter patterns in SQL WHERE clauses.
 */
export const ERROR_LEVEL_RE =
  /\b(level|severity|log_level)\s*=\s*['"]?(error|ERROR|FATAL|fatal)/i;

/**
 * Analyse a SQL string and return structural properties relevant to query routing.
 * @param sql - SQL query string to inspect.
 * @returns Object with `isAggregate` (true when GROUP BY or aggregate functions are present)
 *   and `filtersErrors` (true when the query filters on error-level fields).
 */
export function analyzeSql(sql: string): {
  isAggregate: boolean;
  filtersErrors: boolean;
} {
  return {
    isAggregate: GROUP_BY_RE.test(sql) || AGGREGATE_FN_RE.test(sql),
    filtersErrors: ERROR_LEVEL_RE.test(sql),
  };
}
