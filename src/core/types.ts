export type BrowserType =
  | 'chrome'
  | 'edge'
  | 'firefox'
  | 'vivaldi'
  | 'opera'
  | 'safari'
  | 'other';

export interface BookmarkItem {
  id: string;
  url: string;
  normalizedUrl: string;
  title: string;
  addDate?: string;
  lastModified?: string;
  icon?: string;
  folderPath: string[]; // Hierarchy names, e.g. ["Bookmarks bar", "Tech", "AI"]
  sourceFileId: string;
  sourceBrowser: BrowserType;
}

export interface FolderNode {
  id: string;
  title: string;
  addDate?: string;
  lastModified?: string;
  toolbarFolder?: boolean;
  unfiledFolder?: boolean;
  bookmarks: BookmarkItem[];
  subfolders: FolderNode[];
}

export interface ParsedBookmarkFile {
  id: string;
  filename: string;
  browser: BrowserType;
  label: string;
  color: {
    bg: string;
    text: string;
    border: string;
    accent: string;
  };
  rootFolders: FolderNode[];
  allBookmarks: BookmarkItem[];
  uniqueUrlCount: number;
  rawText?: string;
}

export interface NormalizeOptions {
  stripTrackingParams: boolean; // strip utm_*, ref, fbclid, gclid, etc.
  trimTrailingSlash: boolean;    // normalize https://domain.com/ to https://domain.com
  ignoreProtocol: boolean;       // match http:// to https://
  ignoreHash: boolean;           // strip #anchor
  lowercaseHost: boolean;        // lowercase hostname
}

export interface MergeOptions {
  normalize: NormalizeOptions;
  unifyToolbars: boolean;        // Alias "Bookmarks bar", "Favorites bar", "Bookmarks Toolbar"
  preferNonEmptyTitle: boolean;  // Pick the best non-empty / non-raw URL title
  preferHttps: boolean;          // Upgrade http:// to https:// if one browser has https://
}

export interface UnifiedBookmarkOccurrence {
  fileId: string;
  browser: BrowserType;
  label: string;
  rawUrl: string;
  title: string;
  folderPath: string[];
  icon?: string;
  addDate?: string;
}

export interface UnifiedBookmark {
  canonicalUrl: string;
  title: string;
  occurrences: UnifiedBookmarkOccurrence[];
  sourceFileIds: string[];
  missingFileIds: string[];
  isSharedAll: boolean;
  isExclusive: boolean;
  exclusiveFileId?: string;
  unifiedFolderPath: string[];
  icon?: string;
  addDate?: string;
}

export interface FileGapStats {
  fileId: string;
  label: string;
  browser: BrowserType;
  totalBookmarks: number;
  uniqueCount: number;
  missingCount: number;
  exclusiveCount: number;
  coveragePct: number;
}

export interface ConflictingLocation {
  canonicalUrl: string;
  title: string;
  paths: { fileId: string; label: string; folderPath: string[] }[];
}

export interface GapAnalysisResult {
  totalUniqueUrls: number;
  totalRawItems: number;
  overlapRate: number; // percentage of URLs present in >= 2 files
  files: ParsedBookmarkFile[];
  perFileStats: Record<string, FileGapStats>;
  matrix: UnifiedBookmark[];
  conflictingLocations: ConflictingLocation[];
}

export interface MergedFolderNode {
  title: string;
  addDate?: string;
  lastModified?: string;
  toolbarFolder?: boolean;
  unfiledFolder?: boolean;
  bookmarks: UnifiedBookmark[];
  subfolders: MergedFolderNode[];
}
