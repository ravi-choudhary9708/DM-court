const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Main LLM model for analysis and order drafting
// gemini-2.0-flash-lite: higher free quota (30 RPM) than gemini-2.0-flash (15 RPM)
const getLLMModel = () => genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

// Vision model for OCR — handles Hindi, English, Urdu, Farsi
const getVisionModel = () => genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

// Embedding model for RAG
const getEmbeddingModel = () => genAI.getGenerativeModel({ model: 'text-embedding-004' });

/**
 * Generate embedding for a text string
 * @param {string} text - Input text (Hindi/English/Urdu/Farsi)
 * @returns {number[]} - Embedding vector
 */
const generateEmbedding = async (text) => {
  const model = getEmbeddingModel();
  const result = await model.embedContent(text);
  return result.embedding.values;
};

/**
 * Compute cosine similarity between two vectors
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number} - Similarity score 0 to 1
 */
const cosineSimilarity = (vecA, vecB) => {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
};

module.exports = { genAI, getLLMModel, getVisionModel, getEmbeddingModel, generateEmbedding, cosineSimilarity };
