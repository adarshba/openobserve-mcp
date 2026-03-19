export function parseTime(value: string): number {
  const num = Number(value);
  if (!isNaN(num)) return num;
  return new Date(value).getTime();
}
