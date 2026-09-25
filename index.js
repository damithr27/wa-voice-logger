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

import { recordUpdate } from './sheets.js'
import { enqueueVoice, startQueue } from './queue.js'

const team = JSON.parse(fs.readFileSync('./team.json', 'utf8'))
const GROUP_ID = process.env.GROUP_ID

const M_START = +process.env.MORNING_START || 5
const M_END = +process.env.MORNING_END || 12
const E_START = +process.env.EVENING_START || 13
const E_END = +process.env.EVENING_END || 24

// Ignore very short messages like "ok" or a single emoji
const MIN_TEXT_LENGTH = +process.env.MIN_TEXT_LENGTH || 10

// Build a lookup of every id (phone number or LID) to the person's name
const nameById = new Map()
for (const p of team) {
  for (const id of p.ids || []) nameById.set(String(id), p.name)
}
console.log(`👥 ${team.length} people loaded, ${nameById.size} ids mapped`)

/** Determine the session from the message hour (Asia/Colombo). */
function sessionFromHour (hour) {
  if (hour >= M_START && hour < M_END) return 'MORNING'
  if (hour >= E_START && hour < E_END) return 'EVENING'
  return null // 12–1 dead zone
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
    hour: +p.hour
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

  return { id, phone, lid, name }
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
  const { date, time, hour } = colomboParts(when)
  const session = sessionFromHour(hour)
  return { sender, date, time, session }
}

async function save ({ senderId, name, date, session, kind, text }) {
  const leaveType = detectLeave(text)
  const result = await recordUpdate({ date, name, session, kind, text, leaveType })

  if (result.matched) {
    const leaveNote = leaveType ? ` 🏖️ ${leaveType}` : ''
    console.log(`   ✅ saved — row ${result.row}, ${result.status}${leaveNote}`)
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
    enqueueVoice(buffer, { senderId: sender.id, name, date, session, kind: 'Voice' })
  } catch (err) {
    console.error('   ❌ Could not download the audio:', err.message)
  }
}

async function handleText (msg, text) {
  const { sender, date, time, session } = prepare(msg)
  if (!session) {
    console.log(`⏭️  ${sender.id} @ ${time} — dead zone, skipped`)
    return
  }

  console.log(`💬 ${sender.name || `Unknown (${sender.id})`} — ${session} @ ${time}`)

  try {
    // Text is saved exactly as written — no AI call needed
    await save({
      senderId: sender.id,
      name: sender.name || `Unknown (${sender.id})`,
      date,
      session,
      kind: 'Text',
      text
    })
  } catch (err) {
    console.error('   ❌ failed:', err.message)
  }
}

async function start () {
  // Transcribed voice notes come back here and go straight to the sheet
  startQueue(async ({ job, text }) => {
    await save({
      senderId: job.senderId,
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

  sock.ev.on('creds.update', saveCreds)

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
      if (text && text.trim().length >= MIN_TEXT_LENGTH) {
        await handleText(msg, text.trim())
      }
    }
  })
}

start()