// src/utils/schedule-preview.ts
// Shared heat-map cell class names for add-log schedule previews (month carousel + year grid).

/** Class list for a schedule preview cell in the logs-list heat-map card layout. */
export function schedulePreviewHeatCellClassName(
  dateStr: string,
  todayStr: string,
  due: boolean,
): string {
  const isPast = dateStr < todayStr;
  const showFill = due && !isPast;

  return [
    'heat-map-card__cell',
    showFill ? 'heat-map-card__cell--active' : '',
    !showFill && isPast ? 'heat-map-card__cell--past' : '',
    !showFill && !isPast ? 'heat-map-card__cell--empty' : '',
    due && !showFill ? 'heat-map-card__cell--scheduled-due' : '',
  ]
    .filter(Boolean)
    .join(' ');
}
