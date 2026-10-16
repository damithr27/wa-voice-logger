import { google } from 'googleapis'
import fs from 'node:fs'

const team = JSON.parse(fs.readFileSync('./team.json', 'utf8'))

// Headers exactly as they appear in the Demo sheet, trailing spaces included
const HEADERS = [
  'Name', 'Designation ', 'Leave', 'On', 'Text/ Voice', 'Off',
  'Morning Target ', 'Evening Achievement ', 'Daily Update Status',
  'Morning Target (English)', 'Evening Achievement (English)'
]

// A Name | B Designation | C Leave | D On | E Text/Voice | F Off
// G Morning Target | H Evening Achievement | I Daily Update Status
// J Morning Target (English) | K Evening Achievement (English)
//
// G and H hold what was actually said, in Sinhala or English.
// J and K hold the English translation of the same thing.

const HEADER_GREEN = '#6AA84F'

// Column widths in pixels, roughly matching the Demo sheet
const WIDTHS = [260, 400, 110, 85, 100, 70, 460, 620, 130, 460, 620]

/**
 * Dropdown options per column, with the chip colour for each value.
 * column is the 0-based index (A=0, B=1, C=2 ...).
 * Edit these lists to change what the dropdowns offer.
 */
const DROPDOWNS = [
  {
    column: 2, // C Leave
    options: [
      { value: 'Leave', bg: '#FFCFC9' },
      { value: 'Half Day', bg: '#FFE5A0' }
    ]
  },
  {
    column: 4, // E Text/ Voice
    options: [
      { value: 'Text', bg: '#FFC8AA' },
      { value: 'Voice', bg: '#D4EDBC' }
    ]
  },
  {
    column: 8, // I Daily Update Status
    options: [
      { value: 'Both Sent', bg: '#D4EDBC' },
      { value: 'Morning Only', bg: '#FFC8AA' },
      { value: 'Evening Only', bg: '#FFE5A0' },
      { value: 'Not Sent', bg: '#B10202', fg: '#FFFFFF', bold: true }
    ]
  }
]

let sheetsApi = null
const dayCache = new Map()   // date -> Map(name -> row number)

/** Turn "#RRGGBB" into the colour object the Sheets API expects. */
function rgb (hex) {
  const h = hex.replace('#', '')
  return {
    red: parseInt(h.slice(0, 2), 16) / 255,
    green: parseInt(h.slice(2, 4), 16) / 255,
    blue: parseInt(h.slice(4, 6), 16) / 255
  }
}

async function getApi () {
  if (sheetsApi) return sheetsApi

  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_CREDENTIALS || './credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  })

  sheetsApi = google.sheets({ version: 'v4', auth: await auth.getClient() })
  return sheetsApi
}

// The tab list is asked for on every read. Google counts each of those
// against a per-minute quota, so it is held for a few seconds. Anything
// that adds a tab clears it straight away.
const TABS_TTL_MS = 30_000
let tabsCache = { at: 0, names: null }

function forgetTabs () {
  tabsCache = { at: 0, names: null }
}

async function listTabs () {
  if (tabsCache.names && Date.now() - tabsCache.at < TABS_TTL_MS) {
    return tabsCache.names
  }

  const api = await getApi()
  const meta = await api.spreadsheets.get({ spreadsheetId: process.env.SHEET_ID })
  const names = meta.data.sheets.map(s => s.properties.title)

  tabsCache = { at: Date.now(), names }
  return names
}

/**
 * Build every formatting request for a new tab: header styling, column widths,
 * dropdown lists and the coloured chips for each dropdown value.
 */
