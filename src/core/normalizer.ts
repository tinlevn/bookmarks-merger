import type { NormalizeOptions } from './types';
import { TRACKING_PARAMS, NAMED_HTML_ENTITIES } from './constants';

export const DEFAULT_NORMALIZE_OPTIONS: NormalizeOptions = {
  stripTrackingParams: true,
  trimTrailingSlash: true,
  ignoreProtocol: false,
  ignoreHash: false,
  lowercaseHost: true,
};

/**
 * Robust, spec-compliant HTML entity decoder handling named, decimal, and hexadecimal entities.
 */
export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&[a-zA-Z]+;/g, (match) => NAMED_HTML_ENTITIES[match] ?? match)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isNaN(code) ? _ : String.fromCodePoint(code);
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return Number.isNaN(code) ? _ : String.fromCodePoint(code);
    });
}

/**
 * Normalizes a URL for robust deduplication across different browsers.
 */
export function normalizeUrl(
  rawUrl: string,
  options: Partial<NormalizeOptions> = {}
): string {
  const opts = { ...DEFAULT_NORMALIZE_OPTIONS, ...options };
  const trimmed = (rawUrl || '').trim();

  if (!trimmed) return '';

  // Non-HTTP protocols (e.g. javascript:, chrome:, edge:, place:, file:, data:)
  if (/^(javascript|chrome|edge|opera|about|data|file|view-source):/i.test(trimmed)) {
    return trimmed;
  }

  try {
    const urlObj = new URL(trimmed);
    const protocol = urlObj.protocol.toLowerCase();

    // Preserve non-hierarchical protocols (e.g. mailto:user@domain.com, urn:isbn:...)
    // reconstructing them with // breaks the URI specification
    if (protocol !== 'http:' && protocol !== 'https:') {
      return trimmed;
    }

    // Protocol normalization
    let finalProtocol = protocol;
    if (opts.ignoreProtocol && (protocol === 'http:' || protocol === 'https:')) {
      finalProtocol = 'https:';
    }

    // Hostname normalization
    let host = opts.lowercaseHost ? urlObj.host.toLowerCase() : urlObj.host;
    // Remove standard default ports
    if (
      (finalProtocol === 'http:' && urlObj.port === '80') ||
      (finalProtocol === 'https:' && urlObj.port === '443')
    ) {
      host = opts.lowercaseHost ? urlObj.hostname.toLowerCase() : urlObj.hostname;
    }

    // Pathname normalization
    let pathname = urlObj.pathname;
    if (opts.trimTrailingSlash && pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.replace(/\/+$/, '');
    } else if (opts.trimTrailingSlash && pathname === '/') {
      pathname = '';
    }

    // Search query parameter normalization & sorting
    const searchParams = new URLSearchParams(urlObj.search);
    if (opts.stripTrackingParams) {
      for (const key of Array.from(searchParams.keys())) {
        const lowerKey = key.toLowerCase();
        if (TRACKING_PARAMS.has(lowerKey) || lowerKey.startsWith('utm_')) {
          searchParams.delete(key);
        }
      }
    }

    // Sort query parameters so parameter order doesn't prevent matching
    searchParams.sort();
    const queryString = searchParams.toString();
    const search = queryString ? `?${queryString}` : '';

    // Hash normalization
    const hash = opts.ignoreHash ? '' : urlObj.hash;

    return `${finalProtocol}//${host}${pathname}${search}${hash}`;
  } catch {
    // If URL parsing fails, fallback to basic trimmed trailing slash comparison
    let fallback = trimmed;
    if (opts.trimTrailingSlash && fallback.length > 1 && fallback.endsWith('/')) {
      fallback = fallback.replace(/\/+$/, '');
    }
    return fallback;
  }
}

/**
 * Pick the best, most informative title from multiple candidate titles.
 */
export function pickBestTitle(titles: string[], url: string): string {
  const cleanUrl = url.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

  const valid = titles
    .map((t) => decodeHtmlEntities((t || '').trim()))
    .filter((t) => {
      if (!t) return false;
      const lower = t.toLowerCase();
      if (lower === 'untitled' || lower === 'new tab' || lower === cleanUrl) return false;
      return true;
    });

  if (valid.length === 0) {
    const rawNonEmpty = titles.find((t) => t && t.trim().length > 0);
    return rawNonEmpty ? decodeHtmlEntities(rawNonEmpty.trim()) : url;
  }

  // Sort by length and quality (longer descriptive title preferred)
  valid.sort((a, b) => b.length - a.length);
  return valid[0];
}
