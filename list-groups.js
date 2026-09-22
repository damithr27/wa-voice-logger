import 'dotenv/config'
import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys'
import qrcode from 'qrcode-terminal'
import pino from 'pino'

// Only used to find the group ID. Run with `npm run groups`.

const { state, saveCreds } = await useMultiFileAuthState('./auth')
const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }) })

sock.ev.on('creds.update', saveCreds)

sock.ev.on('connection.update', async ({ connection, qr }) => {
  if (qr) {
    console.log('\n📱 Scan this QR code:\n')
    qrcode.generate(qr, { small: true })
  }
  if (connection === 'open') {
    await new Promise(r => setTimeout(r, 3000))
    const groups = await sock.groupFetchAllParticipating()

    console.log('\n📋 Groups:\n')
    for (const g of Object.values(groups)) {
      console.log(`  ${g.subject}`)
      console.log(`  → ${g.id}`)
      console.log(`  (${g.participants.length} members)\n`)
    }

    console.log('Copy your group ID into GROUP_ID in the .env file.\n')
    process.exit(0)
  }
})