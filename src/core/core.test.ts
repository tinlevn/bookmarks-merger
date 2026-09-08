import { describe, expect, it } from 'vitest';
import { normalizeUrl, pickBestTitle, decodeHtmlEntities } from './normalizer';
import {
  parseBookmarkFile,
  detectBrowser,
  parseNetscapeHtml,
} from './parser';
import { analyzeBookmarkGaps } from './analyzer';
import { buildMergedTree } from './merger';
import {
  serializeNetscapeHtml,
  serializeCatchupHtml,
  serializeMatrixCsv,
} from './serializer';
import {
  CHROME_DEMO_HTML,
  EDGE_DEMO_HTML,
  FIREFOX_DEMO_HTML,
  VIVALDI_DEMO_HTML,
} from './demo-data';
import type { MergeOptions } from './types';
import { isSafeWebUrl, escapeCsvSafe } from '../utils/security';

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

  it('preserves non-hierarchical protocols without double slash corruption', () => {
    expect(normalizeUrl('mailto:support@example.com')).toBe('mailto:support@example.com');
    expect(normalizeUrl('javascript:void(0)')).toBe('javascript:void(0)');
  });

  it('picks best informative title', () => {
    const titles = ['https://github.com', 'GitHub', 'GitHub: Where the world builds software'];
    const best = pickBestTitle(titles, 'https://github.com');
    expect(best).toBe('GitHub: Where the world builds software');
  });

  it('decodes named, decimal, and hexadecimal HTML entities correctly', () => {
    expect(decodeHtmlEntities('GitHub &mdash; Where &amp; how')).toBe('GitHub — Where & how');
    expect(decodeHtmlEntities('Tom &#38; Jerry')).toBe('Tom & Jerry');
    expect(decodeHtmlEntities('Price: &#x24;100 &#x2014; Special')).toBe('Price: $100 — Special');
    expect(decodeHtmlEntities('Copyright &copy; 2026')).toBe('Copyright © 2026');
  });
});

