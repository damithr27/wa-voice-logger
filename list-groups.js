import 'dotenv/config'
import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys'
import qrcode from 'qrcode-terminal'
import pino from 'pino'

// Group ID eka hoyaganna witharai. `npm run groups` kiyala run karanna.

const { state, saveCreds } = await useMultiFileAuthState('./auth')
const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }) })

sock.ev.on('creds.update', saveCreds)

sock.ev.on('connection.update', async ({ connection, qr }) => {
  if (qr) {
    console.log('\n📱 Scan karanna:\n')
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

    console.log('Oyage group eke id eka .env eke GROUP_ID ekata copy karanna.\n')
    process.exit(0)
  }
})
