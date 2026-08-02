const LegalSection = require('../models/LegalSection');
const { generateEmbedding, cosineSimilarity } = require('../config/gemini');
const { getLLMModel } = require('../config/gemini');

/**
 * Retrieve relevant legal sections using hybrid search
 * (keyword search + cosine similarity on embeddings)
 * @param {string} query - Legal question or topic
 * @param {Object} options
 * @param {string} options.jurisdiction - Default 'Bihar'
 * @param {Date} options.caseDate - To filter applicable versions
 * @param {number} options.topK - How many results to return (default 5)
 * @returns {Array} Relevant sections with similarity scores
 */
const retrieveRelevantSections = async (query, options = {}) => {
  const { jurisdiction = 'Bihar', caseDate = new Date(), topK = 5 } = options;

  // Step 1: Keyword search (BM25-style via MongoDB text index)
  const keywordResults = await LegalSection.find(
    {
      $text: { $search: query },
      effectiveFrom: { $lte: caseDate },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gte: caseDate } }],
    },
    { score: { $meta: 'textScore' }, embedding: 0 }
  )
    .populate('actId', 'actName actYear jurisdiction')
    .limit(20)
    .lean();

  // Step 2: Vector similarity search on embeddings (with graceful fallback)
  let vectorResults = [];
  try {
    const queryEmbedding = await generateEmbedding(query);
    const allSections = await LegalSection.find(
      {
        embeddingStatus: 'done',
        effectiveFrom: { $lte: caseDate },
        $or: [{ effectiveTo: null }, { effectiveTo: { $gte: caseDate } }],
      },
      { embedding: 1, sectionNumber: 1, sectionTitle: 1, text: 1, actId: 1 }
    )
      .populate('actId', 'actName actYear jurisdiction')
      .lean();

    vectorResults = allSections
      .map((section) => ({
        ...section,
        vectorScore: cosineSimilarity(queryEmbedding, section.embedding),
      }))
      .filter((s) => s.vectorScore > 0.5)
      .sort((a, b) => b.vectorScore - a.vectorScore)
      .slice(0, 20);
  } catch (vecErr) {
    console.warn('[RAG VECTOR WARNING] Falling back to keyword search:', vecErr.message);
  }


  // Step 3: Merge and deduplicate results
  const merged = new Map();
  for (const section of keywordResults) {
    merged.set(section._id.toString(), {
      ...section,
      keywordScore: section.score || 0,
      vectorScore: 0,
      combinedScore: section.score || 0,
    });
  }
  for (const section of vectorResults) {
    const id = section._id.toString();
    if (merged.has(id)) {
      const existing = merged.get(id);
      existing.vectorScore = section.vectorScore;
      existing.combinedScore = existing.keywordScore * 0.4 + section.vectorScore * 0.6;
    } else {
      merged.set(id, {
        ...section,
        keywordScore: 0,
        combinedScore: section.vectorScore * 0.6,
      });
    }
  }

  // Step 4: Sort by combined score and return top K
  const results = Array.from(merged.values())
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, topK)
    .map((s) => {
      delete s.embedding; // Don't send large arrays to frontend
      return s;
    });

  return results;
};

/**
 * Re-rank retrieved sections using Gemini LLM to pick the most relevant
 * @param {string} query - Legal question
 * @param {Array} sections - Retrieved sections
 * @returns {Array} Re-ranked sections with relevance explanation
 */
const rerankWithGemini = async (query, sections) => {
  if (sections.length === 0) return [];
  const model = getLLMModel();

  const sectionList = sections
    .map(
      (s, i) =>
        `[${i + 1}] ${s.actId?.actName} Section ${s.sectionNumber}: ${s.text?.substring(0, 300)}...`
    )
    .join('\n\n');

  const prompt = `You are a legal expert for Bihar District Magistrate Courts.
The Peshkar is researching: "${query}"

Rate each legal provision below from 0 to 10 for relevance to this query.
Return JSON only:
[{"index": 1, "relevanceScore": 8, "reason": "Directly applicable to ownership disputes"}, ...]

Provisions:
${sectionList}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\[[\s\S]+\]/);
    if (!jsonMatch) return sections;

    const scores = JSON.parse(jsonMatch[0]);
    return sections
      .map((section, i) => {
        const score = scores.find((s) => s.index === i + 1);
        return { ...section, rerankScore: score?.relevanceScore || 0, rerankReason: score?.reason };
      })
      .sort((a, b) => b.rerankScore - a.rerankScore);
  } catch (error) {
    console.error('[RERANK ERROR]', error.message);
    return sections;
  }
};

module.exports = { retrieveRelevantSections, rerankWithGemini };
