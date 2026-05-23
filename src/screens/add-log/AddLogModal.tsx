// src/screens/add-log/AddLogModal.tsx
// Add Log — (1) name, icon, color → (2) frequency + year preview → (3) review → Create.

import { useRef, useState, Fragment } from 'react';
import { Modal } from '../../components/modal/Modal';
import { LogIcon } from '../../components/log-icon/LogIcon';
import { AddLogScheduleMonthCarousel } from '../../components/add-log-schedule-preview/AddLogScheduleMonthCarousel';
import { AddLogScheduleYearPreview } from '../../components/add-log-schedule-preview/AddLogScheduleYearPreview';
import { AVAILABLE_ICONS } from '../../constants/icons';
import {
  INTERVAL_PERIOD_OPTIONS,
  WEEKDAY_PILL_OPTIONS,
  WEEKDAY_SELECT_OPTIONS,
  buildScheduleFromIntervalRules,
  defaultIntervalRule,
  intervalRuleKey,
  nextDistinctIntervalRule,
  type IntervalRuleDraft,
  type JsWeekday,
} from '../../constants/schedule';
import { LOG_COLORS } from '../../styles/theme';
import { formatScheduleSubtitle, normalizeSchedule } from '../../utils/schedule';
import type { LogSchedule } from '../../types';
import { DEFAULT_LOG_SCHEDULE } from '../../types';
import './AddLogModal.css';

interface AddLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: { name: string; icon: string; color: string; schedule: LogSchedule }) => void;
}

type Panel = 'wizard' | 'icons';
type WizardStep = 1 | 2 | 3;
type FrequencyTab = 'daily' | 'weekly' | 'interval';

const FREQUENCY_TABS: { id: FrequencyTab; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'interval', label: 'Interval' },
];

const sortedUniqueInts = (arr: number[]) =>
  [...new Set(arr.filter((x) => x >= 0 && x <= 6))].sort((a, b) => a - b);

function buildSchedule(
  tab: FrequencyTab,
  weekdays: number[],
  intervalRules: IntervalRuleDraft[],
): LogSchedule {
  switch (tab) {
    case 'daily':
      return DEFAULT_LOG_SCHEDULE;
    case 'weekly': {
      const w = sortedUniqueInts(weekdays);
      if (w.length === 0) return { cadence: 'weekly', weekdays: [] };
      if (w.length >= 7) return { cadence: 'daily', weekdays: [] };
      return { cadence: 'weekly', weekdays: w };
    }
    case 'interval':
      return buildScheduleFromIntervalRules(intervalRules);
  }
}

interface WizardFooterProps {
  solo?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  accentColor: string;
}

