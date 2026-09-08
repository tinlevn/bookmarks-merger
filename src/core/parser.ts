import type {
  BookmarkItem,
  BrowserType,
  FolderNode,
  NormalizeOptions,
  ParsedBookmarkFile,
} from './types';
import { normalizeUrl } from './normalizer';

const BROWSER_COLORS: Record<
  BrowserType,
  { bg: string; text: string; border: string; accent: string }
> = {
  chrome: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    accent: '#f59e0b',
  },
  edge: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    accent: '#06b6d4',
  },
  firefox: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    accent: '#f97316',
  },
  vivaldi: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    accent: '#f43f5e',
  },
  opera: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/30',
    accent: '#ef4444',
  },
  safari: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    accent: '#3b82f6',
  },
  other: {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    border: 'border-indigo-500/30',
    accent: '#6366f1',
  },
};

/**
 * Detect browser from file content and filename.
 */
export function detectBrowser(content: string, filename: string): BrowserType {
  const lowerName = filename.toLowerCase();
  const lowerContent = content.slice(0, 3000).toLowerCase();

  if (lowerName.includes('firefox') || lowerContent.includes('unfiled_bookmarks_folder') || (lowerContent.includes('toolbar="true"') && lowerContent.includes('bookmarks toolbar'))) {
    return 'firefox';
  }
  if (lowerName.includes('vivaldi') || lowerContent.includes('speeddial="true"') || lowerContent.includes('vivaldi')) {
    return 'vivaldi';
  }
  if (lowerName.includes('opera') || lowerContent.includes('opera')) {
    return 'opera';
  }
  if (lowerName.includes('edge') || lowerName.includes('favorites') || lowerContent.includes('favorites bar')) {
    return 'edge';
  }
  if (lowerName.includes('chrome') || lowerContent.includes('personal_toolbar_folder="true"')) {
    return 'chrome';
  }
  if (lowerName.includes('safari') || lowerContent.includes('safari')) {
    return 'safari';
  }

  return 'other';
}

/**
 * Clean decoded HTML entities from titles and attributes.
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)));
}

/**
 * Parse attributes from HTML tag string like: <A HREF="..." ADD_DATE="...">
 */
function parseAttributes(tagStr: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  // Match key="value", key='value', or key=value
  const regex = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(tagStr)) !== null) {
    const key = match[1].toUpperCase();
    const val = match[2] ?? match[3] ?? match[4] ?? '';
    attrs[key] = decodeHtmlEntities(val);
  }
  return attrs;
}

/**
 * Fast, streaming stack-based Netscape Bookmark HTML parser.
 * Handles irregular/unclosed HTML tags across Chrome, Edge, Firefox, Vivaldi, Opera.
 */
