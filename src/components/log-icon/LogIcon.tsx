// src/components/log-icon/LogIcon.tsx
// Shared log symbol tile: solid accent background + on-accent glyph (same treatment app-wide).

import './LogIcon.css';

export type LogIconSize = 'sm' | 'md' | 'lg' | 'grid';

interface LogIconProps {
  symbol: string;
  color: string;
  /** Layout preset — dimensions live in LogIcon.css / tokens. */
  size?: LogIconSize;
  className?: string;
  /** Edit affordance on create-flow preview only. */
  showEditBadge?: boolean;
}

export const LogIcon = ({
  symbol,
  color,
  size = 'md',
  className,
  showEditBadge,
}: LogIconProps) => {
  const cls = ['log-icon', `log-icon--${size}`, showEditBadge ? 'log-icon--editable' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls} style={{ backgroundColor: color }} aria-hidden>
      <span className="material-symbols-rounded">{symbol}</span>
    </div>
  );
};
