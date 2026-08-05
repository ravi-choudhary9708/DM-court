/**
 * geminiService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * OCR:           Gemini Vision   (only Vision model can read Hindi PDFs)
 * Text/LLM:      Groq            (free 14,400 req/day — Llama 3.3 70B)
 * Embeddings:    Gemini          (OpenRouter/Groq don't provide embeddings)
 */

const { getVisionModel } = require('../config/gemini');
const { callGroq }       = require('../config/groq');

// ── OCR via Gemini Vision ─────────────────────────────────────────────────────

/**
 * Extract text from a document (PDF/image) using Gemini Vision
 * Handles Hindi, English, Urdu, Farsi script
 * @param {string} documentUrl - Cloudinary URL of the document
 * @param {string} mimeType - e.g. 'application/pdf', 'image/jpeg'
 * @returns {Object} { text, languages, success }
 */
const extractTextFromDocument = async (documentUrl, mimeType = 'application/pdf') => {
  const model = getVisionModel();

  const prompt = `You are an OCR system for Indian court documents. 
Extract ALL text from this document exactly as written.
The document may contain Hindi (Devanagari), English, Urdu, or Farsi text.
Preserve the original structure (paragraphs, lists, tables) as much as possible.
Do NOT translate. Do NOT summarise. Extract verbatim.
Return the complete extracted text followed by a line: DETECTED_LANGUAGES: [list of detected scripts/languages]`;

  try {
    const response = await fetch(documentUrl);
    const buffer = await response.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString('base64');

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType === 'application/pdf' ? 'application/pdf' : mimeType,
          data: base64Data,
        },
      },
      prompt,
    ]);

    const fullText = result.response.text();
    const langMatch = fullText.match(/DETECTED_LANGUAGES:\s*\[(.+)\]/);
    const languages = langMatch
      ? langMatch[1].split(',').map((l) => l.trim())
      : ['unknown'];
    const cleanText = fullText.replace(/DETECTED_LANGUAGES:.+/g, '').trim();

    return { text: cleanText, languages, success: true };
  } catch (error) {
    console.error('[OCR ERROR]', error.message);
    return { text: '', languages: [], success: false, error: error.message };
  }
};

// ── Text LLM via Groq ─────────────────────────────────────────────────────────

/**
 * Summarise a party's submissions from OCR text
 * Powered by Groq (Llama 3.3 70B — free tier)
 * @param {string} ocrText - Extracted text from all party documents
 * @param {string} party - 'A' or 'B'
 * @param {string} partyName - Name of the party
 * @returns {string} Summary
 */
const summarisePartySubmissions = async (ocrText, party, partyName) => {
  const messages = [
    {
      role: 'system',
      content:
        'You are a legal assistant helping a District Magistrate Court in Bihar, India. ' +
        'You read case documents and summarise what each party claims in factual, concise language. ' +
        'Use both Hindi and English terms as appropriate (jamabandi, khata, khesra, dakhil-kharij, etc.). ' +
        'Never add information not present in the documents. Never make legal conclusions.',
    },
    {
      role: 'user',
      content:
        `Below is the text of documents submitted by ${partyName} (Party ${party}).\n\n` +
        `DOCUMENT TEXT:\n${ocrText.substring(0, 8000)}\n\n` +
        `Provide a structured summary under these headings:\n` +
        `1. Main Claim\n2. Key Arguments\n3. Documents Submitted\n4. Relief Sought`,
    },
  ];

  return await callGroq(messages, { maxTokens: 1024, temperature: 0.3 });
};

/**
 * Extract specific facts (evidence objects) from OCR text
 * Powered by Groq (Llama 3.3 70B — free tier)
 * @param {string} ocrText
 * @param {string} documentId
 * @param {string} party
 * @returns {Array} Array of evidence objects
 */
const extractEvidence = async (ocrText, documentId, party) => {
  const messages = [
    {
      role: 'system',
      content:
        'You are a legal evidence extractor for Indian District Magistrate courts. ' +
        'Extract specific factual claims from court documents. Return ONLY valid JSON array, no markdown.',
    },
    {
      role: 'user',
      content:
        `Extract specific factual claims from the following court document (Party ${party}).\n` +
        `For each fact identify: the exact fact, approximate page number, paragraph reference, and what legal issue it relates to.\n\n` +
        `Document text:\n${ocrText.substring(0, 6000)}\n\n` +
        `Return ONLY a JSON array:\n` +
        `[\n  {\n    "extractedFact": "Party A is recorded as owner since 2010",\n` +
        `    "pageNumber": 1,\n    "paragraphRef": "Para 2",\n    "relevantIssue": "ownership"\n  }\n]`,
    },
  ];

  try {
    const text = await callGroq(messages, { maxTokens: 1500, temperature: 0.1 });
    const jsonMatch = text.match(/\[[\s\S]+\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch (error) {
    console.error('[EVIDENCE EXTRACTION ERROR]', error.message);
    return [];
  }
};

module.exports = { extractTextFromDocument, summarisePartySubmissions, extractEvidence };
