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

// Problems with the key or the account. These affect every model,
// so there is no point trying the rest of the list.
const FATAL = [400, 401, 403]
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
- translation: the same content written in clear, natural English. Translate
  every Sinhala word. Keep the meaning and the order of what was said, keep
  names, numbers and places as they are, and do not add anything that was not
  said. If the audio is already entirely in English, repeat the transcript.
- detected_session: based on the content, whether this is a morning plan (MORNING),
  an evening report of completed work (EVENING), or unclear (UNCLEAR).
- audio_quality: GOOD / FAIR / POOR
- unclear_count: the number of [?] marks used
`.trim()

const SCHEMA = {
  type: 'object',
  properties: {
    transcript: { type: 'string' },
    translation: { type: 'string' },
    detected_session: { type: 'string', enum: ['MORNING', 'EVENING', 'UNCLEAR'] },
    audio_quality: { type: 'string', enum: ['GOOD', 'FAIR', 'POOR'] },
    unclear_count: { type: 'integer' }
  },
  required: ['transcript', 'translation', 'detected_session', 'audio_quality', 'unclear_count']
}

// Used for typed messages, where there is nothing to transcribe
const TEXT_PROMPT = `
Translate this message from a Sri Lankan office employee into clear, natural
English. The message may be in Sinhala, in English, or in a mix of both, and
Sinhala words may be typed in English letters (Singlish).

- Translate every Sinhala word.
- Keep the meaning and the order of what was written.
- Keep names, numbers and places as they are.
- Do not add anything that was not written, and do not summarize.
- If the message is already entirely in English, repeat it unchanged.

Reply with the English only, and nothing else.
`.trim()

// Sinhala words commonly typed in English letters (Singlish). A message using
// any of these needs translating even though it looks like English.
const SINGLISH_WORDS = /\b(kara|karana|karanna|karala|kare|krla|kranna|wada|wade|weda|awa|enawa|enna|giya|yanna|ynna|tiyenawa|tiyena|tiynwa|nathi|natha|naha|oni|onna|ona|hariyata|balanna|balala|dala|danna|dapu|ivara|iwara|passe|pasu|ude|hawasa|heta|ada|iye|mama|api|ekak|eke|ekata|mokak|monawa|kiyala|kiyanna|puluwan|pulwn|barida|nivadu|niwadu|dawasa|welawa|hodin|hodata|tikak|poddak|aye|thawa|tawa)\b/i

/** True when the text looks like Sinhala, in either script. */
function needsTranslating (text) {
  return hasSinhala(text) || SINGLISH_WORDS.test(text)
}

/** True when the text has Sinhala characters in it. */
function hasSinhala (text) {
  return /[඀-෿]/.test(text)
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

async function callModelText (model, text) {
  const response = await ai.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: `${TEXT_PROMPT}\n\nMessage:\n${text}` }] }],
    config: { temperature: 0 }
  })

  return (response.text || '').trim()
}

function errorCode (err) {
  if (err?.status) return Number(err.status)
  const m = String(err?.message || '').match(/"code"\s*:\s*(\d{3})/)
  return m ? Number(m[1]) : null
}

/**
 * Try each model in turn until one answers.
 * `call` is given a model name and should return the result.
 */
async function tryModels (label, call) {
  const plan = MODELS.map((model, i) => ({ model, wait: i === 0 ? 0 : GAP_SECONDS * 1000 }))

  let lastErr
  for (let i = 0; i < plan.length; i++) {
    const { model, wait } = plan[i]
    if (wait) await sleep(wait)

    console.log(`   🤖 ${label} with ${model} (${i + 1}/${plan.length})...`)

    try {
      const result = await call(model)
      console.log(`   ↪️  ${model} worked`)
      return result
    } catch (err) {
      lastErr = err
      const code = errorCode(err)
      const reason = code === 503 ? 'busy'
        : code === 429 ? 'rate limited'
        : code === 404 ? 'no such model for this key'
        : code ? `error ${code}`
        : 'failed'
      console.log(`   ✖️  ${model} — ${reason}`)

      // When there is no code, show the message so the cause is visible
      if (!code) console.log(`      ${String(err?.message || err).slice(0, 200)}`)

      // A key or billing problem affects every model, so stop straight away.
      // Anything else (busy, rate limited, a wrong model name) just means
      // this model is no good right now — move on to the next one.
      if (FATAL.includes(code)) throw err
    }
  }
  throw lastErr
}

/**
 * Send a voice note buffer to Gemini and return the transcript plus its
 * English translation. Retries briefly; longer retries are handled by the queue.
 */
export async function transcribe (buffer) {
  // Try every model once, quickly. If they are all busy the queue takes over
  // and tries again later, so nothing is lost.
  return tryModels('Transcribing', model => callModel(model, buffer))
}

/**
 * Translate a typed message into English.
 * Never throws: the message itself is already saved, so a failed translation
 * returns an empty string rather than losing the update.
 */
export async function translate (text) {
  const clean = String(text || '').trim()
  if (!clean) return ''

  // Already English — no need to spend a Gemini call on it
  if (!needsTranslating(clean)) return clean

  try {
    return await tryModels('Translating', model => callModelText(model, clean))
  } catch (err) {
    console.log('   ⚠️  Could not translate the text:', String(err?.message || err).slice(0, 120))
    return ''
  }
}