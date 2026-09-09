import { useState } from 'react';
import { isDateSelectable, isHourSelectable } from '../../lib/date-slots.js';
import { Icon } from '../atoms/icon.js';

const HOURS_PER_DAY = 24;
const HOUR_PAD_LENGTH = 2;
const LAST_DAY_OF_PREVIOUS_MONTH = 0;
const MONTH_HEADER_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
});

const HOURS = Array.from({ length: HOURS_PER_DAY }, (_, hour) => hour);

function daysInMonth(year: number, month: number): Date[] {
  const count = new Date(year, month + 1, LAST_DAY_OF_PREVIOUS_MONTH).getDate();
  return Array.from({ length: count }, (_, index) => new Date(year, month, index + 1));
}

function formatHour(hour: number): string {
  return `${hour.toString().padStart(HOUR_PAD_LENGTH, '0')}:00`;
}

function dayButtonClass(selectable: boolean, isSelected: boolean): string {
  if (!selectable) {
    return 'cursor-not-allowed text-gray-300 line-through';
  }
  return isSelected ? 'bg-brand-500 text-white' : 'text-ink hover:bg-brand-50';
}

function isSameMonth(a: { year: number; month: number }, b: Date): boolean {
  return a.year === b.getFullYear() && a.month === b.getMonth();
}

export interface DateTimePickerProps {
  readonly value: string | null;
  readonly onChange: (isoValue: string) => void;
  readonly now: Date;
}

export function DateTimePicker({ value, onChange, now }: DateTimePickerProps): React.JSX.Element {
  const initialDate = value ? new Date(value) : null;
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate);
  const [viewedMonth, setViewedMonth] = useState(() => ({
    year: (initialDate ?? now).getFullYear(),
    month: (initialDate ?? now).getMonth(),
  }));
  const days = daysInMonth(viewedMonth.year, viewedMonth.month);
  const isCurrentMonth = isSameMonth(viewedMonth, now);

  function goToPreviousMonth(): void {
    if (isCurrentMonth) {
      return;
    }
    setViewedMonth((current) => {
      const date = new Date(current.year, current.month - 1, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  }

  function goToNextMonth(): void {
    setViewedMonth((current) => {
      const date = new Date(current.year, current.month + 1, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  }

  function pickDay(day: Date): void {
    if (!isDateSelectable(day, now)) {
      return;
    }
    setSelectedDate(day);
  }

  function pickHour(hour: number): void {
    if (!selectedDate || !isHourSelectable(selectedDate, hour, now)) {
      return;
    }
    onChange(
      new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        hour,
      ).toISOString(),
    );
  }

  return (
    <div className="rounded-xl border border-hairline bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          disabled={isCurrentMonth}
          onClick={goToPreviousMonth}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink hover:bg-brand-50 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
        >
          <Icon name="chevron-left" className="h-4 w-4" />
        </button>
        <p className="font-display text-sm font-semibold text-ink">
          {MONTH_HEADER_FORMATTER.format(new Date(viewedMonth.year, viewedMonth.month, 1))}
        </p>
        <button
          type="button"
          aria-label="Next month"
          onClick={goToNextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink hover:bg-brand-50"
        >
          <Icon name="chevron-right" className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const selectable = isDateSelectable(day, now);
          const isSelected = selectedDate?.toDateString() === day.toDateString();
          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={!selectable}
              onClick={() => pickDay(day)}
              aria-current={isSelected ? 'date' : undefined}
              className={`h-9 w-9 rounded-full text-sm ${dayButtonClass(selectable, isSelected)}`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div className="mt-4 grid max-h-56 grid-cols-3 gap-2 overflow-auto">
          {HOURS.map((hour) => {
            const selectable = isHourSelectable(selectedDate, hour, now);
            return (
              <button
                key={hour}
                type="button"
                disabled={!selectable}
                onClick={() => pickHour(hour)}
                className={`rounded-lg px-2 py-1.5 text-sm ${
                  !selectable
                    ? 'cursor-not-allowed bg-gray-100 text-gray-300'
                    : 'bg-white text-ink hover:bg-brand-50'
                }`}
              >
                {formatHour(hour)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
