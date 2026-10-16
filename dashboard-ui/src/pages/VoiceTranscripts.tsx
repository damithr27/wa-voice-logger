import { useState, useRef } from 'react';
import { Play, Pause, Copy, CheckCircle, Pencil, BookCheck, ClipboardList, Filter, Search, Languages } from 'lucide-react';
import {
  useDay, useAudio, isSinhala, initials, prettyDate, clock, audioUrl, splitEntries
} from '../api';

/** One update on screen: a single voice note, or a single typed message. */
interface Card {
  key: string;
  name: string;
  role: string;
  date: string;
  type: 'Morning Plan' | 'Evening Achievement';
  via: 'Voice' | 'Text';
  part: string;          // '2 of 3' when the person sent more than one
  lang: 'Sinhala' | 'English';
  duration: string;
  text: string;
  textEn: string;
  audioId: string | null;
  avatar: string;
}

/** A steady number from a card key, so the waveform does not jump about. */
function seed(key: string): number {
  let n = 0;
  for (let i = 0; i < key.length; i++) n = (n * 31 + key.charCodeAt(i)) % 9973;
  return n;
}

export default function VoiceTranscripts() {
  const { rows, date, today, error, updatedAt, shift, goTo } = useDay();
  const clips = useAudio(date);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState<string | null>(null);
  const [selected, setSelected] = useState<Card | null>(null);
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [langFilter, setLangFilter] = useState('All Languages');
  const [showEn, setShowEn] = useState(true);

  /**
   * Build one card per update.
   *
   * Someone may send three or four voice notes for the same session. Each
   * recording is kept separately on disk with its own transcript, so each one
   * gets its own card and its own play button. Typed messages have no
   * recording, so they are read back out of the sheet cell, which the bot
   * numbers once there is more than one.
   */
  const cards: Card[] = [];

  for (const r of rows) {
    const sessions = [
      { key: 'MORNING', label: 'Morning Plan' as const, cell: r.morning, cellEn: r.morningEn },
      { key: 'EVENING', label: 'Evening Achievement' as const, cell: r.evening, cellEn: r.eveningEn }
    ];

    for (const s of sessions) {
      // The recordings kept for this person and session, oldest first
      const mine = clips.filter(c => c.name === r.name && c.session === s.key);

      // The same updates as written in the sheet, used for typed messages
      // and for any recording that was not kept
      const entries = splitEntries(s.cell);
      const entriesEn = splitEntries(s.cellEn || '');

      // Pair each sheet entry with its recording. Matching on the text
      // itself keeps things right when a person sent both a voice note and
      // a typed message in the same session.
      const taken = new Set<number>();
      const flat = (s: string) => s.replace(/\s+/g, ' ').trim();

      const pick = (entry: string, i: number) => {
        const same = mine.findIndex((c, j) => !taken.has(j) && flat(c.text) === flat(entry));
        if (same >= 0) { taken.add(same); return mine[same]; }
        if (mine[i] && !taken.has(i)) { taken.add(i); return mine[i]; }
        return null;
      };

      const parts = entries.map((entry, i) => {
        const clip = pick(entry, i);
        return {
          clip,
          text: (clip?.text || entry).trim(),
          textEn: (clip?.textEn || entriesEn[i] || '').trim()
        };
      });

      // A recording with nothing in the sheet for it — rare, but it should
      // still be playable rather than hidden
      mine.forEach((clip, j) => {
        if (taken.has(j)) return;
        parts.push({ clip, text: (clip.text || '').trim(), textEn: (clip.textEn || '').trim() });
      });

      const count = parts.length;

      for (let i = 0; i < count; i++) {
        const { clip, text, textEn } = parts[i];
        if (!text) continue;

        cards.push({
          key: `${r.name}|${s.key}|${i}`,
          name: r.name,
          role: r.designation,
          date: prettyDate(date),
          type: s.label,
          via: clip ? 'Voice' : (r.kind === 'Voice' ? 'Voice' : 'Text'),
          part: count > 1 ? `${i + 1} of ${count}` : '',
          lang: isSinhala(text) ? 'Sinhala' : 'English',
          duration: clip ? clock(clip.seconds) : '—',
          text,
          textEn: textEn === '(translation not available)' ? '' : textEn,
          audioId: clip ? clip.id : null,
          avatar: initials(r.name)
        });
      }
    }
  }

  const playable = cards.filter(c => c.audioId).length;

  const filteredList = cards.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'All' || c.type === typeFilter;
    const matchLang = langFilter === 'All Languages' || c.lang === langFilter;
    return matchSearch && matchType && matchLang;
  });

  /** Play or pause one recording. Only one plays at a time. */
  const toggleAudio = (c: Card) => {
    const el = audioRef.current;
    if (!el || !c.audioId) return;

    if (playing === c.key) {
      el.pause();
      setPlaying(null);
      return;
    }

    el.src = audioUrl(c.audioId);
    setProgress(0);
    el.play().then(() => setPlaying(c.key)).catch(() => setPlaying(null));
  };

  const barHeight = (key: string, i: number) => 25 + ((seed(key) + i * 13) % 11) * 7;

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      {/* One player for the whole page — only one recording plays at a time */}
      <audio
        ref={audioRef}
        onTimeUpdate={e => {
          const el = e.currentTarget;
          setProgress(el.duration ? el.currentTime / el.duration : 0);
        }}
        onEnded={() => { setPlaying(null); setProgress(0); }}
        hidden
      />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Voice Message Transcripts</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {cards.length} update(s) on this day · {playable} playable recording(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => shift(-1)} aria-label="Previous day" className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-green-400">‹</button>
          <input
            type="date"
            value={date}
            onChange={e => { if (e.target.value) goTo(e.target.value); }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"
            aria-label="Select date"
          />
          <button type="button" onClick={() => shift(1)} aria-label="Next day" className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-green-400">›</button>
          <button type="button" onClick={() => goTo(today)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-green-400">Today</button>
          {updatedAt && <span className="text-xs text-slate-400">Updated {updatedAt}</span>}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          Could not reach the bot: {error}. Is it running?
        </div>
      )}

      {!clips.length && cards.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          No recordings kept for this day — the transcripts below are still complete.
          Playback works for voice notes received after audio saving was turned on.
        </div>
      )}

      {!cards.length && (
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-10 text-center text-sm text-slate-500">
          Nothing was recorded on {prettyDate(date)}.
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-sm">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search member..."
            className="pl-8 pr-4 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-green-400 w-44"
          />
        </div>
        <Filter size={14} className="text-slate-400" />
        {['All', 'Morning Plan', 'Evening Achievement'].map(f => (
          <button
            key={f}
            onClick={() => setTypeFilter(f)}
            className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
              typeFilter === f ? 'bg-green-600 text-white border-green-600' : 'border-slate-200 text-slate-600 hover:border-green-400'
            }`}
          >
            {f}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowEn(v => !v)}
            title="Show or hide the English translation on each card"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              showEn ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-blue-300'
            }`}
          >
            <Languages size={13} /> English
          </button>
          <select
            value={langFilter}
            onChange={e => setLangFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none text-slate-600"
          >
            <option>All Languages</option>
            <option>Sinhala</option>
            <option>English</option>
          </select>
        </div>
      </div>

      <div className="flex gap-5">
        {/* Transcript list */}
        <div className={`space-y-3 ${selected ? 'w-1/2' : 'w-full'} transition-all`}>
          {filteredList.map(c => (
            <div
              key={c.key}
              className={`bg-white border rounded-xl p-4 shadow-sm cursor-pointer transition-all hover:shadow-md ${
                selected?.key === c.key ? 'border-green-400 ring-2 ring-green-100' : 'border-slate-200'
              }`}
              onClick={() => setSelected(c)}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {c.avatar}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 text-sm truncate">{c.name}</div>
                    <div className="text-xs text-slate-500 truncate">{c.role}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-slate-400">{c.date} · {c.via}</div>
                  <div className="flex items-center gap-1 justify-end mt-0.5">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      c.type === 'Morning Plan' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {c.type}
                    </span>
                    {c.part && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-white">
                        {c.part}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-3 mb-3 text-xs text-slate-500">
                <span>🌐 {c.lang}</span>
                <span>⏱ {c.duration}</span>
                {c.textEn
                  ? <span className="px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">EN ready</span>
                  : <span className="px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-500">No translation</span>}
              </div>

              {/* Audio player — one per recording */}
              <div className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2 mb-3">
                <button
                  disabled={!c.audioId}
                  title={c.audioId ? 'Play this voice note' : 'This update was typed, or the audio was not kept'}
                  onClick={e => { e.stopPropagation(); toggleAudio(c); }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 transition-colors ${
                    c.audioId ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-300 cursor-not-allowed'
                  }`}
                >
                  {playing === c.key ? <Pause size={14} /> : <Play size={14} />}
                </button>
                {/* Waveform */}
                <div className="flex-1 flex items-center gap-0.5 h-6">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-all ${
                        playing === c.key && i / 32 <= progress ? 'bg-green-500' : 'bg-slate-300'
                      }`}
                      style={{ height: `${barHeight(c.key, i)}%` }}
                    />
                  ))}
                </div>
                <span className="text-xs text-slate-400 shrink-0">{c.duration}</span>
              </div>

              {/* This recording's own transcript */}
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{c.text}</p>
                <button className="text-[11px] text-blue-500 mt-1 hover:underline">View Full Transcript →</button>
              </div>

              {/* ...and its English translation */}
              {showEn && c.textEn && c.textEn !== c.text && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mt-2">
                  <div className="text-[10px] font-semibold text-blue-600 mb-1 uppercase tracking-wide">English</div>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{c.textEn}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-1/2 shrink-0">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-800">
                  Transcript Details{selected.part && ` · ${selected.part}`}
                </h3>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-700 flex items-center justify-center text-white font-bold">
                  {selected.avatar}
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{selected.name}</div>
                  <div className="text-xs text-slate-500">{selected.role}</div>
                  <div className="text-xs text-slate-400">
                    {selected.date} · {selected.type} · {selected.via} · {selected.lang}
                  </div>
                </div>
              </div>

              {/* The player again, so a long transcript can be checked against the audio */}
              {selected.audioId && (
                <div className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2 mb-4">
                  <button
                    onClick={() => toggleAudio(selected)}
                    className="w-9 h-9 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center text-white shrink-0"
                  >
                    {playing === selected.key ? <Pause size={15} /> : <Play size={15} />}
                  </button>
                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${(playing === selected.key ? progress : 0) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">{selected.duration}</span>
                </div>
              )}

              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                  {selected.lang} Transcript
                </div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{selected.text}</p>
              </div>

              {selected.textEn && selected.textEn !== selected.text && (
                <div className="bg-blue-50 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide">English Translation</div>
                    <button
                      onClick={() => copyText(selected.textEn)}
                      title="Copy the English"
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{selected.textEn}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => copyText(selected.text)}
                  className="flex items-center justify-center gap-2 py-2 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
                >
                  {copied ? <CheckCircle size={13} className="text-green-500" /> : <Copy size={13} />}
                  {copied ? 'Copied!' : 'Copy Transcript'}
                </button>
                <button className="flex items-center justify-center gap-2 py-2 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
                  <Pencil size={13} /> Edit Transcript
                </button>
                <button className="flex items-center justify-center gap-2 py-2 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700">
                  <BookCheck size={13} /> Mark as Verified
                </button>
                <button className="flex items-center justify-center gap-2 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <ClipboardList size={13} /> Add to Tasks
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
