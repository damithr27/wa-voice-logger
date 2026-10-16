import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getDay, listDays } from './sheets.js'
import { listDay as listAudio, resolve as resolveAudio } from './audio.js'

const PORT = +process.env.DASHBOARD_PORT || 3000
const HERE = path.dirname(fileURLToPath(import.meta.url))

/** Today's date in Colombo, as YYYY-MM-DD. */
function today () {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric', month: '2-digit', day: '2-digit'
  })
  return fmt.format(new Date())
}

/** Short weekday name for a YYYY-MM-DD date. */
function dayName (date) {
  return new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })
}

/** Move a YYYY-MM-DD date by a number of days. */
function addDays (date, by) {
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() + by)
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function send (res, code, body, type = 'application/json') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' })
  res.end(typeof body === 'string' ? body : JSON.stringify(body))
}

const UI_DIR = path.join(HERE, 'dashboard-dist')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2'
}

/**
 * Serve a file from the built React app.
 * Returns true if it handled the request, false to fall through.
 */
function serveStatic (pathname, res) {
  if (!fs.existsSync(UI_DIR)) return false

  // Anything that is not a file request falls back to index.html,
  // so the single-page app can handle its own routing.
  const rel = pathname === '/' || !path.extname(pathname) ? 'index.html' : pathname.slice(1)
  const file = path.join(UI_DIR, rel)

  // Never serve anything outside the build folder
  if (!file.startsWith(UI_DIR)) return false
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return false

  const type = MIME[path.extname(file)] || 'application/octet-stream'
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' })
  res.end(fs.readFileSync(file))
  return true
}

/** Start the dashboard web server. Safe to call from inside the bot. */
export function startDashboard () {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`)

    try {
      // The built React dashboard, when it has been built
      if (!url.pathname.startsWith('/api/') && serveStatic(url.pathname, res)) {
        return
      }

      // Fallback: the simple built-in page
      if (url.pathname === '/') {
        const html = fs.readFileSync(path.join(HERE, 'dashboard.html'), 'utf8')
        return send(res, 200, html, 'text/html; charset=utf-8')
      }

      if (url.pathname === '/api/day') {
        const date = url.searchParams.get('date') || today()
        const data = await getDay(date)
        return send(res, 200, { date, today: today(), ...data })
      }

      // The saved voice notes for one day
      if (url.pathname === '/api/audio') {
        const date = url.searchParams.get('date') || today()
        return send(res, 200, { date, clips: listAudio(date) })
      }

      // The audio itself, streamed to the player
      if (url.pathname === '/api/audio/file') {
        const found = resolveAudio(url.searchParams.get('id') || '')
        if (!found) return send(res, 404, { error: 'Not found' })

        const stat = fs.statSync(found.file)
        const range = req.headers.range

        // Browsers ask for a byte range so they can seek
        if (range) {
          const [a, b] = range.replace('bytes=', '').split('-')
          const start = parseInt(a, 10) || 0
          const end = b ? parseInt(b, 10) : stat.size - 1

          res.writeHead(206, {
            'Content-Type': 'audio/ogg',
            'Content-Range': `bytes ${start}-${end}/${stat.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': end - start + 1
          })
          return fs.createReadStream(found.file, { start, end }).pipe(res)
        }

        res.writeHead(200, {
          'Content-Type': 'audio/ogg',
          'Content-Length': stat.size,
          'Accept-Ranges': 'bytes'
        })
        return fs.createReadStream(found.file).pipe(res)
      }

      if (url.pathname === '/api/week') {
        const n = Math.min(+url.searchParams.get('days') || 5, 31)
        const start = url.searchParams.get('start')

        // With a start date, return exactly those days in order, including
        // the ones with no tab. Without one, fall back to the most recent
        // days that do have a tab.
        let days
        if (start && /^\d{4}-\d{2}-\d{2}$/.test(start)) {
          days = Array.from({ length: n }, (_, i) => addDays(start, i))
        } else {
          const all = await listDays()
          days = all.slice(0, n).reverse()
        }

        const out = []
        for (const d of days) {
          // A day with no tab is reported as empty, not as everyone missing
          if (d > today()) {
            out.push({ date: d, day: dayName(d), exists: false, future: true, morning: 0, evening: 0, both: 0, none: 0, leave: 0 })
            continue
          }

          const { exists, rows } = await getDay(d)
          if (!exists) {
            out.push({ date: d, day: dayName(d), exists: false, future: false, morning: 0, evening: 0, both: 0, none: 0, leave: 0 })
            continue
          }

          let morning = 0, evening = 0, both = 0, none = 0, leave = 0
          rows.forEach(r => {
            const hasM = !!r.morning, hasE = !!r.evening
            if (hasM) morning++
            if (hasE) evening++
            if (hasM && hasE) both++
            if (!hasM && !hasE) { r.leave ? leave++ : none++ }
          })
          out.push({ date: d, day: dayName(d), exists: true, future: false, morning, evening, both, none, leave })
        }
        return send(res, 200, { days: out })
      }

      if (url.pathname === '/api/days') {
        return send(res, 200, { days: await listDays(), today: today() })
      }

      send(res, 404, { error: 'Not found' })
    } catch (err) {
      console.error('Request failed:', err.message)
      send(res, 500, { error: err.message })
    }
  })

  server.on('error', err => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️  Port ${PORT} is already in use \u2014 dashboard not started`)
      console.log('   (is it already running in another window?)')
    } else {
      console.log('⚠️  Dashboard error:', err.message)
    }
  })

  server.listen(PORT, () => {
    const which = fs.existsSync(UI_DIR) ? 'Dashboard' : 'Dashboard (simple page)'
    console.log(`📊 ${which} at http://localhost:${PORT}`)
  })

  return server
}

// Running this file on its own still works: `npm run dashboard`
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await import('dotenv/config')
  } catch {
    // .env is already loaded when the bot imports this file
  }
  startDashboard()
}