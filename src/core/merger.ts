import type { MergedFolderNode, MergeOptions, UnifiedBookmark } from './types';
import { TOOLBAR_ROOT_NAMES, UNFILED_ROOT_NAMES } from './constants';

/**
 * Builds a unified, deduplicated folder hierarchy from the unified bookmarks matrix.
 */
export function buildMergedTree(
  unifiedBookmarks: UnifiedBookmark[],
  options?: MergeOptions
): MergedFolderNode[] {
  const unifyToolbars = options ? options.unifyToolbars : true;

  // Intermediate tree structure for fast lookup
  interface TempNode {
    title: string;
    toolbarFolder?: boolean;
    unfiledFolder?: boolean;
    bookmarks: UnifiedBookmark[];
    subfolderMap: Map<string, TempNode>;
  }

  const rootMap = new Map<string, TempNode>();

  function getOrCreateFolder(
    parentMap: Map<string, TempNode>,
    folderName: string,
    isRoot: boolean
  ): TempNode {
    if (!parentMap.has(folderName)) {
      const lower = folderName.toLowerCase().trim();
      const isToolbar =
        isRoot &&
        (unifyToolbars ? TOOLBAR_ROOT_NAMES.has(lower) : lower === 'bookmarks bar' || lower === 'toolbar');
      const isUnfiled =
        isRoot &&
        (unifyToolbars ? UNFILED_ROOT_NAMES.has(lower) : lower === 'other bookmarks');

      parentMap.set(folderName, {
        title: folderName,
        toolbarFolder: isToolbar,
        unfiledFolder: isUnfiled,
        bookmarks: [],
        subfolderMap: new Map(),
      });
    }
    return parentMap.get(folderName)!;
  }

  // Insert each unified bookmark into the tree
  for (const bm of unifiedBookmarks) {
    const path =
      bm.unifiedFolderPath.length > 0 ? bm.unifiedFolderPath : ['Other Bookmarks'];

    let currentMap = rootMap;
    let currentNode: TempNode | null = null;

    for (let i = 0; i < path.length; i++) {
      const segment = path[i];
      currentNode = getOrCreateFolder(currentMap, segment, i === 0);
      currentMap = currentNode.subfolderMap;
    }

    if (currentNode) {
      currentNode.bookmarks.push(bm);
    }
  }

  // Convert TempNode recursively to MergedFolderNode
  function convertNode(node: TempNode): MergedFolderNode {
    const subfolders: MergedFolderNode[] = Array.from(
      node.subfolderMap.values()
    ).map(convertNode);

    // Sort subfolders alphabetically
    subfolders.sort((a, b) => a.title.localeCompare(b.title));

    // Sort bookmarks alphabetically by title
    const sortedBookmarks = [...node.bookmarks].sort((a, b) =>
      a.title.localeCompare(b.title)
    );

    return {
      title: node.title,
      toolbarFolder: node.toolbarFolder,
      unfiledFolder: node.unfiledFolder,
      bookmarks: sortedBookmarks,
      subfolders,
    };
  }

  const rootNodes: MergedFolderNode[] = Array.from(rootMap.values()).map(
    convertNode
  );

  // Preferred root order: Toolbar -> Other -> Mobile -> rest
  rootNodes.sort((a, b) => {
    const getWeight = (node: MergedFolderNode) => {
      const title = node.title.toLowerCase();
      if (node.toolbarFolder || title.includes('bar') || title.includes('toolbar'))
        return 1;
      if (node.unfiledFolder || title.includes('other') || title.includes('unsorted'))
        return 2;
      if (title.includes('mobile') || title.includes('synced')) return 3;
      return 4;
    };
    const wA = getWeight(a);
    const wB = getWeight(b);
    if (wA !== wB) return wA - wB;
    return a.title.localeCompare(b.title);
  });

  return rootNodes;
}
