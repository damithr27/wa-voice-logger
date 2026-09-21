# WhatsApp Voice Logger — Phase 1

WhatsApp group එකේ voice messages අල්ලගෙන, Gemini එකෙන් transcript කරලා,
Google Sheet එකකට දාන bot එකක්.

**Phase 1 එකේ task extraction නෑ.** Transcript එක විතරයි. ඒක දවස් 3–5ක්
run කරලා quality එක බැලුවට පස්සේ තමයි tasks එකතු කරන්නේ.

---

## 1. පෙර සූදානම

```bash
npm install
cp .env.example .env
```

Node.js 20+ ඕන.

---

## 2. Gemini API key එක

1. https://aistudio.google.com/apikey — key එකක් හදාගන්න
2. `.env` එකේ `GEMINI_API_KEY` එකට දාන්න

---

## 3. Google Sheet එක

**Sheet එක හදන එක:**

1. අලුත් Google Sheet එකක් හදන්න
2. URL එකෙන් ID එක ගන්න:
   `docs.google.com/spreadsheets/d/`**`මේ කොටස`**`/edit`
3. `.env` එකේ `SHEET_ID` එකට දාන්න

**Service account එක:**

1. https://console.cloud.google.com → project එකක් හදන්න
2. **APIs & Services → Library → Google Sheets API → Enable**
3. **Credentials → Create credentials → Service account**
4. හදාපු account එක click කරලා → **Keys → Add key → JSON**
5. Download වෙන file එක `credentials.json` කියලා මේ folder එකට දාන්න
6. JSON එකේ තියෙන `client_email` එක copy කරලා,
   **Sheet එකට Editor විදිහට share කරන්න** ← මේක අමතක කරන්න එපා

---

## 4. Roster එක

`roster.json` එකේ ඔයාගේ office එකේ කට්ටියගේ numbers දාන්න.
රටේ code එක එක්ක, `+` හෝ space නැතුව:

```json
{
  "94771234567": "Kasun Perera"
}
```

Roster එකේ නැති කෙනෙක් voice දැම්මොත් `Unknown (94xxxxxxxxx)` කියලා
sheet එකට එනවා — ඒකෙන් අලුත් අය හොයාගන්න පුළුවන්.

---

## 5. Group ID එක

```bash
npm run groups
```

QR එක scan කරන්න (WhatsApp → Linked devices → Link a device).
Groups list එක එනවා. ඔයාගේ group එකේ id එක `.env` එකේ `GROUP_ID` එකට දාන්න.

---

## 6. Run කරන්න

```bash
npm start
```

දැන් group එකට voice එකක් දාලා බලන්න. Sheet එකට row එකක් එන්න ඕන.

---

## Sheet එකේ columns

| Column | කුමක්ද |
|---|---|
| Session (time) | Timestamp එක අනුව MORNING/EVENING |
| Session (AI) | Content එක අනුව Gemini හිතන එක |
| Match? | දෙක නොගැලපේ නම් `⚠️ CHECK` |
| Audio quality | GOOD / FAIR / POOR |
| Unclear marks | Transcript එකේ `[?]` ගණන |

**Phase 1 එකේදී බලන්න ඕන:** `Unclear marks` වැඩිද? `POOR` ගොඩක් තියෙනවද?
`⚠️ CHECK` කී පාරක් එනවද? මේවා තමයි Phase 2 එකට යන්න කලින් හදාගන්න ඕන.

---

## දැනගන්න ඕන දේවල්

- **Dedicated SIM එකක් පාවිච්චි කරන්න.** Baileys කියන්නේ unofficial library
  එකක්. Office එකේ main number එක ban වුණොත් අවුල්.
- **VPS එකක් ඕන.** Laptop එක වහපුවම bot එක නතර වෙනවා.
  DigitalOcean/Hetzner $5/මාසෙට ඇති. `pm2` එකෙන් run කරන්න.
- **`auth/` folder එක backup කරගන්න.** ඒක නැති වුණොත් ආපහු QR scan කරන්න ඕන.
- **`.env`, `credentials.json`, `auth/` — git එකට දාන්න එපා.**
- **කට්ටියට කියන්න.** ඔවුන්ගේ voice messages process වෙනවා කියලා
  කලින්ම දැනුම් දෙන්න.

---

## අවුලක් ආවොත්

| ප්‍රශ්නය | විසඳුම |
|---|---|
| `The caller does not have permission` | Sheet එක service account email එකට share කරලා නෑ |
| `Unable to parse range` | Sheet tab එකේ නම default `Sheet1` ද කියලා බලන්න |
| QR එක ආපහු ආපහු එනවා | `auth/` folder එක delete කරලා ආපහු try කරන්න |
| Transcript එක හිස් | `failed/` folder එකේ `.ogg` file එක බලන්න |
