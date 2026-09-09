import React from 'react';
import type { BrowserType } from '../core/types';
import { BROWSER_THEMES } from '../core/constants';

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
  const theme = BROWSER_THEMES[browser] || BROWSER_THEMES.other;
  const displayText = label || theme.name;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${sizeClasses[size]}`}
      style={{
        color: theme.accent,
        borderColor: `${theme.accent}40`,
        backgroundColor: `${theme.accent}15`,
      }}
      title={displayText}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: theme.accent }}
      />
      {showLabel && <span className="truncate max-w-[140px]">{displayText}</span>}
    </span>
  );
};
