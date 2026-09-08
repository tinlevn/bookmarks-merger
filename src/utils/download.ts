import type { ParsedBookmarkFile, UnifiedBookmark } from '../core/types';
import { serializeCatchupHtml, serializeMatrixCsv } from '../core/serializer';

/**
 * Triggers a file download in the browser with safe asynchronous cleanup of the Object URL.
 * Avoids premature revocation bugs where synchronous URL.revokeObjectURL aborts downloads.
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Allow download stream initiation before revoking the blob URL
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1500);
}

/**
 * Reusable helper to generate and download a browser-specific Catch-up HTML file.
 */
export function exportCatchupBlob(
  fileId: string,
  files: ParsedBookmarkFile[],
  matrix: UnifiedBookmark[]
): void {
  const targetFile = files.find((f) => f.id === fileId);
  if (!targetFile) return;

  const missingBms = matrix.filter((b) => b.missingFileIds.includes(fileId));
  if (missingBms.length === 0) return;

  const html = serializeCatchupHtml(missingBms, targetFile.label);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const sanitizedName = targetFile.filename.replace(/\.[^/.]+$/, '');
  triggerBlobDownload(blob, `catchup-for-${sanitizedName}.html`);
}

/**
 * Reusable helper to generate and download the comparison matrix CSV file.
 */
export function exportCsvBlob(
  matrix: UnifiedBookmark[],
  files: ParsedBookmarkFile[]
): void {
  const headers = files.map((f) => ({ id: f.id, label: f.label }));
  const csv = serializeMatrixCsv(matrix, headers);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  triggerBlobDownload(blob, 'bookmark-gap-matrix.csv');
}

