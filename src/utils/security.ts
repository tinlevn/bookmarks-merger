import { FORMULA_PREFIXES } from '../core/constants';

/**
 * Validates if a URL uses a safe web protocol (http, https, ftp).
 * Prevents stored/DOM XSS via javascript: or dangerous data: URIs in bookmark hrefs.
 */
export function isSafeWebUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();

  // Explicitly block javascript: and inline data: schemes
  if (/^(javascript|vbscript|data):/i.test(trimmed)) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    return ['http:', 'https:', 'ftp:'].includes(parsed.protocol.toLowerCase());
  } catch {
    // Relative or invalid URLs are not safe web URLs for external navigation
    return false;
  }
}

/**
 * Neutralizes CSV Formula Injection (CWE-1236).
 * Prepends a single quote to cells beginning with formula trigger characters (=, +, -, @, \t, \r).
 */
export function escapeCsvSafe(val: string): string {
  let str = (val ?? '').toString();
  if (str.length > 0 && FORMULA_PREFIXES.has(str[0])) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Generates a cryptographically sound or collision-resistant unique ID.
 */
export function generateSafeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