const WizardFooter = ({
  solo,
  showBack,
  onBack,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  accentColor,
}: WizardFooterProps) => {
  if (solo) {
    return (
      <div className="add-log__footer">
        <button
          type="button"
          className={`add-log__footer-primary add-log__footer-primary--full ${primaryDisabled ? 'add-log__footer-primary--inactive' : ''}`}
          style={{ backgroundColor: accentColor }}
          disabled={primaryDisabled}
          onClick={onPrimary}
        >
          {primaryLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="add-log__footer add-log__footer--split">
      {showBack ? (
        <button type="button" className="add-log__footer-back" onClick={onBack} aria-label="Back">
          <span className="material-symbols-rounded" aria-hidden>
            arrow_back
          </span>
        </button>
      ) : null}
      <button
        type="button"
        className={`add-log__footer-primary ${primaryDisabled ? 'add-log__footer-primary--inactive' : ''}`}
        style={{ backgroundColor: accentColor }}
        disabled={primaryDisabled}
        onClick={onPrimary}
      >
        {primaryLabel}
      </button>
    </div>
  );
};

export const AddLogModal = ({ isOpen, onClose, onAdd }: AddLogModalProps) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(AVAILABLE_ICONS[0]);
  const [color, setColor] = useState<(typeof LOG_COLORS)[number]>(LOG_COLORS[0]);
  const [panel, setPanel] = useState<Panel>('wizard');
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);

  const [frequencyTab, setFrequencyTab] = useState<FrequencyTab>('daily');
  const [weekdays, setWeekdays] = useState<number[]>(() => [1, 3, 5]);
  const [intervalRules, setIntervalRules] = useState<IntervalRuleDraft[]>(() => [
    defaultIntervalRule(),
  ]);

  const previewAnchorIsoRef = useRef<string>('');

  const resetForm = () => {
    setName('');
    setIcon(AVAILABLE_ICONS[0]);
    setColor(LOG_COLORS[0]);
    setPanel('wizard');
    setWizardStep(1);
    setFrequencyTab('daily');
    setWeekdays([1, 3, 5]);
    setIntervalRules([defaultIntervalRule()]);
    previewAnchorIsoRef.current = '';
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const proposedSchedule = buildSchedule(frequencyTab, weekdays, intervalRules);
  const normPreview = normalizeSchedule(proposedSchedule);
  const previewIso = previewAnchorIsoRef.current || new Date().toISOString();

  const commitCreate = () => {
    const trimmed = name.trim();
    if (!trimmed || !frequencySelectionOk) return;
    onAdd({
      name: trimmed,
      icon,
      color,
      schedule: buildSchedule(frequencyTab, weekdays, intervalRules),
    });
    resetForm();
    onClose();
  };

  const goNextFromDetails = () => {
    if (!name.trim()) return;
    previewAnchorIsoRef.current = new Date().toISOString();
    setWizardStep(2);
  };

  const goNextFromFrequency = () => {
    if (!frequencySelectionOk) return;
    setWizardStep(3);
  };

  const goBack = () => setWizardStep((s) => (s === 3 ? 2 : 1));

  const handleSelectIcon = (ic: string) => {
    setIcon(ic);
    setPanel('wizard');
  };

  const toggleWeekday = (js: number) => {
    setWeekdays((prev) =>
      prev.includes(js) ? prev.filter((d) => d !== js) : sortedUniqueInts([...prev, js]),
    );
  };

  const updateIntervalRule = (index: number, patch: Partial<IntervalRuleDraft>) => {
    setIntervalRules((prev) => {
      const candidate = { ...prev[index], ...patch };
      const key = intervalRuleKey(candidate);
      const duplicate = prev.some((row, i) => i !== index && intervalRuleKey(row) === key);
      if (duplicate) return prev;
      return prev.map((row, i) => (i === index ? candidate : row));
    });
  };

  const addIntervalRule = () => {
    setIntervalRules((prev) => {
      const next = nextDistinctIntervalRule(prev);
      if (!next) return prev;
      return [...prev, next];
    });
  };

  const removeIntervalRule = (index: number) => {
    setIntervalRules((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const frequencySelectionOk =
    frequencyTab === 'daily'
      ? true
      : frequencyTab === 'weekly'
        ? weekdays.length > 0
        : intervalRules.length > 0;

  const sheetClass = [
    'modal-sheet--stacked',
    'modal-sheet--add-log',
    panel === 'icons' ? 'modal-sheet--add-log-icons' : '',
    panel === 'wizard' && wizardStep === 2 ? 'modal-sheet--add-log-frequency' : '',
    panel === 'wizard' && wizardStep === 3 ? 'modal-sheet--add-log-review' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const modalTitle =
    panel === 'icons'
      ? 'Choose Icon'
      : wizardStep === 1
        ? 'Add New Log'
        : wizardStep === 2
          ? 'Frequency'
          : 'Review';

  const trimmedNameOk = name.trim().length > 0;

  const monthCarousel = (
    <AddLogScheduleMonthCarousel
      schedule={proposedSchedule}
      previewCreatedAtIso={previewIso}
      accentColor={color}
      resetKey={frequencyTab}
    />
  );

  const yearPreview = (
    <AddLogScheduleYearPreview
      schedule={proposedSchedule}
      previewCreatedAtIso={previewIso}
      accentColor={color}
    />
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={modalTitle} sheetClassName={sheetClass}>
      {panel === 'wizard' ? (
        wizardStep === 1 ? (
          <div className="add-log add-log--stacked add-log--details">
            <div className="add-log__scroll">
              <div className="add-log__preview">
                <button
                  type="button"
                  className="add-log__preview-btn"
                  onClick={() => setPanel('icons')}
                  aria-label="Change icon"
                >
                  <LogIcon symbol={icon} color={color} size="lg" showEditBadge />
                  <span className="add-log__preview-hint">Tap to change icon</span>
                </button>
              </div>

              <div className="add-log__field">
                <label className="add-log__label" htmlFor="log-name">
                  Log Name
                </label>
                <input
                  id="log-name"
                  name="logName"
                  type="text"
                  className="add-log__input"
                  placeholder="e.g. Stretching"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="done"
                  maxLength={40}
                />
              </div>

              <div className="add-log__field">
                <span className="add-log__label" id="log-color-label">
                  Color
                </span>
                <div
                  className="add-log__color-strip-outer"
                  role="listbox"
                  aria-labelledby="log-color-label"
                >
                  <div className="add-log__color-strip">
                    {LOG_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        role="option"
                        aria-selected={c === color}
                        className={`add-log__color-swatch ${c === color ? 'add-log__color-swatch--active' : ''}`}
                        style={{ backgroundColor: c }}
                        onClick={() => setColor(c)}
                        aria-label={`Color ${c}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="add-log__color-hint">Swipe for more colors</p>
              </div>
            </div>

            <WizardFooter
              solo
              primaryLabel="Next"
              onPrimary={goNextFromDetails}
              primaryDisabled={!trimmedNameOk}
              accentColor={color}
            />
          </div>
        ) : wizardStep === 2 ? (
          <div className="add-log add-log--stacked add-log--frequency">
            <div className="add-log__scroll">
              <div className="add-log-freq">
                <div className="add-log-freq__tabs" role="tablist" aria-label="Frequency type">
                  {FREQUENCY_TABS.map(({ id, label }) => {
                    const active = frequencyTab === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        className={[
                          'add-log-freq__tab',
                          active ? 'add-log-freq__tab--active' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => setFrequencyTab(id)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {frequencyTab === 'weekly' ? (
                  <div className="add-log-freq__weekday-pills" role="group" aria-label="Days of week">
                    {WEEKDAY_PILL_OPTIONS.map(({ js, label }) => {
                      const on = weekdays.includes(js);
                      return (
                        <button
                          key={js}
                          type="button"
                          className={[
                            'add-log-freq__pill',
                            on ? 'add-log-freq__pill--on' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => toggleWeekday(js)}
                          aria-pressed={on}
                          style={
                            on
                              ? {
                                  backgroundColor: color,
                                  borderColor: color,
                                  color: '#ffffff',
                                }
                              : undefined
                          }
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {frequencyTab === 'interval' ? (
                  <div className="add-log-interval">
                    <div className="add-log-interval__chain">
                      {intervalRules.map((rule, index) => (
                        <Fragment key={index}>
                          <label className="visually-hidden" htmlFor={`interval-period-${index}`}>
                            Repeat interval
                          </label>
                          <select
                            id={`interval-period-${index}`}
                            className="add-log-interval__select"
                            value={rule.periodKey}
                            onChange={(e) =>
                              updateIntervalRule(index, {
                                periodKey: e.target.value as IntervalRuleDraft['periodKey'],
                              })
                            }
                          >
                            {INTERVAL_PERIOD_OPTIONS.map((opt) => (
                              <option key={opt.key} value={opt.key}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <span className="add-log-interval__on">on</span>
                          <label className="visually-hidden" htmlFor={`interval-day-${index}`}>
                            Day of week
                          </label>
                          <select
                            id={`interval-day-${index}`}
                            className="add-log-interval__select add-log-interval__select--day"
                            value={rule.weekday}
                            onChange={(e) =>
                              updateIntervalRule(index, {
                                weekday: Number(e.target.value) as JsWeekday,
                              })
                            }
                          >
                            {WEEKDAY_SELECT_OPTIONS.map(({ js, label }) => (
                              <option key={js} value={js}>
                                {label}
                              </option>
                            ))}
                          </select>
                          {intervalRules.length > 1 ? (
                            <button
                              type="button"
                              className="add-log-interval__remove"
                              onClick={() => removeIntervalRule(index)}
                              aria-label="Remove rule"
                            >
                              <span className="material-symbols-rounded">close</span>
                            </button>
                          ) : null}
                        </Fragment>
                      ))}
                    </div>
                    {nextDistinctIntervalRule(intervalRules) ? (
                      <button type="button" className="add-log-interval__add" onClick={addIntervalRule}>
                        <span className="material-symbols-rounded">add</span>
                        Add another
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {monthCarousel}
              </div>
            </div>

            <WizardFooter
              showBack
              onBack={goBack}
              primaryLabel="Next"
              onPrimary={goNextFromFrequency}
              primaryDisabled={!frequencySelectionOk}
              accentColor={color}
            />
          </div>
        ) : (
          <div className="add-log add-log--stacked add-log--review">
            <div className="add-log__scroll add-log__scroll--review">
              <div className="add-log-review__hero">
                <LogIcon symbol={icon} color={color} size="md" />
                <div className="add-log-review__meta">
                  <p className="add-log-review__name">{name.trim() || '—'}</p>
                  <p className="add-log-review__schedule">{formatScheduleSubtitle(normPreview)}</p>
                </div>
              </div>

              {yearPreview}
            </div>

            <WizardFooter
              showBack
              onBack={goBack}
              primaryLabel="Create Log"
              onPrimary={commitCreate}
              accentColor={color}
            />
          </div>
        )
      ) : (
        <div className="icon-picker icon-picker--in-sheet">
          <button type="button" className="icon-picker__back" onClick={() => setPanel('wizard')}>
            <span className="material-symbols-rounded">arrow_back_ios</span>
            Back to form
          </button>
          <div className="icon-picker__grid">
            {AVAILABLE_ICONS.map((ic) => (
              <button
                key={ic}
                type="button"
                className={`icon-picker__btn ${ic === icon ? 'icon-picker__btn--active' : ''}`}
                onClick={() => handleSelectIcon(ic)}
                aria-pressed={ic === icon}
                aria-label={ic}
              >
                <LogIcon symbol={ic} color={color} size="grid" />
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
};
