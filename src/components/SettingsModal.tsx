import React, { useEffect } from 'react';
import { X, Sliders, Check } from 'lucide-react';
import type { MergeOptions } from '../core/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: MergeOptions;
  onChangeOptions: (newOptions: MergeOptions) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  options,
  onChangeOptions,
}) => {
  // Listen for Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleNormalize = (key: keyof MergeOptions['normalize']) => {
    onChangeOptions({
      ...options,
      normalize: {
        ...options.normalize,
        [key]: !options.normalize[key],
      },
    });
  };

  const toggleOption = (key: 'unifyToolbars' | 'preferNonEmptyTitle' | 'preferHttps') => {
    onChangeOptions({
      ...options,
      [key]: !options[key],
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-5 p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h3 id="settings-modal-title" className="text-base font-semibold text-slate-100">
              Merge & Normalization Settings
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options List */}
        <div className="space-y-4 text-xs">
          {/* Unify Toolbars */}
          <div
            role="button"
            tabIndex={0}
            aria-pressed={options.unifyToolbars}
            onClick={() => toggleOption('unifyToolbars')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleOption('unifyToolbars');
              }
            }}
            className="flex items-start justify-between gap-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
          >
            <div>
              <p className="font-semibold text-slate-200">
                Unify Browser Toolbar Roots
              </p>
              <p className="text-slate-400 mt-0.5">
                Merge "Bookmarks bar" (Chrome), "Favorites bar" (Edge), and "Bookmarks Toolbar" (Firefox) into a single unified Bookmarks Bar.
              </p>
            </div>
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors flex-shrink-0 mt-0.5 ${
                options.unifyToolbars
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'border-slate-700 bg-slate-900'
              }`}
            >
              {options.unifyToolbars && <Check className="w-3.5 h-3.5" />}
            </div>
          </div>

          {/* Strip Tracking Query Params */}
          <div
            role="button"
            tabIndex={0}
            aria-pressed={options.normalize.stripTrackingParams}
            onClick={() => toggleNormalize('stripTrackingParams')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleNormalize('stripTrackingParams');
              }
            }}
            className="flex items-start justify-between gap-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
          >
            <div>
              <p className="font-semibold text-slate-200">
                Strip Marketing & Tracking Parameters
              </p>
              <p className="text-slate-400 mt-0.5">
                Removes tracking noise like <code className="text-indigo-300 font-mono">utm_*</code>,{' '}
                <code className="text-indigo-300 font-mono">fbclid</code>, and{' '}
                <code className="text-indigo-300 font-mono">ref</code> to detect real duplicates and output clean URLs.
              </p>
            </div>
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors flex-shrink-0 mt-0.5 ${
                options.normalize.stripTrackingParams
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'border-slate-700 bg-slate-900'
              }`}
            >
              {options.normalize.stripTrackingParams && <Check className="w-3.5 h-3.5" />}
            </div>
          </div>

          {/* Trim Trailing Slashes */}
          <div
            role="button"
            tabIndex={0}
            aria-pressed={options.normalize.trimTrailingSlash}
            onClick={() => toggleNormalize('trimTrailingSlash')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleNormalize('trimTrailingSlash');
              }
            }}
            className="flex items-start justify-between gap-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
          >
            <div>
              <p className="font-semibold text-slate-200">
                Normalize Trailing Slashes
              </p>
              <p className="text-slate-400 mt-0.5">
                Treats <code className="text-indigo-300 font-mono">site.com/</code> and{' '}
                <code className="text-indigo-300 font-mono">site.com</code> as the same link.
              </p>
            </div>
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors flex-shrink-0 mt-0.5 ${
                options.normalize.trimTrailingSlash
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'border-slate-700 bg-slate-900'
              }`}
            >
              {options.normalize.trimTrailingSlash && <Check className="w-3.5 h-3.5" />}
            </div>
          </div>

          {/* Prefer Informative Title */}
          <div
            role="button"
            tabIndex={0}
            aria-pressed={options.preferNonEmptyTitle}
            onClick={() => toggleOption('preferNonEmptyTitle')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleOption('preferNonEmptyTitle');
              }
            }}
            className="flex items-start justify-between gap-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
          >
            <div>
              <p className="font-semibold text-slate-200">
                Prefer Descriptive Page Titles
              </p>
              <p className="text-slate-400 mt-0.5">
                If one browser stored "GitHub" and another stored the full page title, picks the most informative title.
              </p>
            </div>
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors flex-shrink-0 mt-0.5 ${
                options.preferNonEmptyTitle
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'border-slate-700 bg-slate-900'
              }`}
            >
              {options.preferNonEmptyTitle && <Check className="w-3.5 h-3.5" />}
            </div>
          </div>

          {/* Prefer HTTPS */}
          <div
            role="button"
            tabIndex={0}
            aria-pressed={options.preferHttps}
            onClick={() => toggleOption('preferHttps')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleOption('preferHttps');
              }
            }}
            className="flex items-start justify-between gap-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
          >
            <div>
              <p className="font-semibold text-slate-200">
                Prefer HTTPS Upgrades
              </p>
              <p className="text-slate-400 mt-0.5">
                If any browser has an <code className="text-indigo-300 font-mono">https://</code> version of a link, use HTTPS for the unified output.
              </p>
            </div>
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors flex-shrink-0 mt-0.5 ${
                options.preferHttps
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'border-slate-700 bg-slate-900'
              }`}
            >
              {options.preferHttps && <Check className="w-3.5 h-3.5" />}
            </div>
          </div>

          {/* Ignore Protocol differences */}
          <div
            role="button"
            tabIndex={0}
            aria-pressed={options.normalize.ignoreProtocol}
            onClick={() => toggleNormalize('ignoreProtocol')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleNormalize('ignoreProtocol');
              }
            }}
            className="flex items-start justify-between gap-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
          >
            <div>
              <p className="font-semibold text-slate-200">
                Loose Protocol Matching (HTTP = HTTPS)
              </p>
              <p className="text-slate-400 mt-0.5">
                Treats http:// and https:// versions of the same domain/path as duplicates.
              </p>
            </div>
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors flex-shrink-0 mt-0.5 ${
                options.normalize.ignoreProtocol
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'border-slate-700 bg-slate-900'
              }`}
            >
              {options.normalize.ignoreProtocol && <Check className="w-3.5 h-3.5" />}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
