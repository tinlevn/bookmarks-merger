import { describe, expect, it } from 'vitest';
import { normalizeUrl, pickBestTitle } from './normalizer';
import {
  parseBookmarkFile,
  detectBrowser,
} from './parser';
import { analyzeBookmarkGaps } from './analyzer';
import { buildMergedTree } from './merger';
import { serializeNetscapeHtml, serializeCatchupHtml } from './serializer';
import {
  CHROME_DEMO_HTML,
  EDGE_DEMO_HTML,
  FIREFOX_DEMO_HTML,
  VIVALDI_DEMO_HTML,
} from './demo-data';
import type { MergeOptions } from './types';

const defaultOptions: MergeOptions = {
  normalize: {
    stripTrackingParams: true,
    trimTrailingSlash: true,
    ignoreProtocol: false,
    ignoreHash: false,
    lowercaseHost: true,
  },
  unifyToolbars: true,
  preferNonEmptyTitle: true,
  preferHttps: true,
};

describe('URL Normalizer', () => {
  it('strips tracking query parameters', () => {
    const raw = 'https://example.com/page?utm_source=twitter&utm_medium=social&valid=1';
    const norm = normalizeUrl(raw);
    expect(norm).toBe('https://example.com/page?valid=1');
  });

  it('normalizes trailing slashes on URLs', () => {
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com');
    expect(normalizeUrl('https://example.com/docs/')).toBe('https://example.com/docs');
  });

  it('sorts remaining query params for canonical matching', () => {
    const url1 = 'https://example.com?b=2&a=1';
    const url2 = 'https://example.com?a=1&b=2';
    expect(normalizeUrl(url1)).toBe(normalizeUrl(url2));
  });

  it('picks best informative title', () => {
    const titles = ['https://github.com', 'GitHub', 'GitHub: Where the world builds software'];
    const best = pickBestTitle(titles, 'https://github.com');
    expect(best).toBe('GitHub: Where the world builds software');
  });
});

describe('Bookmark Parser', () => {
  it('detects browser types from HTML content and filenames', () => {
    expect(detectBrowser(CHROME_DEMO_HTML, 'bookmarks_2026_09_08.html')).toBe('chrome');
    expect(detectBrowser(EDGE_DEMO_HTML, 'favorites_2026_09_08.html')).toBe('edge');
    expect(detectBrowser(FIREFOX_DEMO_HTML, 'bookmarks.html')).toBe('firefox');
    expect(detectBrowser(VIVALDI_DEMO_HTML, 'vivaldi_bookmarks.html')).toBe('vivaldi');
  });

  it('parses Chrome HTML export with folders and items', () => {
    const file = parseBookmarkFile(CHROME_DEMO_HTML, 'chrome.html');
    expect(file.browser).toBe('chrome');
    expect(file.allBookmarks.length).toBe(8);
    // Dev folder has 2 items
    const devBookmarks = file.allBookmarks.filter((b) =>
      b.folderPath.includes('Development')
    );
    expect(devBookmarks.length).toBe(2);
  });

  it('parses Chromium JSON format', () => {
    const jsonSample = JSON.stringify({
      roots: {
        bookmark_bar: {
          children: [
            { name: 'Google', type: 'url', url: 'https://google.com' },
            {
              name: 'Sub',
              type: 'folder',
              children: [{ name: 'Deep', type: 'url', url: 'https://deep.com' }],
            },
          ],
          name: 'Bookmarks bar',
          type: 'folder',
        },
      },
    });

    const file = parseBookmarkFile(jsonSample, 'Bookmarks');
    expect(file.allBookmarks.length).toBe(2);
    expect(file.allBookmarks[1].folderPath).toEqual(['Bookmarks bar', 'Sub']);
  });
});

