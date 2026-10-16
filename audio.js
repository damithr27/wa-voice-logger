import fs from 'node:fs'
import path from 'node:path'

// Where the voice notes are kept after they have been transcribed.
// One folder per day, plus a small index.json listing what is in it.
const DIR = process.env.AUDIO_DIR || './audio'

// Older day folders are removed on startup. Set 0 to keep everything.
const KEEP_DAYS = process.env.AUDIO_KEEP_DAYS === undefined
  ? 30
  : +process.env.AUDIO_KEEP_DAYS

// Set AUDIO_SAVE=false to delete voice notes after transcribing, as before
export const SAVING = process.env.AUDIO_SAVE !== 'false'

const ID_OK = /^\d{4}-\d{2}-\d{2}__[A-Za-z0-9._-]+$/

function dayDir (date) {
  return path.join(DIR, date)
}

function indexPath (date) {
  return path.join(dayDir(date), 'index.json')
}

function readIndex (date) {
  try {
    return JSON.parse(fs.readFileSync(indexPath(date), 'utf8'))
  } catch {
    return []
  }
}

function writeIndex (date, entries) {
  fs.mkdirSync(dayDir(date), { recursive: true })
  fs.writeFileSync(indexPath(date), JSON.stringify(entries, null, 2))
}

/**
 * Keep a transcribed voice note.
 * The file is moved out of the queue folder into the day's archive,
 * and a line is added to that day's index.
 */
export function archive (job, srcPath, text, textEn) {
  if (!SAVING) return null

  try {
    const date = job.date
    const id = `${date}__${job.id}`
    const file = `${job.id}.ogg`
    const dest = path.join(dayDir(date), file)

    fs.mkdirSync(dayDir(date), { recursive: true })
    fs.renameSync(srcPath, dest)

    const entry = {
      id,
      date,
      file,
      name: job.name,
      senderId: job.senderId,
      session: job.session,
      seconds: job.seconds || 0,
      bytes: fs.statSync(dest).size,
      savedAt: new Date().toISOString(),
      // Each recording keeps its own transcript and English translation, so
      // several voice notes from one person stay separate in the dashboard
      text: text || '',
      textEn: textEn || ''
    }

    const entries = readIndex(date).filter(e => e.id !== id)
    entries.push(entry)
    writeIndex(date, entries)

    return entry
  } catch (err) {
    // Keeping the audio is a bonus — never let it break the main flow
    console.log('   ⚠️  Could not archive the audio:', err.message)
    return null
  }
}

/** Every saved voice note for one day, oldest first. */
export function listDay (date) {
  return readIndex(date).sort((a, b) => String(a.savedAt).localeCompare(String(b.savedAt)))
}

/** Find a saved file by its id. Returns null if the id looks wrong or is gone. */
export function resolve (id) {
  if (!ID_OK.test(id)) return null

  const [date] = id.split('__')
  const entry = readIndex(date).find(e => e.id === id)
  if (!entry) return null

  const file = path.join(dayDir(date), entry.file)
  if (!fs.existsSync(file)) return null

  return { file, entry }
}

/** Delete day folders older than KEEP_DAYS. Called once at startup. */
export function cleanup () {
  if (!SAVING || !KEEP_DAYS || !fs.existsSync(DIR)) return 0

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - KEEP_DAYS)
  const limit = cutoff.toISOString().slice(0, 10)

  let removed = 0
  for (const name of fs.readdirSync(DIR)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(name)) continue
    if (name >= limit) continue
    try {
      fs.rmSync(path.join(DIR, name), { recursive: true, force: true })
      removed++
    } catch {}
  }

  if (removed) console.log(`🧹 Removed ${removed} day(s) of audio older than ${KEEP_DAYS} days`)
  return removed
}

/** How much space the archive is using, for the startup line. */
export function stats () {
  if (!fs.existsSync(DIR)) return { days: 0, files: 0, mb: 0 }

  let files = 0
  let bytes = 0
  let days = 0

  for (const name of fs.readdirSync(DIR)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(name)) continue
    days++
    for (const e of readIndex(name)) {
      files++
      bytes += e.bytes || 0
    }
  }

  return { days, files, mb: Math.round((bytes / 1048576) * 10) / 10 }
}