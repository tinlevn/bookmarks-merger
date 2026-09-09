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
      <div className="bg-surface border border-ink/20 rounded-lg p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-acid/10 border border-acid/20 text-acid-strong flex items-center justify-center mx-auto mb-3">
          ✓
        </div>
        <h3 className="text-sm font-semibold text-ink">
          Zero Folder Path Conflicts
        </h3>
        <p className="text-xs text-ink-soft mt-1 max-w-sm mx-auto">
          All shared bookmarks were stored in matching folder locations across your imported browser files.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-ink/20 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="w-4 h-4 text-amber" />
          <h3 className="text-sm font-semibold text-ink">
            Reconciled Folder Path Differences ({conflicts.length})
          </h3>
        </div>
        <p className="text-xs text-ink-soft">
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
              className="bg-surface border border-ink/20 rounded-lg p-4 space-y-3 shadow-sm"
            >
              {/* Bookmark Info */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-medium text-ink">
                    {conflict.title}
                  </h4>
                  {safeWeb ? (
                    <a
                      href={conflict.canonicalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-xs text-signal hover:underline mt-0.5"
                    >
                      {conflict.canonicalUrl}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="font-mono text-xs text-ink-soft mt-0.5">
                      {conflict.canonicalUrl}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-acid/10 border border-acid/20 text-acid-strong text-xs font-medium">
                  <span>Unified Location:</span>
                  <span className="font-semibold text-acid">{unifiedPath}</span>
                </div>
              </div>

              {/* Locations comparison */}
              <div className={`grid gap-2 pt-2 border-t border-ink/20 ${getDynamicGridCols(conflict.paths.length)}`}>
                {conflict.paths.map((p, idx) => (
                  <div
                    key={idx}
                    className="bg-surface-muted border border-ink/20 rounded-lg p-2.5 flex flex-col justify-between text-xs"
                  >
                    <span className="font-semibold text-ink-soft text-[11px] mb-1">
                      {p.label}
                    </span>
                    <div className="flex items-center gap-1.5 text-ink">
                      <Folder className="w-3.5 h-3.5 text-ink-faint flex-shrink-0" />
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
