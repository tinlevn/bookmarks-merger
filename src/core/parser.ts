import type {
  BookmarkItem,
  BrowserType,
  FolderNode,
  NormalizeOptions,
  ParsedBookmarkFile,
} from './types';
import { normalizeUrl, decodeHtmlEntities } from './normalizer';
import { BROWSER_THEMES } from './constants';
import { generateSafeId } from '../utils/security';

/**
 * Detect browser from file content and filename.
 */
export function detectBrowser(content: string, filename: string): BrowserType {
  const lowerName = filename.toLowerCase();
  const lowerContent = content.slice(0, 4000).toLowerCase();

  // 1. Firefox
  if (
    lowerName.includes('firefox') ||
    lowerContent.includes('unfiled_bookmarks_folder') ||
    (lowerContent.includes('toolbar="true"') && lowerContent.includes('bookmarks toolbar'))
  ) {
    return 'firefox';
  }

  // 2. Vivaldi
  if (
    lowerName.includes('vivaldi') ||
    lowerContent.includes('speeddial="true"') ||
    lowerContent.includes('vivaldi')
  ) {
    return 'vivaldi';
  }

  // 3. Opera
  if (lowerName.includes('opera') || lowerContent.includes('opera')) {
    return 'opera';
  }

  // 4. Microsoft Edge
  if (
    lowerName.includes('edge') ||
    lowerName.includes('favorites') ||
    lowerContent.includes('favorites bar')
  ) {
    return 'edge';
  }

  // 5. Google Chrome
  if (
    lowerName.includes('chrome') ||
    lowerContent.includes('personal_toolbar_folder="true"')
  ) {
    return 'chrome';
  }

  // 6. Safari
  if (lowerName.includes('safari') || lowerContent.includes('safari')) {
    return 'safari';
  }

  return 'other';
}

/**
 * Parse attributes from HTML tag string like: <A HREF="..." ADD_DATE="...">
 */
