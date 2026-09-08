import React from 'react';
import { Layers, Bookmark, Share2, AlertCircle, ArrowUpRight } from 'lucide-react';
import type { GapAnalysisResult } from '../core/types';
import { BrowserBadge } from './BrowserBadge';

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
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Total Unique URLs</span>
            <Bookmark className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-bold text-slate-100 font-mono tracking-tight">
              {totalUniqueUrls}
            </span>
            <span className="text-xs text-slate-400 ml-2">links</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Total Items Read</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-bold text-slate-100 font-mono tracking-tight">
              {totalRawItems}
            </span>
            <span className="text-xs text-slate-400 ml-2">across {files.length} files</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Overlap Rate</span>
            <Share2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-bold text-slate-100 font-mono tracking-tight">
              {overlapRate.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-400 ml-2">shared in 2+</span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Folder Conflicts</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-bold text-slate-100 font-mono tracking-tight">
              {conflictingLocations.length}
            </span>
            <span className="text-xs text-slate-400 ml-2">reconciled</span>
          </div>
        </div>
      </div>

      {/* Per-Browser Coverage Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {files.map((file) => {
          const stats = perFileStats[file.id];
          if (!stats) return null;

          return (
            <div
              key={file.id}
              className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <BrowserBadge browser={file.browser} label={file.label} />
                  <span className="text-xs font-mono font-semibold text-slate-300">
                    {stats.coveragePct.toFixed(0)}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats.coveragePct}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="bg-slate-950/60 rounded-lg p-2">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Present</p>
                    <p className="text-sm font-semibold font-mono text-slate-200 mt-0.5">
                      {stats.uniqueCount}
                    </p>
                  </div>
                  <div
                    onClick={() => onSelectBrowserFilter(file.id)}
                    className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 cursor-pointer hover:bg-amber-500/20 transition-colors group"
                    title={`View ${stats.missingCount} missing links`}
                  >
                    <p className="text-[10px] uppercase tracking-wider text-amber-400 flex items-center justify-center gap-0.5">
                      Missing
                      <ArrowUpRight className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
                    </p>
                    <p className="text-sm font-semibold font-mono text-amber-300 mt-0.5">
                      {stats.missingCount}
                    </p>
                  </div>
                  <div className="bg-slate-950/60 rounded-lg p-2">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Unique</p>
                    <p className="text-sm font-semibold font-mono text-slate-200 mt-0.5">
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
