import 'dotenv/config'
import makeWASocket, {
  useMultiFileAuthState,
  downloadMediaMessage,
  DisconnectReason
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import qrcode from 'qrcode-terminal'
import pino from 'pino'
import fs from 'node:fs'

import { recordUpdate, checkAccess } from './sheets.js'
import { enqueueVoice, startQueue } from './queue.js'
import { startReminders } from './reminder.js'

const team = JSON.parse(fs.readFileSync('./team.json', 'utf8'))
const GROUP_ID = process.env.GROUP_ID

/**
 * Read a time from .env. Accepts a plain hour ("13") or HH:MM ("12:30"),
 * and returns the number of minutes since midnight.
 */
function toMinutes (value, fallback) {
  const raw = String(value ?? '').trim()
  if (!raw) return fallback

  const [h, m = '0'] = raw.split(':')
  const hours = Number(h)
  const mins = Number(m)
  if (Number.isNaN(hours) || Number.isNaN(mins)) return fallback

  return hours * 60 + mins
}

const M_START = toMinutes(process.env.MORNING_START, 5 * 60)
const M_END = toMinutes(process.env.MORNING_END, 13 * 60)
const E_START = toMinutes(process.env.EVENING_START, 13 * 60)
const E_END = toMinutes(process.env.EVENING_END, 24 * 60)

// Ignore very short messages like "ok" or a single emoji
const MIN_TEXT_LENGTH = +process.env.MIN_TEXT_LENGTH || 10

// Send a private thank-you to the sender once their update is saved.
// While testing, REPLY_ONLY_TO limits this to one id so nobody else is messaged.
const SEND_REPLY = process.env.SEND_REPLY !== 'false'
const REPLY_ONLY_TO = (process.env.REPLY_ONLY_TO || '')
  .split(',')
  .map(x => x.trim())
  .filter(Boolean)

// Build a lookup of every id (phone number or LID) to the person's name
let waSocket = null
let remindersStarted = false

const nameById = new Map()
for (const p of team) {
  for (const id of p.ids || []) nameById.set(String(id), p.name)
}
console.log(`👥 ${team.length} people loaded, ${nameById.size} ids mapped`)

/** Determine the session from the message time (Asia/Colombo). */
function sessionFromTime (hour, minute) {
  const mins = hour * 60 + minute
  if (mins >= M_START && mins < M_END) return 'MORNING'
  if (mins >= E_START && mins < E_END) return 'EVENING'
  return null // Outside working hours
}

function colomboParts (date) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  })
  const p = Object.fromEntries(fmt.formatToParts(date).map(x => [x.type, x.value]))
    return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}:${p.second}`,
    hour: +p.hour,
    minute: +p.minute
  }
}

/**
 * Identify who sent the message.
 * WhatsApp groups now use a hidden "LID" identifier for privacy,
 * so we check every field that might contain the real phone number.
 */
function identifySender (msg) {
  const k = msg.key
  const candidates = [
    k.participantPn,        // newer Baileys — real phone number
    k.participantAlt,
    k.senderPn,
    k.participant,          // may be a LID
    k.remoteJid
  ].filter(Boolean)

  const phoneJid = candidates.find(j => j.endsWith('@s.whatsapp.net'))
  const lidJid = candidates.find(j => j.endsWith('@lid'))

  const phone = phoneJid ? phoneJid.split('@')[0].split(':')[0] : null
  const lid = lidJid ? lidJid.split('@')[0] : null

  // Match against team.json by phone number or LID
  const name = (phone && nameById.get(phone)) || (lid && nameById.get(lid)) || null
  const id = phone || lid || candidates[0]?.split('@')[0] || 'unknown'

  // A private chat can only be opened with a real phone number, not a LID
  const jid = phoneJid || null

  return { id, phone, lid, name, jid }
}

/** Pull the most useful message out of an error object. */
function errorDetail (err) {
  return err?.response?.data?.error?.message
    || err?.errors?.[0]?.message
    || err?.message
    || String(err)
}

/** Extract plain text from a message, if it has any. */
function extractText (msg) {
  const m = msg.message
  return m?.conversation
    || m?.extendedTextMessage?.text
    || null
}

// Words that mean a half day, in English, Sinhala and Singlish
const HALF_DAY_PATTERNS = [
  /\bhalf[- ]?day\b/i,
  /අර්ධ\s*දින/,
  /හාෆ්\s*ඩේ/,
  /\bhaf?[- ]?day\b/i
]

// Words that mean the person is on leave
const LEAVE_PATTERNS = [
  /\bleaves?\b/i,              // leave, Leave, LEAVE
  /\bon leave\b/i,
  /නිවාඩු/,                     // nivadu, nivaduwa, nivaduwak
  /\bni[vw]a?ad?u\b/i          // niwadu, nivadu
]

/**
 * Work out whether a message says the person is on leave.
 * Returns 'Half Day', 'Leave' or '' — the same values as the Leave dropdown.
 */
function detectLeave (text) {
  if (HALF_DAY_PATTERNS.some(re => re.test(text))) return 'Half Day'
  if (LEAVE_PATTERNS.some(re => re.test(text))) return 'Leave'
  return ''
}

/** Shared work for both voice and text: figure out who, when and which session. */
function prepare (msg) {
  const sender = identifySender(msg)
  const when = new Date(Number(msg.messageTimestamp) * 1000)
  const { date, time, hour, minute } = colomboParts(when)
  const session = sessionFromTime(hour, minute)
  return { sender, date, time, session }
}

/**
 * Send a short private thank-you to the person who sent the update.
 * Never throws — a failed reply must not affect what was already saved.
 */
async function sendThankYou ({ senderJid, senderId, name, session, status }) {
  if (!SEND_REPLY || !waSocket || !senderJid) return
  if (REPLY_ONLY_TO.length && !REPLY_ONLY_TO.includes(senderId)) return

  const when = session === 'MORNING' ? 'morning' : 'evening'
  const firstName = name.split(/[\s.]+/).filter(Boolean).pop() || name

  let message = `Thank you, ${firstName}. Your ${when} update has been recorded.`
  if (status === 'Both Sent') {
    message += '\nBoth your morning and evening updates are complete for today.'
  }

  try {
    await waSocket.sendMessage(senderJid, { text: message })
    console.log('   💬 Thank-you sent')
  } catch (err) {
    console.log('   ⚠️  Could not send the thank-you:', errorDetail(err))
  }
}

async function save ({ senderId, senderJid, name, date, session, kind, text }) {
  const leaveType = detectLeave(text)
  const result = await recordUpdate({ date, name, session, kind, text, leaveType })

  if (result.matched) {
    const leaveNote = leaveType ? ` 🏖️ ${leaveType}` : ''
    console.log(`   ✅ saved — row ${result.row}, ${result.status}${leaveNote}`)
    await sendThankYou({ senderJid, senderId, name, session, status: result.status })
  } else {
    console.log('   ⚠️  Not in team.json — saved to the Unmatched tab')
    console.log(`   ℹ️  Add "${senderId}" to the right person's "ids" in team.json`)
  }
}

