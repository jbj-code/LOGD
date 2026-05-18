// src/screens/calendar/CalendarScreen.tsx
// Monthly calendar: tap a day to see which logs were completed.

import { useState } from 'react';
import type { Log } from '../../types';
import { formatDateLabel, toDateString, today } from '../../utils/date';
import './CalendarScreen.css';

interface CalendarScreenProps {
  logs: Log[];
}

const DAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const CalendarScreen = ({ logs }: CalendarScreenProps) => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(() => new Date().getDate());
  const todayStr = today();

  const goToMonth = (nextYear: number, nextMonth: number) => {
    setYear(nextYear);
    setMonth(nextMonth);
    const n = new Date();
    setSelectedDay(
      nextYear === n.getFullYear() && nextMonth === n.getMonth() ? n.getDate() : null,
    );
  };

  const prevMonth = () => {
    if (month === 0) goToMonth(year - 1, 11);
    else goToMonth(year, month - 1);
  };

  const nextMonth = () => {
    if (month === 11) goToMonth(year + 1, 0);
    else goToMonth(year, month + 1);
  };

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();

  const startDow = firstDay.getDay();
  const offsetCells = startDow === 0 ? 6 : startDow - 1;

  const cells: (number | null)[] = [
    ...Array(offsetCells).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const getCompletedLogs = (day: number): Log[] => {
    const dateStr = toDateString(new Date(year, month, day));
    return logs.filter((l) => l.entries[dateStr]);
  };

  const selectedDateStr =
    selectedDay !== null ? toDateString(new Date(year, month, selectedDay)) : null;
  const selectedLogs = selectedDay !== null ? getCompletedLogs(selectedDay) : [];

  return (
    <div className="screen-page calendar-screen">
      <header className="screen-page__header calendar-screen__header">
        <h1 className="calendar-screen__title">Calendar</h1>
      </header>

      <div className="screen-page__scroll calendar-screen__body">
        <div className="cal-nav">
          <button type="button" className="cal-nav__btn" onClick={prevMonth} aria-label="Previous month">
            <span className="material-symbols-rounded">chevron_left</span>
          </button>
          <span className="cal-nav__label">{MONTH_NAMES[month]} {year}</span>
          <button type="button" className="cal-nav__btn" onClick={nextMonth} aria-label="Next month">
            <span className="material-symbols-rounded">chevron_right</span>
          </button>
        </div>

        <div className="cal-grid">
          {DAY_HEADERS.map((d, i) => (
            <div key={i} className="cal-grid__dow">{d}</div>
          ))}

          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} className="cal-cell cal-cell--empty" />;
            }

            const dateStr = toDateString(new Date(year, month, day));
            const isTodayCell = dateStr === todayStr;
            const isFuture = new Date(year, month, day) > new Date();
            const completedLogs = getCompletedLogs(day);
            const allLogged = logs.length > 0 && completedLogs.length === logs.length;
            const isSelected = selectedDay === day;

            const cellClasses = [
              'cal-cell',
              isTodayCell ? 'cal-cell--today' : '',
              isFuture ? 'cal-cell--future' : '',
              completedLogs.length > 0 ? 'cal-cell--has-logs' : '',
              allLogged ? 'cal-cell--full' : '',
            ].filter(Boolean).join(' ');

            const label = formatDateLabel(dateStr);
            const inner = (
              <span className="cal-cell__stack">
                <span
                  className={['cal-cell__day', isSelected ? 'cal-cell__day--highlight' : ''].filter(Boolean).join(' ')}
                >
                  {day}
                </span>
                {completedLogs.length > 0 && <span className="cal-cell__marker" aria-hidden />}
              </span>
            );

            if (isFuture) {
              return (
                <div key={day} className={cellClasses}>
                  {inner}
                </div>
              );
            }

            return (
              <button
                key={day}
                type="button"
                className={cellClasses}
                aria-label={`${label}${completedLogs.length ? `, ${completedLogs.length} log${completedLogs.length === 1 ? '' : 's'}` : ', no logs'}`}
                aria-pressed={isSelected}
                onClick={() => setSelectedDay((d) => (d === day ? null : day))}
              >
                {inner}
              </button>
            );
          })}
        </div>

        {selectedDateStr !== null && (
          <div className="cal-day-detail" role="region" aria-live="polite">
            <h2 className="cal-day-detail__title">{formatDateLabel(selectedDateStr)}</h2>
            {selectedLogs.length === 0 ? (
              <p className="cal-day-detail__empty">No logs on this day.</p>
            ) : (
              <ul className="cal-day-detail__list">
                {selectedLogs.map((log) => (
                  <li key={log.id} className="cal-day-detail__log">
                    <span className="cal-day-detail__swatch" style={{ backgroundColor: log.color }} />
                    <span className="cal-day-detail__name">{log.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
