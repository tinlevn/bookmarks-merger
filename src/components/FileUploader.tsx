import React, { useRef, useState } from 'react';
import { UploadCloud, Trash2, Sparkles, Edit2, Check } from 'lucide-react';
import type { ParsedBookmarkFile } from '../core/types';
import { BrowserBadge } from './BrowserBadge';
import { getDynamicGridCols } from '../core/constants';

interface FileUploaderProps {
  files: ParsedBookmarkFile[];
  onAddFiles: (newFiles: { content: string; filename: string }[]) => void;
  onRemoveFile: (fileId: string) => void;
  onUpdateLabel: (fileId: string, newLabel: string) => void;
  onLoadDemo: () => void;
  onClearAll: () => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  files,
  onAddFiles,
  onRemoveFile,
  onUpdateLabel,
  onLoadDemo,
  onClearAll,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const readPromises: Promise<{ content: string; filename: string }>[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      readPromises.push(
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve({
              content: event.target?.result as string,
              filename: file.name,
            });
          };
          reader.onerror = reject;
          reader.readAsText(file);
        })
      );
    }

    try {
      const results = await Promise.all(readPromises);
      onAddFiles(results);
    } catch (err) {
      console.error('Failed to read uploaded files:', err);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    await processFiles(e.dataTransfer.files);
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await processFiles(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startEditing = (file: ParsedBookmarkFile) => {
    setEditingId(file.id);
    setEditValue(file.label);
  };

  const saveEditing = (fileId: string) => {
    if (editValue.trim()) {
      onUpdateLabel(fileId, editValue.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative group cursor-pointer border-2 border-dashed rounded-lg p-6 md:p-8 text-center transition-colors duration-200 ${
          isDragging
            ? 'border-cyan bg-cyan-soft scale-[1.01]'
            : 'border-ink/25 hover:border-ink/40 bg-surface hover:bg-surface'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".html,.htm,.json"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-lg bg-signal/15 border border-signal/30 flex items-center justify-center text-signal group-hover:scale-110 transition-transform duration-200">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div>
            <p className="text-base font-medium text-ink">
              Drag & drop bookmark export files here, or <span className="text-signal hover:underline">browse</span>
            </p>
            <p className="text-xs text-ink-soft mt-1">
              Supports 2 to 4+ files from Chrome, Edge, Firefox, Vivaldi, Opera (.html or Chromium JSON)
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLoadDemo();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-acid/15 text-acid-strong border border-acid/30 hover:bg-acid/25 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Load 4-Browser Demo (Chrome, Edge, Firefox, Vivaldi)
            </button>
          </div>
        </div>
      </div>

      {/* Uploaded Files Grid */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Source Rack ({files.length})
              </h3>
              <span className="text-xs text-ink-faint">
                • Click names to edit labels
              </span>
            </div>

            <button
              type="button"
              onClick={onClearAll}
              className="text-xs text-error hover:text-error hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear all
            </button>
          </div>

          <div className={`grid gap-3 ${getDynamicGridCols(files.length)}`}>
            {files.map((file) => {
              const isEditing = editingId === file.id;

              return (
                <div
                  key={file.id}
                  className="relative group bg-surface border border-ink/20 rounded-lg p-3.5 flex flex-col justify-between hover:border-ink/30 transition-colors shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <BrowserBadge browser={file.browser} />
                      <button
                        type="button"
                        onClick={() => onRemoveFile(file.id)}
                        aria-label="Remove file"
                        title="Remove file"
                        className="text-ink-faint hover:text-error p-1 rounded-md hover:bg-error/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-1.5 pt-1">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditing(file.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          autoFocus
                          className="w-full text-xs px-2 py-1 bg-surface-muted border border-ink/25 rounded text-ink focus:outline-none focus:ring-1 focus:ring-cyan"
                        />
                        <button
                          type="button"
                          onClick={() => saveEditing(file.id)}
                          aria-label="Save label"
                          className="p-1 text-acid-strong hover:bg-acid/10 rounded"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => startEditing(file)}
                        className="cursor-pointer group/title flex items-center justify-between"
                      >
                        <p className="text-sm font-medium text-ink truncate" title={file.label}>
                          {file.label}
                        </p>
                        <Edit2 className="w-3 h-3 text-ink-faint opacity-0 group-hover/title:opacity-100 transition-opacity ml-1 flex-shrink-0" />
                      </div>
                    )}

                    <p className="text-xs text-ink-faint truncate" title={file.filename}>
                      {file.filename}
                    </p>
                  </div>

                  <div className="pt-3 mt-2 border-t border-ink/20 flex items-center justify-between text-xs text-ink-soft">
                    <span>{file.allBookmarks.length} bookmarks</span>
                    <span className="text-ink-faint font-mono">
                      {file.uniqueUrlCount} unique
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
