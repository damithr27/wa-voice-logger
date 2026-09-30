import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
// Models to try, in order. Set GEMINI_MODELS in .env as a comma separated
// list to change them, e.g. GEMINI_MODELS=gemini-3.8-flash,gemini-3.5-flash
const MODELS = (process.env.GEMINI_MODELS || 'gemini-3.8-flash,gemini-3.5-flash')
  .split(',')
  .map(m => m.trim())
  .filter(Boolean)

// Seconds to wait before each attempt after the first
const GAP_SECONDS = 2

// Temporary server-side errors that are safe to retry
const RETRYABLE = [429, 500, 503, 504]
const sleep = ms => new Promise(r => setTimeout(r, ms))

const PROMPT = `
Transcribe exactly what is said in this audio.

- The speaker is a Sri Lankan office employee speaking in Sinhala, or a mix of
  Sinhala and English.
- Write English words in English. Do not translate them.
- Write Sinhala parts in Sinhala script.
- Mark any inaudible parts as [?]. Do not guess.
- Do not summarize.

Also provide:
- detected_session: based on the content, whether this is a morning plan (MORNING),
  an evening report of completed work (EVENING), or unclear (UNCLEAR).
- audio_quality: GOOD / FAIR / POOR
- unclear_count: the number of [?] marks used
`.trim()

const SCHEMA = {
  type: 'object',
  properties: {
    transcript: { type: 'string' },
    detected_session: { type: 'string', enum: ['MORNING', 'EVENING', 'UNCLEAR'] },
    audio_quality: { type: 'string', enum: ['GOOD', 'FAIR', 'POOR'] },
    unclear_count: { type: 'integer' }
  },
  required: ['transcript', 'detected_session', 'audio_quality', 'unclear_count']
}

async function callModel (model, buffer) {
  const response = await ai.models.generateContent({
    model,
    contents: [{
      role: 'user',
      parts: [
        { text: PROMPT },
        { inlineData: { mimeType: 'audio/ogg', data: buffer.toString('base64') } }
      ]
    }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: SCHEMA,
      temperature: 0
    }
  })

  const raw = (response.text || '').replace(/```json|```/g, '').trim()
  return JSON.parse(raw)
}

function errorCode (err) {
  if (err?.status) return Number(err.status)
  const m = String(err?.message || '').match(/"code"\s*:\s*(\d{3})/)
  return m ? Number(m[1]) : null
}

/**
 * Send a voice note buffer to Gemini and return the transcript.
 * Retries briefly; longer retries are handled by the queue.
 */
export async function transcribe (buffer) {
  // Try every model once, quickly. If they are all busy the queue takes over
  // and tries again later, so nothing is lost.
  const plan = MODELS.map((model, i) => ({ model, wait: i === 0 ? 0 : GAP_SECONDS * 1000 }))

  let lastErr
  for (let i = 0; i < plan.length; i++) {
    const { model, wait } = plan[i]
    if (wait) await sleep(wait)

    console.log(`   🤖 Trying ${model} (${i + 1}/${plan.length})...`)

    try {
      const result = await callModel(model, buffer)
      console.log(`   ↪️  ${model} worked`)
      return result
    } catch (err) {
      lastErr = err
      const code = errorCode(err)
      const reason = code === 503 ? 'busy'
        : code === 429 ? 'rate limited'
        : code ? `error ${code}`
        : 'failed'
      console.log(`   ✖️  ${model} — ${reason}`)
      if (code === 429) console.log(`      ${String(err.message).slice(0, 300)}`)

      // Errors like 400, 401, 403 are code/key problems — retrying won't help
      if (code && !RETRYABLE.includes(code)) throw err
    }
  }
  throw lastErr
}