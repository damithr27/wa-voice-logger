import { useEffect, useState, useCallback } from 'react';

/** One row of a day's tab, exactly as the bot writes it. */
export interface SheetRow {
  name: string;
  designation: string;
  leave: string;      // '' | 'Leave' | 'Half Day'
  on: string;         // '✔' when anything was received
  kind: string;       // '' | 'Text' | 'Voice'
  off: string;
  morning: string;    // the morning transcript
  evening: string;    // the evening transcript
  status: string;     // 'Both Sent' | 'Morning Only' | 'Evening Only' | 'Not Sent'
  morningEn?: string; // the English translation of the morning update
  eveningEn?: string; // the English translation of the evening update
}

/** A voice note kept on disk by the bot. */
export interface AudioClip {
  id: string;
  date: string;
  name: string;
  senderId: string;
  session: 'MORNING' | 'EVENING';
  seconds: number;
  bytes: number;
  savedAt: string;
  text: string;      // this recording's own transcript
  textEn?: string;   // this recording's own English translation
}

export interface WeekDay {
  date: string;
  day: string;        // 'Mon', 'Tue', ...
  label?: string;     // 'Mon 12' — what the chart puts on the axis
  exists?: boolean;   // false when that day has no tab at all
  future?: boolean;   // true for days that have not happened yet
  morning: number;
  evening: number;
  both: number;
  none: number;
  leave: number;
}

const REFRESH_MS = 20000;

/** The badge name this row should show, using the StatusBadge vocabulary. */
export function uiStatus(r: SheetRow): 'complete' | 'partial' | 'no-update' | 'on-leave' {
  if (r.leave) return 'on-leave';
  if (r.morning && r.evening) return 'complete';
  if (r.morning || r.evening) return 'partial';
  return 'no-update';
}

export function initials(name: string): string {
  const clean = name.replace(/^(Mr|Mrs|Ms|Dr)\.?\s*/i, '').replace(/[^A-Za-z\s.]/g, '');
  const last = clean.split(/[\s.]+/).filter(Boolean).pop();
  return (last || name).charAt(0).toUpperCase();
}

/** True when the text contains Sinhala characters. */
export function isSinhala(text: string): boolean {
  return /[\u0D80-\u0DFF]/.test(text);
}

/**
 * Split one sheet cell back into the separate updates it holds.
 * The bot numbers them ("1. ... 2. ...") once a person sends more than one,
 * so each entry can be shown on its own card.
 */
export function splitEntries(cell: string): string[] {
  const clean = String(cell || '').trim();
  if (!clean) return [];

  return clean
    .split(/\n{2,}/)
    .map(b => b.replace(/^\d+\.\s+/, '').trim())
    .filter(Boolean);
}

/** Today's date in Colombo, as YYYY-MM-DD. */
export function todayColombo(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

/** Move a YYYY-MM-DD date by a number of days. */
export function addDays(date: string, by: number): string {
  const d = new Date(date + 'T12:00:00');
  d.setDate(d.getDate() + by);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** The Monday of the week that contains this date. */
export function mondayOf(date: string): string {
  const d = new Date(date + 'T12:00:00');
  return addDays(date, -((d.getDay() + 6) % 7));
}

/** "12 – 18 October 2026", for a week heading. */
export function weekRange(monday: string): string {
  const sunday = addDays(monday, 6);
  const a = new Date(monday + 'T12:00:00');
  const b = new Date(sunday + 'T12:00:00');

  const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  const month = (d: Date) => d.toLocaleDateString('en-GB', { month: 'long' });
  const year = b.getFullYear();

  return sameMonth
    ? `${a.getDate()} – ${b.getDate()} ${month(b)} ${year}`
    : `${a.getDate()} ${month(a)} – ${b.getDate()} ${month(b)} ${year}`;
}

export function prettyDate(date: string): string {
  if (!date) return '';
  return new Date(date + 'T12:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

/**
 * Read one day from the bot and keep it fresh.
 * Returns the rows plus the controls the pages need.
 */
export function useDay(initialDate?: string) {
  const [date, setDate] = useState(initialDate || '');
  const [today, setToday] = useState('');
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [exists, setExists] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');

  const load = useCallback(async (d: string, quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch('/api/day' + (d ? '?date=' + encodeURIComponent(d) : ''));
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setRows(data.rows || []);
      setExists(data.exists !== false);
      setDate(data.date);
      setToday(data.today);
      setError('');
      setUpdatedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err: any) {
      setError(err?.message || 'Could not reach the bot');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(date); }, []);

  useEffect(() => {
    const t = setInterval(() => load(date, true), REFRESH_MS);
    return () => clearInterval(t);
  }, [date, load]);

  const goTo = useCallback((d: string) => { setDate(d); load(d); }, [load]);

  const shift = useCallback((days: number) => {
    const d = new Date((date || todayColombo()) + 'T12:00:00');
    d.setDate(d.getDate() + days);
    goTo(d.toISOString().slice(0, 10));
  }, [date, goTo]);

  return { rows, date, today, exists, loading, error, updatedAt, goTo, shift, reload: () => load(date) };
}

/** Turn seconds into m:ss for the player. */
export function clock(seconds: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** The URL the audio player should load for a clip. */
export function audioUrl(id: string): string {
  return '/api/audio/file?id=' + encodeURIComponent(id);
}

/**
 * The voice notes saved for one day, oldest first. Empty when none were kept.
 * Refreshed on a timer, so a recording that arrives while the page is open
 * turns up on its own.
 */
export function useAudio(date: string) {
  const [clips, setClips] = useState<AudioClip[]>([]);

  useEffect(() => {
    if (!date) return;
    let alive = true;

    const load = () => {
      fetch('/api/audio?date=' + encodeURIComponent(date))
        .then(r => r.json())
        .then(d => { if (alive) setClips(d.clips || []); })
        .catch(() => {});
    };

    setClips([]);
    load();
    const t = setInterval(load, REFRESH_MS);

    return () => { alive = false; clearInterval(t); };
  }, [date]);

  return clips;
}

/**
 * The days that have an update tab, newest first.
 * Used to put a dot on those days in the calendar.
 */
export function useDays() {
  const [days, setDays] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    fetch('/api/days')
      .then(r => r.json())
      .then(d => { if (alive) setDays(d.days || []); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return days;
}

/**
 * Monday to Sunday of the week that contains `date`, in order.
 * Days with no updates come back as zeros rather than being left out,
 * so the chart always shows a full week.
 */
export function useWeek(date: string) {
  const [week, setWeek] = useState<WeekDay[]>([]);
  const monday = date ? mondayOf(date) : '';

  useEffect(() => {
    if (!monday) return;
    let alive = true;

    fetch(`/api/week?start=${monday}&days=7`)
      .then(r => r.json())
      .then(d => {
        if (!alive) return;
        const days: WeekDay[] = (d.days || []).map((w: WeekDay) => ({
          ...w,
          label: `${w.day} ${Number(w.date.slice(8, 10))}`
        }));
        setWeek(days);
      })
      .catch(() => {});

    return () => { alive = false; };
  }, [monday]);

  return { week, monday };
}