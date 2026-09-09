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
  Sun,
  Moon,
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
import { useTheme } from './hooks/useTheme';

export const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

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
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-md border-b border-ink/20">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-signal text-white flex items-center justify-center shadow-[2px_2px_0_0_var(--color-ink)] border border-ink">
              <Bookmark className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-ink tracking-tight font-display">
                  Bookmark Unifier &amp; Gap Analyzer
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan/15 text-cyan font-semibold border border-cyan/30 hidden sm:inline-block">
                  Universal HTML &amp; JSON
                </span>
              </div>
              <p className="text-xs text-ink-soft">
                Chrome • Edge • Firefox • Vivaldi • Opera • Safari • Brave
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-acid/10 border border-acid/20 text-acid-strong text-xs font-medium mr-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              100% Local &amp; Private
            </div>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'Night Shift' : 'Archive Control'} theme`}
              title={`Active: ${theme === 'light' ? 'Archive Control (Light)' : 'Night Shift (Dark)'} — Click to switch`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-muted hover:bg-surface-strong text-ink border border-ink/20 transition-colors cursor-pointer"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-cyan" />
                  <span className="hidden sm:inline">Night Shift</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-signal" />
                  <span className="hidden sm:inline">Archive Control</span>
                </>
              )}
            </button>

            {/* Reconciliation Rules Button */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-muted hover:bg-surface-strong text-ink border border-ink/20 transition-colors cursor-pointer"
              title="Reconciliation Rules & Normalization"
            >
              <Sliders className="w-3.5 h-3.5 text-signal" />
              <span>Rules</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Source Ingestion / File Uploader */}
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
            {/* Stats Dashboard / Control Deck */}
            <StatsOverview
              analysis={analysis}
              onSelectBrowserFilter={handleSelectBrowserMissing}
            />

            {/* Navigation Tabs with Signal Rails */}
            <div className="border-b border-ink/20 flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('matrix')}
                  className={`inline-flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-[3px] transition-colors flex-shrink-0 cursor-pointer ${
                    activeTab === 'matrix'
                      ? 'border-cyan text-ink font-bold'
                      : 'border-transparent text-ink-soft hover:text-ink'
                  }`}
                >
                  <TableProperties className="w-4 h-4" />
                  Gap Matrix &amp; Missing Links
                  <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-surface-muted text-ink font-mono">
                    {analysis.totalUniqueUrls}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('tree')}
                  className={`inline-flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-[3px] transition-colors flex-shrink-0 cursor-pointer ${
                    activeTab === 'tree'
                      ? 'border-cyan text-ink font-bold'
                      : 'border-transparent text-ink-soft hover:text-ink'
                  }`}
                >
                  <FolderTree className="w-4 h-4" />
                  Unified Folder Hierarchy
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('conflicts')}
                  className={`inline-flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-[3px] transition-colors flex-shrink-0 cursor-pointer ${
                    activeTab === 'conflicts'
                      ? 'border-cyan text-ink font-bold'
                      : 'border-transparent text-ink-soft hover:text-ink'
                  }`}
                >
                  <AlertCircle className="w-4 h-4" />
                  Folder Conflicts
                  {analysis.conflictingLocations.length > 0 && (
                    <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-amber/20 text-amber font-mono">
                      {analysis.conflictingLocations.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('export')}
                  className={`inline-flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-[3px] transition-colors flex-shrink-0 cursor-pointer ${
                    activeTab === 'export'
                      ? 'border-cyan text-ink font-bold'
                      : 'border-transparent text-ink-soft hover:text-ink'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  Export Unified Archive
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
          <div className="bg-surface border border-ink/20 rounded-lg p-12 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-lg bg-signal/15 text-signal flex items-center justify-center mx-auto">
              <Bookmark className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-ink font-display">
              No Bookmark Sources Loaded
            </h3>
            <p className="text-xs text-ink-soft max-w-md mx-auto">
              Drag and drop your exported bookmark HTML files above or load sample sources from Chrome, Edge, Firefox, and Vivaldi.
            </p>
            <button
              type="button"
              onClick={handleLoadDemo}
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-signal hover:bg-signal-hover text-white text-xs font-semibold shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-[6px_6px_0_0_var(--color-ink)] hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-[transform,box-shadow,background-color] cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Load Sample Sources
            </button>
          </div>
        )}
      </main>

      {/* Settings / Reconciliation Rules Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        options={options}
        onChangeOptions={setOptions}
      />

      {/* Footer */}
      <footer className="border-t border-ink/20 py-6 mt-12 bg-canvas">
        <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-faint">
          <p>
            Bookmark Unifier &amp; Gap Analyzer • Zero cloud dependencies, 100% private.
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
