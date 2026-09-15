import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  X,
  Clock,
  Check
} from 'lucide-react';
import {
  getCurrentJalaliDate,
  toPersianDigits,
  toEnglishDigits,
  parseJalaliToDate,
  isJalaliLeapYear
} from '../utils/persianDate';

export interface PersianDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  iconColor?: string;
  align?: 'left' | 'right';
  showTodayBtn?: boolean;
  allowClear?: boolean;
}

const PERSIAN_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

const WEEK_DAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

export const PersianDatePicker: React.FC<PersianDatePickerProps> = ({
  value,
  onChange,
  placeholder = 'انتخاب تاریخ...',
  className = '',
  inputClassName = '',
  disabled = false,
  required = false,
  label,
  iconColor = 'text-amber-800',
  align = 'right',
  showTodayBtn = true,
  allowClear = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value or fallback to today
  const todayStr = getCurrentJalaliDate();
  const parsedValue = value ? toEnglishDigits(value).trim() : '';

  const getInitialYearMonth = () => {
    if (parsedValue && parsedValue.includes('/')) {
      const parts = parsedValue.split('/');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
        return { year: y, month: m };
      }
    }
    const todayParts = todayStr.split('/');
    return {
      year: parseInt(todayParts[0], 10),
      month: parseInt(todayParts[1], 10),
    };
  };

  const [viewYear, setViewYear] = useState<number>(() => getInitialYearMonth().year);
  const [viewMonth, setViewMonth] = useState<number>(() => getInitialYearMonth().month);
  const [isSelectingYear, setIsSelectingYear] = useState(false);
  const [isSelectingMonth, setIsSelectingMonth] = useState(false);

  // Sync view when opened
  useEffect(() => {
    if (isOpen) {
      const initial = getInitialYearMonth();
      setViewYear(initial.year);
      setViewMonth(initial.month);
      setIsSelectingYear(false);
      setIsSelectingMonth(false);
    }
  }, [isOpen, value]);

  // Click outside listener to close popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle month changes
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Get total days in currently viewed Jalali month
  const getDaysInMonth = (year: number, month: number): number => {
    if (month <= 6) return 31;
    if (month <= 11) return 30;
    return isJalaliLeapYear(year) ? 30 : 29;
  };

  // Calculate starting weekday (0: Shanbeh, ..., 6: Jomeh)
  const getFirstDayOfWeek = (year: number, month: number): number => {
    const gDate = parseJalaliToDate(`${year}/${month < 10 ? '0' + month : month}/01`);
    if (!gDate) return 0;
    // JS getDay(): 0 is Sunday, 1 is Monday, ..., 6 is Saturday
    // In Persian calendar week: Shanbeh is index 0 (Saturday in Gregorian)
    const gDay = gDate.getDay();
    const jalaliWeekday = (gDay + 1) % 7;
    return jalaliWeekday;
  };

  // Handle day selection
  const handleSelectDay = (day: number) => {
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const selectedDateStr = `${viewYear}/${pad(viewMonth)}/${pad(day)}`;
    onChange(selectedDateStr);
    setIsOpen(false);
  };

  const handleSetToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(todayStr);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const startWeekday = getFirstDayOfWeek(viewYear, viewMonth);

  // Selected date comparison
  const isSelected = (day: number) => {
    if (!parsedValue) return false;
    const parts = parsedValue.split('/');
    if (parts.length !== 3) return false;
    return (
      parseInt(parts[0], 10) === viewYear &&
      parseInt(parts[1], 10) === viewMonth &&
      parseInt(parts[2], 10) === day
    );
  };

  const isToday = (day: number) => {
    const parts = todayStr.split('/');
    return (
      parseInt(parts[0], 10) === viewYear &&
      parseInt(parts[1], 10) === viewMonth &&
      parseInt(parts[2], 10) === day
    );
  };

  // Generate Year options around current year (-10 to +10)
  const yearOptions: number[] = [];
  for (let y = viewYear - 7; y <= viewYear + 7; y++) {
    yearOptions.push(y);
  }

  // Display text in input
  const displayFormatted = value ? toPersianDigits(value) : '';

  return (
    <div className={`relative inline-block w-full ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
          <CalendarIcon className={`w-3.5 h-3.5 ${iconColor}`} />
          {label}
        </label>
      )}

      {/* Trigger Input */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white cursor-pointer select-none transition-all hover:border-amber-700/60 focus-within:ring-2 focus-within:ring-amber-700 ${
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''
        } ${inputClassName}`}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <CalendarIcon className={`w-4 h-4 shrink-0 ${iconColor}`} />
          {displayFormatted ? (
            <span className="font-bold text-slate-800 font-sans tracking-wide">
              {displayFormatted}
            </span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {allowClear && value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
              title="پاک کردن تاریخ"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-[10px] text-amber-800/70 bg-amber-50 px-1.5 py-0.5 rounded font-bold border border-amber-200/50">
            تقویم
          </span>
        </div>
      </div>

      {/* Hidden input for HTML form validation if required */}
      {required && (
        <input
          type="text"
          value={value || ''}
          onChange={() => {}}
          required
          className="opacity-0 absolute -z-10 pointer-events-none w-0 h-0"
          tabIndex={-1}
        />
      )}

      {/* Date Picker Popover */}
      {isOpen && (
        <div
          className={`absolute z-50 mt-1.5 bg-white border border-amber-900/20 rounded-2xl shadow-2xl p-3.5 w-72 sm:w-80 text-right select-none animate-in fade-in zoom-in-95 duration-150 ${
            align === 'left' ? 'left-0' : 'right-0'
          }`}
          style={{ direction: 'rtl' }}
        >
          {/* Calendar Header: Month/Year navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-amber-900/10 gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-amber-50 text-slate-600 hover:text-amber-900 rounded-lg transition-colors cursor-pointer"
              title="ماه قبل"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs sm:text-sm">
              {/* Month Selector Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSelectingMonth(!isSelectingMonth);
                  setIsSelectingYear(false);
                }}
                className="hover:text-amber-800 hover:bg-amber-50 px-2 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>{PERSIAN_MONTH_NAMES[viewMonth - 1]}</span>
              </button>

              <span className="text-slate-300">/</span>

              {/* Year Selector Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSelectingYear(!isSelectingYear);
                  setIsSelectingMonth(false);
                }}
                className="hover:text-amber-800 hover:bg-amber-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
              >
                <span>{toPersianDigits(viewYear)}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-amber-50 text-slate-600 hover:text-amber-900 rounded-lg transition-colors cursor-pointer"
              title="ماه بعد"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Month Picker Dropdown */}
          {isSelectingMonth && (
            <div className="py-3 grid grid-cols-3 gap-1.5 border-b border-amber-900/10">
              {PERSIAN_MONTH_NAMES.map((name, idx) => (
                <button
                  key={name}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewMonth(idx + 1);
                    setIsSelectingMonth(false);
                  }}
                  className={`py-1.5 px-2 text-xs rounded-xl font-bold transition-all cursor-pointer ${
                    viewMonth === idx + 1
                      ? 'bg-amber-800 text-white shadow-xs'
                      : 'hover:bg-amber-50 text-slate-700'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          {/* Quick Year Picker Dropdown */}
          {isSelectingYear && (
            <div className="py-3 border-b border-amber-900/10">
              <div className="flex items-center justify-between px-2 mb-2 text-[11px] text-slate-500 font-bold">
                <span>انتخاب سال شمسی:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewYear((y) => y - 5);
                    }}
                    className="hover:text-amber-800 cursor-pointer"
                  >
                    -۵ سال
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewYear((y) => y + 5);
                    }}
                    className="hover:text-amber-800 cursor-pointer"
                  >
                    +۵ سال
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto p-1">
                {yearOptions.map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewYear(yr);
                      setIsSelectingYear(false);
                    }}
                    className={`py-1 px-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                      viewYear === yr
                        ? 'bg-amber-800 text-white shadow-xs'
                        : 'hover:bg-amber-50 text-slate-700'
                    }`}
                  >
                    {toPersianDigits(yr)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Weekday Names */}
          {!isSelectingMonth && !isSelectingYear && (
            <>
              <div className="grid grid-cols-7 gap-1 text-center py-2 text-[11px] font-bold text-slate-400 border-b border-slate-100">
                {WEEK_DAYS.map((wd, i) => (
                  <span key={wd} className={i === 6 ? 'text-rose-500' : ''}>
                    {wd}
                  </span>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 py-2.5">
                {/* Empty slots before first day */}
                {Array.from({ length: startWeekday }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="h-8" />
                ))}

                {/* Days of month */}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const selected = isSelected(dayNum);
                  const today = isToday(dayNum);
                  // Check if this day is Friday (Jomeh): (startWeekday + idx) % 7 === 6
                  const isFriday = (startWeekday + idx) % 7 === 6;

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => handleSelectDay(dayNum)}
                      className={`h-8 w-8 sm:h-9 sm:w-9 mx-auto flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selected
                          ? 'bg-amber-800 text-white shadow-md scale-105 ring-2 ring-amber-800/30 font-black'
                          : today
                          ? 'bg-amber-100 text-amber-950 border border-amber-400 font-black hover:bg-amber-200'
                          : isFriday
                          ? 'text-rose-600 hover:bg-rose-50'
                          : 'text-slate-700 hover:bg-amber-50'
                      }`}
                    >
                      {toPersianDigits(dayNum)}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Bottom Toolbar (Today & Clear Buttons) */}
          <div className="flex items-center justify-between pt-2.5 border-t border-amber-900/10 text-xs">
            {showTodayBtn && (
              <button
                type="button"
                onClick={handleSetToday}
                className="flex items-center gap-1 text-amber-800 hover:text-amber-950 font-bold px-2 py-1 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>امروز ({toPersianDigits(todayStr)})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
