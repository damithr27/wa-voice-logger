import { google } from 'googleapis'

const HEADERS = [
  'Timestamp', 'Date', 'Time', 'Name', 'Phone',
  'Session (time)', 'Session (AI)', 'Match?',
  'Transcript', 'Audio quality', 'Unclear marks', 'Duration (s)'
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

/** Add the header row if it doesn't exist. Only runs on the first start. */
export async function ensureHeaders () {
  const api = await getApi()
  const res = await api.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: 'A1:L1'
  })

  if (res.data.values?.length) return

  await api.spreadsheets.values.update({
    spreadsheetId: process.env.SHEET_ID,
    range: 'A1',
    valueInputOption: 'RAW',
    requestBody: { values: [HEADERS] }
  })
  console.log('✅ Header row added')
}

/** Append a row to the end of the sheet. */
export async function appendRow (row) {
  const api = await getApi()
  await api.spreadsheets.values.append({
    spreadsheetId: process.env.SHEET_ID,
    range: 'A:L',
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
        row.sessionByTime === row.sessionByAI ? 'OK' : '⚠️ CHECK',
        row.transcript,
        row.audioQuality,
        row.unclearCount,
        row.duration
      ]]
    }
  })
}