require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('./src/config/db');

// Must require models BEFORE ragService so Mongoose has them registered
require('./src/models/LegalAct');
require('./src/models/LegalSection');
const { retrieveRelevantSections, rerankWithGemini } = require('./src/services/ragService');

const ocrText = fs.readFileSync(
  path.join(__dirname, '..', 'public', 'OCR_Document_Text.txt'),
  'utf-8'
);

async function run() {
  // 1. Connect to MongoDB for RAG
  await connectDB();
  console.log('\n=== RAG + Gemini Order Generation Test ===\n');
  console.log(`OCR document: ${ocrText.length} chars`);

  const client = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
  });

  // 2. RAG: retrieve relevant legal sections from MongoDB
  console.log('\n[RAG] Step 1: Keyword + Vector search...');
  const query = 'jamabandi cancellation Bihar land mutation dakhil kharij appeal fraud revenue records';
  let ragSections = [];
  try {
    const retrieved = await retrieveRelevantSections(query, { topK: 10 });
    console.log(`[RAG] Retrieved ${retrieved.length} sections from DB`);

    if (retrieved.length > 0) {
      console.log('[RAG] Step 2: Re-ranking with Gemini...');
      const reranked = await rerankWithGemini(query, retrieved);
      ragSections = reranked.filter((s) => (s.rerankScore || 0) >= 4).slice(0, 6);
      console.log(`[RAG] Final: ${ragSections.length} sections after re-ranking`);
      ragSections.forEach((s, i) =>
        console.log(`  [${i + 1}] ${s.actId?.actName} §${s.sectionNumber} — score: ${s.rerankScore} — ${s.rerankReason}`)
      );
    } else {
      console.log('[RAG] No sections in DB — proceeding with built-in statute fallback');
    }
  } catch (err) {
    console.warn('[RAG] DB retrieval failed:', err.message, '— using fallback statutes');
  }

  // 3. Format RAG sections for the prompt
  const ragBlock = ragSections.length > 0
    ? ragSections
        .map((s) => `§ ${s.sectionNumber} of ${s.actId?.actName} (${s.sectionTitle || ''}): "${(s.text || '').substring(0, 300)}..."`)
        .join('\n\n')
    : `§ 9(6)(A) of Bihar Land Mutation Act 2011 (DM Appellate Jurisdiction): "The District Magistrate shall hear appeals against orders of the Additional Collector in mutation matters..."
§ 114 of Bihar Revenue Code 2011 (Cancellation of fraudulent entries): "Any entry in revenue records obtained by fraud, misrepresentation or forgery shall be liable to cancellation..."
§ 35 of Indian Evidence Act 1872 (Relevance of entry in public records): "An entry in any public or official book, register or record... is a relevant fact..."`;

  // 4. Build the full prompt with RAG context
  const systemInstruction =
    'Aap Bihar Sarkar ke Jila Padhadhikari / Samahartta Nyayalay ke varishtha nyayik prarupkar hain. ' +
    'Aap Bihar DM Court ke pramanik format mein, bina kisi Markdown heading ya bullet symbol ke, ' +
    'shuddh aupcharik nyayik Hindi mein sampurna vishleshanatmak nyayik aadesh likhte hain. ' +
    'RAG se prapt vidhik dharaon ko aadesh ke vishleshan mein avashya uddhrit karen. ' +
    'Keval Hindi bhasha aur Devnagari lipi ka prayog karen. Kisi bhi vaky ya anuchhed ko dohrana mana hai.';

  const prompt = `नीचे दिए गए न्यायालय के OCR अभिलेख के आधार पर, एक पूर्ण, विस्तृत और आधिकारिक न्यायिक आदेश हिंदी में तैयार करें।

=== RAG से प्राप्त लागू विधिक प्रावधान (इन्हें आदेश के विश्लेषण एवं निर्णय में अवश्य उद्धृत करें) ===
${ragBlock}

=== न्यायालय का आदेश प्रारूप ===
आदेश में निम्नलिखित खंड होने चाहिए (बिना किसी Markdown heading या ** के):
1. न्यायालय का शीर्षक (जिला, वाद संख्या, पक्षकारों के नाम)
2. प्रस्तावना (अपील का आधार — उपरोक्त RAG से प्राप्त धारा उद्धृत करें, नोटिस, तामिला, उपस्थिति)
3. अपीलकर्त्ता के तर्क (क्रमांकित — 1-, 2-, 3-)
4. प्रतिवादी का प्रतिउत्तर (क्रमांकित)
5. न्यायालय का विश्लेषण — RAG से प्राप्त विधिक धाराओं को यहाँ उद्धृत करें
6. निर्णय
7. निर्देश (अंचलाधिकारी को)
8. जिला पदाधिकारी का हस्ताक्षर खंड

=== OCR अभिलेख ===
${ocrText}

अब उपरोक्त RAG प्रावधानों एवं अभिलेख के आधार पर संपूर्ण न्यायालय आदेश तैयार करें:`;

  console.log('\n[GEMINI] Generating order with RAG-enriched prompt...\n');

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${systemInstruction}\n\n${prompt}`,
    });

    const order = response.text;
    console.log('='.repeat(70));
    console.log('GENERATED COURT ORDER (with RAG):');
    console.log('='.repeat(70));
    console.log(order);
    console.log('='.repeat(70));
    console.log(`\nTotal length: ${order.length} characters`);
    console.log(`RAG sections cited: ${ragSections.length}`);

    const outputPath = path.join(__dirname, 'generated_order_rag.txt');
    fs.writeFileSync(outputPath, order, 'utf-8');
    console.log(`Saved to: ${outputPath}`);
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch(console.error);