async function handleVoice (msg) {
  const { sender, date, time, session } = prepare(msg)
  if (!session) {
    console.log(`⏭️  ${sender.id} @ ${time} — outside working hours, skipped`)
    return
  }

  const name = sender.name || `Unknown (${sender.id})`
  console.log(`🎤 ${name} — ${session} @ ${time}`)

  try {
    // Save the audio and queue it. Transcription happens one job at a time,
    // so two voice notes sent together never hit Gemini at the same moment.
    const buffer = await downloadMediaMessage(msg, 'buffer', {})
    enqueueVoice(buffer, {
      senderId: sender.id,
      senderJid: sender.jid,
      name,
      date,
      session,
      kind: 'Voice'
    })
  } catch (err) {
    console.error('   ❌ Could not download the audio:', err.message)
  }
}

async function handleText (msg, text) {
  const { sender, date, time, session } = prepare(msg)
  if (!session) {
    console.log(`⏭️  ${sender.id} @ ${time} — outside working hours, skipped`)
    return
  }

  console.log(`💬 ${sender.name || `Unknown (${sender.id})`} — ${session} @ ${time}`)

  try {
    // Text is saved exactly as written — no AI call needed
    await save({
      senderId: sender.id,
      senderJid: sender.jid,
      name: sender.name || `Unknown (${sender.id})`,
      date,
      session,
      kind: 'Text',
      text
    })
  } catch (err) {
    console.error('   ❌ Could not save:', errorDetail(err))
  }
}

async function start () {
  try {
    await checkAccess()
  } catch (err) {
    console.error('❌ Cannot reach the Google Sheet:', errorDetail(err))
    console.error('   Check SHEET_ID in .env, and that the sheet is shared')
    console.error('   with the client_email from credentials.json as an Editor.')
    process.exit(1)
  }

  // Transcribed voice notes come back here and go straight to the sheet
  startQueue(async ({ job, text }) => {
    await save({
      senderId: job.senderId,
      senderJid: job.senderJid,
      name: job.name,
      date: job.date,
      session: job.session,
      kind: job.kind,
      text
    })
  })

  const { state, saveCreds } = await useMultiFileAuthState('./auth')
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    markOnlineOnConnect: false // Keep phone notifications working
  })

  waSocket = sock
  sock.ev.on('creds.update', saveCreds)

  // Reminders read the socket when they fire, so a reconnect is picked up
  if (!remindersStarted) {
    startReminders(() => waSocket)
    remindersStarted = true
  }

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\n📱 WhatsApp > Linked devices > Link a device\n')
      qrcode.generate(qr, { small: true })
    }
    if (connection === 'open') console.log('✅ Connected. Listening...\n')
    if (connection === 'close') {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode
      if (code !== DisconnectReason.loggedOut) {
        console.log('🔄 Reconnecting...')
        start()
      } else {
        console.log('❌ Logged out. Delete ./auth and scan again.')
      }
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    for (const msg of messages) {
      if (msg.key.remoteJid !== GROUP_ID) continue
      if (msg.key.fromMe) continue

      if (msg.message?.audioMessage) {
        await handleVoice(msg)
        continue
      }

      const text = extractText(msg)
      if (!text) continue

      const trimmed = text.trim()
      if (trimmed.length < MIN_TEXT_LENGTH) {
        console.log(`⏭️  Text ignored — only ${trimmed.length} characters (minimum is ${MIN_TEXT_LENGTH})`)
        continue
      }

      await handleText(msg, trimmed)
    }
  })
}

start()