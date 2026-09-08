import type {
  ConflictingLocation,
  FileGapStats,
  GapAnalysisResult,
  MergeOptions,
  ParsedBookmarkFile,
  UnifiedBookmark,
  UnifiedBookmarkOccurrence,
} from './types';
import { pickBestTitle } from './normalizer';

/**
 * Normalizes folder path for hierarchy comparison and toolbar aliasing.
 */
export function normalizeFolderPath(
  path: string[],
  unifyToolbars: boolean
): string[] {
  if (path.length === 0) return ['Other Bookmarks'];

  const result = [...path];
  if (unifyToolbars) {
    const root = result[0].toLowerCase();
    if (
      root === 'bookmarks bar' ||
      root === 'favorites bar' ||
      root === 'bookmarks toolbar' ||
      root === 'personal toolbar' ||
      root === 'toolbar'
    ) {
      result[0] = 'Bookmarks Bar';
    } else if (
      root === 'other bookmarks' ||
      root === 'other favorites' ||
      root === 'unsorted bookmarks' ||
      root === 'unfiled bookmarks' ||
      root === 'unfiled'
    ) {
      result[0] = 'Other Bookmarks';
    } else if (root === 'mobile bookmarks' || root === 'synced') {
      result[0] = 'Mobile Bookmarks';
    }
  }

  return result;
}

/**
 * Runs gap analysis and builds the diff presence matrix across all bookmark files.
 */
export function analyzeBookmarkGaps(
  files: ParsedBookmarkFile[],
  options: MergeOptions
): GapAnalysisResult {
  if (files.length === 0) {
    return {
      totalUniqueUrls: 0,
      totalRawItems: 0,
      overlapRate: 0,
      files: [],
      perFileStats: {},
      matrix: [],
      conflictingLocations: [],
    };
  }

  // 1. Group bookmarks across all files by normalized URL
  const urlGroups = new Map<string, UnifiedBookmarkOccurrence[]>();
  let totalRawItems = 0;

  for (const file of files) {
    for (const bm of file.allBookmarks) {
      totalRawItems++;
      const norm = bm.normalizedUrl;
      if (!norm) continue;

      if (!urlGroups.has(norm)) {
        urlGroups.set(norm, []);
      }
      urlGroups.get(norm)!.push({
        fileId: file.id,
        browser: file.browser,
        label: file.label,
        rawUrl: bm.url,
        title: bm.title,
        folderPath: bm.folderPath,
        icon: bm.icon,
        addDate: bm.addDate,
      });
    }
  }

  const allFileIds = files.map((f) => f.id);
  const totalUniqueUrls = urlGroups.size;

  const matrix: UnifiedBookmark[] = [];
  const conflictingLocations: ConflictingLocation[] = [];

  let overlapCount = 0;

  for (const [canonicalUrl, occurrences] of urlGroups.entries()) {
    const presentFiles = Array.from(new Set(occurrences.map((o) => o.fileId)));
    const presentFileSet = new Set(presentFiles);
    const missingFileIds = allFileIds.filter((id) => !presentFileSet.has(id));

    if (presentFiles.length >= 2) {
      overlapCount++;
    }

    const isSharedAll = presentFiles.length === files.length;
    const isExclusive = presentFiles.length === 1;
    const exclusiveFileId = isExclusive ? presentFiles[0] : undefined;

    // Determine the unified folder path
    // Prefer non-empty path, with toolbar taking precedence if enabled
    let chosenPath = occurrences[0].folderPath;
    for (const occ of occurrences) {
      if (occ.folderPath.length > 0) {
        const first = occ.folderPath[0].toLowerCase();
        if (first.includes('bar') || first.includes('toolbar')) {
          chosenPath = occ.folderPath;
          break;
        }
      }
    }
    const unifiedFolderPath = normalizeFolderPath(chosenPath, options.unifyToolbars);

    // Pick best title and icon
    const title = options.preferNonEmptyTitle
      ? pickBestTitle(
          occurrences.map((o) => o.title),
          canonicalUrl
        )
      : occurrences[0].title;

    const icon = occurrences.find((o) => o.icon)?.icon;
    const addDate = occurrences.find((o) => o.addDate)?.addDate;

    // Check if there are conflicting folder locations across files
    const normalizedPathsByFile = occurrences.map((o) => ({
      fileId: o.fileId,
      label: o.label,
      folderPath: normalizeFolderPath(o.folderPath, options.unifyToolbars),
    }));

    const pathStrings = new Set(
      normalizedPathsByFile.map((p) => p.folderPath.join(' / '))
    );
    if (pathStrings.size > 1 && presentFiles.length > 1) {
      conflictingLocations.push({
        canonicalUrl,
        title,
        paths: normalizedPathsByFile,
      });
    }

    matrix.push({
      canonicalUrl,
      title,
      occurrences,
      sourceFileIds: presentFiles,
      missingFileIds,
      isSharedAll,
      isExclusive,
      exclusiveFileId,
      unifiedFolderPath,
      icon,
      addDate,
    });
  }

  // 2. Compute per-file gap stats
  const perFileStats: Record<string, FileGapStats> = {};

  for (const file of files) {
    const fileUrlSet = new Set(file.allBookmarks.map((b) => b.normalizedUrl));
    const uniqueCount = fileUrlSet.size;
    const missingCount = totalUniqueUrls - uniqueCount;

    let exclusiveCount = 0;
    for (const bm of matrix) {
      if (bm.exclusiveFileId === file.id) {
        exclusiveCount++;
      }
    }

    const coveragePct = totalUniqueUrls > 0 ? (uniqueCount / totalUniqueUrls) * 100 : 0;

    perFileStats[file.id] = {
      fileId: file.id,
      label: file.label,
      browser: file.browser,
      totalBookmarks: file.allBookmarks.length,
      uniqueCount,
      missingCount,
      exclusiveCount,
      coveragePct,
    };
  }

  const overlapRate = totalUniqueUrls > 0 ? (overlapCount / totalUniqueUrls) * 100 : 0;

  return {
    totalUniqueUrls,
    totalRawItems,
    overlapRate,
    files,
    perFileStats,
    matrix,
    conflictingLocations,
  };
}