function parseAttributes(tagStr: string): Record<string, string> {
  const attrs: Record<string, string> = {};
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
 * Protects against bookmark loss when </A> tags are omitted.
 */
export function parseNetscapeHtml(
  content: string,
  fileId: string,
  browser: BrowserType,
  normOpts?: Partial<NormalizeOptions>
): { rootFolders: FolderNode[]; allBookmarks: BookmarkItem[] } {
  const rootFolders: FolderNode[] = [];
  const allBookmarks: BookmarkItem[] = [];

  interface StackEntry {
    node: FolderNode | null; // null represents the document root container (<DL><p>)
    path: string[];
  }

  const stack: StackEntry[] = [];
  let pendingFolder: {
    title: string;
    attrs: Record<string, string>;
  } | null = null;

  // Regex token matching with lookahead:
  // Extracts H3 titles or A titles stopping at closing tags OR upcoming bookmark tags
  const tokenRegex =
    /<(H3)([^>]*)>([\s\S]*?)(?:<\/H3>|(?=<(?:H3|A|\/DL|DL|DT)\b|$))|<(A)([^>]*)>([\s\S]*?)(?:<\/A>|(?=<(?:H3|A|\/DL|DL|DT)\b|$))|<(\/DL)>|<(DL)[^>]*>/gi;

  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(content)) !== null) {
    const isH3 = Boolean(match[1]);
    const isA = Boolean(match[4]);
    const isCloseDL = Boolean(match[7]);
    const isOpenDL = Boolean(match[8]);

    if (isH3) {
      if (pendingFolder) {
        commitPendingFolder();
      }

      const attrs = parseAttributes(match[2] || '');
      const rawTitle = match[3] || 'New Folder';
      const title = decodeHtmlEntities(rawTitle.replace(/<[^>]+>/g, '').trim()) || 'New Folder';

      pendingFolder = { title, attrs };
    } else if (isOpenDL) {
      if (pendingFolder) {
        const parentEntry = stack.length > 0 ? stack[stack.length - 1] : null;
        const currentPath = parentEntry ? parentEntry.path : [];

        const folderNode: FolderNode = {
          id: generateSafeId(`folder_${fileId}`),
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

        if (!parentEntry || parentEntry.node === null) {
          rootFolders.push(folderNode);
        } else {
          parentEntry.node.subfolders.push(folderNode);
        }

        stack.push({
          node: folderNode,
          path: [...currentPath, folderNode.title],
        });

        pendingFolder = null;
      } else {
        // Enclosing document-level <DL> container
        stack.push({ node: null, path: [] });
      }
    } else if (isCloseDL) {
      if (pendingFolder) {
        commitPendingFolder();
      }
      if (stack.length > 0) {
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

      // Find active enclosing folder
      let activeFolder: FolderNode | null = null;
      let currentPath: string[] = [];

      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].node !== null) {
          activeFolder = stack[i].node;
          currentPath = stack[i].path;
          break;
        }
      }

      const normalized = normalizeUrl(url, normOpts);

      const bookmark: BookmarkItem = {
        id: generateSafeId(`bm_${fileId}`),
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

      if (activeFolder) {
        activeFolder.bookmarks.push(bookmark);
      } else {
        // Root unfiled bookmark without explicit folder
        let defaultRoot = rootFolders.find((f) => f.title === 'Bookmarks' || f.title === 'Other Bookmarks');
        if (!defaultRoot) {
          defaultRoot = {
            id: generateSafeId(`folder_root_${fileId}`),
            title: 'Bookmarks',
            bookmarks: [],
            subfolders: [],
          };
          rootFolders.push(defaultRoot);
        }
        defaultRoot.bookmarks.push(bookmark);
      }

      allBookmarks.push(bookmark);
    }
  }

  function commitPendingFolder() {
    if (!pendingFolder) return;
    const parentEntry = stack.length > 0 ? stack[stack.length - 1] : null;

    const folderNode: FolderNode = {
      id: generateSafeId(`folder_${fileId}`),
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

    if (!parentEntry || parentEntry.node === null) {
      rootFolders.push(folderNode);
    } else {
      parentEntry.node.subfolders.push(folderNode);
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

  let json: any;
  try {
    json = JSON.parse(content);
  } catch (err) {
    console.error('Failed to parse Chromium JSON bookmarks file:', err);
    return { rootFolders, allBookmarks };
  }

  const roots = json && typeof json === 'object' ? json.roots || {} : {};

  function traverseJsonNode(node: any, currentPath: string[]): FolderNode | null {
    if (!node || typeof node !== 'object') return null;

    if (node.type === 'folder') {
      const folderTitle = decodeHtmlEntities(node.name || 'Folder');
      const path = currentPath.length === 0 && folderTitle === 'Root' ? [] : [...currentPath, folderTitle];

      const folderNode: FolderNode = {
        id: generateSafeId(`folder_${fileId}`),
        title: folderTitle,
        addDate: node.date_added,
        lastModified: node.date_modified,
        bookmarks: [],
        subfolders: [],
      };

      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          if (child && child.type === 'url' && child.url) {
            const url = (child.url as string).trim();
            const normalized = normalizeUrl(url, normOpts);
            const title = decodeHtmlEntities(child.name || url);
            const bm: BookmarkItem = {
              id: generateSafeId(`bm_${fileId}`),
              url,
              normalizedUrl: normalized,
              title,
              addDate: child.date_added,
              folderPath: path,
              sourceFileId: fileId,
              sourceBrowser: browser,
            };
            folderNode.bookmarks.push(bm);
            allBookmarks.push(bm);
          } else if (child && child.type === 'folder') {
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
  const fileId = generateSafeId('file');
  const browser = detectBrowser(content, filename);
  const label = customLabel || defaultBrowserLabel(browser, filename);

  const trimmed = (content || '').trim();
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
    color: BROWSER_THEMES[browser],
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
