// src/screens/logs/LogsScreen.tsx
// Home screen — lists all active logs with mini heat maps and streaks.

import type { Log } from '../../types';
import { HeatMap } from '../../components/heat-map/HeatMap';
import { LogIcon } from '../../components/log-icon/LogIcon';
import { formatCalendarMonthHeading } from '../../utils/heat-map';
import { getCurrentStreak, getTotalLogged } from '../../utils/stats';
import './LogsScreen.css';

interface LogsScreenProps {
  logs: Log[];
  onLogSelect: (logId: string) => void;
  onAddLog: () => void;
}

export const LogsScreen = ({ logs, onLogSelect, onAddLog }: LogsScreenProps) => {
  const monthHeading = formatCalendarMonthHeading(new Date());

  return (
    <div className="screen-page logs-screen">
      <header className="screen-page__header logs-screen__header">
        <h1 className="logs-screen__title">Your Logs</h1>
        <span className="logs-screen__month">{monthHeading}</span>
      </header>

      <div className="screen-page__scroll">
        {logs.length === 0 ? (
          <EmptyState onAdd={onAddLog} />
        ) : (
          <div className="logs-screen__list">
            {logs.map((log) => (
              <LogCard key={log.id} log={log} onClick={() => onLogSelect(log.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface LogCardProps {
  log: Log;
  onClick: () => void;
}

const LogCard = ({ log, onClick }: LogCardProps) => {
  const streak = getCurrentStreak(log);
  const total = getTotalLogged(log);

  return (
    <button type="button" className="log-card" onClick={onClick} aria-label={`Open ${log.name}`}>
      <div className="log-card__header">
        <div className="log-card__info">
          <LogIcon symbol={log.icon} color={log.color} size="sm" />
          <div className="log-card__meta">
            <span className="log-card__name">{log.name}</span>
          </div>
        </div>

        <span className="log-card__chevron" aria-hidden>
          <span className="material-symbols-rounded">chevron_right</span>
        </span>
      </div>

      <span className="log-card__subline" style={{ color: log.color }}>
        {streak > 0 ? `${streak} day streak` : total > 0 ? `${total} total` : 'Start today'}
      </span>

      <div className="log-card__heatmap">
        <HeatMap entries={log.entries} color={log.color} variant="card" />
      </div>
    </button>
  );
};

const EmptyState = ({ onAdd }: { onAdd: () => void }) => (
  <div className="logs-empty">
    <div className="logs-empty__icon">
      <span className="material-symbols-rounded">format_list_bulleted_add</span>
    </div>
    <h2 className="logs-empty__title">No logs yet</h2>
    <p className="logs-empty__body">Add your first log and start building a streak.</p>
    <button type="button" className="logs-empty__btn" onClick={onAdd}>
      <span className="material-symbols-rounded">add</span>
      Add your first log
    </button>
  </div>
);
