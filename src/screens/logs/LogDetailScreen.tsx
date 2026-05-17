// src/screens/logs/LogDetailScreen.tsx
// Detailed view of a single log — full heat map + stats; log today via header action.

import { useEffect, useMemo, useState } from 'react';
import type { Log } from '../../types';
import { HeatMap } from '../../components/heat-map/HeatMap';
import { LogIcon } from '../../components/log-icon/LogIcon';
import { getCurrentStreak, getLongestStreak, getTotalLogged, getConsistency } from '../../utils/stats';
import { today } from '../../utils/date';
import './LogDetailScreen.css';

function heatMapYearOptions(log: Log): number[] {
  const years = new Set<number>();
  const created = new Date(log.createdAt);
  if (!Number.isNaN(created.getTime())) {
    years.add(created.getFullYear());
  }
  for (const key of Object.keys(log.entries)) {
    const y = Number.parseInt(key.slice(0, 4), 10);
    if (!Number.isNaN(y)) years.add(y);
  }
  years.add(new Date().getFullYear());
  return Array.from(years).sort((a, b) => b - a);
}

interface LogDetailScreenProps {
  log: Log;
  onBack: () => void;
  onToggleEntry: (logId: string, date: string) => void;
  onDelete: (logId: string) => Promise<void>;
  onArchive: (logId: string) => Promise<void>;
  onSaveNotes: (logId: string, notes: string) => void;
}

export const LogDetailScreen = ({
  log,
  onBack,
  onToggleEntry,
  onDelete,
  onArchive,
  onSaveNotes,
}: LogDetailScreenProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const [draftNotes, setDraftNotes] = useState(() => log.notes ?? '');
  const todayStr = today();
  const yearOptions = useMemo(() => heatMapYearOptions(log), [log]);
  const currentCalendarYear = new Date().getFullYear();
  const [heatmapYear, setHeatmapYear] = useState(() =>
    yearOptions.includes(currentCalendarYear) ? currentCalendarYear : (yearOptions[0] ?? currentCalendarYear),
  );

  useEffect(() => {
    queueMicrotask(() => setDraftNotes(log.notes ?? ''));
  }, [log.id, log.notes]);

  const streak = getCurrentStreak(log);
  const longest = getLongestStreak(log);
  const total = getTotalLogged(log);
  const consistency = getConsistency(log);
  const loggedToday = !!log.entries[todayStr];

  const handleToggleToday = () => {
    onToggleEntry(log.id, todayStr);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${log.name}"? This cannot be undone.`)) {
      setShowMenu(false);
      return;
    }
    await onDelete(log.id);
    setShowMenu(false);
    onBack();
  };

  const handleArchive = async () => {
    await onArchive(log.id);
    setShowMenu(false);
    onBack();
  };

  return (
    <div className={`log-detail ${showMenu ? 'log-detail--menu-open' : ''}`}>
      <div className="log-detail__header">
        <button type="button" className="log-detail__back" onClick={onBack} aria-label="Back">
          <span className="material-symbols-rounded">arrow_back_ios</span>
        </button>
        <span className="log-detail__header-title">Log Detail</span>
        <div className="log-detail__menu-wrap">
          <button
            type="button"
            className="log-detail__more"
            onClick={() => setShowMenu((v) => !v)}
            aria-label="More options"
          >
            <span className="material-symbols-rounded">more_vert</span>
          </button>
          {showMenu && (
            <div className="log-detail__dropdown" role="menu">
              <button type="button" role="menuitem" onClick={handleArchive}>
                <span className="material-symbols-rounded">inventory_2</span>
                Archive
              </button>
              <button type="button" role="menuitem" className="log-detail__dropdown-danger" onClick={handleDelete}>
                <span className="material-symbols-rounded">delete</span>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="log-detail__body">
        <div className="log-detail__identity">
          <LogIcon symbol={log.icon} color={log.color} size="md" />
          <div className="log-detail__identity-text">
            <h1 className="log-detail__name">{log.name}</h1>
            <p className="log-detail__streak-label" style={{ color: log.color }}>
              {streak > 0 ? `${streak} day streak` : 'No current streak'}
            </p>
          </div>
          <button
            type="button"
            className={`log-detail__log-today ${loggedToday ? 'log-detail__log-today--done' : ''}`}
            onClick={handleToggleToday}
            aria-label={loggedToday ? 'Unlog today' : 'Log today'}
            aria-pressed={loggedToday}
            style={
              loggedToday
                ? {
                    backgroundColor: log.color,
                    borderColor: log.color,
                    color: 'var(--color-text-on-accent-fill)',
                  }
                : { borderColor: log.color, color: log.color }
            }
          >
            <span key={loggedToday ? 'logged' : 'open'} className="log-action-toggle-icon">
              <span className="material-symbols-rounded">{loggedToday ? 'check' : 'add'}</span>
            </span>
          </button>
        </div>

        <div className="log-detail__heatmap">
          <div className="log-detail__heatmap-head">
            <p className="log-detail__heatmap-caption">Calendar</p>
            {yearOptions.length > 1 ? (
              <label className="log-detail__year-select-wrap">
                <span className="visually-hidden">Year</span>
                <select
                  className="log-detail__year-select"
                  value={heatmapYear}
                  onChange={(e) => setHeatmapYear(Number(e.target.value))}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span className="log-detail__year-static">{heatmapYear}</span>
            )}
          </div>
          <HeatMap
            entries={log.entries}
            color={log.color}
            variant="detail"
            detailYear={heatmapYear}
            onToggle={(date) => onToggleEntry(log.id, date)}
          />
        </div>

        <div className="log-detail__stats">
          <StatPill label="Logged" value={String(total)} />
          <StatPill label="Consistency" value={`${consistency}%`} />
          <StatPill label="Current Streak" value={String(streak)} />
        </div>

        <div className="log-detail__row">
          <span className="log-detail__row-label">Longest Streak</span>
          <span className="log-detail__row-value" style={{ color: log.color }}>
            {longest} {longest === 1 ? 'day' : 'days'}
          </span>
        </div>

        <section className="log-detail__notes" aria-labelledby="log-detail-notes-label">
          <label id="log-detail-notes-label" className="log-detail__notes-label" htmlFor="log-detail-notes-field">
            Note
          </label>
          <textarea
            id="log-detail-notes-field"
            className="log-detail__notes-field"
            value={draftNotes}
            onChange={(e) => setDraftNotes(e.target.value)}
            onBlur={() => {
              if (draftNotes !== log.notes) {
                onSaveNotes(log.id, draftNotes);
              }
            }}
            placeholder="Optional — what this log is for, goals, reminders…"
            rows={5}
            maxLength={4000}
            enterKeyHint="done"
            autoCapitalize="sentences"
            spellCheck
          />
        </section>
      </div>

      {showMenu && (
        <div className="log-detail__menu-backdrop" onClick={() => setShowMenu(false)} />
      )}
    </div>
  );
};

const StatPill = ({ label, value }: { label: string; value: string }) => (
  <div className="stat-pill">
    <span className="stat-pill__value">{value}</span>
    <span className="stat-pill__label">{label}</span>
  </div>
);