function formatRequests (sheetId, rowCount) {
  const lastRow = rowCount + 1   // header is row 1, so people end here
  const requests = []

  // Green header row
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: HEADERS.length },
      cell: {
        userEnteredFormat: {
          backgroundColor: rgb(HEADER_GREEN),
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
          wrapStrategy: 'WRAP'
        }
      },
      fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,wrapStrategy)'
    }
  })

  // Taller header row
  requests.push({
    updateDimensionProperties: {
      range: { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
      properties: { pixelSize: 38 },
      fields: 'pixelSize'
    }
  })

  // Column widths
  WIDTHS.forEach((w, i) => {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: w },
        fields: 'pixelSize'
      }
    })
  })

  // Wrap the long text columns so the transcript stays readable.
  // G, H hold what was said; J, K hold the English translation.
  for (const [from, to] of [[6, 8], [9, 11]]) {
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex: lastRow, startColumnIndex: from, endColumnIndex: to },
        cell: { userEnteredFormat: { wrapStrategy: 'WRAP', verticalAlignment: 'TOP' } },
        fields: 'userEnteredFormat(wrapStrategy,verticalAlignment)'
      }
    })
  }

  // Give the two English columns a light grey tint, so it is clear at a
  // glance that they are the translation and not the original words
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 1, endRowIndex: lastRow, startColumnIndex: 9, endColumnIndex: 11 },
      cell: { userEnteredFormat: { textFormat: { italic: true } } },
      fields: 'userEnteredFormat(textFormat)'
    }
  })

  // Centre the short status columns
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 1, endRowIndex: lastRow, startColumnIndex: 2, endColumnIndex: 6 },
      cell: { userEnteredFormat: { horizontalAlignment: 'CENTER' } },
      fields: 'userEnteredFormat(horizontalAlignment)'
    }
  })

  for (const d of DROPDOWNS) {
    const range = {
      sheetId,
      startRowIndex: 1,
      endRowIndex: lastRow,
      startColumnIndex: d.column,
      endColumnIndex: d.column + 1
    }

    // The dropdown itself. strict: false means the bot can always write,
    // even if a value is later removed from the list.
    requests.push({
      setDataValidation: {
        range,
        rule: {
          condition: {
            type: 'ONE_OF_LIST',
            values: d.options.map(o => ({ userEnteredValue: o.value }))
          },
          showCustomUi: true,
          strict: false
        }
      }
    })

    // One conditional format rule per value gives the coloured chip look
    d.options.forEach((o, i) => {
      requests.push({
        addConditionalFormatRule: {
          index: i,
          rule: {
            ranges: [range],
            booleanRule: {
              condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: o.value }] },
              format: {
                backgroundColor: rgb(o.bg),
                textFormat: {
                  foregroundColor: rgb(o.fg || '#000000'),
                  bold: !!o.bold
                }
              }
            }
          }
        }
      })
    })
  }

  return requests
}

async function createTab (title) {
  const api = await getApi()

  const added = await api.spreadsheets.batchUpdate({
    spreadsheetId: process.env.SHEET_ID,
    requestBody: {
      requests: [{
        addSheet: {
          properties: {
            title,
            gridProperties: { frozenRowCount: 1, frozenColumnCount: 1 }
          }
        }
      }]
    }
  })

  // A new tab exists now, so the cached list is out of date
  forgetTabs()

  const sheetId = added.data.replies[0].addSheet.properties.sheetId

  // Header row plus every team member's name and designation
  const values = [HEADERS, ...team.map(p => [p.name, p.designation])]
  await api.spreadsheets.values.update({
    spreadsheetId: process.env.SHEET_ID,
    range: `'${title}'!A1`,
    valueInputOption: 'RAW',
    requestBody: { values }
  })

  await api.spreadsheets.batchUpdate({
    spreadsheetId: process.env.SHEET_ID,
    requestBody: { requests: formatRequests(sheetId, team.length) }
  })

  console.log(`📄 Created tab "${title}" — ${team.length} people, dropdowns and colours applied`)
}

/** Check at startup that the sheet is reachable, so problems show up early. */
export async function checkAccess () {
  const api = await getApi()
  const meta = await api.spreadsheets.get({ spreadsheetId: process.env.SHEET_ID })
  console.log(`📗 Sheet connected: "${meta.data.properties.title}"`)
}

/**
 * Make sure today's tab exists and return a map of name -> row number.
 * Each day gets its own tab, named by date (e.g. 2026-09-25).
 */
/**
 * A tab created before the English columns existed has no header in J and K.
 * Fill them in once, so an older day keeps working without being rebuilt.
 */
