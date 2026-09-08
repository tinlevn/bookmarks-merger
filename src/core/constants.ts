import type { BrowserType } from './types';

export interface BrowserTheme {
  name: string;
  bg: string;
  text: string;
  border: string;
  accent: string;
  dot: string;
}

export const BROWSER_THEMES: Record<BrowserType, BrowserTheme> = {
  chrome: {
    name: 'Chrome',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    accent: '#f59e0b',
    dot: 'bg-amber-400',
  },
  edge: {
    name: 'Edge',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    accent: '#06b6d4',
    dot: 'bg-cyan-400',
  },
  firefox: {
    name: 'Firefox',
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    accent: '#f97316',
    dot: 'bg-orange-400',
  },
  vivaldi: {
    name: 'Vivaldi',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    accent: '#f43f5e',
    dot: 'bg-rose-400',
  },
  opera: {
    name: 'Opera',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/30',
    accent: '#ef4444',
    dot: 'bg-red-400',
  },
  safari: {
    name: 'Safari',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    accent: '#3b82f6',
    dot: 'bg-blue-400',
  },
  other: {
    name: 'Other',
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    border: 'border-indigo-500/30',
    accent: '#6366f1',
    dot: 'bg-indigo-400',
  },
};

export const TRACKING_PARAMS = new Set([
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

export const TOOLBAR_ROOT_NAMES = new Set([
  'bookmarks bar',
  'favorites bar',
  'bookmarks toolbar',
  'personal toolbar',
  'toolbar',
]);

export const UNFILED_ROOT_NAMES = new Set([
  'other bookmarks',
  'other favorites',
  'unsorted bookmarks',
  'unfiled bookmarks',
  'unfiled',
]);

export const MOBILE_ROOT_NAMES = new Set([
  'mobile bookmarks',
  'synced',
]);

export const FORMULA_PREFIXES = new Set(['=', '+', '-', '@', '\t', '\r']);

export const NAMED_HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&mdash;': '—',
  '&ndash;': '–',
  '&hellip;': '…',
  '&bull;': '•',
  '&copy;': '©',
  '&reg;': '®',
  '&trade;': '™',
};

