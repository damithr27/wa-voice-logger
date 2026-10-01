import fs from 'node:fs'
import { getPending } from './sheets.js'

const team = JSON.parse(fs.readFileSync('./team.json', 'utf8'))

// Reminder times, as HH:MM in 24-hour Asia/Colombo time.
// Set them in .env, e.g. MORNING_REMINDER=12:30
const MORNING_REMINDER = process.env.MORNING_REMINDER || '12:30'
const EVENING_REMINDER = process.env.EVENING_REMINDER || '23:30'
const REMINDERS_ON = process.env.REMINDERS_ENABLED !== 'false'

// While testing, REMIND_ONLY_TO limits reminders to these ids.
// Leave it empty to remind everyone who has an id in team.json.
const REMIND_ONLY_TO = (process.env.REMIND_ONLY_TO || '')
  .split(',')
  .map(x => x.trim())
  .filter(Boolean)

// Gap between two reminder messages, so they are not sent all at once
const GAP_MS = +process.env.REMINDER_GAP_MS || 3000

const sleep = ms => new Promise(r => setTimeout(r, ms))

// Remembers which reminders have already gone out today, so a reminder
// is never sent twice even though the clock is checked every minute.
const sentToday = new Set()

// Look up how to reach each person by name
const contactByName = new Map()
for (const p of team) {
  const ids = (p.ids || []).map(String)
  if (ids.length) contactByName.set(p.name, ids)
}

/** Current date and time in Colombo, as { date, time }. */
function colomboNow () {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: false
  })
  const p = Object.fromEntries(fmt.formatToParts(new Date()).map(x => [x.type, x.value]))
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`
  }
}

// Phone numbers with a country code are about 11 to 13 digits;
// a LID is longer, so the length tells the two apart.
const MAX_PHONE_DIGITS = 13

/** Turn an id into something sendMessage accepts. */
function toJid (id) {
  return id.length > MAX_PHONE_DIGITS ? `${id}@lid` : `${id}@s.whatsapp.net`
}

function buildMessage (name, session, deadline) {
  const which = session === 'MORNING' ? 'morning' : 'evening'
  const firstName = name.split(/[\s.]+/).filter(Boolean).pop() || name

  return [
    `Hello ${firstName},`,
    '',
    `Your ${which} update has not been received yet.`,
    `Please send it before ${deadline}.`,
    '',
    'A voice note or a text message both work.'
  ].join('\n')
}

async function sendReminders (sock, session, deadline) {
  const { date } = colomboNow()

  let pending
  try {
    pending = await getPending(date, session)
  } catch (err) {
    console.log(`⚠️  Could not read the sheet for the ${session} reminder:`, err.message)
    return
  }

  if (!pending.length) {
    console.log(`⏰ ${session} reminder — everyone has sent theirs`)
    return
  }

  let sent = 0
  let skipped = 0

  for (const name of pending) {
    const ids = contactByName.get(name)
    if (!ids) { skipped++; continue }

    // In test mode, only the listed ids are messaged
    if (REMIND_ONLY_TO.length && !ids.some(id => REMIND_ONLY_TO.includes(id))) {
      skipped++
      continue
    }

    // Prefer a phone number over a LID
    const id = ids.find(x => x.length <= MAX_PHONE_DIGITS) || ids[0]

    try {
      await sock.sendMessage(toJid(id), { text: buildMessage(name, session, deadline) })
      console.log(`   📨 Reminded ${name}`)
      sent++
      await sleep(GAP_MS)
    } catch (err) {
      console.log(`   ⚠️  Could not remind ${name}:`, err.message)
    }
  }

  console.log(`⏰ ${session} reminder done — ${sent} sent, ${skipped} skipped, ${pending.length} pending in total`)
}

/**
 * Check the clock every minute and send reminders when one is due.
 * Called once at startup; getSocket is read each time so a reconnect is used.
 */
export function startReminders (getSocket) {
  if (!REMINDERS_ON) {
    console.log('⏰ Reminders are off')
    return
  }

  const who = REMIND_ONLY_TO.length
    ? `test mode — only ${REMIND_ONLY_TO.length} id(s)`
    : `${contactByName.size} people have ids`
  console.log(`⏰ Reminders set for ${MORNING_REMINDER} and ${EVENING_REMINDER} (${who})`)

  setInterval(async () => {
    const { date, time } = colomboNow()
    const sock = getSocket()
    if (!sock) return

    for (const [session, at, deadline] of [
      ['MORNING', MORNING_REMINDER, '1:00 PM'],
      ['EVENING', EVENING_REMINDER, 'midnight']
    ]) {
      const key = `${date}-${session}`
      if (time !== at || sentToday.has(key)) continue

      sentToday.add(key)
      await sendReminders(sock, session, deadline)
    }
  }, 60_000)
}