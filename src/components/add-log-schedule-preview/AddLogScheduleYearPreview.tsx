// src/components/add-log-schedule-preview/AddLogScheduleYearPreview.tsx
// Full-year review — compact 3×4 mini calendars (same layout as frequency preview).

import { useMemo, type CSSProperties } from 'react';
import type { LogSchedule } from '../../types';
import { getMonthCalendarGrid, toDateString, today } from '../../utils/date';
import { isDueDateStr, normalizeSchedule } from '../../utils/schedule';
import '../../components/heat-map/HeatMap.css';
import './AddLogScheduleYearPreview.css';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export interface AddLogScheduleYearPreviewProps {
  schedule: LogSchedule;
  previewCreatedAtIso: string;
  accentColor: string;
  year?: number;
}

export const AddLogScheduleYearPreview = ({
  schedule,
  previewCreatedAtIso,
  accentColor,
  year: yearProp,
}: AddLogScheduleYearPreviewProps) => {
  const normalized = useMemo(() => normalizeSchedule(schedule), [schedule]);
  const year = yearProp ?? new Date().getFullYear();
  const todayStr = today();
  const style = { '--cell-color': accentColor } as CSSProperties;

  const months = useMemo(
    () =>
      MONTH_SHORT.map((label, monthIndex) => ({
        label,
        grid: getMonthCalendarGrid(year, monthIndex),
      })),
    [year],
  );

  return (
    <div className="add-log-year-preview">
      <p className="add-log-year-preview__caption">{year} at a glance</p>
      <div className="add-log-year-preview__months" aria-hidden>
        {months.map(({ label, grid }) => (
          <div key={label} className="add-log-year-preview__month">
            <p className="add-log-year-preview__month-label">{label}</p>
            <div className="heat-map heat-map--card add-log-year-preview__heat" style={style}>
              <div className="heat-map-card__grid">
                {grid.map((row, wi) => (
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
                      const isPast = dateStr < todayStr;
                      const showFill = due && !isPast;

                      return (
                        <div
                          key={di}
                          className={[
                            'heat-map-card__cell',
                            showFill ? 'heat-map-card__cell--active' : '',
                            !showFill && isPast ? 'heat-map-card__cell--past' : '',
                            !showFill && !isPast ? 'heat-map-card__cell--empty' : '',
                            due && !showFill ? 'heat-map-card__cell--scheduled-due' : '',
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
          </div>
        ))}
      </div>
    </div>
  );
};
