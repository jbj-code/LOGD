// src/screens/logs/LogsScreen.tsx
// Home screen — lists all active logs with mini heat maps, streaks, and drag reorder.

import { useMemo } from 'react';
import type { Log } from '../../types';
import { HeatMap } from '../../components/heat-map/HeatMap';
import { LogIcon } from '../../components/log-icon/LogIcon';
import { formatCalendarMonthHeading } from '../../utils/heat-map';
import { useLogListReorder } from '../../hooks/use-log-list-reorder';
import { normalizeSchedule, scheduleIsNonDaily } from '../../utils/schedule';
import { getCurrentStreak } from '../../utils/stats';
import './LogsScreen.css';

interface LogsScreenProps {
  logs: Log[];
  onLogSelect: (logId: string) => void;
  onAddLog: () => void;
  onReorderLogs: (orderedIds: string[]) => void | Promise<void>;
}

export const LogsScreen = ({ logs, onLogSelect, onAddLog, onReorderLogs }: LogsScreenProps) => {
  const monthHeading = formatCalendarMonthHeading(new Date());
  const logIds = useMemo(() => logs.map((log) => log.id), [logs]);
  const logsById = useMemo(() => new Map(logs.map((log) => [log.id, log])), [logs]);

  const {
    reorderMode,
    draftIds,
    draggingId,
    finishReorder,
    handleCardPointerDown,
    handleCardPointerMove,
    handleCardPointerUp,
    handleCardTouchStart,
    handleCardTouchMove,
    handleCardTouchEnd,
    handleCardContextMenu,
    handleCardClick,
  } = useLogListReorder({
    logIds,
    onCommit: (orderedIds) => void onReorderLogs(orderedIds),
  });

  const displayIds = reorderMode ? draftIds : logIds;

  return (
    <div className={`screen-page logs-screen ${reorderMode ? 'logs-screen--reorder' : ''}`}>
      <header className="screen-page__header logs-screen__header">
        <h1 className="logs-screen__title">Your Logs</h1>
        {reorderMode ? (
          <button type="button" className="logs-screen__done" onClick={finishReorder}>
            Done
          </button>
        ) : (
          <span className="logs-screen__month">{monthHeading}</span>
        )}
      </header>

      <div className="screen-page__scroll">
        {logs.length === 0 ? (
          <EmptyState onAdd={onAddLog} />
        ) : (
          <div className={`logs-screen__list ${reorderMode ? 'logs-screen__list--reorder' : ''}`}>
            {displayIds.map((id, index) => {
              const log = logsById.get(id);
              if (!log) return null;
              return (
                <LogCard
                  key={log.id}
                  log={log}
                  index={index}
                  reorderMode={reorderMode}
                  dragging={draggingId === log.id}
                  onPointerDown={(event) => handleCardPointerDown(event, log.id, index)}
                  onPointerMove={handleCardPointerMove}
                  onPointerUp={handleCardPointerUp}
                  onTouchStart={(event) => handleCardTouchStart(event, log.id, index)}
                  onTouchMove={handleCardTouchMove}
                  onTouchEnd={handleCardTouchEnd}
                  onContextMenu={handleCardContextMenu}
                  onClick={(event) => handleCardClick(event, () => onLogSelect(log.id))}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

interface LogCardProps {
  log: Log;
  index: number;
  reorderMode: boolean;
  dragging: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onTouchStart: (event: React.TouchEvent<HTMLButtonElement>) => void;
  onTouchMove: (event: React.TouchEvent<HTMLButtonElement>) => void;
  onTouchEnd: (event: React.TouchEvent<HTMLButtonElement>) => void;
  onContextMenu: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const LogCard = ({
  log,
  index,
  reorderMode,
  dragging,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onContextMenu,
  onClick,
}: LogCardProps) => {
  const streak = getCurrentStreak(log);
  const nonDaily = scheduleIsNonDaily(normalizeSchedule(log.schedule));
  const streakUnit = nonDaily ? 'check-in streak' : 'day streak';

  return (
    <button
      type="button"
      className={[
        'log-card',
        reorderMode ? 'log-card--reorder' : '',
        dragging ? 'log-card--dragging' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-reorder-index={index}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onContextMenu={onContextMenu}
      aria-label={
        reorderMode
          ? `Reorder ${log.name}`
          : `Open ${log.name}, ${streak} ${streakUnit}`
      }
    >
      <div className="log-card__header">
        <LogIcon symbol={log.icon} color={log.color} size="sm" className="log-card__icon" />
        <span className="log-card__name">{log.name}</span>
        <span
          className={['log-card__streak', streak > 0 ? 'log-card__streak--active' : ''].filter(Boolean).join(' ')}
          style={{
            ...(streak > 0 ? { color: log.color } : undefined),
            ['--streak-ch' as string]: streak >= 100 ? 3 : 2,
          }}
          aria-hidden
        >
          {streak}
        </span>
      </div>

      <div className="log-card__heatmap">
        <HeatMap
          entries={log.entries}
          color={log.color}
          variant="card"
          schedule={log.schedule}
          scheduleCreatedAt={log.createdAt}
        />
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
