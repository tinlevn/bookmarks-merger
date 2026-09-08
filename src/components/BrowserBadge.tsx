import React from 'react';
import type { BrowserType } from '../core/types';

interface BrowserBadgeProps {
  browser: BrowserType;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const BrowserBadge: React.FC<BrowserBadgeProps> = ({
  browser,
  label,
  size = 'md',
  showLabel = true,
}) => {
  const getBrowserDetails = () => {
    switch (browser) {
      case 'chrome':
        return {
          name: 'Chrome',
          bg: 'bg-amber-500/15',
          text: 'text-amber-400',
          border: 'border-amber-500/30',
          dot: 'bg-amber-400',
        };
      case 'edge':
        return {
          name: 'Edge',
          bg: 'bg-cyan-500/15',
          text: 'text-cyan-400',
          border: 'border-cyan-500/30',
          dot: 'bg-cyan-400',
        };
      case 'firefox':
        return {
          name: 'Firefox',
          bg: 'bg-orange-500/15',
          text: 'text-orange-400',
          border: 'border-orange-500/30',
          dot: 'bg-orange-400',
        };
      case 'vivaldi':
        return {
          name: 'Vivaldi',
          bg: 'bg-rose-500/15',
          text: 'text-rose-400',
          border: 'border-rose-500/30',
          dot: 'bg-rose-400',
        };
      case 'opera':
        return {
          name: 'Opera',
          bg: 'bg-red-500/15',
          text: 'text-red-400',
          border: 'border-red-500/30',
          dot: 'bg-red-400',
        };
      case 'safari':
        return {
          name: 'Safari',
          bg: 'bg-blue-500/15',
          text: 'text-blue-400',
          border: 'border-blue-500/30',
          dot: 'bg-blue-400',
        };
      default:
        return {
          name: 'Other',
          bg: 'bg-indigo-500/15',
          text: 'text-indigo-400',
          border: 'border-indigo-500/30',
          dot: 'bg-indigo-400',
        };
    }
  };

  const details = getBrowserDetails();
  const displayText = label || details.name;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${details.bg} ${details.text} ${details.border} ${sizeClasses[size]}`}
      title={displayText}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${details.dot}`} />
      {showLabel && <span className="truncate max-w-[140px]">{displayText}</span>}
    </span>
  );
};
