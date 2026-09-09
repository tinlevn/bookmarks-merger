import React, { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  FileCode,
  FileSpreadsheet,
  FileJson,
  Sparkles,
} from 'lucide-react';
import type { GapAnalysisResult, MergedFolderNode } from '../core/types';
import { serializeNetscapeHtml } from '../core/serializer';
import { BrowserBadge } from './BrowserBadge';
import { getDynamicGridCols } from '../core/constants';
import {
  triggerBlobDownload,
  exportCatchupBlob,
  exportCsvBlob,
} from '../utils/download';

interface ExportPanelProps {
  analysis: GapAnalysisResult;
  mergedTree: MergedFolderNode[];
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ analysis, mergedTree }) => {
  const { files, matrix, totalUniqueUrls } = analysis;
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const mergedHtml = React.useMemo(() => {
    return serializeNetscapeHtml(mergedTree);
  }, [mergedTree]);

  const downloadUnifiedHtml = () => {
    const blob = new Blob([mergedHtml], { type: 'text/html;charset=utf-8' });
    triggerBlobDownload(blob, 'bookmarks_unified.html');
  };

  const copyHtmlToClipboard = () => {
    navigator.clipboard.writeText(mergedHtml);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  const downloadCatchupFile = (fileId: string) => {
    exportCatchupBlob(fileId, files, matrix);
  };

  const downloadCsv = () => {
    exportCsvBlob(matrix, files);
  };

  const downloadJson = () => {
    const data = {
      generatedAt: new Date().toISOString(),
      totalUniqueUrls,
      files: files.map((f) => ({
        id: f.id,
        label: f.label,
        browser: f.browser,
        filename: f.filename,
        uniqueBookmarks: f.uniqueUrlCount,
      })),
      matrix: matrix.map((b) => ({
        url: b.canonicalUrl,
        title: b.title,
        unifiedFolder: b.unifiedFolderPath,
        presentIn: b.sourceFileIds.map(
          (id) => files.find((f) => f.id === id)?.label
        ),
        missingIn: b.missingFileIds.map(
          (id) => files.find((f) => f.id === id)?.label
        ),
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    triggerBlobDownload(blob, 'bookmark-analysis-report.json');
  };

  return (
    <div className="space-y-6">
      {/* Primary Download Banner */}
      <div className="relative overflow-hidden bg-signal/10 border-2 border-signal/30 rounded-lg p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-lg">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-signal/15 border border-signal/30 text-signal text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            ARCHIVE READY
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-ink tracking-tight">
            Download Unified Archive ({totalUniqueUrls} Unique Links)
          </h2>
          <p className="text-xs md:text-sm text-ink-soft">
            Compliant Netscape Bookmark HTML file preserving folder hierarchies,
            timestamps, and favicons. Ready to import directly into Chrome, Edge,
            Firefox, Vivaldi, Opera, or Safari.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={downloadUnifiedHtml}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded bg-signal hover:bg-signal-hover text-white font-semibold text-sm shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-[6px_6px_0_0_var(--color-ink)] hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-[transform,box-shadow,background-color] cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download Archive
          </button>

          <button
            type="button"
            onClick={copyHtmlToClipboard}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded bg-surface-muted hover:bg-surface-strong text-ink font-medium text-sm border border-ink/20 transition-colors cursor-pointer"
          >
            {copiedHtml ? (
              <>
                <Check className="w-4 h-4 text-acid-strong" />
                Copied HTML!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-ink-soft" />
                Copy HTML
              </>
            )}
          </button>
        </div>
      </div>

      {/* Per-Browser Catch-up Exports */}
      <div className="bg-surface border border-ink/20 rounded-lg p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">
            Per-Browser Catch-Up Exports
          </h3>
          <p className="text-xs text-ink-soft mt-1">
            Want to sync your browsers without replacing everything? Download a dedicated file containing
            <strong> only the bookmarks that browser is missing</strong>, and import it into that browser.
          </p>
        </div>

        <div className={`grid gap-3 ${getDynamicGridCols(files.length)}`}>
          {files.map((file) => {
            const stats = analysis.perFileStats[file.id];
            const missingCount = stats ? stats.missingCount : 0;

            return (
              <div
                key={file.id}
                className="bg-surface-muted border border-ink/20 rounded-lg p-4 flex flex-col justify-between space-y-3"
              >
                <div>
                  <BrowserBadge browser={file.browser} label={file.label} />
                  <p className="text-xs text-ink-soft mt-2">
                    Missing <strong className="text-amber">{missingCount}</strong> links compared to others
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => downloadCatchupFile(file.id)}
                  disabled={missingCount === 0}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-surface-muted hover:bg-surface-strong disabled:opacity-40 disabled:cursor-not-allowed text-ink transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-signal" />
                  Catch-up for {file.label}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Additional Export Formats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-surface border border-ink/20 rounded-lg p-5 flex items-center justify-between">
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-ink flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-acid-strong" />
              Spreadsheet CSV Matrix
            </h4>
            <p className="text-xs text-ink-soft">
              Export the full presence matrix for Excel or Google Sheets.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadCsv}
            className="px-3.5 py-2 text-xs font-medium rounded-lg bg-surface-muted hover:bg-surface-strong text-ink border border-ink/20 transition-colors cursor-pointer"
          >
            Download CSV
          </button>
        </div>

        <div className="bg-surface border border-ink/20 rounded-lg p-5 flex items-center justify-between">
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-ink flex items-center gap-2">
              <FileJson className="w-4 h-4 text-cyan" />
              Machine-readable JSON
            </h4>
            <p className="text-xs text-ink-soft">
              Full structured metadata and gap analysis report.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadJson}
            className="px-3.5 py-2 text-xs font-medium rounded-lg bg-surface-muted hover:bg-surface-strong text-ink border border-ink/20 transition-colors cursor-pointer"
          >
            Download JSON
          </button>
        </div>
      </div>

      {/* Raw HTML Code Viewer */}
      <div className="bg-surface border border-ink/20 rounded-lg p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-signal" />
            <h3 className="text-sm font-semibold text-ink">
              Netscape Bookmark HTML Preview
            </h3>
          </div>

          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs text-signal hover:underline cursor-pointer"
          >
            {showPreview ? 'Hide Raw Code' : 'View Raw Code'}
          </button>
        </div>

        {showPreview && (
          <div className="relative">
            <pre className="p-4 bg-surface-muted rounded-lg font-mono text-[11px] text-ink-soft overflow-x-auto max-h-96 border border-ink/20">
              {mergedHtml}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
