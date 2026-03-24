import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse a UTC datetime string from the backend.
 * Python's datetime.utcnow().isoformat() emits strings like "2026-03-10T06:30:00.123456"
 * without a Z/offset, so JS would misread them as local time.
 * This helper ensures they're always parsed as UTC.
 */
export function utcDate(s: string | null | undefined): Date {
  if (!s) return new Date();
  return new Date(s.endsWith("Z") || s.includes("+") ? s : s + "Z");
}
