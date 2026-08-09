import { parseDate } from "./parseDate";

export function formatDate(value?: string | null): string {
  if (!value) {
    return "Not set";
  }

  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(date);
}

export function formatDateTime(value?: string | null): string {
  if (!value) {
    return "Not set";
  }

  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}
