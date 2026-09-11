const { GoogleGenAI } = require('@google/genai');

// GOOGLE_APPLICATION_CREDENTIALS env var is picked up automatically by the SDK
const client = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
});

// We export the client to be used directly by controllers.
// They should call `client.models.generateContent({ model: '...', contents: ... })`

/**
 * Generate embedding for a text string using Vertex AI
 * @param {string} text - Input text (Hindi/English/Urdu/Farsi)
 * @returns {number[]} - Embedding vector
 */
const generateEmbedding = async (text) => {
  const response = await client.models.embedContent({
    model: 'text-embedding-004',
    contents: text
  });
  // Note: the response structure in @google/genai is response.embeddings[0].values
  return response.embeddings[0].values;
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

module.exports = { client, generateEmbedding, cosineSimilarity };
