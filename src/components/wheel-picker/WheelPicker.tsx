// src/components/wheel-picker/WheelPicker.tsx
// Scroll-snap number wheel (TickTick-style) for frequency pickers.

import { useCallback, useEffect, useRef } from 'react';
import './WheelPicker.css';

const ITEM_HEIGHT = 44;

export interface WheelPickerProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** Static label beside the selected value, e.g. "days per week". */
  suffix?: string;
  'aria-label'?: string;
}

export const WheelPicker = ({
  value,
  min,
  max,
  onChange,
  suffix,
  'aria-label': ariaLabel,
}: WheelPickerProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const paddingRows = 2;

  const scrollToValue = useCallback(
    (next: number, behavior: ScrollBehavior = 'auto') => {
      const el = scrollRef.current;
      if (!el) return;
      const index = next - min;
      el.scrollTo({ top: index * ITEM_HEIGHT, behavior });
    },
    [min],
  );

  useEffect(() => {
    scrollToValue(value);
  }, [value, scrollToValue]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollTop / ITEM_HEIGHT);
    const clamped = Math.min(max, Math.max(min, min + index));
    if (clamped !== value) onChange(clamped);
  };

  return (
    <div className="wheel-picker" aria-label={ariaLabel}>
      <div className="wheel-picker__frame">
        <div className="wheel-picker__highlight" aria-hidden />
        <div
          ref={scrollRef}
          className="wheel-picker__scroll"
          onScroll={handleScroll}
          role="listbox"
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
        >
          {Array.from({ length: paddingRows }, (_, i) => (
            <div key={`pad-top-${i}`} className="wheel-picker__item wheel-picker__item--pad" aria-hidden />
          ))}
          {values.map((n) => (
            <div
              key={n}
              className={[
                'wheel-picker__item',
                n === value ? 'wheel-picker__item--selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              role="option"
              aria-selected={n === value}
            >
              {n}
            </div>
          ))}
          {Array.from({ length: paddingRows }, (_, i) => (
            <div key={`pad-bot-${i}`} className="wheel-picker__item wheel-picker__item--pad" aria-hidden />
          ))}
        </div>
      </div>
      {suffix ? <span className="wheel-picker__suffix">{suffix}</span> : null}
    </div>
  );
};