export function parseNetscapeHtml(
  content: string,
  fileId: string,
  browser: BrowserType,
  normOpts?: Partial<NormalizeOptions>
): { rootFolders: FolderNode[]; allBookmarks: BookmarkItem[] } {
  const rootFolders: FolderNode[] = [];
  const allBookmarks: BookmarkItem[] = [];

  interface ActiveFolder {
    node: FolderNode;
    path: string[];
  }

  const stack: ActiveFolder[] = [];
  let pendingFolder: {
    title: string;
    attrs: Record<string, string>;
  } | null = null;

  // Regex tokenizer to walk through bookmark HTML tags
  // Matches:
  // 1. <H3 ...>...</H3> or <H3 ...>
  // 2. <DL ...>
  // 3. </DL>
  // 4. <A ...>...</A>
  const tokenRegex = /<(H3)([^>]*)>(.*?)(?:<\/H3>|$)|<(A)([^>]*)>(.*?)(?:<\/A>|$)|<(\/DL)>|<(DL)[^>]*>/gis;

  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(content)) !== null) {
    const isH3 = Boolean(match[1]);
    const isA = Boolean(match[4]);
    const isCloseDL = Boolean(match[7]);
    const isOpenDL = Boolean(match[8]);

    if (isH3) {
      // If there was a pending folder that didn't have a DL, treat it as an empty folder
      if (pendingFolder) {
        commitPendingFolder();
      }

      const attrs = parseAttributes(match[2] || '');
      const rawTitle = match[3] || 'New Folder';
      const title = decodeHtmlEntities(rawTitle.replace(/<[^>]+>/g, '').trim());

      pendingFolder = { title, attrs };
    } else if (isOpenDL) {
      if (pendingFolder) {
        const currentPath = stack.length > 0 ? [...stack[stack.length - 1].path] : [];
        const folderNode: FolderNode = {
          id: `folder_${fileId}_${stack.length}_${Math.random().toString(36).substring(2, 9)}`,
          title: pendingFolder.title,
          addDate: pendingFolder.attrs['ADD_DATE'],
          lastModified: pendingFolder.attrs['LAST_MODIFIED'],
          toolbarFolder:
            pendingFolder.attrs['PERSONAL_TOOLBAR_FOLDER'] === 'true' ||
            pendingFolder.attrs['TOOLBAR'] === 'true',
          unfiledFolder: pendingFolder.attrs['UNFILED_BOOKMARKS_FOLDER'] === 'true',
          bookmarks: [],
          subfolders: [],
        };

        if (stack.length === 0) {
          rootFolders.push(folderNode);
        } else {
          stack[stack.length - 1].node.subfolders.push(folderNode);
        }

        stack.push({
          node: folderNode,
          path: [...currentPath, folderNode.title],
        });

        pendingFolder = null;
      } else if (stack.length === 0) {
        // Initial root DL without preceding H3
        const rootNode: FolderNode = {
          id: `folder_root_${fileId}`,
          title: 'Root',
          bookmarks: [],
          subfolders: [],
        };
        rootFolders.push(rootNode);
        stack.push({ node: rootNode, path: [] });
      }
    } else if (isCloseDL) {
      if (pendingFolder) {
        commitPendingFolder();
      }
      if (stack.length > 1) {
        stack.pop();
      }
    } else if (isA) {
      if (pendingFolder) {
        commitPendingFolder();
      }

      const attrs = parseAttributes(match[5] || '');
      const url = (attrs['HREF'] || '').trim();
      if (!url) continue;

      const rawTitle = match[6] || '';
      const title = decodeHtmlEntities(rawTitle.replace(/<[^>]+>/g, '').trim()) || url;

      const currentPath = stack.length > 0 ? [...stack[stack.length - 1].path] : [];
      const normalized = normalizeUrl(url, normOpts);

      const bookmark: BookmarkItem = {
        id: `bm_${fileId}_${allBookmarks.length}_${Math.random().toString(36).substring(2, 9)}`,
        url,
        normalizedUrl: normalized,
        title,
        addDate: attrs['ADD_DATE'],
        lastModified: attrs['LAST_MODIFIED'],
        icon: attrs['ICON'],
        folderPath: currentPath,
        sourceFileId: fileId,
        sourceBrowser: browser,
      };

      if (stack.length > 0) {
        stack[stack.length - 1].node.bookmarks.push(bookmark);
      } else {
        // Root bookmark without folder
        if (rootFolders.length === 0) {
          const rootNode: FolderNode = {
            id: `folder_root_${fileId}`,
            title: 'Bookmarks',
            bookmarks: [],
            subfolders: [],
          };
          rootFolders.push(rootNode);
          stack.push({ node: rootNode, path: [] });
        }
        rootFolders[0].bookmarks.push(bookmark);
      }

      allBookmarks.push(bookmark);
    }
  }

  function commitPendingFolder() {
    if (!pendingFolder) return;
    const folderNode: FolderNode = {
      id: `folder_${fileId}_${Math.random().toString(36).substring(2, 9)}`,
      title: pendingFolder.title,
      addDate: pendingFolder.attrs['ADD_DATE'],
      lastModified: pendingFolder.attrs['LAST_MODIFIED'],
      toolbarFolder:
        pendingFolder.attrs['PERSONAL_TOOLBAR_FOLDER'] === 'true' ||
        pendingFolder.attrs['TOOLBAR'] === 'true',
      unfiledFolder: pendingFolder.attrs['UNFILED_BOOKMARKS_FOLDER'] === 'true',
      bookmarks: [],
      subfolders: [],
    };
    if (stack.length === 0) {
      rootFolders.push(folderNode);
    } else {
      stack[stack.length - 1].node.subfolders.push(folderNode);
    }
    pendingFolder = null;
  }

  return { rootFolders, allBookmarks };
}