async function upgradeHeaders (title) {
  const api = await getApi()

  const res = await api.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: `'${title}'!A1:K1`
  })
  const head = res.data.values?.[0] || []
  if (head[9] && head[10]) return

  await api.spreadsheets.values.update({
    spreadsheetId: process.env.SHEET_ID,
    range: `'${title}'!J1:K1`,
    valueInputOption: 'RAW',
    requestBody: { values: [[HEADERS[9], HEADERS[10]]] }
  })

  const meta = await api.spreadsheets.get({ spreadsheetId: process.env.SHEET_ID })
  const sheet = meta.data.sheets.find(s => s.properties.title === title)
  if (!sheet) return
  const sheetId = sheet.properties.sheetId
  const lastRow = team.length + 1

  await api.spreadsheets.batchUpdate({
    spreadsheetId: process.env.SHEET_ID,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 9, endColumnIndex: 11 },
            cell: {
              userEnteredFormat: {
                backgroundColor: rgb(HEADER_GREEN),
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                wrapStrategy: 'WRAP'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,horizontalAlignment,verticalAlignment,wrapStrategy)'
          }
        },
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 1, endRowIndex: lastRow, startColumnIndex: 9, endColumnIndex: 11 },
            cell: { userEnteredFormat: { wrapStrategy: 'WRAP', verticalAlignment: 'TOP', textFormat: { italic: true } } },
            fields: 'userEnteredFormat(wrapStrategy,verticalAlignment,textFormat)'
          }
        },
        {
          updateDimensionProperties: {
            range: { sheetId, dimension: 'COLUMNS', startIndex: 9, endIndex: 10 },
            properties: { pixelSize: WIDTHS[9] },
            fields: 'pixelSize'
          }
        },
        {
          updateDimensionProperties: {
            range: { sheetId, dimension: 'COLUMNS', startIndex: 10, endIndex: 11 },
            properties: { pixelSize: WIDTHS[10] },
            fields: 'pixelSize'
          }
        }
      ]
    }
  })

  console.log(`📄 Added the English columns to tab "${title}"`)
}

async function getDayTab (date) {
  if (dayCache.has(date)) return dayCache.get(date)

  const tabs = await listTabs()
  if (!tabs.includes(date)) await createTab(date)
  else await upgradeHeaders(date)

  const api = await getApi()
  const res = await api.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: `'${date}'!A2:A${team.length + 1}`
  })

  const rowByName = new Map()
  const names = res.data.values || []
  names.forEach((r, i) => {
    if (r[0]) rowByName.set(String(r[0]).trim(), i + 2)
  })

  dayCache.set(date, rowByName)
  return rowByName
}

/** Work out the status from what has been filled in so far. */
function statusOf (morning, evening) {
  if (morning && evening) return 'Both Sent'
  if (morning) return 'Morning Only'
  if (evening) return 'Evening Only'
  return 'Not Sent'
}

/**
 * Add one more update underneath the ones already in a cell.
 *
 * Someone may send three or four voice notes for the same session. The first
 * one is written on its own; from the second onwards every entry is numbered,
 * so they can be told apart and matched with the players in the dashboard.
 */
function appendBlock (old, add) {
  const cur = String(old || '').trim()
  const next = String(add || '').trim()

  if (!cur) return next
  if (!next) return cur

  // Split what is already there back into entries and renumber the lot,
  // so the numbering stays right no matter how many arrive
  const blocks = cur
    .split(/\n{2,}/)
    .map(b => b.replace(/^\d+\.\s+/, '').trim())
    .filter(Boolean)

  blocks.push(next)
  return blocks.map((b, i) => `${i + 1}. ${b}`).join('\n\n')
}

/**
 * Record one update from a team member into today's tab.
 * If the person already submitted for that session, the new text is appended
 * below the old one instead of overwriting it. The English translation is
 * kept in the same way, in columns J and K.
 */