describe('Security Utilities', () => {
  it('validates safe web URLs and blocks javascript/data/vbscript', () => {
    expect(isSafeWebUrl('https://example.com')).toBe(true);
    expect(isSafeWebUrl('http://insecure.org/path')).toBe(true);
    expect(isSafeWebUrl('ftp://ftp.is.co.za')).toBe(true);
    expect(isSafeWebUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeWebUrl('javascript://%0aalert(1)')).toBe(false);
    expect(isSafeWebUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeWebUrl('vbscript:msgbox(1)')).toBe(false);
    expect(isSafeWebUrl('')).toBe(false);
  });

  it('neutralizes CSV formula injection trigger characters', () => {
    expect(escapeCsvSafe('=cmd|calc')).toBe(`"'=cmd|calc"`);
    expect(escapeCsvSafe('+SUM(1,2)')).toBe(`"'+SUM(1,2)"`);
    expect(escapeCsvSafe('-10+20')).toBe(`"'-10+20"`);
    expect(escapeCsvSafe('@mention')).toBe(`"'@mention"`);
    expect(escapeCsvSafe('\tTabbed')).toBe(`"'\tTabbed"`);
    expect(escapeCsvSafe('Normal Title')).toBe(`"Normal Title"`);
  });

  it('sanitizes CSV output through serializeMatrixCsv', () => {
    const mockBm: any = {
      canonicalUrl: 'https://safe.com',
      title: '=cmd|\' /C calc\'!A0',
      unifiedFolderPath: ['Toolbar'],
      sourceFileIds: ['f1'],
    };
    const csv = serializeMatrixCsv([mockBm], [{ id: 'f1', label: 'Chrome' }]);
    expect(csv).toContain(`"'=cmd|' /C calc'!A0"`);
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
    const devBookmarks = file.allBookmarks.filter((b) =>
      b.folderPath.includes('Development')
    );
    expect(devBookmarks.length).toBe(2);
  });

  it('does not swallow bookmarks when closing </A> tag is omitted', () => {
    const unclosedHtml = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
    <DT><H3>Tools</H3>
    <DL><p>
        <DT><A HREF="https://site1.com">Site 1 Without Close
        <DT><A HREF="https://site2.com">Site 2 With Close</A>
        <DT><A HREF="https://site3.com">Site 3
    </DL><p>
</DL><p>`;

    const parsed = parseNetscapeHtml(unclosedHtml, 'f1', 'chrome');
    expect(parsed.allBookmarks.length).toBe(3);
    expect(parsed.allBookmarks[0].url).toBe('https://site1.com');
    expect(parsed.allBookmarks[0].title).toBe('Site 1 Without Close');
    expect(parsed.allBookmarks[1].url).toBe('https://site2.com');
    expect(parsed.allBookmarks[1].title).toBe('Site 2 With Close');
    expect(parsed.allBookmarks[2].url).toBe('https://site3.com');
  });

  it('parses unnested sibling root folders without outer DL correctly', () => {
    const siblingHtml = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DT><H3>Folder A</H3>
<DL><p>
    <DT><A HREF="https://a.com">Item A</A>
</DL><p>
<DT><H3>Folder B</H3>
<DL><p>
    <DT><A HREF="https://b.com">Item B</A>
</DL><p>`;

    const parsed = parseNetscapeHtml(siblingHtml, 'f1', 'chrome');
    expect(parsed.rootFolders.length).toBe(2);
    expect(parsed.rootFolders[0].title).toBe('Folder A');
    expect(parsed.rootFolders[1].title).toBe('Folder B');
    expect(parsed.rootFolders[0].subfolders.length).toBe(0);
  });

  it('handles top-level root bookmarks outside explicit folder headers', () => {
    const rootBmHtml = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
    <DT><A HREF="https://toplevel.com">Top Level Bookmark</A>
    <DT><H3>Folder A</H3>
    <DL><p>
        <DT><A HREF="https://a.com">Item A</A>
    </DL><p>
</DL><p>`;

    const parsed = parseNetscapeHtml(rootBmHtml, 'f1', 'chrome');
    expect(parsed.allBookmarks.length).toBe(2);
    expect(parsed.allBookmarks.some((b) => b.url === 'https://toplevel.com')).toBe(true);
    const topBm = parsed.allBookmarks.find((b) => b.url === 'https://toplevel.com');
    expect(topBm?.folderPath).toEqual(['Bookmarks']);
  });

  it('parses Chromium JSON format and handles corrupt JSON gracefully', () => {
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

    const file = parseBookmarkFile(jsonSample, 'Bookmarks.json');
    expect(file.allBookmarks.length).toBe(2);
    expect(file.allBookmarks[1].folderPath).toEqual(['Bookmarks bar', 'Sub']);

    // Corrupt JSON should not throw exception
    const corruptFile = parseBookmarkFile('{ invalid json: roots }', 'Bookmarks.json');
    expect(corruptFile.allBookmarks.length).toBe(0);
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

  it('dynamically recalculates matrix when normalization options change', () => {
    const file1 = parseBookmarkFile(
      '<DL><p><DT><A HREF="https://example.com/item?utm_source=fb">Item</A></DL><p>',
      'f1.html',
      'Browser1'
    );
    const file2 = parseBookmarkFile(
      '<DL><p><DT><A HREF="https://example.com/item">Item</A></DL><p>',
      'f2.html',
      'Browser2'
    );

    // With stripTrackingParams: true (default) -> identical URL, 1 unique item, 100% overlap
    const strippedResult = analyzeBookmarkGaps([file1, file2], defaultOptions);
    expect(strippedResult.totalUniqueUrls).toBe(1);
    expect(strippedResult.overlapRate).toBe(100);

    // With stripTrackingParams: false -> treated as 2 separate items
    const strictResult = analyzeBookmarkGaps([file1, file2], {
      ...defaultOptions,
      normalize: { ...defaultOptions.normalize, stripTrackingParams: false },
    });
    expect(strictResult.totalUniqueUrls).toBe(2);
    expect(strictResult.overlapRate).toBe(0);
  });

  it('identifies folder location conflicts', () => {
    const chrome = parseBookmarkFile(CHROME_DEMO_HTML, 'chrome.html', 'Chrome');
    const edge = parseBookmarkFile(EDGE_DEMO_HTML, 'edge.html', 'Edge');
    const result = analyzeBookmarkGaps([chrome, edge], defaultOptions);

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

    const toolbar = mergedTree.find((f) => f.toolbarFolder);
    expect(toolbar).toBeDefined();
    expect(toolbar?.title).toBe('Bookmarks Bar');

    const devFolder = toolbar?.subfolders.find((f) => f.title === 'Development');
    expect(devFolder).toBeDefined();
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

    // Roundtrip test: parse the generated HTML back
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
