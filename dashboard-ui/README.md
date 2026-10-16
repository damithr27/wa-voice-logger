# Daily Update Dashboard

The admin dashboard for the WhatsApp Daily Update Bot, built from the Figma design.

## Setup (once)

```bash
cd dashboard-ui
npm install
npm run build
```

The build writes to `../dashboard-dist`, which the bot serves automatically.

## Day to day

Run the bot as usual:

```bash
npm start          # from the project root
```

Then open http://localhost:3000 — the dashboard is there.

## Working on the design

For live reload while editing the UI:

```bash
# terminal 1 — the bot, for the API
npm start

# terminal 2 — the UI with hot reload
cd dashboard-ui
npm run dev        # http://localhost:5173
```

API calls are proxied to the bot on port 3000, so both work together.

When you are happy with a change, run `npm run build` again so the bot picks it up.

## Pages and their data

| Page | Data |
|---|---|
| Dashboard | Live — counts, recent-days chart, today's table |
| Daily Monitoring | Live — every person's morning and evening text |
| Voice Transcripts | Live — one card per update, language detected |
| Members | Live — names and designations, today's compliance |
| Weekly Task Tracker | Sample data — tasks are not collected yet |
| Reminder Center | Sample data — the bot sends reminders but does not log them |
| Reports | Sample data |
| Settings | Sample data |

## Not in the sheet yet

The design expects a few things the bot does not record:

- **Timestamps per update** — the Type column (Voice / Text) is shown instead
- **Audio playback** — the recordings are deleted once transcribed
- **Phone numbers** — these live in `team.json`, not the sheet
- **Task breakdown** — this is Phase 2

Each can be added later without changing the design.
