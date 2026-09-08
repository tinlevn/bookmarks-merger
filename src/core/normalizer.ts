import type { NormalizeOptions } from './types';

export const DEFAULT_NORMALIZE_OPTIONS: NormalizeOptions = {
  stripTrackingParams: true,
  trimTrailingSlash: true,
  ignoreProtocol: false,
  ignoreHash: false,
  lowercaseHost: true,
};

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'fbclid',
  'gclid',
  'gclsrc',
  'dclid',
  'msclkid',
  'ref',
  'ref_src',
  'ref_url',
  'mc_cid',
  'mc_eid',
  '_ga',
  '_gl',
  'yclid',
  'wickedid',
  'spm',
  'scm',
  'igshid',
  'si',
]);

/**
 * Normalizes a URL for robust deduplication across different browsers.
 */
export function normalizeUrl(
  rawUrl: string,
  options: Partial<NormalizeOptions> = {}
): string {
  const opts = { ...DEFAULT_NORMALIZE_OPTIONS, ...options };
  const trimmed = rawUrl.trim();

  if (!trimmed) return '';

  // Non-HTTP protocols (e.g. javascript:, chrome:, edge:, place:)
  if (/^(javascript|chrome|edge|opera|about|data|file):/i.test(trimmed)) {
    return trimmed;
  }

  try {
    const urlObj = new URL(trimmed);

    // Protocol normalization
    let protocol = urlObj.protocol.toLowerCase();
    if (opts.ignoreProtocol && (protocol === 'http:' || protocol === 'https:')) {
      protocol = 'https:';
    }

    // Hostname normalization
    let host = opts.lowercaseHost ? urlObj.host.toLowerCase() : urlObj.host;
    // Remove default ports
    if ((protocol === 'http:' && urlObj.port === '80') || (protocol === 'https:' && urlObj.port === '443')) {
      host = urlObj.hostname.toLowerCase();
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
        if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) {
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

    return `${protocol}//${host}${pathname}${search}${hash}`;
  } catch {
    // If URL parsing fails, fallback to basic trimmed lowercase comparison
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
    .map((t) => (t || '').trim())
    .filter((t) => {
      if (!t) return false;
      const lower = t.toLowerCase();
      if (lower === 'untitled' || lower === 'new tab' || lower === cleanUrl) return false;
      return true;
    });

  if (valid.length === 0) {
    const rawNonEmpty = titles.find((t) => t && t.trim().length > 0);
    return rawNonEmpty?.trim() || url;
  }

  // Sort by length and quality (longer descriptive title preferred)
  valid.sort((a, b) => b.length - a.length);
  return valid[0];
}
