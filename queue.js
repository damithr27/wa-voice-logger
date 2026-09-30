import fs from 'node:fs'
import path from 'node:path'
import { transcribe } from './gemini.js'

const DIR = './pending'

// How long to wait before each retry, in minutes.
// After the last one the job is given up on and moved to ./failed.
const BACKOFF_MINUTES = [0.5, 2, 5, 15, 30, 60, 120]

// Smallest gap between two Gemini calls, so requests are never sent at once
const MIN_GAP_MS = 2000

// A job older than this is given up on, even if it has attempts left.
// Stops yesterday's leftovers from being retried every time the bot starts.
const MAX_AGE_HOURS = +process.env.QUEUE_MAX_AGE_HOURS || 6

let onDone = null
let running = false
let lastCallAt = 0

const sleep = ms => new Promise(r => setTimeout(r, ms))

function ensureDir () {
  fs.mkdirSync(DIR, { recursive: true })
  fs.mkdirSync('./failed', { recursive: true })
}

/**
 * Every job waiting on disk.
 * Brand new jobs come first, so a message that just arrived is handled
 * straight away instead of waiting behind an older one that keeps failing.
 */
function listJobs () {
  ensureDir()
  return fs.readdirSync(DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try {
        return JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))
      } catch {
        return null
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.attempts - b.attempts || a.createdAt - b.createdAt)
}

function saveJob (job) {
  fs.writeFileSync(path.join(DIR, `${job.id}.json`), JSON.stringify(job, null, 2))
}

function removeJob (job) {
  for (const f of [`${job.id}.json`, `${job.id}.ogg`]) {
    try { fs.unlinkSync(path.join(DIR, f)) } catch {}
  }
}

/** Give up: keep the audio in ./failed so it can be looked at by hand. */
function giveUp (job, reason) {
  try {
    fs.renameSync(path.join(DIR, `${job.id}.ogg`), `./failed/${job.id}.ogg`)
    fs.writeFileSync(`./failed/${job.id}.json`, JSON.stringify({ ...job, reason }, null, 2))
  } catch {}
  removeJob(job)
  console.log(`   ❌ Gave up on ${job.name} after ${job.attempts} attempts — moved to ./failed`)
}

/**
 * Add a voice note to the queue. The audio is written to disk straight away,
 * so nothing is lost if the bot stops before it is processed.
 */
export function enqueueVoice (buffer, meta) {
  ensureDir()
  const id = `${meta.senderId}-${Date.now()}`
  fs.writeFileSync(path.join(DIR, `${id}.ogg`), buffer)

  const job = { id, ...meta, attempts: 0, nextTryAt: Date.now(), createdAt: Date.now() }
  saveJob(job)

  const waiting = listJobs().length
  console.log(`   📥 Queued${waiting > 1 ? ` (${waiting} waiting)` : ''}`)
  tick()
}

/** Work through the queue, one job at a time. */
async function tick () {
  if (running) return
  running = true

  try {
    while (true) {
      const jobs = listJobs()
      if (!jobs.length) break

      const now = Date.now()
      const job = jobs.find(j => j.nextTryAt <= now)
      if (!job) break // everything left is waiting for its retry time

      const audioPath = path.join(DIR, `${job.id}.ogg`)
      if (!fs.existsSync(audioPath)) { removeJob(job); continue }

      const ageHours = (now - job.createdAt) / 3_600_000
      if (ageHours > MAX_AGE_HOURS) {
        giveUp(job, `Older than ${MAX_AGE_HOURS} hours`)
        continue
      }

      // Never fire two requests back to back
      const gap = MIN_GAP_MS - (Date.now() - lastCallAt)
      if (gap > 0) await sleep(gap)

      job.attempts++
      console.log(`🎧 ${job.name} — ${job.session} (attempt ${job.attempts})`)

      try {
        const buffer = fs.readFileSync(audioPath)
        lastCallAt = Date.now()
        const result = await transcribe(buffer)

        await onDone({ job, text: result.transcript })
        removeJob(job)
      } catch (err) {
        lastCallAt = Date.now()
        const waitMin = BACKOFF_MINUTES[job.attempts - 1]

        if (waitMin === undefined) {
          giveUp(job, String(err.message).slice(0, 300))
          continue
        }

        job.nextTryAt = Date.now() + waitMin * 60_000
        job.lastError = String(err.message).slice(0, 200)
        saveJob(job)
        const waitText = waitMin < 1 ? `${waitMin * 60} sec` : `${waitMin} min`
        console.log(`   ⏳ All models busy — trying again in ${waitText} (${listJobs().length} in queue)`)
      }
    }
  } finally {
    running = false
  }
}

/**
 * Start the queue. `handler` is called with { job, text } once a voice note
 * has been transcribed; it should write the result to the sheet.
 */
export function startQueue (handler) {
  onDone = handler
  ensureDir()

  const waiting = listJobs().length
  if (waiting) {
    console.log(`📥 ${waiting} voice note(s) left over from last run`)
    console.log('   (to throw them away instead, stop the bot and delete the pending folder)')
  }

  // Check every 15 seconds for jobs whose retry time has come
  setInterval(tick, 15_000)
  tick()
}