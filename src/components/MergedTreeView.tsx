import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
} from 'lucide-react';
import type { MergedFolderNode, ParsedBookmarkFile, UnifiedBookmark } from '../core/types';
import { BrowserBadge } from './BrowserBadge';
import { isSafeWebUrl } from '../utils/security';

interface MergedTreeViewProps {
  rootFolders: MergedFolderNode[];
  files: ParsedBookmarkFile[];
}

export const MergedTreeView: React.FC<MergedTreeViewProps> = ({ rootFolders, files }) => {
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const fileMap = new Map(files.map((f) => [f.id, f]));

  const toggleFolder = (path: string) => {
    setCollapsedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const expandAll = () => {
    setCollapsedPaths(new Set());
  };

  const collapseAll = () => {
    const allPaths = new Set<string>();
    const collect = (nodes: MergedFolderNode[], prefix: string) => {
      for (const n of nodes) {
        const p = `${prefix}/${n.title}`;
        allPaths.add(p);
        collect(n.subfolders, p);
      }
    };
    collect(rootFolders, '');
    setCollapsedPaths(allPaths);
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 1800);
  };

  const renderBookmarkItem = (bm: UnifiedBookmark) => {
    const isCopied = copiedUrl === bm.canonicalUrl;
    const safeWeb = isSafeWebUrl(bm.canonicalUrl);
    const safeIcon =
      bm.icon &&
      (bm.icon.startsWith('data:image/') || isSafeWebUrl(bm.icon));

    return (
      <div
        key={bm.canonicalUrl}
        className="flex items-center justify-between py-1.5 px-2.5 rounded-lg hover:bg-slate-800/50 group transition-colors text-xs"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {safeIcon ? (
            <img
              src={bm.icon}
              alt=""
              className="w-4 h-4 rounded flex-shrink-0"
              onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
            />
          ) : (
            <div className="w-4 h-4 rounded bg-slate-800 flex items-center justify-center text-[9px] text-slate-400 flex-shrink-0">
              🔗
            </div>
          )}

          <div className="min-w-0 flex-1 flex items-baseline gap-2">
            {safeWeb ? (
              <a
                href={bm.canonicalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-200 hover:text-indigo-400 font-medium truncate inline-block"
                title={bm.title}
              >
                {bm.title}
              </a>
            ) : (
              <span
                className="text-slate-300 font-medium truncate inline-block"
                title={bm.title}
              >
                {bm.title}
              </span>
            )}

            <span className="font-mono text-[10px] text-slate-500 truncate hidden sm:inline-block">
              {bm.canonicalUrl}
            </span>
          </div>
        </div>

        {/* Contributing source browser badges */}
        <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
          <div className="flex items-center -space-x-1">
            {bm.occurrences.map((occ) => {
              const file = fileMap.get(occ.fileId);
              if (!file) return null;
              return (
                <BrowserBadge
                  key={occ.fileId}
                  browser={occ.browser}
                  label={file.label}
                  size="sm"
                  showLabel={false}
                />
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => copyUrl(bm.canonicalUrl)}
            className="p-1 text-slate-500 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity rounded cursor-pointer"
            title="Copy URL"
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderFolderNode = (folder: MergedFolderNode, currentPath: string, level: number) => {
    const path = `${currentPath}/${folder.title}`;
    const isCollapsed = collapsedPaths.has(path);
    const totalItems = folder.bookmarks.length;

    return (
      <div key={path} className="space-y-1">
        {/* Folder Header */}
        <div
          role="button"
          tabIndex={0}
          aria-expanded={!isCollapsed}
          onClick={() => toggleFolder(path)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleFolder(path);
            }
          }}
          className={`flex items-center justify-between py-1.5 px-2.5 rounded-lg cursor-pointer select-none transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
            level === 0
              ? 'bg-slate-900/90 hover:bg-slate-800 border border-slate-800'
              : 'hover:bg-slate-800/60'
          }`}
          style={{ marginLeft: `${level * 16}px` }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            )}

            {isCollapsed ? (
              <Folder className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            ) : (
              <FolderOpen className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            )}

            <span className="font-semibold text-xs text-slate-200 truncate">
              {folder.title}
            </span>

            {folder.toolbarFolder && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                Bookmarks Bar / Toolbar
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
            {folder.subfolders.length > 0 && (
              <span>{folder.subfolders.length} subfolders</span>
            )}
            <span>{totalItems} items</span>
          </div>
        </div>

        {/* Children: Subfolders & Bookmarks */}
        {!isCollapsed && (
          <div className="space-y-0.5">
            {folder.subfolders.map((sub) => renderFolderNode(sub, path, level + 1))}

            <div style={{ marginLeft: `${(level + 1) * 16}px` }} className="space-y-0.5">
              {folder.bookmarks.map(renderBookmarkItem)}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-4">
      {/* Tree Controls Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-200">
            Unified Bookmark Hierarchy
          </h3>
          <span className="text-xs text-slate-500">
            • Folders merged cleanly across all browsers
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Tree Nodes */}
      <div className="space-y-2">
        {rootFolders.map((root) => renderFolderNode(root, '', 0))}

        {rootFolders.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-8">
            No folders or bookmarks loaded yet.
          </p>
        )}
      </div>
    </div>
  );
};
