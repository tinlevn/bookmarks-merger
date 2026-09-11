import React from 'react';
import type { BrowserType } from '../core/types';
import { BROWSER_THEMES } from '../core/constants';
import { useTheme } from '../hooks/useTheme';

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
  const { theme } = useTheme();
  const isNight = theme === 'night';
  const theme_ = BROWSER_THEMES[browser] || BROWSER_THEMES.other;
  const displayText = label || theme_.name;

  // In Night Shift, blue/cool hues at 15% alpha disappear on near-black.
  // Raise the alpha tiers so all browser colors stay legible.
  const bgAlpha = isNight ? '28' : '15';   // hex: ~16% vs ~9%
  const borderAlpha = isNight ? '60' : '40'; // hex: ~38% vs ~25%

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${sizeClasses[size]}`}
      style={{
        color: theme_.accent,
        borderColor: `${theme_.accent}${borderAlpha}`,
        backgroundColor: `${theme_.accent}${bgAlpha}`,
      }}
      title={displayText}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: theme_.accent }}
      />
      {showLabel && <span className="truncate max-w-[140px]">{displayText}</span>}
    </span>
  );
};
