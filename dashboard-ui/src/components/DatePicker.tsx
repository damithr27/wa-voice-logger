import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { prettyDate } from '../api';

interface Props {
  /** The selected day, as YYYY-MM-DD. */
  date: string;
  /** Today in Colombo, as YYYY-MM-DD. Days after this cannot be picked. */
  today: string;
  /** Called with the day the user picked. */
  onPick: (date: string) => void;
  /** Days that have an update tab, so they can be marked with a dot. */
  marked?: string[];
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/** A date as YYYY-MM-DD, built from its parts so no timezone can shift it. */
function stamp(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Monday = 0 ... Sunday = 6, which is how the grid is laid out. */
function firstWeekday(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * A date field that opens a real month calendar.
 * Days after today are greyed out, and days that have updates get a dot.
 */
export default function DatePicker({ date, today, onPick, marked = [] }: Props) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);

  // The month on show. It follows the selected day whenever that changes.
  const start = new Date((date || today || '2026-01-01') + 'T12:00:00');
  const [view, setView] = useState({ year: start.getFullYear(), month: start.getMonth() });

  useEffect(() => {
    if (!date) return;
    const d = new Date(date + 'T12:00:00');
    setView({ year: d.getFullYear(), month: d.getMonth() });
  }, [date]);

  // Close when the user clicks anywhere else, or presses Escape
  useEffect(() => {
    if (!open) return;

    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };

    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const hasUpdates = new Set(marked);
  const isToday = date === today;

  const moveMonth = (by: number) => {
    setView(v => {
      const m = v.month + by;
      return { year: v.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
  };

  const pick = (day: string) => {
    if (day > today) return;
    onPick(day);
    setOpen(false);
  };

  // The leading blanks, then every day of the month
  const blanks = Array.from({ length: firstWeekday(view.year, view.month) });
  const days = Array.from({ length: daysInMonth(view.year, view.month) }, (_, i) => i + 1);

  // Stop the user paging into months that have not happened yet
  const viewStart = stamp(view.year, view.month, 1);
  const nextMonthBlocked = viewStart >= today.slice(0, 8) + '01';

  return (
    <div className="relative" ref={box}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 bg-white border rounded-lg pl-3 pr-2 py-1.5 transition-colors ${
          open ? 'border-green-400 ring-2 ring-green-100' : 'border-slate-200 hover:border-green-300'
        }`}
      >
        <Calendar size={14} className="text-slate-400 shrink-0" />
        {isToday && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-100 text-green-700">
            Today
          </span>
        )}
        <span className="text-sm text-slate-700 whitespace-nowrap">{prettyDate(date)}</span>
        <ChevronLeft size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-90' : '-rotate-90'}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 p-3">
          {/* Month header */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => moveMonth(-1)}
              className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-600"
            >
              <ChevronLeft size={15} />
            </button>
            <div className="text-sm font-semibold text-slate-800">
              {MONTHS[view.month]} {view.year}
            </div>
            <button
              onClick={() => moveMonth(1)}
              disabled={nextMonthBlocked}
              className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Weekday names */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-[10px] font-medium text-slate-400 text-center py-1">{d}</div>
            ))}
          </div>

          {/* The days themselves */}
          <div className="grid grid-cols-7 gap-0.5">
            {blanks.map((_, i) => <div key={`b${i}`} />)}

            {days.map(n => {
              const day = stamp(view.year, view.month, n);
              const future = day > today;
              const chosen = day === date;
              const now = day === today;

              return (
                <button
                  key={day}
                  onClick={() => pick(day)}
                  disabled={future}
                  title={hasUpdates.has(day) ? 'Updates were recorded on this day' : undefined}
                  className={`relative h-8 rounded-md text-xs transition-colors ${
                    chosen
                      ? 'bg-green-600 text-white font-semibold'
                      : future
                        ? 'text-slate-300 cursor-not-allowed'
                        : now
                          ? 'text-green-700 font-semibold hover:bg-green-50 ring-1 ring-green-300'
                          : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {n}
                  {hasUpdates.has(day) && !chosen && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-green-500" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> has updates
            </span>
            <button
              onClick={() => pick(today)}
              className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1 hover:bg-green-100"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}