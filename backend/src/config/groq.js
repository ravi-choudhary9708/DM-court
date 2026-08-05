/**
 * Groq LLM Client
 * ─────────────────────────────────────────────────────────────────────────────
 * Groq provides OpenAI-compatible API with extremely fast inference.
 * Free tier: 14,400 requests/day — no credits needed.
 *
 * Models available (free):
 *   - llama-3.3-70b-versatile    ← Best quality, excellent Hindi
 *   - llama-3.1-8b-instant       ← Fastest, good for simple tasks
 *   - gemma2-9b-it               ← Google's model, decent Hindi
 *   - mixtral-8x7b-32768         ← Large context window (32K tokens)
 *
 * Docs: https://console.groq.com/docs
 * Keys: https://console.groq.com/keys
 */

const OpenAI = require('openai');

// ── Groq client (OpenAI-compatible, just different baseURL) ───────────────────
const groqClient = new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});

// ── Model priority list (tries in order if one hits rate limit) ───────────────
const GROQ_MODELS = [
  'llama-3.3-70b-versatile',   // Best quality, strong Hindi, 32K context
  'llama-3.1-8b-instant',      // Fast fallback
  'gemma2-9b-it',              // Google Gemma fallback
];

/**
 * Call Groq with automatic model fallback on rate limit.
 *
 * @param {Array}  messages  - OpenAI-format messages [{ role, content }]
 * @param {Object} options   - { maxTokens, temperature }
 * @returns {string}         - Generated text response
 */
const callGroq = async (messages, options = {}) => {
  const { maxTokens = 2048, temperature = 0.4 } = options;

  for (const model of GROQ_MODELS) {
    try {
      console.log(`[Groq] Trying model: ${model}`);

      const response = await groqClient.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      });

      const text = response.choices?.[0]?.message?.content;
      if (text && text.trim().length > 30) {
        console.log(`[Groq] Success with model: ${model} | chars: ${text.length}`);
        return text.trim();
      }
      throw new Error('Response too short or empty');

    } catch (err) {
      const isRateLimit = err.status === 429 || err.message?.includes('rate_limit') || err.message?.includes('Rate limit');
      const isNotFound  = err.status === 404 || err.message?.includes('not found');

      console.warn(`[Groq] ${model} failed (${err.status || 'ERR'}): ${String(err.message).substring(0, 100)}`);

      if (!isRateLimit && !isNotFound) {
        // Unexpected error — propagate immediately
        throw err;
      }
      // Rate limit / not found → try next model
    }
  }

  throw new Error('[Groq] All models exhausted / rate-limited. Template fallback will activate.');
};

module.exports = { groqClient, callGroq, GROQ_MODELS };
