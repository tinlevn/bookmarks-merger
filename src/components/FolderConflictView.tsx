import React from 'react';
import { AlertCircle, Folder, ExternalLink } from 'lucide-react';
import type { ConflictingLocation, UnifiedBookmark } from '../core/types';
import { isSafeWebUrl } from '../utils/security';
import { getDynamicGridCols } from '../core/constants';

interface FolderConflictViewProps {
  conflicts: ConflictingLocation[];
  matrix: UnifiedBookmark[];
}

export const FolderConflictView: React.FC<FolderConflictViewProps> = ({
  conflicts,
  matrix,
}) => {
  const bookmarkMap = new Map(matrix.map((b) => [b.canonicalUrl, b]));

  if (conflicts.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
          ✓
        </div>
        <h3 className="text-sm font-semibold text-slate-200">
          Zero Folder Path Conflicts
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          All shared bookmarks were stored in matching folder locations across your imported browser files.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-slate-200">
            Reconciled Folder Path Differences ({conflicts.length})
          </h3>
        </div>
        <p className="text-xs text-slate-400">
          These bookmarks exist in multiple browsers but were filed under different folder hierarchies.
          The merger unified them into the best matching folder (prioritizing toolbars and primary categories).
        </p>
      </div>

      <div className="space-y-3">
        {conflicts.map((conflict) => {
          const unified = bookmarkMap.get(conflict.canonicalUrl);
          const unifiedPath = unified?.unifiedFolderPath.join(' / ') || 'Other Bookmarks';
          const safeWeb = isSafeWebUrl(conflict.canonicalUrl);

          return (
            <div
              key={conflict.canonicalUrl}
              className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3 shadow-sm"
            >
              {/* Bookmark Info */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-medium text-slate-200">
                    {conflict.title}
                  </h4>
                  {safeWeb ? (
                    <a
                      href={conflict.canonicalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-xs text-indigo-400 hover:underline mt-0.5"
                    >
                      {conflict.canonicalUrl}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="font-mono text-xs text-slate-400 mt-0.5">
                      {conflict.canonicalUrl}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
                  <span>Unified Location:</span>
                  <span className="font-semibold text-emerald-200">{unifiedPath}</span>
                </div>
              </div>

              {/* Locations comparison */}
              <div className={`grid gap-2 pt-2 border-t border-slate-800/80 ${getDynamicGridCols(conflict.paths.length)}`}>
                {conflict.paths.map((p, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5 flex flex-col justify-between text-xs"
                  >
                    <span className="font-semibold text-slate-400 text-[11px] mb-1">
                      {p.label}
                    </span>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Folder className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="truncate" title={p.folderPath.join(' / ')}>
                        {p.folderPath.join(' / ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
