// src/components/bottom-nav/BottomNav.tsx
// Fixed bottom tab bar (centered within app shell width).

import type { Tab } from '../../types';
import './BottomNav.css';

const NAV_ITEMS: { tab: Tab; icon: string; label: string }[] = [
  { tab: 'logs',     icon: 'format_list_bulleted', label: 'Logs'     },
  { tab: 'stats',    icon: 'bar_chart',            label: 'Stats'    },
  { tab: 'calendar', icon: 'calendar_month',       label: 'Calendar' },
  { tab: 'settings', icon: 'settings', label: 'Settings' },
];

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => (
  <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
    <div className="bottom-nav__items">
      {NAV_ITEMS.map(({ tab, icon, label }) => (
        <button
          key={tab}
          type="button"
          className={`bottom-nav__item ${activeTab === tab ? 'bottom-nav__item--active' : ''}`}
          onClick={() => onTabChange(tab)}
          aria-label={label}
          aria-current={activeTab === tab ? 'page' : undefined}
        >
          <span className="material-symbols-rounded bottom-nav__icon">{icon}</span>
          <span className="bottom-nav__label">{label}</span>
        </button>
      ))}
    </div>
  </nav>
);