/**
 * Chromium JSON Bookmarks parser (Chrome / Edge / Vivaldi / Opera raw 'Bookmarks' file).
 */
export function parseChromiumJson(
  content: string,
  fileId: string,
  browser: BrowserType,
  normOpts?: Partial<NormalizeOptions>
): { rootFolders: FolderNode[]; allBookmarks: BookmarkItem[] } {
  const rootFolders: FolderNode[] = [];
  const allBookmarks: BookmarkItem[] = [];

  const json = JSON.parse(content);
  const roots = json.roots || {};

  function traverseJsonNode(node: any, currentPath: string[]): FolderNode | null {
    if (!node) return null;

    if (node.type === 'folder') {
      const folderTitle = node.name || 'Folder';
      const path = currentPath.length === 0 && folderTitle === 'Root' ? [] : [...currentPath, folderTitle];

      const folderNode: FolderNode = {
        id: `folder_${fileId}_${Math.random().toString(36).substring(2, 9)}`,
        title: folderTitle,
        addDate: node.date_added,
        lastModified: node.date_modified,
        bookmarks: [],
        subfolders: [],
      };

      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          if (child.type === 'url' && child.url) {
            const url = child.url.trim();
            const normalized = normalizeUrl(url, normOpts);
            const bm: BookmarkItem = {
              id: `bm_${fileId}_${allBookmarks.length}_${Math.random().toString(36).substring(2, 9)}`,
              url,
              normalizedUrl: normalized,
              title: child.name || url,
              addDate: child.date_added,
              folderPath: path,
              sourceFileId: fileId,
              sourceBrowser: browser,
            };
            folderNode.bookmarks.push(bm);
            allBookmarks.push(bm);
          } else if (child.type === 'folder') {
            const sub = traverseJsonNode(child, path);
            if (sub) folderNode.subfolders.push(sub);
          }
        }
      }
      return folderNode;
    }
    return null;
  }

  for (const rootKey of Object.keys(roots)) {
    const rootNode = traverseJsonNode(roots[rootKey], []);
    if (rootNode) rootFolders.push(rootNode);
  }

  return { rootFolders, allBookmarks };
}

/**
 * Universal bookmark file parser: parses either HTML or JSON.
 */
export function parseBookmarkFile(
  content: string,
  filename: string,
  customLabel?: string,
  normOpts?: Partial<NormalizeOptions>
): ParsedBookmarkFile {
  const fileId = `file_${Math.random().toString(36).substring(2, 9)}`;
  const browser = detectBrowser(content, filename);
  const label = customLabel || defaultBrowserLabel(browser, filename);

  const trimmed = content.trim();
  let rootFolders: FolderNode[] = [];
  let allBookmarks: BookmarkItem[] = [];

  if (trimmed.startsWith('{') && trimmed.includes('"roots"')) {
    const res = parseChromiumJson(trimmed, fileId, browser, normOpts);
    rootFolders = res.rootFolders;
    allBookmarks = res.allBookmarks;
  } else {
    const res = parseNetscapeHtml(trimmed, fileId, browser, normOpts);
    rootFolders = res.rootFolders;
    allBookmarks = res.allBookmarks;
  }

  const uniqueUrls = new Set(allBookmarks.map((b) => b.normalizedUrl)).size;

  return {
    id: fileId,
    filename,
    browser,
    label,
    color: BROWSER_COLORS[browser],
    rawText: content,
    rootFolders,
    allBookmarks,
    uniqueUrlCount: uniqueUrls,
  };
}

export function defaultBrowserLabel(browser: BrowserType, filename: string): string {
  const baseName = filename.replace(/\.[^/.]+$/, '');
  switch (browser) {
    case 'chrome':
      return `Chrome (${baseName})`;
    case 'edge':
      return `Edge (${baseName})`;
    case 'firefox':
      return `Firefox (${baseName})`;
    case 'vivaldi':
      return `Vivaldi (${baseName})`;
    case 'opera':
      return `Opera (${baseName})`;
    case 'safari':
      return `Safari (${baseName})`;
    default:
      return baseName;
  }
}
