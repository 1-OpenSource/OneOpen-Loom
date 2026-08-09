/** Parse API timestamps. Naive ISO values are treated as UTC. */
export function parseDate(value: string | Date): Date {
  if (value instanceof Date) {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return new Date(Number.NaN);
  }

  // Already has timezone (Z or ±HH:MM)
  if (/([zZ]|[+-]\d{2}:\d{2})$/.test(trimmed)) {
    return new Date(trimmed);
  }

  // Date-only values
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T00:00:00Z`);
  }

  // Naive datetime from backend (SQLite/UTC without offset)
  const normalized = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  return new Date(`${normalized}Z`);
}
