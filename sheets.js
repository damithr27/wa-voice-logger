import { google } from 'googleapis'
import fs from 'node:fs'

const team = JSON.parse(fs.readFileSync('./team.json', 'utf8'))

// Headers exactly as they appear in the Demo sheet, trailing spaces included
const HEADERS = [
  'Name', 'Designation ', 'Leave', 'On', 'Text/ Voice', 'Off',
  'Morning Target ', 'Evening Achievement ', 'Daily Update Status'
]

// A Name | B Designation | C Leave | D On | E Text/Voice | F Off
// G Morning Target | H Evening Achievement | I Daily Update Status

const HEADER_GREEN = '#6AA84F'

// Column widths in pixels, roughly matching the Demo sheet
const WIDTHS = [260, 400, 110, 85, 100, 70, 460, 620, 130]

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

async function listTabs () {
  const api = await getApi()
  const meta = await api.spreadsheets.get({ spreadsheetId: process.env.SHEET_ID })
  return meta.data.sheets.map(s => s.properties.title)
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

  // Wrap the long text columns so the transcript stays readable
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 1, endRowIndex: lastRow, startColumnIndex: 6, endColumnIndex: 8 },
      cell: { userEnteredFormat: { wrapStrategy: 'WRAP', verticalAlignment: 'TOP' } },
      fields: 'userEnteredFormat(wrapStrategy,verticalAlignment)'
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

/**
 * Make sure today's tab exists and return a map of name -> row number.
 * Each day gets its own tab, named by date (e.g. 2026-09-25).
 */
async function getDayTab (date) {
  if (dayCache.has(date)) return dayCache.get(date)

  const tabs = await listTabs()
  if (!tabs.includes(date)) await createTab(date)

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
 * Record one update from a team member into today's tab.
 * If the person already submitted for that session, the new text is appended
 * below the old one instead of overwriting it.
 */
export async function recordUpdate ({ date, name, session, kind, text, leaveType }) {
  const api = await getApi()
  const rowByName = await getDayTab(date)
  const row = rowByName.get(name)

  if (!row) {
    await recordUnmatched({ date, name, session, kind, text })
    return { matched: false }
  }

  // Read the row as it is now, so nothing already there is lost
  const res = await api.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: `'${date}'!C${row}:I${row}`
  })
  const cur = res.data.values?.[0] || []
  const [leaveCur = '', , kindCur = '', , morningCur = '', eveningCur = ''] = cur

  // Once set, the leave marking stays for the rest of the day
  const leave = (leaveCur && String(leaveCur).trim()) ? leaveCur : (leaveType || '')

  // The dropdown only offers Text or Voice, so Voice wins once it is used
  const kindCell = (kindCur === 'Voice' || kind === 'Voice') ? 'Voice' : kind

  const join = (old, add) => (old && String(old).trim() ? `${old}\n\n${add}` : add)
  const morning = session === 'MORNING' ? join(morningCur, text) : morningCur
  const evening = session === 'EVENING' ? join(eveningCur, text) : eveningCur

  await api.spreadsheets.values.update({
    spreadsheetId: process.env.SHEET_ID,
    range: `'${date}'!C${row}:I${row}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        leave,                        // C Leave
        '✔',                          // D On
        kindCell,                     // E Text/ Voice
        '',                           // F Off — cleared, they did submit
        morning,                      // G Morning Target
        evening,                      // H Evening Achievement
        statusOf(morning, evening)    // I Daily Update Status
      ]]
    }
  })

  return { matched: true, row, status: statusOf(morning, evening), leave }
}

/** Anyone whose number is not in team.json goes to a separate tab. */
async function recordUnmatched ({ date, name, session, kind, text }) {
  const api = await getApi()
  const tabs = await listTabs()

  if (!tabs.includes('Unmatched')) {
    await api.spreadsheets.batchUpdate({
      spreadsheetId: process.env.SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: 'Unmatched' } } }] }
    })
    await api.spreadsheets.values.update({
      spreadsheetId: process.env.SHEET_ID,
      range: "'Unmatched'!A1",
      valueInputOption: 'RAW',
      requestBody: { values: [['Date', 'Sender', 'Session', 'Type', 'Message']] }
    })
  }

  await api.spreadsheets.values.append({
    spreadsheetId: process.env.SHEET_ID,
    range: "'Unmatched'!A:E",
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[date, name, session, kind, text]] }
  })
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