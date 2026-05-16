// src/screens/quick-log/QuickLogModal.tsx
// Quick sheet: list logs with a one-tap control for toggling today.

import type { Log } from '../../types';
import { Modal } from '../../components/modal/Modal';
import { LogIcon } from '../../components/log-icon/LogIcon';
import { today } from '../../utils/date';
import './QuickLogModal.css';

interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: Log[];
  onToggleToday: (logId: string) => void;
}

export const QuickLogModal = ({
  isOpen,
  onClose,
  logs,
  onToggleToday,
}: QuickLogModalProps) => {
  const todayStr = today();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log today" sheetClassName="modal-sheet--stacked">
      <div className="quick-log quick-log--stacked">
        <div className="quick-log__scroll">
          {logs.length === 0 ? (
            <p className="quick-log__empty">Create a log type first, then you can mark days here.</p>
          ) : (
            <ul className="quick-log__list">
              {logs.map((log) => {
                const done = !!log.entries[todayStr];
                return (
                  <li key={log.id} className="quick-log__row">
                    <div className="quick-log__icon-slot">
                      <LogIcon symbol={log.icon} color={log.color} size="sm" />
                    </div>
                    <span className="quick-log__name">{log.name}</span>
                    <button
                      type="button"
                      className={`quick-log__btn ${done ? 'quick-log__btn--done' : ''}`}
                      style={
                        done
                          ? { backgroundColor: log.color, color: 'var(--color-text-on-accent-fill)' }
                          : undefined
                      }
                      onClick={() => onToggleToday(log.id)}
                      aria-label={done ? `Unlog ${log.name} today` : `Log ${log.name} today`}
                      aria-pressed={done}
                    >
                      <span key={done ? `done-${log.id}` : `open-${log.id}`} className="log-action-toggle-icon">
                        <span className="material-symbols-rounded">{done ? 'check' : 'add'}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
};
