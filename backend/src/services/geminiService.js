const { getVisionModel, getLLMModel, generateEmbedding } = require('../config/gemini');

/**
 * Extract text from a document (PDF/image) using Gemini Vision
 * Handles Hindi, English, Urdu, Farsi script
 * @param {string} documentUrl - Cloudinary URL of the document
 * @param {string} mimeType - e.g. 'application/pdf', 'image/jpeg'
 * @returns {Object} { text, languages, pageCount }
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
    // Fetch document and convert to base64
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

    // Parse detected languages line
    const langMatch = fullText.match(/DETECTED_LANGUAGES:\s*\[(.+)\]/);
    const languages = langMatch
      ? langMatch[1].split(',').map((l) => l.trim())
      : ['unknown'];

    // Remove the DETECTED_LANGUAGES line from the extracted text
    const cleanText = fullText.replace(/DETECTED_LANGUAGES:.+/g, '').trim();

    return { text: cleanText, languages, success: true };
  } catch (error) {
    console.error('[OCR ERROR]', error.message);
    return { text: '', languages: [], success: false, error: error.message };
  }
};

/**
 * Summarise a party's submissions from OCR text
 * @param {string} ocrText - Extracted text from all party documents
 * @param {string} party - 'A' or 'B'
 * @param {string} partyName - Name of the party
 * @returns {string} Summary
 */
const summarisePartySubmissions = async (ocrText, party, partyName) => {
  const model = getLLMModel();
  const prompt = `You are an assistant helping a District Magistrate Court in Bihar, India.
Below is the text of documents submitted by ${partyName} (Party ${party}).

Summarise their main claims, arguments, and evidence in clear, factual language.
Use both Hindi and English terms as appropriate (e.g., 'jamabandi', 'khata', 'khesra').
Do NOT add any information not present in the documents.
Do NOT make legal conclusions — only summarise what the party claims.

DOCUMENT TEXT:
${ocrText.substring(0, 8000)}

Provide a structured summary under these headings:
1. Main Claim
2. Key Arguments
3. Documents Submitted
4. Relief Sought`;

  const result = await model.generateContent(prompt);
  return result.response.text();
};

/**
 * Extract specific facts (evidence objects) from OCR text
 * @param {string} ocrText
 * @param {string} documentId
 * @param {string} party
 * @returns {Array} Array of evidence objects
 */
const extractEvidence = async (ocrText, documentId, party) => {
  const model = getLLMModel();
  const prompt = `You are an assistant helping extract legal evidence from court documents in Bihar, India.

Extract specific factual claims from the following document text. 
For each fact, identify:
- The exact fact stated
- The approximate page/section where it appears
- What legal issue it might be relevant to

Document text (Party ${party}):
${ocrText.substring(0, 6000)}

Return as JSON array:
[
  {
    "extractedFact": "Party A is recorded as owner of Plot No. 123 since 2010",
    "pageNumber": 3,
    "paragraphRef": "Para 2",
    "relevantIssue": "ownership"
  }
]

Only return valid JSON, no other text.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
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
