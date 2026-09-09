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
        className={`relative group cursor-pointer border-2 border-dashed rounded-2xl p-6 md:p-8 text-center transition-all duration-200 ${
          isDragging
            ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/60'
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
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform duration-200">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div>
            <p className="text-base font-medium text-slate-200">
              Drag & drop bookmark export files here, or <span className="text-indigo-400 hover:underline">browse</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors"
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
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Loaded Files ({files.length})
              </h3>
              <span className="text-xs text-slate-500">
                • Click names to edit labels
              </span>
            </div>

            <button
              type="button"
              onClick={onClearAll}
              className="text-xs text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1"
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
                  className="relative group bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <BrowserBadge browser={file.browser} />
                      <button
                        type="button"
                        onClick={() => onRemoveFile(file.id)}
                        title="Remove file"
                        className="text-slate-500 hover:text-rose-400 p-1 rounded-md hover:bg-rose-500/10 transition-colors"
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
                          className="w-full text-xs px-2 py-1 bg-slate-950 border border-indigo-500/50 rounded text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => saveEditing(file.id)}
                          className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => startEditing(file)}
                        className="cursor-pointer group/title flex items-center justify-between"
                      >
                        <p className="text-sm font-medium text-slate-200 truncate" title={file.label}>
                          {file.label}
                        </p>
                        <Edit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover/title:opacity-100 transition-opacity ml-1 flex-shrink-0" />
                      </div>
                    )}

                    <p className="text-xs text-slate-500 truncate" title={file.filename}>
                      {file.filename}
                    </p>
                  </div>

                  <div className="pt-3 mt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span>{file.allBookmarks.length} bookmarks</span>
                    <span className="text-slate-500 font-mono">
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
