import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDays } from '../api';
import DatePicker from './DatePicker';

interface Props {
  date: string;
  today: string;
  shift: (days: number) => void;
  goTo: (date: string) => void;
  updatedAt?: string;
}

/**
 * Day picker shared by the pages that show one day at a time:
 * a step back and forward, and a calendar for jumping to any past day.
 */
export default function DateBar({ date, today, shift, goTo, updatedAt }: Props) {
  const isToday = date === today;
  const withUpdates = useDays();

  return (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      {updatedAt && (
        <span className="text-xs text-slate-400 mr-1">updated {updatedAt}</span>
      )}

      <button
        onClick={() => shift(-1)}
        title="Previous day"
        className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600"
      >
        <ChevronLeft size={16} />
      </button>

      <DatePicker date={date} today={today} onPick={goTo} marked={withUpdates} />

      <button
        onClick={() => shift(1)}
        disabled={isToday}
        title="Next day"
        className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 disabled:opacity-30 disabled:hover:bg-white"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}