import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash'
// Main model eka busy nam meka try karanawa
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash'

// Aye try karanna puluwan errors (Google side temporary)
const RETRYABLE = [429, 500, 503, 504]
const sleep = ms => new Promise(r => setTimeout(r, ms))

const PROMPT = `
මේ audio එකේ කියන දේ ඒ විදිහටම transcript කරන්න.

- කතා කරන්නේ ශ්‍රී ලාංකික කාර්යාල සේවකයෙක්. සිංහල, හෝ සිංහල+ඉංග්‍රීසි මිශ්‍ර.
- ඉංග්‍රීසි වචන ඉංග්‍රීසියෙන්ම ලියන්න. පරිවර්තනය කරන්න එපා.
- සිංහල කොටස් සිංහල අකුරෙන් ලියන්න.
- අහගන්න බැරි තැන් [?] කියලා දාන්න. අනුමාන කරන්න එපා.
- සාරාංශයක් දෙන්න එපා.

මේවත් දෙන්න:
- detected_session: අන්තර්ගතය අනුව මේක උදේ plan එකක්ද (MORNING),
  හවස කරපු වැඩ ගැන වාර්තාවක්ද (EVENING), නැත්නම් පැහැදිලි නෑද (UNCLEAR).
- audio_quality: GOOD / FAIR / POOR
- unclear_count: [?] කීයක් දැම්මාද
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
 * Voice note buffer ekak Gemini ekata dila transcript eka ganna.
 * Busy nam 3 paarak aye try karanawa, eeth bari nam backup model eka.
 */
export async function transcribe (buffer) {
  // Short, quick attempts only. Longer waits are handled by the queue,
  // which retries after 1, 3, 10, 30, 60 and 120 minutes.
  const plan = [
    { model: MODEL, wait: 0 },
    { model: MODEL, wait: 3000 },
    { model: FALLBACK_MODEL, wait: 2000 }
  ]

  let lastErr
  for (let i = 0; i < plan.length; i++) {
    const { model, wait } = plan[i]
    if (wait) {
      console.log(`   ⏳ ${wait / 1000}s inna, aye try karanawa (${model})...`)
      await sleep(wait)
    }
    try {
      const result = await callModel(model, buffer)
      if (model !== MODEL) console.log(`   ↪️  backup model eken hari giya (${model})`)
      return result
    } catch (err) {
      lastErr = err
      const code = errorCode(err)
      // 400, 401, 403 wage ewa aye try karala wadak na — code/key prashnayak
      if (code && !RETRYABLE.includes(code)) throw err
    }
  }
  throw lastErr
}