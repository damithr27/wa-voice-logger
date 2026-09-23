import { google } from 'googleapis'

const HEADERS = [
  'Timestamp', 'Date', 'Time', 'Name', 'Phone',
  'Session (time)', 'Session (AI)', 'Match?',
  'Transcript', 'Audio quality', 'Unclear marks', 'Duration (s)', 'Type'
]

let sheetsApi = null

async function getApi () {
  if (sheetsApi) return sheetsApi

  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_CREDENTIALS || './credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  })

  sheetsApi = google.sheets({ version: 'v4', auth: await auth.getClient() })
  return sheetsApi
}

/** Add or update the header row. Also extends older sheets with new columns. */
export async function ensureHeaders () {
  const api = await getApi()
  const res = await api.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: 'A1:M1'
  })

  const existing = res.data.values?.[0] || []
  if (existing.length === HEADERS.length) return

  await api.spreadsheets.values.update({
    spreadsheetId: process.env.SHEET_ID,
    range: 'A1',
    valueInputOption: 'RAW',
    requestBody: { values: [HEADERS] }
  })
  console.log(existing.length ? '✅ Header row updated' : '✅ Header row added')
}

/** Append a row to the end of the sheet. */
export async function appendRow (row) {
  const api = await getApi()

  // Text messages have no AI session detection, so there is nothing to compare
  const match = row.sessionByAI === 'N/A'
    ? '-'
    : (row.sessionByTime === row.sessionByAI ? 'OK' : '⚠️ CHECK')

  await api.spreadsheets.values.append({
    spreadsheetId: process.env.SHEET_ID,
    range: 'A:M',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[
        row.timestamp,
        row.date,
        row.time,
        row.name,
        row.phone,
        row.sessionByTime,
        row.sessionByAI,
        match,
        row.transcript,
        row.audioQuality,
        row.unclearCount,
        row.duration,
        row.type
      ]]
    }
  })
}