import React, { useMemo, useState } from 'react';
import {
  Sparkles,
  Sliders,
  TableProperties,
  FolderTree,
  AlertCircle,
  Download,
  Bookmark,
  ShieldCheck,
} from 'lucide-react';
import type { MergeOptions, ParsedBookmarkFile } from './core/types';
import { DEFAULT_NORMALIZE_OPTIONS } from './core/normalizer';
import { parseBookmarkFile } from './core/parser';
import { analyzeBookmarkGaps } from './core/analyzer';
import { buildMergedTree } from './core/merger';
import {
  CHROME_DEMO_HTML,
  EDGE_DEMO_HTML,
  FIREFOX_DEMO_HTML,
  VIVALDI_DEMO_HTML,
} from './core/demo-data';
import { FileUploader } from './components/FileUploader';
import { StatsOverview } from './components/StatsOverview';
import { GapMatrixView } from './components/GapMatrixView';
import { MergedTreeView } from './components/MergedTreeView';
import { FolderConflictView } from './components/FolderConflictView';
import { ExportPanel } from './components/ExportPanel';
import { SettingsModal } from './components/SettingsModal';

export const App: React.FC = () => {
  const [options, setOptions] = useState<MergeOptions>({
    normalize: { ...DEFAULT_NORMALIZE_OPTIONS },
    unifyToolbars: true,
    preferNonEmptyTitle: true,
    preferHttps: true,
  });

  const [files, setFiles] = useState<ParsedBookmarkFile[]>(() => {
    // Start with demo files loaded so user immediately sees rich data!
    const chrome = parseBookmarkFile(CHROME_DEMO_HTML, 'chrome_bookmarks.html', 'Chrome');
    const edge = parseBookmarkFile(EDGE_DEMO_HTML, 'edge_favorites.html', 'Edge');
    const firefox = parseBookmarkFile(FIREFOX_DEMO_HTML, 'firefox_bookmarks.html', 'Firefox');
    const vivaldi = parseBookmarkFile(VIVALDI_DEMO_HTML, 'vivaldi_bookmarks.html', 'Vivaldi');
    return [chrome, edge, firefox, vivaldi];
  });

  const [activeTab, setActiveTab] = useState<'matrix' | 'tree' | 'conflicts' | 'export'>('matrix');
  const [matrixFilter, setMatrixFilter] = useState<string>('all');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Re-run gap analysis whenever files or options change
  const analysis = useMemo(() => {
    return analyzeBookmarkGaps(files, options);
  }, [files, options]);

  // Re-run merged tree whenever analysis matrix or options change
  const mergedTree = useMemo(() => {
    return buildMergedTree(analysis.matrix, options);
  }, [analysis.matrix, options]);

  const handleAddFiles = (newFiles: { content: string; filename: string }[]) => {
    const parsed = newFiles.map((f) =>
      parseBookmarkFile(f.content, f.filename, undefined, options.normalize)
    );
    setFiles((prev) => [...prev, ...parsed]);
  };

  const handleRemoveFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    if (matrixFilter === fileId) {
      setMatrixFilter('all');
    }
  };

  const handleUpdateLabel = (fileId: string, newLabel: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, label: newLabel } : f))
    );
  };

  const handleLoadDemo = () => {
    const chrome = parseBookmarkFile(CHROME_DEMO_HTML, 'chrome_bookmarks.html', 'Chrome');
    const edge = parseBookmarkFile(EDGE_DEMO_HTML, 'edge_favorites.html', 'Edge');
    const firefox = parseBookmarkFile(FIREFOX_DEMO_HTML, 'firefox_bookmarks.html', 'Firefox');
    const vivaldi = parseBookmarkFile(VIVALDI_DEMO_HTML, 'vivaldi_bookmarks.html', 'Vivaldi');
    setFiles([chrome, edge, firefox, vivaldi]);
    setMatrixFilter('all');
  };

  const handleClearAll = () => {
    setFiles([]);
    setMatrixFilter('all');
  };

  const handleSelectBrowserMissing = (fileId: string) => {
    setActiveTab('matrix');
    setMatrixFilter(fileId);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Bookmark className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-100 tracking-tight">
                  Bookmark Unifier & Gap Analyzer
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 font-semibold border border-indigo-500/30 hidden sm:inline-block">
                  Universal HTML & JSON
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Chrome • Edge • Firefox • Vivaldi • Opera
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium mr-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              100% Local & Private
            </div>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              title="Merge & Normalization Settings"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              Settings
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* File Uploader */}
        <FileUploader
          files={files}
          onAddFiles={handleAddFiles}
          onRemoveFile={handleRemoveFile}
          onUpdateLabel={handleUpdateLabel}
          onLoadDemo={handleLoadDemo}
          onClearAll={handleClearAll}
        />

        {files.length > 0 ? (
          <>
            {/* Stats Dashboard */}
            <StatsOverview
              analysis={analysis}
              onSelectBrowserFilter={handleSelectBrowserMissing}
            />

            {/* Navigation Tabs */}
            <div className="border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('matrix')}
                  className={`inline-flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex-shrink-0 ${
                    activeTab === 'matrix'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <TableProperties className="w-4 h-4" />
                  Gap Matrix & Missing Links
                  <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                    {analysis.totalUniqueUrls}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('tree')}
                  className={`inline-flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex-shrink-0 ${
                    activeTab === 'tree'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FolderTree className="w-4 h-4" />
                  Unified Folder Hierarchy
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('conflicts')}
                  className={`inline-flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex-shrink-0 ${
                    activeTab === 'conflicts'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <AlertCircle className="w-4 h-4" />
                  Folder Conflicts
                  {analysis.conflictingLocations.length > 0 && (
                    <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-mono">
                      {analysis.conflictingLocations.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('export')}
                  className={`inline-flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors flex-shrink-0 ${
                    activeTab === 'export'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  Export Unified HTML
                </button>
              </div>
            </div>

            {/* Tab Views */}
            {activeTab === 'matrix' && (
              <GapMatrixView
                analysis={analysis}
                selectedFilter={matrixFilter}
                onFilterChange={setMatrixFilter}
              />
            )}

            {activeTab === 'tree' && (
              <MergedTreeView rootFolders={mergedTree} files={files} />
            )}

            {activeTab === 'conflicts' && (
              <FolderConflictView
                conflicts={analysis.conflictingLocations}
                matrix={analysis.matrix}
              />
            )}

            {activeTab === 'export' && (
              <ExportPanel analysis={analysis} mergedTree={mergedTree} />
            )}
          </>
        ) : (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
              <Bookmark className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">
              No Bookmark Files Loaded
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Drag and drop your exported bookmark HTML files above or click below to load sample demo files from Chrome, Edge, Firefox, and Vivaldi.
            </p>
            <button
              type="button"
              onClick={handleLoadDemo}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Load Sample Demo Data
            </button>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        options={options}
        onChangeOptions={setOptions}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 mt-12 bg-slate-950">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>
            Bookmark Unifier & Gap Analyzer • Zero cloud dependencies, 100% private.
          </p>
          <div className="flex items-center gap-4">
            <span>Netscape Bookmark HTML Standard</span>
            <span>•</span>
            <span>Chromium JSON Compatible</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
