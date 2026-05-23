// src/components/heat-map/HeatMap.tsx
// Card = current month grid; detail = calendar year columns + optional year from parent.

import { useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react';
import type { LogSchedule } from '../../types';
import {
  getCurrentMonthGrid,
  getWeeksForCalendarYear,
  monthLabelForWeekColumnInDetailYear,
  toDateString,
  today,
} from '../../utils/date';
import { isDueDateStr, normalizeSchedule, scheduleIsNonDaily } from '../../utils/schedule';
import './HeatMap.css';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type HeatMapVariant = 'card' | 'detail';

interface HeatMapProps {
  entries: Record<string, boolean>;
  color: string;
  variant: HeatMapVariant;
  /** Calendar year for detail variant (January → December columns). */
  detailYear?: number;
  onToggle?: (date: string) => void;
  /** When rhythm is not daily, outlines expected check-ins on heat cells. */
  schedule?: LogSchedule;
  scheduleCreatedAt?: string;
}

interface DetailInnerProps {
  weeks: Date[][];
  detailYear: number;
  entries: Record<string, boolean>;
  color: string;
  todayStr: string;
  now: Date;
  onToggle?: (date: string) => void;
  showScheduledOutlines: boolean;
  normalizedSchedule: LogSchedule;
  scheduleCreatedAt: string;
}

const HeatMapDetailInner = ({
  weeks,
  detailYear,
  entries,
  color,
  todayStr,
  now,
  onToggle,
  showScheduledOutlines,
  normalizedSchedule,
  scheduleCreatedAt,
}: DetailInnerProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    scrollEl.scrollLeft = 0;
  }, [detailYear, weeks]);

  const style = { '--cell-color': color } as CSSProperties;

  return (
    <div className="heat-map heat-map--detail" style={style}>
      <div className="heat-map-detail">
        <div className="heat-map-detail__gutter">
          <div className="heat-map-detail__corner" aria-hidden />
          {DAY_LABELS.map((label, i) => (
            <div key={`${label}-${i}`} className="heat-map-detail__dow">
              {label}
            </div>
          ))}
        </div>
        <div ref={scrollRef} className="heat-map-detail__scroll">
          <div className="heat-map-detail__cols">
            {weeks.map((week, wi) => (
              <div key={wi} className="heat-map-detail__col" data-week-col={wi}>
                <div className="heat-map-detail__month">
                  {monthLabelForWeekColumnInDetailYear(weeks, wi, detailYear)}
                </div>
                {week.map((date, dayIndex) => {
                  const dateStr = toDateString(date);
                  const completed = !!entries[dateStr];
                  const isFuture = date > now;
                  const isTodayCell = dateStr === todayStr;
                  const inYear = date.getFullYear() === detailYear;
                  const scheduledDue =
                    showScheduledOutlines &&
                    inYear &&
                    isDueDateStr(normalizedSchedule, scheduleCreatedAt, dateStr);

                  return (
                    <button
                      key={dayIndex}
                      type="button"
                      className={[
                        'heat-map__cell',
                        completed ? 'heat-map__cell--active' : '',
                        !completed && !isFuture && inYear ? 'heat-map__cell--past' : '',
                        isFuture && inYear ? 'heat-map__cell--future' : '',
                        !inYear ? 'heat-map__cell--outside-year' : '',
                        isTodayCell ? 'heat-map__cell--today' : '',
                        scheduledDue ? 'heat-map__cell--scheduled-due' : '',
                        onToggle && !isFuture && inYear ? 'heat-map__cell--interactive' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => !isFuture && inYear && onToggle?.(dateStr)}
                      disabled={isFuture || !onToggle || !inYear}
                      aria-label={`${dateStr}${completed ? ' — logged' : ''}${scheduledDue ? ' — planned' : ''}`}
                      aria-pressed={completed}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const EMPTY_WEEKS: Date[][] = [];

export const HeatMap = ({
  entries,
  color,
  variant,
  detailYear: detailYearProp,
  onToggle,
  schedule,
  scheduleCreatedAt,
}: HeatMapProps) => {
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  const normalizedSchedule = useMemo(() => normalizeSchedule(schedule ?? { cadence: 'daily' }), [schedule]);
  const showScheduledOutlines =
    typeof scheduleCreatedAt === 'string' && scheduleIsNonDaily(normalizedSchedule);
  const createdStr = typeof scheduleCreatedAt === 'string' ? scheduleCreatedAt : '';

  const detailYear = detailYearProp ?? new Date().getFullYear();
  const weeks = useMemo(() => {
    if (variant !== 'detail') return EMPTY_WEEKS;
    return getWeeksForCalendarYear(detailYear);
  }, [variant, detailYear]);

  const style = { '--cell-color': color } as CSSProperties;

  if (variant === 'card') {
    const monthGrid = getCurrentMonthGrid();

    return (
      <div className="heat-map heat-map--card" style={style}>
        <div className="heat-map-card__dow">
          {DAY_LABELS.map((label, i) => (
            <span key={`${label}-${i}`} className="heat-map-card__dow-cell">
              {label}
            </span>
          ))}
        </div>
        <div className="heat-map-card__grid">
          {monthGrid.map((row, wi) => (
            <div key={wi} className="heat-map-card__row">
              {row.map((date, di) => {
                if (!date) {
                  return <div key={di} className="heat-map-card__cell heat-map-card__cell--pad" aria-hidden />;
                }
                const dateStr = toDateString(date);
                const completed = !!entries[dateStr];
                const isFuture = date > now;
                const scheduledDue =
                  showScheduledOutlines &&
                  createdStr.length > 0 &&
                  isDueDateStr(normalizedSchedule, createdStr, dateStr);

                return (
                  <div
                    key={di}
                    className={[
                      'heat-map-card__cell',
                      completed ? 'heat-map-card__cell--active' : '',
                      !completed && !isFuture ? 'heat-map-card__cell--past' : '',
                      isFuture ? 'heat-map-card__cell--future' : '',
                      scheduledDue ? 'heat-map-card__cell--scheduled-due' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-hidden
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <HeatMapDetailInner
      weeks={weeks}
      detailYear={detailYear}
      entries={entries}
      color={color}
      todayStr={today()}
      now={now}
      onToggle={onToggle}
      showScheduledOutlines={showScheduledOutlines}
      normalizedSchedule={normalizedSchedule}
      scheduleCreatedAt={createdStr}
    />
  );
};