describe('Gap Analyzer', () => {
  it('identifies missing and exclusive bookmarks across 4 browsers', () => {
    const chrome = parseBookmarkFile(CHROME_DEMO_HTML, 'chrome.html', 'Chrome');
    const edge = parseBookmarkFile(EDGE_DEMO_HTML, 'edge.html', 'Edge');
    const firefox = parseBookmarkFile(FIREFOX_DEMO_HTML, 'firefox.html', 'Firefox');
    const vivaldi = parseBookmarkFile(VIVALDI_DEMO_HTML, 'vivaldi.html', 'Vivaldi');

    const result = analyzeBookmarkGaps([chrome, edge, firefox, vivaldi], defaultOptions);

    expect(result.files.length).toBe(4);
    expect(result.totalUniqueUrls).toBeGreaterThan(0);

    // GitHub is present in all 4 files
    const githubBm = result.matrix.find((b) => b.canonicalUrl.includes('github.com'));
    expect(githubBm).toBeDefined();
    expect(githubBm?.isSharedAll).toBe(true);
    expect(githubBm?.missingFileIds.length).toBe(0);

    // Zig is only in Vivaldi
    const zigBm = result.matrix.find((b) => b.canonicalUrl.includes('ziglang.org'));
    expect(zigBm).toBeDefined();
    expect(zigBm?.isExclusive).toBe(true);
    expect(zigBm?.exclusiveFileId).toBe(vivaldi.id);
    expect(zigBm?.missingFileIds).toContain(chrome.id);
    expect(zigBm?.missingFileIds).toContain(edge.id);
    expect(zigBm?.missingFileIds).toContain(firefox.id);

    // Per-file stats check
    for (const file of [chrome, edge, firefox, vivaldi]) {
      const stats = result.perFileStats[file.id];
      expect(stats).toBeDefined();
      expect(stats.missingCount + stats.uniqueCount).toBe(result.totalUniqueUrls);
    }
  });

  it('identifies folder location conflicts', () => {
    const chrome = parseBookmarkFile(CHROME_DEMO_HTML, 'chrome.html', 'Chrome');
    const edge = parseBookmarkFile(EDGE_DEMO_HTML, 'edge.html', 'Edge');
    const result = analyzeBookmarkGaps([chrome, edge], defaultOptions);

    // Stack Overflow is in Bookmarks Bar in Chrome, but in Other favorites in Edge
    const conflict = result.conflictingLocations.find((c) =>
      c.canonicalUrl.includes('stackoverflow.com')
    );
    expect(conflict).toBeDefined();
  });
});

describe('Folder Merger & HTML Serializer', () => {
  it('merges folders and unifies toolbars into one tree', () => {
    const chrome = parseBookmarkFile(CHROME_DEMO_HTML, 'chrome.html', 'Chrome');
    const edge = parseBookmarkFile(EDGE_DEMO_HTML, 'edge.html', 'Edge');
    const result = analyzeBookmarkGaps([chrome, edge], defaultOptions);

    const mergedTree = buildMergedTree(result.matrix, defaultOptions);
    expect(mergedTree.length).toBeGreaterThan(0);

    // Root folder should be Bookmarks Bar (toolbar unified)
    const toolbar = mergedTree.find((f) => f.toolbarFolder);
    expect(toolbar).toBeDefined();
    expect(toolbar?.title).toBe('Bookmarks Bar');

    // Inside toolbar, Development folder should have merged items from both Chrome and Edge
    const devFolder = toolbar?.subfolders.find((f) => f.title === 'Development');
    expect(devFolder).toBeDefined();
    // Chrome has TypeScript and React. Edge has TypeScript and Rust.
    // Total in merged Development: TypeScript (deduplicated), React, Rust => 3 items!
    expect(devFolder?.bookmarks.length).toBe(3);
  });

  it('serializes to valid Netscape Bookmark HTML and roundtrips without loss', () => {
    const chrome = parseBookmarkFile(CHROME_DEMO_HTML, 'chrome.html', 'Chrome');
    const edge = parseBookmarkFile(EDGE_DEMO_HTML, 'edge.html', 'Edge');
    const result = analyzeBookmarkGaps([chrome, edge], defaultOptions);
    const mergedTree = buildMergedTree(result.matrix, defaultOptions);

    const html = serializeNetscapeHtml(mergedTree);
    expect(html).toContain('<!DOCTYPE NETSCAPE-Bookmark-file-1>');
    expect(html).toContain('PERSONAL_TOOLBAR_FOLDER="true"');

    // Roundtrip test: parse the generated HTML back!
    const roundtripFile = parseBookmarkFile(html, 'merged.html');
    expect(roundtripFile.uniqueUrlCount).toBe(result.totalUniqueUrls);
  });

  it('generates catch-up HTML containing only missing bookmarks for a file', () => {
    const chrome = parseBookmarkFile(CHROME_DEMO_HTML, 'chrome.html', 'Chrome');
    const edge = parseBookmarkFile(EDGE_DEMO_HTML, 'edge.html', 'Edge');
    const result = analyzeBookmarkGaps([chrome, edge], defaultOptions);

    const missingInChrome = result.matrix.filter((b) =>
      b.missingFileIds.includes(chrome.id)
    );
    const catchupHtml = serializeCatchupHtml(missingInChrome, chrome.label);
    expect(catchupHtml).toContain('<!DOCTYPE NETSCAPE-Bookmark-file-1>');
    expect(catchupHtml).toContain('Catch-up for Chrome');

    const parsedCatchup = parseBookmarkFile(catchupHtml, 'catchup.html');
    expect(parsedCatchup.allBookmarks.length).toBe(missingInChrome.length);
  });
});
