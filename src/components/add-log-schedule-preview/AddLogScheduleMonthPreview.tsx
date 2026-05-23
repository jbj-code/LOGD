// src/components/add-log-schedule-preview/AddLogScheduleMonthPreview.tsx
// Current month, Sun-first 6×7 grid — “heat” cells where the proposed schedule expects a check-in.

import { Fragment, useMemo } from 'react';
import type { LogSchedule } from '../../types';
import { getSunStartMonthGridSixRows, toDateString } from '../../utils/date';
import { isDueDateStr, normalizeSchedule } from '../../utils/schedule';
import './AddLogScheduleMonthPreview.css';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

export interface AddLogScheduleMonthPreviewProps {
  schedule: LogSchedule;
  /** Aligns stride “week bands” with when the log will be created (preview matches post-create behavior). */
  previewCreatedAtIso: string;
  accentColor: string;
}

export const AddLogScheduleMonthPreview = ({
  schedule,
  previewCreatedAtIso,
  accentColor,
}: AddLogScheduleMonthPreviewProps) => {
  const normalized = useMemo(() => normalizeSchedule(schedule), [schedule]);

  const { heading, rows } = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const h = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    return {
      heading: h,
      rows: getSunStartMonthGridSixRows(y, m),
    };
  }, []);

  return (
    <div className="add-log-schedule-preview">
      <h3 className="add-log-schedule-preview__month">{heading}</h3>
      <div className="add-log-schedule-preview__card">
        <div className="add-log-schedule-preview__grid" aria-hidden>
          <div className="add-log-schedule-preview__corner" />
          {DOW.map((label, i) => (
            <div key={`dow-${i}`} className="add-log-schedule-preview__dow">
              {label}
            </div>
          ))}
          {rows.map((row, ri) => (
            <Fragment key={`row-${ri}`}>
              <div className="add-log-schedule-preview__wk">Wk&nbsp;{ri + 1}</div>
              {row.map((cell, ci) => {
                if (!cell) {
                  return (
                    <div
                      key={`e-${ri}-${ci}`}
                      className="add-log-schedule-preview__cell add-log-schedule-preview__cell--empty"
                    />
                  );
                }
                const ds = toDateString(cell);
                const due = isDueDateStr(normalized, previewCreatedAtIso, ds);
                return (
                  <div
                    key={ds}
                    className={[
                      'add-log-schedule-preview__cell',
                      due ? 'add-log-schedule-preview__cell--due' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={
                      due
                        ? {
                            backgroundColor: accentColor,
                            boxShadow: `inset 0 0 0 1px ${accentColor}`,
                          }
                        : undefined
                    }
                  >
                    <span className="add-log-schedule-preview__day-num">{cell.getDate()}</span>
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
