import fs from 'node:fs'
import path from 'node:path'

// Empty the pending queue. Run with `npm run clear`.
// Audio files are moved to ./failed rather than deleted, so nothing is lost.

const DIR = './pending'

if (!fs.existsSync(DIR)) {
  console.log('Queue is already empty.')
  process.exit(0)
}

fs.mkdirSync('./failed', { recursive: true })

const files = fs.readdirSync(DIR)
let moved = 0

for (const f of files) {
  fs.renameSync(path.join(DIR, f), path.join('./failed', f))
  if (f.endsWith('.ogg')) moved++
}

fs.rmSync(DIR, { recursive: true, force: true })
console.log(`🧹 Queue cleared — ${moved} voice note(s) moved to ./failed`)
