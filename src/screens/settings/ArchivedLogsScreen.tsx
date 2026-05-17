// src/screens/settings/ArchivedLogsScreen.tsx
// Full-screen list of archived logs — restore or permanently delete.

import type { Log } from '../../types';
import { LogIcon } from '../../components/log-icon/LogIcon';
import { getTotalLogged } from '../../utils/stats';
import './ArchivedLogsScreen.css';

interface ArchivedLogsScreenProps {
  logs: Log[];
  onBack: () => void;
  onRestore: (logId: string) => void;
  onDelete: (logId: string) => Promise<void>;
}

export const ArchivedLogsScreen = ({ logs, onBack, onRestore, onDelete }: ArchivedLogsScreenProps) => {
  const handleDelete = (log: Log) => {
    if (!confirm(`Permanently delete "${log.name}"? This removes all entries and cannot be undone.`)) {
      return;
    }
    void onDelete(log.id);
  };

  return (
    <div className="archived-logs">
      <header className="archived-logs__header">
        <button type="button" className="archived-logs__back" onClick={onBack} aria-label="Back">
          <span className="material-symbols-rounded">arrow_back_ios</span>
        </button>
        <h1 className="archived-logs__title">Archived Logs</h1>
        <span className="archived-logs__header-spacer" aria-hidden />
      </header>

      <div className="archived-logs__body">
        {logs.length === 0 ? (
          <p className="archived-logs__empty">No archived logs.</p>
        ) : (
          <ul className="archived-logs__list">
            {logs.map((log) => {
              const total = getTotalLogged(log);
              return (
                <li key={log.id} className="archived-logs__row">
                  <div className="archived-logs__row-main">
                    <LogIcon symbol={log.icon} color={log.color} size="sm" />
                    <div className="archived-logs__meta">
                      <span className="archived-logs__name">{log.name}</span>
                      <span className="archived-logs__sub" style={{ color: log.color }}>
                        {total} {total === 1 ? 'entry' : 'entries'} logged
                      </span>
                    </div>
                  </div>
                  <div className="archived-logs__actions">
                    <button
                      type="button"
                      className="archived-logs__btn archived-logs__btn--restore"
                      onClick={() => onRestore(log.id)}
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      className="archived-logs__btn archived-logs__btn--delete"
                      onClick={() => handleDelete(log)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
