# WhatsApp Voice Logger — Phase 1

A bot that captures voice messages from a WhatsApp group, transcribes them
with Gemini, and logs them to a Google Sheet.

**Phase 1 does not include task extraction.** It only records the transcript.
After running it for 3–5 days and reviewing the quality, task extraction will
be added.

---

## 1. Prerequisites

```bash
npm install
cp .env.example .env
cp roster.example.json roster.json
```

On **Windows (Command Prompt)**, use `copy` instead of `cp`:

```cmd
npm install
copy .env.example .env
copy roster.example.json roster.json
```

Requires Node.js 20+.

---

## 2. Gemini API key

1. Create a key at https://aistudio.google.com/apikey
2. Add it to `GEMINI_API_KEY` in `.env`

---

## 3. Google Sheet

**Creating the sheet:**

1. Create a new Google Sheet
2. Copy the ID from the URL:
   `docs.google.com/spreadsheets/d/`**`this part`**`/edit`
3. Add it to `SHEET_ID` in `.env`

**Service account:**

1. Go to https://console.cloud.google.com → create a project
2. **APIs & Services → Library → Google Sheets API → Enable**
3. **Credentials → Create credentials → Service account**
4. Click the new account → **Keys → Add key → JSON**
5. Rename the downloaded file to `credentials.json` and place it in this folder
6. Copy the `client_email` from the JSON file and
   **share the Sheet with it as an Editor** ← don't forget this step

---

## 4. Roster

`roster.json` is not included in the repository because it contains personal
phone numbers. Create it from the example file (see step 1), then add your
team members' numbers. Include the country code, without `+` or spaces:

```json
{
  "94771234567": "Kasun Perera"
}
```

If someone not in the roster sends a voice message, it appears in the sheet
as `Unknown (94xxxxxxxxx)` — this helps you identify new members.

---

## 5. Group ID

```bash
npm run groups
```

Scan the QR code (WhatsApp → Linked devices → Link a device).

**On the first scan, the connection will close with a `restart required`
message. This is normal** — WhatsApp requires one restart after pairing.
**Do not delete the `auth/` folder.** Simply run the command again:

```bash
npm run groups
```

This time it connects without a QR code and shows the list of groups.
Copy your group's ID into `GROUP_ID` in `.env`.

---

## 6. Run

```bash
npm start
```

Send a voice message to the group to test. A new row should appear in the sheet.

---

## Sheet columns

| Column | Description |
|---|---|
| Session (time) | MORNING/EVENING based on the timestamp |
| Session (AI) | Gemini's assessment based on the content |
| Match? | `⚠️ CHECK` if the two don't match |
| Audio quality | GOOD / FAIR / POOR |
| Unclear marks | Number of `[?]` marks in the transcript |

**What to watch during Phase 1:** Are `Unclear marks` high? Are there many
`POOR` ratings? How often does `⚠️ CHECK` appear? These should be addressed
before moving to Phase 2.

---

## Important notes

- **Use a dedicated SIM.** Baileys is an unofficial library. If the office's
  main number gets banned, it will cause problems.
- **A VPS is required.** The bot stops when the laptop is closed.
  A $5/month DigitalOcean/Hetzner server is enough. Run it with `pm2`.
- **Back up the `auth/` folder.** If it's lost, you'll need to scan the QR code again.
- **Never commit `.env`, `credentials.json`, `roster.json`, or `auth/` to git.**
- **Inform the team.** Let everyone know in advance that their voice messages
  will be processed.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `The caller does not have permission` | The Sheet hasn't been shared with the service account email |
| `Unable to parse range` | Check that the sheet tab name is the default `Sheet1` |
| `restart required` after the first QR scan | Normal — run the command again without deleting `auth/` |
| QR code keeps reappearing / `logged out` | Delete the `auth/` folder and try again |
| Empty transcript | Check the `.ogg` file in the `failed/` folder |