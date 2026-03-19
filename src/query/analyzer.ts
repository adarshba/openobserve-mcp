const GROUP_BY_RE = /\bgroup\s+by\b/i;
const AGGREGATE_FN_RE = /\b(count|sum|avg|min|max|histogram)\s*\(/i;
export const ERROR_LEVEL_RE =
  /\b(level|severity|log_level)\s*=\s*['"]?(error|ERROR|FATAL|fatal)/i;

export function analyzeSql(sql: string): {
  isAggregate: boolean;
  filtersErrors: boolean;
} {
  return {
    isAggregate: GROUP_BY_RE.test(sql) || AGGREGATE_FN_RE.test(sql),
    filtersErrors: ERROR_LEVEL_RE.test(sql),
  };
}
