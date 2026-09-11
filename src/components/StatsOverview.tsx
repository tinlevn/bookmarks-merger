import React from 'react';
import { Layers, Bookmark, Share2, AlertCircle, ArrowUpRight } from 'lucide-react';
import type { GapAnalysisResult } from '../core/types';
import { BrowserBadge } from './BrowserBadge';
import { getDynamicGridCols } from '../core/constants';

interface StatsOverviewProps {
  analysis: GapAnalysisResult;
  onSelectBrowserFilter: (fileId: string) => void;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  analysis,
  onSelectBrowserFilter,
}) => {
  const { totalUniqueUrls, totalRawItems, overlapRate, perFileStats, files, conflictingLocations } =
    analysis;

  if (files.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface border border-ink/20 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-xs font-medium uppercase tracking-wider">Total Unique URLs</span>
            <Bookmark className="w-4 h-4 text-signal" />
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-bold text-ink font-display tracking-tight">
              {totalUniqueUrls}
            </span>
            <span className="text-xs text-ink-soft ml-2">links</span>
          </div>
        </div>

        <div className="bg-surface border border-ink/20 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-xs font-medium uppercase tracking-wider">Total Items Read</span>
            <Layers className="w-4 h-4 text-acid-strong" />
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-bold text-ink font-display tracking-tight">
              {totalRawItems}
            </span>
            <span className="text-xs text-ink-soft ml-2">across {files.length} files</span>
          </div>
        </div>

        <div className="bg-surface border border-ink/20 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-xs font-medium uppercase tracking-wider">Overlap Rate</span>
            <Share2 className="w-4 h-4 text-amber" />
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-bold text-ink font-display tracking-tight">
              {overlapRate.toFixed(1)}%
            </span>
            <span className="text-xs text-ink-soft ml-2">shared in 2+</span>
          </div>
        </div>

        <div className="bg-surface border border-ink/20 rounded-lg p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-xs font-medium uppercase tracking-wider">Folder Conflicts</span>
            <AlertCircle className="w-4 h-4 text-amber" />
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-bold text-ink font-display tracking-tight">
              {conflictingLocations.length}
            </span>
            <span className="text-xs text-ink-soft ml-2">reconciled</span>
          </div>
        </div>
      </div>

      {/* Per-Browser Coverage Cards */}
      <div className={`grid gap-3 ${getDynamicGridCols(files.length)}`}>
        {files.map((file) => {
          const stats = perFileStats[file.id];
          if (!stats) return null;

          return (
            <div
              key={file.id}
              className="bg-surface border border-ink/20 rounded-lg p-4 flex flex-col justify-between hover:border-ink/30 transition-colors shadow-sm"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <BrowserBadge browser={file.browser} label={file.label} />
                  <span className="text-xs font-mono font-semibold text-ink-soft">
                    {stats.coveragePct.toFixed(0)}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-surface-muted h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-cyan h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${stats.coveragePct}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="bg-surface-muted rounded-lg p-2">
                    <p className="text-[10px] uppercase tracking-wider text-ink-soft">Present</p>
                    <p className="text-sm font-semibold font-mono text-ink mt-0.5">
                      {stats.uniqueCount}
                    </p>
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectBrowserFilter(file.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectBrowserFilter(file.id);
                      }
                    }}
                    className="bg-amber/10 border border-amber/20 rounded-lg p-2 cursor-pointer hover:bg-amber/20 focus:outline-none focus:ring-1 focus:ring-amber transition-colors group"
                    title={`View ${stats.missingCount} missing links`}
                  >
                    <p className="text-[10px] uppercase tracking-wider text-amber flex items-center justify-center gap-0.5">
                      Missing
                      <ArrowUpRight className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
                    </p>
                    <p className="text-sm font-semibold font-mono text-amber mt-0.5">
                      {stats.missingCount}
                    </p>
                  </div>
                  <div className="bg-surface-muted rounded-lg p-2">
                    <p className="text-[10px] uppercase tracking-wider text-ink-soft">Unique</p>
                    <p className="text-sm font-semibold font-mono text-ink mt-0.5">
                      {stats.exclusiveCount}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
