import React, { useMemo, useState } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Copy,
  Check,
  Download,
  Filter,
  FileSpreadsheet,
  Folder,
} from 'lucide-react';
import type { GapAnalysisResult } from '../core/types';
import { exportCatchupBlob, exportCsvBlob } from '../utils/download';
import { isSafeWebUrl } from '../utils/security';

interface GapMatrixViewProps {
  analysis: GapAnalysisResult;
  selectedFilter: string; // 'all' | 'shared' | 'exclusive' | 'conflicts' | fileId
  onFilterChange: (filter: string) => void;
}

export const GapMatrixView: React.FC<GapMatrixViewProps> = ({
  analysis,
  selectedFilter,
  onFilterChange,
}) => {
  const { matrix, files, perFileStats, conflictingLocations } = analysis;

  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [batchCopied, setBatchCopied] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Filter bookmarks based on selected filter and search query
  const filteredBookmarks = useMemo(() => {
    let result = matrix;

    if (selectedFilter === 'shared') {
      result = result.filter((b) => b.isSharedAll);
    } else if (selectedFilter === 'exclusive') {
      result = result.filter((b) => b.isExclusive);
    } else if (selectedFilter === 'conflicts') {
      const conflictUrls = new Set(conflictingLocations.map((c) => c.canonicalUrl));
      result = result.filter((b) => conflictUrls.has(b.canonicalUrl));
    } else if (selectedFilter !== 'all') {
      // Selected filter is a specific fileId: show bookmarks MISSING in this file
      result = result.filter((b) => b.missingFileIds.includes(selectedFilter));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.canonicalUrl.toLowerCase().includes(q) ||
          b.unifiedFolderPath.some((f) => f.toLowerCase().includes(q))
      );
    }

    return result;
  }, [matrix, selectedFilter, searchQuery, conflictingLocations]);

  // Pagination
  const totalPages = Math.ceil(filteredBookmarks.length / pageSize) || 1;
  const paginatedBookmarks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBookmarks.slice(start, start + pageSize);
  }, [filteredBookmarks, currentPage, pageSize]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const copyBatchUrls = () => {
    const urls = filteredBookmarks.map((b) => b.canonicalUrl).join('\n');
    navigator.clipboard.writeText(urls);
    setBatchCopied(true);
    setTimeout(() => setBatchCopied(false), 2000);
  };

  const selectedFile = files.find((f) => f.id === selectedFilter);

  return (
    <div className="space-y-4">
      {/* Controls Header: Search & Filter Pills */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md lg:max-w-xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search title, URL, or folder..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {selectedFile && (
              <>
                <button
                  type="button"
                  onClick={copyBatchUrls}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                >
                  {batchCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copied {filteredBookmarks.length} URLs!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      Copy {filteredBookmarks.length} Missing URLs
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => exportCatchupBlob(selectedFile.id, files, matrix)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Catch-up HTML for {selectedFile.label}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => exportCsvBlob(matrix, files)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors ml-auto md:ml-0"
              title="Download comparison matrix as CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs" role="toolbar" aria-label="Filter Bookmarks">
          <span className="text-slate-500 font-medium mr-1 flex items-center gap-1 flex-shrink-0">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>

          <button
            type="button"
            onClick={() => {
              onFilterChange('all');
              setCurrentPage(1);
            }}
            className={`px-3 py-1 rounded-lg font-medium transition-colors flex-shrink-0 ${
              selectedFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`}
          >
            All Unique ({matrix.length})
          </button>

          {/* Per-browser missing filters */}
          {files.map((file) => {
            const stats = perFileStats[file.id];
            const isSelected = selectedFilter === file.id;

            return (
              <button
                key={file.id}
                type="button"
                onClick={() => {
                  onFilterChange(file.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 flex-shrink-0 ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                    : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/20'
                }`}
              >
                <span>Missing in {file.label}</span>
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-amber-950/40 text-amber-200">
                  {stats ? stats.missingCount : 0}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              onFilterChange('exclusive');
              setCurrentPage(1);
            }}
            className={`px-3 py-1 rounded-lg font-medium transition-colors flex-shrink-0 ${
              selectedFilter === 'exclusive'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`}
          >
            Single Browser Only ({matrix.filter((b) => b.isExclusive).length})
          </button>

          <button
            type="button"
            onClick={() => {
              onFilterChange('shared');
              setCurrentPage(1);
            }}
            className={`px-3 py-1 rounded-lg font-medium transition-colors flex-shrink-0 ${
              selectedFilter === 'shared'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`}
          >
            Shared in All ({matrix.filter((b) => b.isSharedAll).length})
          </button>

          {conflictingLocations.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onFilterChange('conflicts');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg font-medium transition-colors flex-shrink-0 ${
                selectedFilter === 'conflicts'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/20'
              }`}
            >
              Path Conflicts ({conflictingLocations.length})
            </button>
          )}
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 min-w-[300px] w-2/5">Bookmark & URL</th>
                <th className="py-3.5 px-4 min-w-[200px] w-1/4">Target Folder</th>
                {files.map((file) => (
                  <th key={file.id} className="py-3.5 px-4 text-center min-w-[130px] whitespace-nowrap">
                    <span className="truncate block max-w-[160px] mx-auto">
                      {file.label}
                    </span>
                  </th>
                ))}
                <th className="py-3.5 px-4 text-right min-w-[70px] w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedBookmarks.map((bm) => {
                const isCopied = copiedId === bm.canonicalUrl;
                const presentSet = new Set(bm.sourceFileIds);
                const safeWeb = isSafeWebUrl(bm.canonicalUrl);
                const safeIcon =
                  bm.icon &&
                  (bm.icon.startsWith('data:image/') || isSafeWebUrl(bm.icon));

                return (
                  <tr
                    key={bm.canonicalUrl}
                    className="hover:bg-slate-800/30 transition-colors group"
                  >
                    {/* Bookmark Title & Canonical URL */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {safeIcon ? (
                            <img
                              src={bm.icon}
                              alt=""
                              className="w-4 h-4 rounded flex-shrink-0"
                              onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                            />
                          ) : (
                            <div className="w-4 h-4 rounded bg-slate-800 flex items-center justify-center text-[9px] font-mono text-slate-400 flex-shrink-0">
                              🔗
                            </div>
                          )}
                          <span
                            className="font-medium text-slate-200 line-clamp-1 group-hover:text-indigo-300 transition-colors"
                            title={bm.title}
                          >
                            {bm.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
                          <span className="truncate max-w-sm md:max-w-md lg:max-w-xl xl:max-w-3xl" title={bm.canonicalUrl}>
                            {bm.canonicalUrl}
                          </span>
                          {safeWeb && (
                            <a
                              href={bm.canonicalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-600 hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Open link in new tab"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Unified Folder Path */}
                    <td className="py-3 px-4 min-w-[200px]">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Folder className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        <span className="truncate max-w-xs md:max-w-sm lg:max-w-md" title={bm.unifiedFolderPath.join(' > ')}>
                          {bm.unifiedFolderPath.join(' / ')}
                        </span>
                      </div>
                    </td>

                    {/* Presence Columns per File */}
                    {files.map((file) => {
                      const isPresent = presentSet.has(file.id);
                      const occurrence = bm.occurrences.find((o) => o.fileId === file.id);

                      return (
                        <td key={file.id} className="py-3 px-4 text-center">
                          {isPresent ? (
                            <div
                              className="inline-flex items-center gap-1 text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20"
                              title={`Stored in: ${occurrence?.folderPath.join(' / ') || 'Root'}`}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span className="text-[11px]">Present</span>
                            </div>
                          ) : (
                            <div
                              className="inline-flex items-center gap-1 text-amber-400/80 font-medium px-2 py-0.5 rounded-full bg-amber-500/5 border border-amber-500/15"
                              title="Missing from this browser export"
                            >
                              <XCircle className="w-3 h-3 text-amber-500" />
                              <span className="text-[11px]">Missing</span>
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* Quick Actions */}
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(bm.canonicalUrl, bm.canonicalUrl)}
                        className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Copy URL"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {paginatedBookmarks.length === 0 && (
                <tr>
                  <td colSpan={files.length + 3} className="py-12 text-center text-slate-500">
                    No bookmarks match the current filter or search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="py-3 px-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredBookmarks.length)} of{' '}
              {filteredBookmarks.length} bookmarks
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200"
              >
                Previous
              </button>
              <span className="px-2 font-mono">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