export async function recordUpdate ({ date, name, session, kind, text, textEn, leaveType }) {
  const api = await getApi()
  const rowByName = await getDayTab(date)
  const row = rowByName.get(name)

  if (!row) {
    await recordUnmatched({ date, name, session, kind, text, textEn })
    return { matched: false }
  }

  // Read the row as it is now, so nothing already there is lost
  const res = await api.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: `'${date}'!C${row}:K${row}`
  })
  const cur = res.data.values?.[0] || []

  // C=0 Leave, D=1 On, E=2 Text/Voice, F=3 Off, G=4 Morning, H=5 Evening,
  // I=6 Status, J=7 Morning English, K=8 Evening English
  const leaveCur = cur[0] || ''
  const kindCur = cur[2] || ''
  const morningCur = cur[4] || ''
  const eveningCur = cur[5] || ''
  const morningEnCur = cur[7] || ''
  const eveningEnCur = cur[8] || ''

  // Once set, the leave marking stays for the rest of the day
  const leave = (leaveCur && String(leaveCur).trim()) ? leaveCur : (leaveType || '')

  // The dropdown only offers Text or Voice, so Voice wins once it is used
  const kindCell = (kindCur === 'Voice' || kind === 'Voice') ? 'Voice' : kind

  const isMorning = session === 'MORNING'

  const morning = isMorning ? appendBlock(morningCur, text) : morningCur
  const evening = isMorning ? eveningCur : appendBlock(eveningCur, text)

  // The translation is appended even when it is empty, so entry 3 in column J
  // still lines up with entry 3 in column G
  const english = textEn || '(translation not available)'
  const morningEn = isMorning ? appendBlock(morningEnCur, english) : morningEnCur
  const eveningEn = isMorning ? eveningEnCur : appendBlock(eveningEnCur, english)

  await api.spreadsheets.values.update({
    spreadsheetId: process.env.SHEET_ID,
    range: `'${date}'!C${row}:K${row}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        leave,                        // C Leave
        '✔',                          // D On
        kindCell,                     // E Text/ Voice
        '',                           // F Off — cleared, they did submit
        morning,                      // G Morning Target
        evening,                      // H Evening Achievement
        statusOf(morning, evening),   // I Daily Update Status
        morningEn,                    // J Morning Target (English)
        eveningEn                     // K Evening Achievement (English)
      ]]
    }
  })

  return { matched: true, row, status: statusOf(morning, evening), leave }
}

/** Anyone whose number is not in team.json goes to a separate tab. */
async function recordUnmatched ({ date, name, session, kind, text, textEn }) {
  const api = await getApi()
  const tabs = await listTabs()

  if (!tabs.includes('Unmatched')) {
    await api.spreadsheets.batchUpdate({
      spreadsheetId: process.env.SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: 'Unmatched' } } }] }
    })
    forgetTabs()
    await api.spreadsheets.values.update({
      spreadsheetId: process.env.SHEET_ID,
      range: "'Unmatched'!A1",
      valueInputOption: 'RAW',
      requestBody: { values: [['Date', 'Sender', 'Session', 'Type', 'Message', 'English']] }
    })
  }

  await api.spreadsheets.values.append({
    spreadsheetId: process.env.SHEET_ID,
    range: "'Unmatched'!A:F",
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[date, name, session, kind, text, textEn || '']] }
  })
}

/**
 * Everyone who has not sent an update for this session yet.
 * People marked as on leave are left out.
 * session is 'MORNING' (column G) or 'EVENING' (column H).
 */
export async function getPending (date, session) {
  const api = await getApi()
  await getDayTab(date)

  const res = await api.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: `'${date}'!A2:I${team.length + 1}`
  })

  const rows = res.data.values || []
  const column = session === 'MORNING' ? 6 : 7   // G or H
  const pending = []

  rows.forEach(r => {
    const name = r[0]
    const leave = r[2]
    if (!name) return
    if (leave && String(leave).trim()) return
    if (r[column] && String(r[column]).trim()) return
    pending.push(String(name).trim())
  })

  return pending
}

/**
 * Every row of one day's tab, for the dashboard.
 * Returns exists:false if that day has no tab yet.
 */
export async function getDay (date) {
  const api = await getApi()

  const tabs = await listTabs()
  if (!tabs.includes(date)) return { exists: false, rows: [] }

  const res = await api.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: `'${date}'!A2:K${team.length + 1}`
  })

  const rows = (res.data.values || [])
    .filter(r => r[0])
    .map(r => ({
      name: r[0] || '',
      designation: r[1] || '',
      leave: r[2] || '',
      on: r[3] || '',
      kind: r[4] || '',
      off: r[5] || '',
      morning: r[6] || '',
      evening: r[7] || '',
      status: r[8] || '',
      // Tabs created before the English columns existed simply return nothing
      morningEn: r[9] || '',
      eveningEn: r[10] || ''
    }))

  return { exists: true, rows }
}

/** The day tabs that exist, newest first. */
export async function listDays () {
  const tabs = await listTabs()
  return tabs.filter(t => /^\d{4}-\d{2}-\d{2}$/.test(t)).sort().reverse()
}

/**
 * Mark everyone who did not submit anything today as Off / Not Sent.
 * Meant to be run at the end of the day. People marked as on leave are skipped.
 */
export async function markAbsent (date) {
  const api = await getApi()
  await getDayTab(date)

  const res = await api.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: `'${date}'!A2:I${team.length + 1}`
  })

  const rows = res.data.values || []
  const updates = []

  rows.forEach((r, i) => {
    const leave = r[2]
    const on = r[3]
    if (on || (leave && String(leave).trim())) return
    updates.push({
      range: `'${date}'!F${i + 2}:I${i + 2}`,
      values: [['✔', '', '', 'Not Sent']]
    })
  })

  if (updates.length) {
    await api.spreadsheets.values.batchUpdate({
      spreadsheetId: process.env.SHEET_ID,
      requestBody: { valueInputOption: 'RAW', data: updates }
    })
  }

  console.log(`📌 Marked ${updates.length} people as Not Sent for ${date}`)
  return updates.length
}