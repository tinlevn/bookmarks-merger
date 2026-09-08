import type { MergedFolderNode, UnifiedBookmark } from './types';

/**
 * Escapes characters for HTML attributes and text content.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Serializes a folder tree into Netscape Bookmark HTML format.
 */
export function serializeNetscapeHtml(rootFolders: MergedFolderNode[]): string {
  const lines: string[] = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<!-- This is an automatically generated file.',
    '     It will be read and overwritten.',
    '     DO NOT EDIT! -->',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
  ];

  function renderFolder(folder: MergedFolderNode, indentLevel: number) {
    const indent = '    '.repeat(indentLevel);
    const attrs: string[] = [];

    const nowSec = Math.floor(Date.now() / 1000).toString();
    attrs.push(`ADD_DATE="${folder.addDate || nowSec}"`);
    if (folder.lastModified) {
      attrs.push(`LAST_MODIFIED="${folder.lastModified}"`);
    }
    if (folder.toolbarFolder) {
      attrs.push('PERSONAL_TOOLBAR_FOLDER="true"');
    }
    if (folder.unfiledFolder) {
      attrs.push('UNFILED_BOOKMARKS_FOLDER="true"');
    }

    lines.push(`${indent}<DT><H3 ${attrs.join(' ')}>${escapeHtml(folder.title)}</H3>`);
    lines.push(`${indent}<DL><p>`);

    // Render bookmarks in this folder
    for (const bm of folder.bookmarks) {
      const bmAttrs: string[] = [`HREF="${escapeHtml(bm.canonicalUrl)}"`];
      if (bm.addDate) {
        bmAttrs.push(`ADD_DATE="${bm.addDate}"`);
      }
      if (bm.icon) {
        bmAttrs.push(`ICON="${escapeHtml(bm.icon)}"`);
      }
      lines.push(
        `${indent}    <DT><A ${bmAttrs.join(' ')}>${escapeHtml(bm.title)}</A>`
      );
    }

    // Render subfolders
    for (const sub of folder.subfolders) {
      renderFolder(sub, indentLevel + 1);
    }

    lines.push(`${indent}</DL><p>`);
  }

  for (const root of rootFolders) {
    renderFolder(root, 1);
  }

  lines.push('</DL><p>');
  return lines.join('\n');
}

/**
 * Generates a "Catch-up" bookmark HTML containing ONLY the missing bookmarks for a specific file.
 */
export function serializeCatchupHtml(
  missingBookmarks: UnifiedBookmark[],
  targetLabel: string
): string {
  const lines: string[] = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<!-- This is an automatically generated file.',
    `     Catch-up bookmarks for: ${targetLabel} -->`,
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    `<TITLE>Catch-up Bookmarks - ${escapeHtml(targetLabel)}</TITLE>`,
    '<H1>Bookmarks</H1>',
    '<DL><p>',
    `    <DT><H3 PERSONAL_TOOLBAR_FOLDER="true">Catch-up for ${escapeHtml(targetLabel)}</H3>`,
    '    <DL><p>',
  ];

  for (const bm of missingBookmarks) {
    const bmAttrs: string[] = [`HREF="${escapeHtml(bm.canonicalUrl)}"`];
    if (bm.addDate) bmAttrs.push(`ADD_DATE="${bm.addDate}"`);
    if (bm.icon) bmAttrs.push(`ICON="${escapeHtml(bm.icon)}"`);
    lines.push(`        <DT><A ${bmAttrs.join(' ')}>${escapeHtml(bm.title)}</A>`);
  }

  lines.push('    </DL><p>');
  lines.push('</DL><p>');
  return lines.join('\n');
}

/**
 * Generates a downloadable CSV representation of the gap analysis matrix.
 */
export function serializeMatrixCsv(
  matrix: UnifiedBookmark[],
  fileHeaders: { id: string; label: string }[]
): string {
  const headers = ['URL', 'Title', 'Unified Folder', ...fileHeaders.map((f) => f.label)];
  const escapeCsv = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;

  const rows: string[] = [headers.map(escapeCsv).join(',')];

  for (const bm of matrix) {
    const presentSet = new Set(bm.sourceFileIds);
    const row = [
      escapeCsv(bm.canonicalUrl),
      escapeCsv(bm.title),
      escapeCsv(bm.unifiedFolderPath.join(' > ')),
      ...fileHeaders.map((f) => (presentSet.has(f.id) ? '"YES"' : '"MISSING"')),
    ];
    rows.push(row.join(','));
  }

  return rows.join('\r\n');
}
