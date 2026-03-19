import type { Granularity } from "./types.js";
import { ERROR_LEVEL_RE } from "./analyzer.js";

const FROM_RE = /\bfrom\b/i;
const WHERE_RE = /\bwhere\b/i;
const ORDER_BY_RE = /\border\s+by\b/i;
const LIMIT_RE = /\blimit\b/i;
const GROUP_BY_RE = /\bgroup\s+by\b/i;

export function rewriteToAggregate(
  sql: string,
  granularity: Granularity,
): string {
  const interval = granularity === "day" ? "1 day" : "1 hour";

  const fromIdx = sql.search(FROM_RE);
  if (fromIdx === -1) throw new Error(`Cannot rewrite SQL: no FROM clause found`);

  const fromClause = extractFromClause(sql, fromIdx);
  const whereClause = extractWhereClause(sql);
  const errorExpr = buildErrorCountExpr(sql);

  const parts = [
    `SELECT histogram(_timestamp, '${interval}') AS ts,`,
    `       COUNT(*) AS count,`,
    `       ${errorExpr} AS error_count`,
    fromClause,
  ];

  if (whereClause) {
    parts.push(whereClause);
  }

  parts.push(`GROUP BY ts`);
  parts.push(`ORDER BY ts ASC`);

  return parts.join("\n");
}

function extractFromClause(sql: string, fromIdx: number): string {
  const after = sql.slice(fromIdx);
  const whereMatch = after.search(WHERE_RE);
  const orderMatch = after.search(ORDER_BY_RE);
  const limitMatch = after.search(LIMIT_RE);
  const groupMatch = after.search(GROUP_BY_RE);

  const terminators = [whereMatch, orderMatch, limitMatch, groupMatch].filter((i) => i > 0);
  const end = terminators.length > 0 ? Math.min(...terminators) : after.length;

  return after.slice(0, end).trim();
}

function extractWhereClause(sql: string): string | null {
  const whereIdx = sql.search(WHERE_RE);
  if (whereIdx === -1) return null;

  const after = sql.slice(whereIdx);
  const orderMatch = after.search(ORDER_BY_RE);
  const limitMatch = after.search(LIMIT_RE);
  const groupMatch = after.search(GROUP_BY_RE);

  const terminators = [orderMatch, limitMatch, groupMatch].filter((i) => i > 0);
  const end = terminators.length > 0 ? Math.min(...terminators) : after.length;

  return after.slice(0, end).trim();
}

function buildErrorCountExpr(sql: string): string {
  const m = sql.match(ERROR_LEVEL_RE);
  if (m) {
    return `COUNT(CASE WHEN ${m[1]} = '${m[2]}' THEN 1 END)`;
  }
  return `COUNT(CASE WHEN level = 'error' OR level = 'ERROR' THEN 1 END)`;
}
