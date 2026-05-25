// src/components/add-log-schedule-preview/AddLogScheduleMonthCarousel.tsx
// Swipeable month previews — same heat-map card layout as the logs list.

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { LogSchedule } from '../../types';
import { getMonthCalendarGrid, toDateString, today } from '../../utils/date';
import { schedulePreviewHeatCellClassName } from '../../utils/schedule-preview';
import {
  countDueDatesInCalendarYear,
  countDueDatesInMonth,
  isDueDateStr,
  normalizeSchedule,
} from '../../utils/schedule';
import '../../components/heat-map/HeatMap.css';
import './AddLogScheduleMonthCarousel.css';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
const MONTH_COUNT = 12;

export interface AddLogScheduleMonthCarouselProps {
  schedule: LogSchedule;
  previewCreatedAtIso: string;
  accentColor: string;
  year?: number;
  /** When this changes (e.g. frequency tab), scroll back to the current month. */
  resetKey?: string;
}

export const AddLogScheduleMonthCarousel = ({
  schedule,
  previewCreatedAtIso,
  accentColor,
  year: yearProp,
  resetKey,
}: AddLogScheduleMonthCarouselProps) => {
  const normalized = useMemo(() => normalizeSchedule(schedule), [schedule]);
  const year = yearProp ?? new Date().getFullYear();
  const todayStr = today();

  const currentMonthIndex = new Date().getFullYear() === year ? new Date().getMonth() : 0;
  const [activeMonth, setActiveMonth] = useState(currentMonthIndex);
  const trackRef = useRef<HTMLDivElement>(null);

  const annualCount = useMemo(
    () => countDueDatesInCalendarYear(normalized, previewCreatedAtIso, year, todayStr),
    [normalized, previewCreatedAtIso, year, todayStr],
  );

  const monthHeading = useMemo(
    () =>
      new Date(year, activeMonth, 1).toLocaleString('default', {
        month: 'long',
        year: 'numeric',
      }),
    [activeMonth, year],
  );

  const monthDueCount = useMemo(
    () => countDueDatesInMonth(normalized, previewCreatedAtIso, year, activeMonth, todayStr),
    [normalized, previewCreatedAtIso, year, activeMonth, todayStr],
  );

  const syncActiveFromScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track || track.clientWidth <= 0) return;
    const idx = Math.round(track.scrollLeft / track.clientWidth);
    setActiveMonth(Math.min(MONTH_COUNT - 1, Math.max(0, idx)));
  }, []);

  const scrollToMonth = useCallback((monthIndex: number, smooth: boolean) => {
    const track = trackRef.current;
    if (!track || track.clientWidth <= 0) return;
    track.scrollTo({
      left: monthIndex * track.clientWidth,
      behavior: smooth ? 'smooth' : 'auto',
    });
    setActiveMonth(monthIndex);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const run = () => scrollToMonth(currentMonthIndex, false);

    run();
    const id = window.requestAnimationFrame(run);
    return () => window.cancelAnimationFrame(id);
  }, [resetKey, currentMonthIndex, scrollToMonth]);

  const style = { '--cell-color': accentColor } as CSSProperties;

  return (
    <div className="add-log-month-carousel">
      <div className="add-log-month-carousel__meta">
        <p className="add-log-month-carousel__heading">{monthHeading}</p>
        <p className="add-log-month-carousel__stats">
          <span>{monthDueCount} this month</span>
          <span className="add-log-month-carousel__stats-sep" aria-hidden>
            ·
          </span>
          <span>{annualCount} this year</span>
        </p>
      </div>

      <div
        ref={trackRef}
        className="add-log-month-carousel__track"
        onScroll={syncActiveFromScroll}
        aria-label="Swipe through months"
      >
        {Array.from({ length: MONTH_COUNT }, (_, monthIndex) => {
          const monthGrid = getMonthCalendarGrid(year, monthIndex);
          return (
            <div key={monthIndex} className="add-log-month-carousel__slide">
              <div className="heat-map heat-map--card add-log-month-carousel__heat" style={style}>
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
                          return (
                            <div
                              key={di}
                              className="heat-map-card__cell heat-map-card__cell--pad"
                              aria-hidden
                            />
                          );
                        }
                        const dateStr = toDateString(date);
                        const due = isDueDateStr(normalized, previewCreatedAtIso, dateStr);

                        return (
                          <div
                            key={di}
                            className={schedulePreviewHeatCellClassName(dateStr, todayStr, due)}
                            aria-hidden
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="add-log-month-carousel__dots" role="tablist" aria-label="Month">
        {Array.from({ length: MONTH_COUNT }, (_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === activeMonth}
            aria-label={new Date(year, i, 1).toLocaleString('default', { month: 'long' })}
            className={[
              'add-log-month-carousel__dot',
              i === activeMonth ? 'add-log-month-carousel__dot--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => scrollToMonth(i, true)}
          />
        ))}
      </div>
    </div>
  );
};
