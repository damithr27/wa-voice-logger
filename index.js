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

import { transcribe } from './gemini.js'
import { ensureHeaders, appendRow } from './sheets.js'

const roster = JSON.parse(fs.readFileSync('./roster.json', 'utf8'))
const GROUP_ID = process.env.GROUP_ID

const M_START = +process.env.MORNING_START || 5
const M_END = +process.env.MORNING_END || 12
const E_START = +process.env.EVENING_START || 13
const E_END = +process.env.EVENING_END || 24

// Ignore very short messages like "ok" or a single emoji
const MIN_TEXT_LENGTH = +process.env.MIN_TEXT_LENGTH || 10

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

  // Look up the name in the roster by phone number or LID
  const name = (phone && roster[phone]) || (lid && roster[lid]) || null
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

async function handleVoice (msg, sock) {
  const sender = identifySender(msg)
  const phone = sender.id
  const when = new Date(Number(msg.messageTimestamp) * 1000)
  const { date, time, hour } = colomboParts(when)

  const sessionByTime = sessionFromHour(hour)
  if (!sessionByTime) {
    console.log(`⏭️  ${phone} @ ${time} — dead zone, skipped`)
    return
  }

  const name = sender.name || `Unknown (${phone})`
  console.log(`🎤 ${name} — ${sessionByTime} @ ${time}`)
  if (!sender.name) {
    console.log(`   ℹ️  Add to roster.json:  "${phone}": "Name"`)
    if (sender.lid && sender.phone) console.log(`      (LID: ${sender.lid})`)
  }

  try {
    const buffer = await downloadMediaMessage(msg, 'buffer', {})
    const result = await transcribe(buffer)

    await appendRow({
      timestamp: when.toISOString(),
      date,
      time,
      name,
      phone,
      sessionByTime,
      sessionByAI: result.detected_session,
      transcript: result.transcript,
      audioQuality: result.audio_quality,
      unclearCount: result.unclear_count,
      duration: msg.message.audioMessage.seconds || '',
      type: 'VOICE'
    })

    const flag = sessionByTime !== result.detected_session ? ' ⚠️ session mismatch' : ''
    console.log(`   ✅ saved — ${result.audio_quality}, ${result.unclear_count} unclear${flag}`)
  } catch (err) {
    console.error(`   ❌ failed for ${name}:`, err.message)
    // Save the audio so it can be retried later
    fs.mkdirSync('./failed', { recursive: true })
    try {
      const buf = await downloadMediaMessage(msg, 'buffer', {})
      fs.writeFileSync(`./failed/${phone}-${Date.now()}.ogg`, buf)
    } catch {}
  }
}

async function handleText (msg, text) {
  const sender = identifySender(msg)
  const phone = sender.id
  const when = new Date(Number(msg.messageTimestamp) * 1000)
  const { date, time, hour } = colomboParts(when)

  const sessionByTime = sessionFromHour(hour)
  if (!sessionByTime) {
    console.log(`⏭️  ${phone} @ ${time} — dead zone, skipped`)
    return
  }

  const name = sender.name || `Unknown (${phone})`
  console.log(`💬 ${name} — ${sessionByTime} @ ${time}`)
  if (!sender.name) {
    console.log(`   ℹ️  Add to roster.json:  "${phone}": "Name"`)
  }

  try {
    // Text is saved exactly as written — no AI call needed
    await appendRow({
      timestamp: when.toISOString(),
      date,
      time,
      name,
      phone,
      sessionByTime,
      sessionByAI: 'N/A',
      transcript: text,
      audioQuality: '-',
      unclearCount: 0,
      duration: '',
      type: 'TEXT'
    })
    console.log(`   ✅ saved — ${text.length} characters`)
  } catch (err) {
    console.error(`   ❌ failed for ${name}:`, err.message)
  }
}

async function start () {
  await ensureHeaders()

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
        await handleVoice(msg, sock)
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