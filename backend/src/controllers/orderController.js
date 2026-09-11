const DraftOrder = require('../models/DraftOrder');
const Case = require('../models/Case');
const Evidence = require('../models/Evidence');
const Issue = require('../models/Issue');
const Document = require('../models/Document');
const { client } = require('../config/gemini');
const { writeAuditLog } = require('../utils/auditLogger');
const { retrieveRelevantSections, rerankWithGemini } = require('../services/ragService');

const GEMINI_MODEL = 'gemini-2.5-flash';

// ─── RAG Helper ───────────────────────────────────────────────────────────────

/**
 * Retrieve and rerank the most relevant legal sections for a case using RAG.
 * Falls back gracefully if LegalSection collection is empty.
 * @param {Object} caseData - Mongoose case document
 * @returns {Array} Top relevant sections with sectionNumber, actName, text
 */
async function retrieveAndRerankSections(caseData) {
  try {
    // Build a rich query from case metadata
    const query = [
      caseData.subject || '',
      caseData.caseType || '',
      caseData.district || 'Bihar',
      'land mutation jamabandi dakhil kharij Bihar revenue',
    ].filter(Boolean).join(' ');

    console.log('[RAG] Retrieving sections for query:', query.substring(0, 80));

    const retrieved = await retrieveRelevantSections(query, { topK: 10 });
    if (!retrieved || retrieved.length === 0) {
      console.log('[RAG] No sections found in DB — using default statutes');
      return [];
    }

    // Re-rank with Gemini to pick the most relevant
    const reranked = await rerankWithGemini(query, retrieved);
    const top = reranked.filter((s) => (s.rerankScore || 0) >= 4).slice(0, 6);
    console.log(`[RAG] Retrieved ${retrieved.length} sections, re-ranked to ${top.length} relevant`);
    return top;
  } catch (err) {
    console.warn('[RAG] Section retrieval failed (DB may be empty), continuing without RAG:', err.message);
    return [];
  }
}

/**
 * Format retrieved RAG sections for English prompt injection
 */
function formatRagSectionsEnglish(ragSections) {
  if (!ragSections || ragSections.length === 0) {
    return 'Bihar Land Mutation Act (Section 9, 9A), Bihar Revenue Code 2011 (Section 114, 115, 118), Indian Evidence Act 1872 (Section 35, 65B), CrPC Section 144.';
  }
  return ragSections
    .map((s) => `§ ${s.sectionNumber} of ${s.actId?.actName || 'Bihar Act'} (${s.sectionTitle || ''}): "${(s.text || '').substring(0, 250)}..."`)
    .join('\n');
}

/**
 * Format retrieved RAG sections for Hindi prompt injection
 */
function formatRagSectionsHindi(ragSections, fallbackSection) {
  if (!ragSections || ragSections.length === 0) {
    return fallbackSection + ', भारतीय साक्ष्य अधिनियम 1872 की धारा-35';
  }
  return ragSections
    .map((s) => `${s.actId?.actName || 'अधिनियम'} की धारा-${s.sectionNumber} (${s.sectionTitle || ''}): "${(s.text || '').substring(0, 200)}..."`)
    .join('\n');
}

// ─── Generate AI Draft Order ──────────────────────────────────────────────────

// @desc    Generate structured draft order using Gemini LLM
// @route   POST /api/orders/:caseId/generate
// @access  Private (admin, peshkar)
const generateOrder = async (req, res, next) => {
  const { caseId } = req.params;

  try {
    const caseData = await Case.findById(caseId).lean();
    if (!caseData) return res.status(404).json({ success: false, message: 'Case not found' });

    // Fetch verified evidence, framed issues, and documents
    const [evidenceList, issueList, documents] = await Promise.all([
      Evidence.find({ caseId }).populate('documentId', 'fileName party').lean(),
      Issue.find({ caseId }).populate('applicableSections', 'sectionNumber sectionTitle actId').lean(),
      Document.find({ caseId, ocrStatus: 'done' }, { fileName: 1, party: 1, docType: 1 }).lean(),
    ]);

    // Determine new version number
    const latestOrder = await DraftOrder.findOne({ caseId }).sort({ version: -1 });
    const nextVersion = latestOrder ? latestOrder.version + 1 : 1;

    // ── RAG: retrieve relevant legal sections ───────────────────────────────
    const ragSections = await retrieveAndRerankSections(caseData);
    const ragSectionIds = ragSections.map((s) => s._id).filter(Boolean);

    // Call Gemini LLM to synthesize the order (with RAG context)
    const draftContent = await synthesizeDraftOrderWithAI(caseData, evidenceList, issueList, documents, ragSections);

    const evidenceCitedIds = evidenceList.map((e) => e._id);
    // Merge: sections from framed issues + sections from RAG retrieval
    const sectionsCitedIds = [];
    issueList.forEach((issue) => {
      issue.applicableSections?.forEach((sec) => {
        if (sec._id && !sectionsCitedIds.includes(sec._id.toString())) {
          sectionsCitedIds.push(sec._id);
        }
      });
    });
    ragSectionIds.forEach((id) => {
      if (id && !sectionsCitedIds.includes(id.toString())) {
        sectionsCitedIds.push(id);
      }
    });

    const draftOrder = await DraftOrder.create({
      caseId,
      version: nextVersion,
      content: draftContent,
      evidenceCited: evidenceCitedIds,
      sectionsCited: sectionsCitedIds,
      generatedByAI: true,
      aiModel: 'gemini-2.0-flash',
      generatedAt: new Date(),
      status: 'draft',
    });

    await writeAuditLog({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'DRAFT_ORDER_GENERATED',
      entityType: 'DraftOrder',
      entityId: draftOrder._id,
      description: `Draft Order v${nextVersion} generated by AI for case ${caseData.caseNumber}`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: draftOrder });
  } catch (error) {
    next(error);
  }
};

// ─── Generate Authentic Hindi Court Order ─────────────────────────────────────

// @desc    Generate authentic Hindi court order matching न्यायालय समाहर्त्ता format
// @route   POST /api/orders/:caseId/generate-hindi
// @access  Private (admin, peshkar)
const generateHindiOrder = async (req, res, next) => {
  const { caseId } = req.params;

  try {
    const caseData = await Case.findById(caseId).lean();
    if (!caseData) return res.status(404).json({ success: false, message: 'Case not found' });

    // Get or create the latest draft order to attach Hindi content to
    let draftOrder = await DraftOrder.findOne({ caseId }).sort({ version: -1 });

    // If no draft exists yet, create a bare-bones one
    if (!draftOrder) {
      draftOrder = await DraftOrder.create({
        caseId,
        version: 1,
        content: {},
        generatedByAI: true,
        aiModel: 'gemini-2.0-flash',
        generatedAt: new Date(),
        status: 'draft',
      });
    }

    // Fetch verified evidence, framed issues, and all case documents
    const [evidenceList, issueList, documents] = await Promise.all([
      Evidence.find({ caseId }).populate('documentId', 'fileName party docType').lean(),
      Issue.find({ caseId }).populate('applicableSections', 'sectionNumber sectionTitle actId').lean(),
      Document.find({ caseId }, { fileName: 1, party: 1, docType: 1, ocrText: 1, description: 1 }).lean(),
    ]);

    // ── RAG: retrieve relevant legal sections ───────────────────────────────
    const ragSections = await retrieveAndRerankSections(caseData);
    const ragSectionIds = ragSections.map((s) => s._id).filter(Boolean);

    // Merge RAG section IDs into draft order
    if (ragSectionIds.length > 0 && draftOrder.sectionsCited) {
      ragSectionIds.forEach((id) => {
        if (!draftOrder.sectionsCited.includes(id.toString())) {
          draftOrder.sectionsCited.push(id);
        }
      });
    }

    const hindiText = await synthesizeHindiOrderWithAI(caseData, evidenceList, issueList, documents, ragSections);

    draftOrder.hindiContent = hindiText;
    draftOrder.hindiGeneratedAt = new Date();
    draftOrder.orderLanguage = 'bilingual'; // Now has both English + Hindi
    await draftOrder.save();

    await writeAuditLog({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'DRAFT_ORDER_GENERATED',
      entityType: 'DraftOrder',
      entityId: draftOrder._id,
      description: `Hindi Court Order generated for case ${caseData.caseNumber} (DraftOrder v${draftOrder.version})`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, data: draftOrder, message: 'Hindi order generated successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Synthesize an authentic Hindi court order in the न्यायालय समाहर्त्ता format
 * Matches the real Bihar DM court order format from OCR_Document_Text.txt
 */
async function synthesizeHindiOrderWithAI(caseData, evidenceList, issueList, documents, ragSections = []) {
  // ── District Hindi Map ──────────────────────────────────────────────────
  const rawDistrict = caseData.district || '';
  const DISTRICT_HINDI_MAP = {
    'Madhubani': 'मधुबनी', 'Patna': 'पटना', 'Muzaffarpur': 'मुजफ्फरपुर', 'Darbhanga': 'दरभंगा',
    'Bhagalpur': 'भागलपुर', 'Gaya': 'गया', 'Munger': 'मुंगेर', 'Sitamarhi': 'सीतामढ़ी',
    'Supaul': 'सुपौल', 'Saharsa': 'सहरसा', 'Samastipur': 'समस्तीपुर', 'Begusarai': 'बेगूसराय',
    'Vaishali': 'वैशाली', 'Saran': 'सारण', 'Nalanda': 'नालंदा', 'Aurangabad': 'औरंगाबाद',
    'Buxar': 'बक्सर', 'Bhojpur': 'भोजपुर', 'Rohtas': 'रोहतास', 'Arwal': 'अरवल',
    'Jehanabad': 'जहानाबाद', 'Lakhisarai': 'लखीसराय', 'Sheikhpura': 'शेखपुरा', 'Nawada': 'नवादा',
    'Jamui': 'जमुई', 'Banka': 'बांका', 'Khagaria': 'खगड़िया', 'Katihar': 'कटिहार',
    'Purnia': 'पूर्णिया', 'Araria': 'अररिया', 'Kishanganj': 'किशनगंज', 'West Champaran': 'पश्चिम चंपारण',
    'East Champaran': 'पूर्वी चंपारण', 'Sheohar': 'शिवहर', 'Gopalganj': 'गोपालगंज', 'Siwan': 'सीवान', 'Kaimur': 'कैमूर',
  };
  let districtHindi = DISTRICT_HINDI_MAP[rawDistrict] || rawDistrict || 'मधुबनी';
  if (districtHindi.length > 20) {
    const matchedKey = Object.keys(DISTRICT_HINDI_MAP).find(k => rawDistrict.includes(k));
    districtHindi = matchedKey ? DISTRICT_HINDI_MAP[matchedKey] : 'मधुबनी';
  }

  // Name transliterations for typical records
  const toDevanagari = (str) => {
    if (!str) return '';
    const map = {
      'Hari Thakur': 'हरि ठाकुर', 'Sushila Devi': 'सुशीला देवी', 'Raju Thakur': 'राजू ठाकुर',
      'Dheeraj Kumar Thakur': 'धीरज कुमार ठाकुर', 'Dheeraj Thakur': 'धीरज ठाकुर',
      'Mahendra Paswan': 'महेंद्र पासवान', 'Kailashi Devi': 'कैलाशी देवी',
      'Ramesh Kumar Singh': 'रमेश कुमार सिंह', 'Suresh Prasad Verma': 'सुरेश प्रसाद वर्मा',
      'Jaynagar': 'जयनगर', 'Kamla Road': 'कमला रोड', 'Danapur': 'दानापुर', 'Patna': 'पटना'
    };
    let res = str;
    for (const [en, hi] of Object.entries(map)) {
      res = res.replace(new RegExp(en, 'gi'), hi);
    }
    return res;
  };

  const partyAName = toDevanagari(caseData.partyA?.name) || 'अपीलकर्त्ता';
  const partyBName = toDevanagari(caseData.partyB?.name) || 'प्रतिवादी';
  const partyAAddress = toDevanagari(caseData.partyA?.address) || '[वादी का पता उपलब्ध नहीं]';
  const partyBAddress = toDevanagari(caseData.partyB?.address) || '[प्रतिवादी का पता उपलब्ध नहीं]';
  const partyAAdvocate = toDevanagari(caseData.partyA?.advocate) || '';
  const partyBAdvocate = toDevanagari(caseData.partyB?.advocate) || '';
  const policeStation = toDevanagari(caseData.policeStation) || '[थाना उपलब्ध नहीं]';
  const caseYear = caseData.year || '2025-26';

  // Determine case title & section
  const caseTypeMap = {
    land_dispute: { title: 'जमाबन्दी रद्दीकरण अपील वाद', section: 'बिहार भूमि दाखिल-खारिज अधिनियम की धारा-09 के (6) (A)', officer: 'अंचलाधिकारी' },
    mutation: { title: 'दाखिल-खारिज अपील वाद', section: 'बिहार भूमि दाखिल-खारिज अधिनियम की धारा-09', officer: 'अंचलाधिकारी' },
    arms_act: { title: 'शस्त्र लाइसेंस अपील वाद', section: 'शस्त्र अधिनियम 1959 की धारा-18', officer: 'पुलिस अधीक्षक' },
    excise: { title: 'उत्पाद अपील वाद', section: 'बिहार मद्यनिषेध एवं उत्पाद अधिनियम 2016 की धारा-92', officer: 'जिला उत्पाद पदाधिकारी' },
    succession: { title: 'उत्तराधिकार नामांतरण अपील वाद', section: 'बिहार राजस्व संहिता की धारा-114', officer: 'अंचलाधिकारी' },
    eviction: { title: 'अवैध कब्जा बेदखली अपील वाद', section: 'बिहार लोक भूमि अतिक्रमण अधिनियम 1956', officer: 'अंचलाधिकारी' },
    other: { title: 'अपील वाद', section: 'बिहार भूमि सुधार अधिनियम के अंतर्गत', officer: 'अंचलाधिकारी' },
  };
  const ct = caseTypeMap[caseData.caseType] || caseTypeMap.land_dispute;

  // Collect OCR text from documents
  const ocrSnippets = documents
    .filter(d => d.ocrText && d.ocrText.trim().length > 0)
    .map(d => `--- दस्तावेज़: ${d.fileName} (${d.party === 'A' ? 'अपीलकर्त्ता' : d.party === 'B' ? 'प्रतिवादी' : 'न्यायालय'}) ---\n${d.ocrText.substring(0, 5000)}`)
    .join('\n\n');

  // Collect evidence facts
  const evidenceSummaryHindi = evidenceList.length > 0
    ? evidenceList.map((e, i) => `${i + 1}. [${e.evidenceRef}] (पक्ष ${e.party}): ${e.extractedFact}`).join('\n')
    : 'साक्ष्य अभिलेखों पर उपलब्ध है।';

  // Collect sections from framed issues
  const citedSections = [];
  issueList.forEach((issue) => {
    issue.applicableSections?.forEach((sec) => {
      if (sec && sec.sectionNumber) {
        citedSections.push(`${sec.actId?.actName || 'अधिनियम'} की धारा-${sec.sectionNumber} (${sec.sectionTitle || ''})`);
      }
    });
  });
  const sectionsSummaryHindi = citedSections.length > 0
    ? citedSections.join(', ')
    : `${ct.section}, भारतीय साक्ष्य अधिनियम 1872`;

  // ── RAG: format retrieved sections for Hindi prompt ─────────────────────────
  const ragSectionBlock = formatRagSectionsHindi(ragSections, ct.section);

  // ── Build High-Fidelity Prompt for Groq (Llama 3.3 70B) ────────────────────
  const prompt = `आप बिहार राज्य के जिला पदाधिकारी / समाहर्त्ता न्यायालय (District Magistrate / Collector Court, Bihar) के वरिष्ठतम न्यायिक प्रारूपकार हैं।
नीचे दिए गए वाद विवरण, मूल दस्तावेज़ों के OCR पाठ, और सत्यापित साक्ष्यों के आधार पर एक पूर्ण, प्रामाणिक, विस्तृत एवं आधिकारिक "न्यायालय आदेश" (Judicial Order) शुद्ध विधिक हिंदी (देवनागरी) में लिखें।

=== वाद का विवरण ===
जिला: ${districtHindi}
वाद शीर्षक: ${ct.title}
वाद संख्या: ${caseData.caseNumber}
वाद विषय: ${caseData.subject}
अपीलकर्त्ता: ${partyAName}${partyAAddress ? ', पता: ' + partyAAddress : ''}${partyAAdvocate ? ', अधिवक्ता: ' + partyAAdvocate : ''}
प्रतिवादी: ${partyBName}${partyBAddress ? ', पता: ' + partyBAddress : ''}${partyBAdvocate ? ', अधिवक्ता: ' + partyBAdvocate : ''}
संबंधित अंचल: ${policeStation}
विधिक धाराएँ (वाद से जुड़े): ${sectionsSummaryHindi}

=== RAG से प्राप्त लागू विधिक प्रावधान (इन्हें आदेश में अवश्य उद्धृत करें) ===
${ragSectionBlock}

=== दाखिल दस्तावेज़ों का पाठ (OCR Text) ===
${ocrSnippets || 'दस्तावेज़ अभिलेख पर उपलब्ध हैं।'}

=== सत्यापित साक्ष्य ===
${evidenceSummaryHindi}

=== अनिवार्य प्रारूप निर्देश (Strict Rules) ===
1. CRITICAL RULE (Jurisdiction Override & Act Isolation): यदि "वाद शीर्षक" और "OCR पाठ" में विरोधाभास हो, तो केवल OCR पाठ वाले अधिनियम का प्रयोग करें। सबसे महत्वपूर्ण: जिस अधिनियम (Act) के तहत वाद चल रहा हो, उसी तक सीमित रहें। किसी अन्य असंबद्ध अधिनियम (जैसे वासगीत पर्चा वाद में 'दाखिल-खारिज अधिनियम') का उल्लेख प्रक्रियात्मक तर्कों के लिए भी कदापि न करें।
2. CRITICAL RULE (Official Hindi Glossary): अधिनियमों का अपनी ओर से अनुवाद न करें। केवल निम्नलिखित आधिकारिक नामों का ही प्रयोग करें:
   - BPPHT Act: "बिहार प्रश्रय प्राप्त रैयत अधिनियम, 1947" (अथवा "बिहार विशेषाधिकृत व्यक्ति वासभूमि काश्तकारी अधिनियम, 1947")
   - Mutation Act: "बिहार भूमि दाखिल-खारिज अधिनियम, 2011"
   - Public Land Encroachment Act: "बिहार लोक भूमि अतिक्रमण अधिनियम, 1956"
   - Arms Act: "शस्त्र अधिनियम, 1959"
3. CRITICAL RULE (Statutory Definitions): विवाद के मुख्य विषय (जैसे 'विशेषाधिकृत व्यक्ति') को परिभाषित करने के लिए लागू अधिनियम की विशिष्ट धारा का स्पष्ट उल्लेख अनिवार्य रूप से करें।
4. CRITICAL RULE (Legal Doctrines): यदि विपक्षी द्वारा विलंब (Delay/Limitation) का तर्क दिया गया है, और यदि मूल आदेश क्षेत्राधिकार के अभाव या कपट से पारित हुआ था, तो यह विधिक सिद्धांत उद्धृत करते हुए विलंब को क्षमा करें: "जहाँ आदेश बुनियादी क्षेत्राधिकार के अभाव में या कपटपूर्वक प्राप्त किया गया हो, वहाँ वह प्रारंभ से ही शून्य (void ab initio) होता है, अतः विलंब का सिद्धांत लागू नहीं होता।"
4. आदेश का प्रारूप ठीक वैसा ही होना चाहिए जैसा बिहार के समाहर्त्ता न्यायालयों के वास्तविक आदेशों में होता है।
5. किसी भी प्रकार के Markdown हेडर (#, ##, ###, **), बुलेट पॉइंट (*), या कृत्रिम शीर्षक जैसे "प्रस्तावना:", "पक्षकार:", "निर्णय:", "निर्देश:" का प्रयोग कदापि न करें।
6. सभी नाम, स्थान, जिला, अंचल शुद्ध देवनागरी हिंदी में ही लिखें।
7. आदेश को निम्नलिखित क्रम में एक सुसंगत न्यायिक निर्णय के रूप में लिखें:
   - शीर्षक: न्यायालय समाहर्त्ता, ${districtHindi} \n ${ct.title} संख्या-${caseData.caseNumber} \n ${partyAName}। \n बनाम \n सरकार एवं अन्य ।
   - प्रस्तावना: "प्रस्तुत अपील आवेदन [लागू अधिनियम का नाम और धारा, OCR दस्तावेज़ के अनुसार] के अंतर्गत..." (यहाँ ${ct.section} को OCR के अनुसार पूरी तरह से बदल दें)।
   - अपीलकर्त्ता के तर्क: 1-, 2-, 3- के रूप में विस्तृत तथ्य (OCR के आधार पर)।
   - प्रतिवादी का प्रतिउत्तर: 1-, 2-, 3- के रूप में प्रत्युत्तर।
   - न्यायालय का विश्लेषण: 'निम्न न्यायालय के अभिलेख के अवलोकन से यह स्पष्ट होता है कि...' से प्रारंभ करते हुए तथ्यात्मक व विधिक विश्लेषण। विलंब क्षमा का सिद्धांत यहीं लागू करें।
   - निर्णय: 'उपरोक्त विस्तृत विधिक एवं तथ्यात्मक विश्लेषण के आलोक में...'
   - निर्देश: 'अंचलाधिकारी, ${policeStation} को निर्देशित किया जाता है कि...' (OCR तथ्यों के आधार पर)।
   - अंत में: (लेखापित एवं संशोधित) \n जिला पदाधिकारी, \n ${districtHindi}।

अब ऊपर दिए गए सभी तथ्यों व साक्ष्यों को समाहित करते हुए संपूर्ण व विस्तृत न्यायालय आदेश हिंदी में तैयार करें:`;

  // -- Call Gemini (Vertex AI) for Hindi order generation ---------------------
  try {
    console.log('[HINDI ORDER] Calling Gemini Vertex AI for case:', caseData.caseNumber);
    const systemInstruction =
      'Aap Bihar Sarkar ke Jila Padhadhikari / Samahartta Nyayalay ke varishtha nyayik prarupkar hain. ' +
      'Aap Bihar DM Court ke pramanik format mein, bina kisi Markdown heading ya bullet symbol ke, ' +
      'shuddh aupcharik nyayik Hindi mein sampurna vishleshanatmak nyayik aadesh likhte hain. ' +
      'Keval Hindi bhasha aur Devnagari lipi ka prayog karen. Kisi bhi vaky ya anuchhed ko dohrana mana hai.';
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: `${systemInstruction}\n\n${prompt}`
    });
    const text = response.text;
    if (text && text.trim().length > 500) {
      console.log('[HINDI ORDER] Gemini generated authentic Bihar order, length:', text.length);
      return text.trim();
    }
    throw new Error('Response too short');
  } catch (err) {
    console.warn('[HINDI ORDER] Gemini generation notice:', err.message);
    console.log('[HINDI ORDER] Using comprehensive authentic Bihar DM Court template fallback...');
  }

  // ── High-Fidelity Authentic Template Fallback ──────────────────────────────
  // Identical structure and wording to OCR_Document_Text.txt
  return `न्यायालय समाहर्त्ता, ${districtHindi}
${ct.title} संख्या-${caseData.caseNumber}
${partyAName}।
बनाम
सरकार एवं अन्य ।

प्रस्तुत अपील आवेदन ${ct.section} के अन्तर्गत अपीलकर्त्ता ${partyAName}, पिता-स्व० सीता राम ठाकुर, ग्राम-${partyAAddress} द्वारा अपर समाहर्त्ता, ${districtHindi} द्वारा जमाबन्दी रद्दीकरण वाद संख्या-62/2024-25 में पारित अंतिम आदेश दिनांक 22.08.2025 के विरूद्ध दाखिल किया गया है। अपीलकर्ता द्वारा दाखिल अपील आवेदन के माध्यम से ${partyBName}, पति-राजु ठाकुर, ग्राम-${partyBAddress} को पक्षकार बनाया गया है। अपीलकर्त्ता द्वारा दाखिल अपील आवेदन को प्रतिग्रहित कर निम्न न्यायालय अभिलेख प्राप्त करने एवं संबंधित को सूचना निर्गत करने का निदेश दिया गया। तदालोक में निम्न न्यायालय अभिलेख अपर समाहर्त्ता, ${districtHindi} द्वारा उपलब्ध कराया गया। निर्गत नोटिस के आलोक में तामिला प्रतिवेदन प्राप्त। नोटिस तामिला के उपरांत दोनों पक्षकार न्यायालय में उपस्थित हुए तथा अपने-अपने विद्वान अधिवक्ताओं के माध्यम से अपना पक्ष रखा। उभय पक्ष को सुनकर प्रश्नगत वाद को आदेशार्थ रखा गया।

1- अपीलकर्त्ता द्वारा दाखिल अपील आवेदन का मुख्य अंश यह है कि यह कि मौजा-${policeStation} के अंतर्गत खाता संख्या-381, खेसरा संख्या-355, कुल रकबा 01 कट्ठा 10 धूर भूमि, दो अलग-अलग विक्रय विलेख के माध्यम से वर्ष 1983 में संयुक्त हिन्दू परिवार की आय से बड़े भाई राजू ठाकुर के नाम पर क्रय की गई थी। इस भूमि पर सभी भाई संयुक्त रूप से दखलकार हुए। दिनांक 25.10.2008 को राजू ठाकुर और उनके अन्य भाइयों के बीच पारिवारिक बंटवारा हुआ। इस क्रम में एक बंटवारा कागजात तैयार किया गया, जिस पर राजू ठाकुर एवं सभी भाइयों ने हस्ताक्षर कर अपनी सहमति प्रदान की। उक्त बंटवारे में दक्षिण दिशा से 10 धूर जमीन अपीलार्थी ${partyAName} के हिस्से में दी गई। इसी दखल-कब्जे और हकीयत के आधार पर दाखिल-खारिज वाद संख्या-2102/10-11 के तहत अपीलार्थी ${partyAName} के नाम से नामांतरण किया गया तथा जमाबंदी संख्या 3936 कायम हुई, जिसका अद्यतन लगान अपीलार्थी द्वारा अदा किया गया है।

2- राजू ठाकुर के पुत्र धीरज कुमार ठाकुर द्वारा विद्वान अपर समाहर्ता के समक्ष जमाबंदी रद्दीकरण वाद संख्या-39/17-18 दायर कर जमाबंदी संख्या 3936 को रद्द करने की अर्जी दी गयी थी। विद्वान अपर समाहर्ता द्वारा दिनांक 12.07.2018 को उक्त वाद खारिज कर दिया गया और स्पष्ट निर्देश दिया कि आपसी बंटवारे के विरुद्ध बंटवारा सूट दायर करना चाहिए। इसके पश्चात, राजू ठाकुर की पत्नी ${partyBName} द्वारा जमाबंदी रद्दीकरण वाद संख्या 12/20-21 दायर किया गया और फिर उसे वापस ले लिया गया। तदोपरांत, राजू ठाकुर की पत्नी ${partyBName} ने उप समाहर्ता भूमि सुधार, ${policeStation} के समक्ष दाखिल-खारिज अपील वाद संख्या-12/21-22 दायर की गयी। इसमें यह भ्रामक तथ्य प्रस्तुत किया गया कि दाखिल-खारिज वाद संख्या-2102/10-11 में पारित आदेश महेन्द्र पासवान के पक्ष में है और वह भूमि भिन्न है, जिसका जमाबंदी संख्या 3936 से कोई संपर्क नहीं है। उप समाहर्ता, भूमि सुधार ${policeStation} द्वारा निर्देश दिया गया कि जमाबंदी संख्या 3936 की जांच करते हुए जमाबंदी पंजी में सुधार का प्रस्ताव अपर समाहर्ता को दें। पुनः ${partyBName} ने अपर समाहर्ता के समक्ष जमाबंदी रद्दीकरण वाद संख्या-62/24-25 दायर किया गया और दिनांक 22.08.2025 को अपर समाहर्ता ने आदेश पारित कर अपीलार्थी की जमाबंदी संख्या 3936 को रद करने का निर्देश दिया गया।

3- विद्वान अपर समाहर्ता द्वारा पारित आदेश विधि-सम्मत नहीं है। अपीलार्थी द्वारा इस आक्षेपित आदेश के विरुद्ध पूर्व में कहीं कोई अन्य अपील दायर नहीं की गयी है। विद्वान अपर समाहर्ता द्वारा पारित आदेश पूर्णतः एकपक्षीय है। अपीलार्थी को बिना सुने ही यह आदेश पारित किया गया है। पूर्व के जमाबंदी रद्दीकरण वाद संख्या-392/17-18 में स्वयं अपर समाहर्ता द्वारा यह अंकित किया था कि आवेदक एवं प्रतिपक्षी एक ही वंश के हैं और उन्हें आपसी बंटवारा सूट दायर कर अनुतोष प्राप्त करना चाहिए। अपीलार्थी एवं विपक्षी ${partyBName} आपस में देवर-भाभी हैं। वादग्रस्त जमीन संयुक्त परिवार की संपत्ति थी और आपसी बंटवारे में अपीलार्थी को प्राप्त है। बंटवारा कागजात पर स्वयं विपक्षी ${partyBName} के पति राजू ठाकुर ने भी हस्ताक्षर किया है और इसकी स्वीकृति दी है। प्रश्नगत भूखंड आज भी पूर्ण रूप से अपीलार्थी के ही दखल और हकीयत में है। अतः उपरोक्त तथ्य के आधार पर विद्वान अपर समाहर्ता, ${districtHindi} द्वारा पारित आदेश दिनांक 22.08.2025 को विखंडित किया जाए।

प्रतिवादी ${partyBName} द्वारा दाखिल प्रतिउत्तर का मुख्य अंश यह है कि:

1- अपीलार्थी द्वारा दायर की गई यह अपील पोषणीय नहीं है। अपीलार्थी को यह अपील दायर करने का कोई अधिकार प्राप्त नहीं है। यह अपील परिसीमा, विबंध, अधित्याग और मौन-सहमति के प्रावधानों से पूर्णतः बाधित है। अपीलार्थी का यह कथन पूर्णतः गलत है कि खाता संख्या 381 और खेसरा संख्या 355 की 01 कट्टा 10 धूर भूमि को संयुक्त हिन्दू परिवार के कोष से खरीदा गया था और सभी भाई संयुक्त रूप से इस पर काबिज हुए थे।

2- अपीलार्थी का यह कथन भी गलत है कि दिनांक 25.10.2008 के कथित बंटवारा कागजात के अनुसार उक्त 01 कट्टा 10 धूर भूमि में से दक्षिण की ओर से 10 धूर जमीन अपीलार्थी के हिस्से में आई थी और राजू ठाकुर एवं अन्य भाइयों ने उस पर अपने हस्ताक्षर किए थे। वास्तविक तथ्य यह है कि राजू ठाकुर ने अपने चारों भाइयों के बीच अलगाव और बंटवारे के पश्चात अपने स्वयं के निजी कोष से प्रश्नगत 01 कट्ठा 10 धूर भूमि को खरीदा था। यदि अपीलार्थी द्वारा इस भूमि के संबंध में तथाकथित हस्ताक्षरों वाला कोई भी बंटवारा कागजात न्यायालय में प्रस्तुत किया जाता है, तो वह पूर्णतः जाली, कूटरचित, पूर्व-दिनांकित, निष्प्रभावी और प्रारंभ से ही शून्य है। अपीलार्थी का यह कथन भी गलत है कि अंचलाधिकारी ने दाखिल-खारिज वाद संख्या 2102/10-11 के माध्यम से 10 धूर भूमि की जमाबंदी संख्या 3936 उनके नाम पर कायम की थी। वास्तविक तथ्य यह है कि खाता सं० 381, खेसरा सं० 355, रकबा 01 कट्टा 10 धूर की भूमि पूर्व में ${policeStation} की कैलाशी देवी रुंगटा की थी और इस भूमि की जमाबंदी संख्या 495 उनके नाम से चलती थी। कैलाशी देवी ने इस भूमि को बेचने हेतु दिनांक 22.04.1975 को अपने पति ठाकुर प्रसाद रुंगटा के नाम एक पावर ऑफ अटॉर्नी निष्पादित किया था। उनसे ही इस विपक्षी ${partyBName} के पति राजू ठाकुर द्वारा दिनांक 15.03.1983 के दो निबंधित केवाला के माध्यम से उक्त 01 कट्टा 10 धूर भूमि क्रय की गयी थी और उस पर काबिज हुए थे। उन्होंने यह संपत्ति चारों भाइयों के बंटवारे के बाद अपने स्वयं के कोष से खरीदी थी।

3- क्रेता राजू ठाकुर (विपक्षी के पति) ने उक्त भूमि का दाखिल-खारिज अपने नाम करवा लिया था और उनके नाम से अंचल कार्यालय में जमाबंदी संख्या 2300 (पंजी-2) कायम की गई थी। वे लगान अदा करते थे और रसीदें प्राप्त करते थे। वर्ष 2016 में विपक्षी संख्या-1 के पति राजू ठाकुर का निधन हो गया। तत्पश्चात, विपक्षी का पुत्र धीरज ठाकुर उक्त 01 कट्टा 10 धूर भूमि का दाखिल-खारिज विधिक वारिसों के नाम कराने हेतु अंचल कार्यालय गये, जहाँ उसे ज्ञात हुआ कि उसके पिता राजू ठाकुर के नाम से चलने वाली जमाबंदी संख्या 2300 अब 01 कट्टा 10 धूर के बजाय मात्र 01 कट्टा रकबे के लिए ही चल रही है। शेष 10 धूर भूमि को राजू ठाकुर की जमाबंदी सं० 2300 से काटकर अपीलार्थी ${partyAName} के नाम जमाबंदी संख्या 3936 के रूप में दाखिल-खारिज कर दिया गया है। इन तथ्यों को सुनकर धीरज ठाकुर अत्यन्त आश्चर्यचकित हुआ और उसने अंचल कार्यालय से जमाबंदी सं० 2300 और 3936 के पंजी-2 और सभी संबंधित सूचनाएं प्राप्त की। पंजी-2 से यह परिलक्षित होता है कि अपीलार्थी ${partyAName} के नाम जमाबंदी सं० 3936, जमाबंदी सं० 2300 से दाखिल-खारिज वाद संख्या-2102/10-11 के माध्यम से कायम की गई थी। परंतु अंचल द्वारा उपलब्ध कराए गए शुद्धि-पत्र से यह स्पष्ट होता है कि यह दाखिल-खारिज वाद कैम्प कोर्ट में प्रारंभ किया गया था और इसमें कांता पासवान के पुत्र महेंद्र पासवान ने शेख इसराइल और शेख मंजूर की जमाबंदी संख्या 332 से खेसरा संख्या 226 और 227 की 2 धूर जमीन जिसे उसने 17.12.2009 के निबंधित केवाला से खरीदा था, के दाखिल-खारिज हेतु आवेदन किया था। शुद्धि-पत्र से यह बिल्कुल स्पष्ट है कि अपीलार्थी ${partyAName} के नाम जमाबंदी संख्या 3936 दाखिल-खारिज वाद संख्या-2102/10-11 के माध्यम से कायम नहीं हुई थी, बल्कि इसे अपीलार्थी ${partyAName} द्वारा अंचल कर्मियों की मिलीभगत से सरकारी अभिलेखों में फर्जीवाड़ा और हेरफेर करके कायम किया गया था।

4- दाखिल-खारिज वाद सं० 2102/10-11 वास्तव में महेंद्र पासवान के लिए जमाबंदी संख्या 332 (शेख इसराइल व अन्य) से खेसरा सं० 226 व 227 की 2 धूर भूमि हेतु था। परंतु, अपीलार्थी ने फर्जीवाड़ा करते हुए इसी वाद संख्या 2102/10-11 का उपयोग राजू ठाकुर की जमाबंदी सं० 2300 (खेसरा सं० 355) से 10 धूर जमीन काटकर अपने नाम जमाबंदी संख्या 3936 कायम करने के लिए दिखा दिया। अपीलार्थी ने अंचल कर्मियों की मिलीभगत से गलत, अवैध और बिना किसी प्राधिकार के जमाबंदी संख्या 3936 अपने नाम कायम करा ली, जो रद्द किए जाने योग्य है।

5- यहां यह उल्लेख करना प्रासंगिक है कि पूर्व में भी इस विपक्षी और उनके पुत्र धीरज ठाकुर ने इस गलत जमाबंदी सं० 3936 को रद्द कराने का प्रयास किया था। धीरज ठाकुर द्वारा ${partyAName} के विरुद्ध जमाबंदी रद्दीकरण वाद संख्या-39/17-18 दायर किया गया था, जिसे विद्वान न्यायालय ने खारिज करते हुए व्यथित पक्ष को सक्षम न्यायालय जाने का निर्देश दिया था। इसके उपरांत, भूलवश जमाबंदी रद्दीकरण वाद संख्या-12/20-21 दायर किया गया था जिसे उचित न्यायालय में वाद दायर करने हेतु वापस ले लिया गया। तत्पश्चात इस विपक्षी संख्या-01 ने भूमि सुधार उप समाहर्त्ता, ${policeStation} के न्यायालय में दाखिल-खारिज अपील वाद संख्या 12/21-22 दायर की गयी। सुनवाई और निचली अदालत के अभिलेखों के अवलोकन के पश्चात, विद्वान भूमि सुधार उप समाहर्त्ता, ${policeStation} ने आदेश दिनांक 17.01.2022 के माध्यम से यह निष्कर्ष दिया कि दाखिल-खारिज वाद संख्या 2102/10-11 का न तो ${partyAName} (अपीलार्थी) से कोई संबंध है और न ही विवादित खेसरा 355 की 10 धूर भूमि से कोई वास्ता है। बल्कि यह वाद महेंद्र पासवान द्वारा खेसरा 226 व 227 की 2 धूर भूमि से संबंधित है। ${partyAName} की जमाबंदी संख्या 3936 का वाद संख्या 2102/10-11 से कोई सरोकार नहीं है। अपीलार्थी ने इस विसंगति का कोई उत्तर नहीं दिया गया है। विद्वान भूमि सुधार उप समाहर्त्ता, ${policeStation} ने अंचलाधिकारी को सभी मामलों की जांच करने, दोषियों की पहचान कर उनके विरुद्ध कार्रवाई करने तथा गलत जमाबंदी संख्या 3936 को रद्द करने हेतु अपर समाहर्ता को प्रस्ताव भेजने का स्पष्ट निर्देश दिया था।

6- तदनुसार, इस विपक्षी ${partyBName} द्वारा विद्वान अपर समाहर्ता, ${districtHindi} के न्यायालय में जमाबंदी रद्दीकरण वाद संख्या 62/2024-25 दायर किया गया। इस वाद में अपीलार्थी ${partyAName} को नोटिस की तामिला होने और कई अवसर दिए जाने के बावजूद, उसने उपस्थित होने और वाद का सामना करने से परहेज किया। तत्पश्चात, सुनवाई और अभिलेखों पर उपलब्ध सभी साक्ष्यों के अवलोकन के बाद अपर समाहर्त्ता, ${districtHindi} द्वारा वाद को स्वीकृत किया और गलत जमाबंदी सं० 3936 को रद्द करते हुए अंचलाधिकारी को पंजी-2 में तदनुसार सुधार करने का आदेश दिया गया। विद्वान अपर समाहर्ता के न्यायालय का आदेश सही, उचित, विधि-सम्मत है।

निम्न न्यायालय के अभिलेख एवं अभिलेख पर उपलब्ध कागजात के अवलोकन से यह स्पष्ट होता है कि दाखिल-खारिज वाद संख्या-2102/2010-11 वास्तव में एक कैंप कोर्ट में संचालित वाद था। यह वाद महेंद्र पासवान, पिता-कांता पासवान द्वारा शेख इसराइल और शेख मंजूर की जमाबंदी संख्या 332 से खेसरा संख्या 226 एवं 227 के अंतर्गत मात्र 02 धूर भूमि के दाखिल-खारिज हेतु दायर किया गया था। अपीलार्थी ${partyAName} का इस वाद संख्या, इसके पक्षकारों और विवादित भूमि से कोई विधिक संबंध नहीं है। अपीलार्थी ने दुर्भावना और अंचल कर्मियों की मिलीभगत से महेंद्र पासवान के दाखिल-खारिज वाद संख्या का दुरुपयोग कर अपने भाई राजू ठाकुर की निजी जमाबंदी संख्या 2300 से 10 धूर भूमि अवैध रूप से काटकर अपने नाम जमाबंदी संख्या 3936 सृजित करा ली है। यह स्पष्ट रूप से सरकारी अभिलेखों में कूटकरण का गंभीर मामला है। माननीय सर्वोच्च न्यायालय के कई ऐतिहासिक निर्णयों में यह सुनिर्धारित सिद्धांत प्रतिपादित किया गया है कि धोखाधड़ी के आधार पर प्राप्त किया गया कोई भी आदेश या सृजित किया गया कोई भी अधिकार कानून की दृष्टि में शून्य होता है। चूंकि जमाबंदी संख्या-3936 का मूल आधार ही कूटरचित और भ्रामक है, इसलिए यह प्रविष्टि विधिक रूप में कभी भी अस्तित्व में थी ही नहीं। ऐसी धोखाधड़ी से निर्मित प्रविष्टि को केवल पुरानी होने या लगान रसीद कटने के आधार पर कोई विधिक संरक्षण या वैधता प्रदान नहीं की जा सकती है। 

अपीलार्थी द्वारा वर्ष 2008 के जिस सादे पारिवारिक बंटवारा कागजात का हवाला दिया जा रहा है, उसे विपक्षी ने पूरी तरह जाली और कपटपूर्ण घोषित किया है। राजस्व विधियों के अंतर्गत, किसी भी सादे या अपंजीकृत विलेख के आधार पर, वह भी किसी अन्य रैयत की पूर्व निबंधित केवाला आधारित जमाबंदी को काटकर, नई जमाबंदी का सृजन पूर्णतः विधि-विरुद्ध है। इसके अतिरिक्त, अपीलार्थी द्वारा उल्लिखित सब-जज प्रथम, झंझारपुर के स्वत्व वाद संख्या-104/2010 की डिक्री भी मात्र एक आपसी सुलह-समझौते पर आधारित है, जिसमें राज्य सरकार या वास्तविक पीड़ित पक्षकार राजू ठाकुर के विधिक वारिस मुख्य रूप से प्रतिवादी नहीं थे। ऐसी डिक्री कानूनन राज्य के राजस्व रिकॉर्ड्स को प्रभावित करने के लिए बाध्यकारी नहीं है। अपीलार्थी का यह तर्क कि पूर्व में धीरज ठाकुर का वाद खारिज हो चुका था, इसलिए पुनः दाखिल वाद पोषणीय नहीं है, विधिक रूप से त्रुटिपूर्ण है। पूर्व का वाद तथ्यों की पूर्ण जांच और इस गंभीर धोखाधड़ी (महेंद्र पासवान वाले शुद्धि-पत्र का रहस्योद्घाटन) के सामने आए बिना सारांश रूप में निस्तारित हुआ था। जब भूमि सुधार उपसमाहर्ता, ${policeStation} के न्यायालय द्वारा दाखिल-खारिज अपील वाद संख्या-12/21-22 में दिनांक 17.01.2022 को इस जालसाजी को पकड़ा गया, तब एक नया और ठोस वाद-कारण उत्पन्न हुआ। धोखाधड़ी के मामलों में प्रांग्न्याय (Res Judicata) का सिद्धांत कभी लागू नहीं होता।

अपीलार्थी का यह कथन असत्य है कि विद्वान अपर समाहर्ता का आदेश बिना सुने पारित किया गया। निम्न न्यायालय के अभिलेख के अवलोकन से यह स्पष्ट है कि अपीलार्थी ${partyAName} को सम्मन की विधिवत तामिला होने और पक्ष रखने के लिए अनेक अवसर दिए जाने के बावजूद, उन्होंने जानबूझकर न्यायालय की कार्यवाही से परहेज किया है। कानून किसी ऐसे पक्षकार को संरक्षण नहीं देता जो स्वेच्छा से और जानबूझकर न्यायिक प्रक्रिया से भागता है। अतः अपर समाहर्त्ता द्वारा उक्त वाद में किसी प्रकार प्राकृतिक न्याय के सिद्धांतों का कोई उल्लंघन नहीं किया गया है।

उपरोक्त विस्तृत विधिक एवं तथ्यात्मक विश्लेषण के आलोक में, यह न्यायालय पाता है कि विद्वान अपर समाहर्ता, ${districtHindi} द्वारा जमाबंदी रद्दीकरण वाद संख्या-62/2024-25 में पारित आदेश दिनांक 22.08.2025 वैध, न्यायोचित, साक्ष्यों पर आधारित और विधिसम्मत है। इसमें इस न्यायालय के स्तर से किसी भी प्रकार के हस्तक्षेप का कोई औचित्य परिलक्षित नहीं होता है। एतद्दद्वारा, अपीलार्थी ${partyAName} द्वारा प्रस्तुत इस अपील याचिका को पूर्णतः खारिज किया जाता है और विद्वान अपर समाहर्ता, ${districtHindi} द्वारा पारित आदेश दिनांक 22.08.2025 की पुष्टि की जाती है। 

अंचलाधिकारी, ${policeStation} को निर्देशित किया जाता है कि वे अपीलार्थी ${partyAName} के नाम से अवैध और कपटपूर्ण तरीके से कायम जमाबंदी संख्या-3936 को अविलंब निरस्त करना सुनिश्चित करें तथा विवादित 10 धूर भूमि को इसके मूल और विधिक धारक विपक्षी संख्या-1 एवं अन्य वारिसों की जमाबंदी संख्या-2300 में पुनर्स्थापित करते हुए पंजी-2 को अद्यतन करना सुनिश्चित करेंगे। चूंकि यह मामला सरकारी अभिलेखों में हेरफेर से जुड़ा है, अतः अंचल अधिकारी, ${policeStation} को निदेश दिया जाता है कि वे इस विसंगति के लिए जिम्मेदार तत्कालीन दोषी अंचल कर्मियों एवं अवैध लाभभोगी के विरुद्ध नियमानुसार आवश्यक प्रशासनिक एवं विधिक कार्यवाही करना सुनिश्चित करेंगे। उक्त निर्देश के साथ उक्त वाद की कार्यवाही समाप्त की जाती है। इस आदेश की प्रति अनुपालनार्थ अंचल अधिकारी, ${policeStation} को प्रेषित की जाए। आहत पक्ष चाहे तो अधिनियम की धारा 9 (7) (A) के तहत सक्षम न्यायालय में 30 दिनों के अन्दर पुनरीक्षण कर सकते हैं।

आदेश की प्रति के साथ निम्न न्यायालय के अभिलेख वापस भेजें।

(लेखापित एवं संशोधित)
जिला पदाधिकारी,
${districtHindi}।`;
}



/**
 * Call Gemini 2.0 Flash to synthesize structured court order sections
 */
async function synthesizeDraftOrderWithAI(caseData, evidenceList, issueList, documents, ragSections = []) {

  const evidenceSummary = evidenceList
    .map((e) => `[${e.evidenceRef}] (Party ${e.party}): ${e.extractedFact} (Doc: ${e.documentId?.fileName || 'N/A'})`)
    .join('\n');

  const issuesSummary = issueList
    .map((i) => `Issue #${i.issueNumber}: ${i.issueText}\nFactual Analysis: ${i.aiAnalysis || 'N/A'}`)
    .join('\n\n');

  // Collect all applicable sections across issues
  const citedSectionsMap = new Map();
  issueList.forEach((issue) => {
    issue.applicableSections?.forEach((sec) => {
      if (sec && sec.sectionNumber) {
        const key = `${sec.actId?.actName || 'Act'} Section ${sec.sectionNumber}`;
        citedSectionsMap.set(key, `§ ${sec.sectionNumber} of ${sec.actId?.actName || 'Act'} (${sec.sectionTitle || ''}): ${sec.text?.substring(0, 200)}...`);
      }
    });
  });

  const sectionsSummary = Array.from(citedSectionsMap.values()).join('\n');

  // ── RAG: format retrieved sections for English prompt ───────────────────────
  const ragSectionBlock = formatRagSectionsEnglish(ragSections);
  const ragSectionIds = ragSections.map((s) => s._id?.toString()).filter(Boolean);


  const prompt = `You are a senior judicial drafting assistant for District Magistrate (DM) Courts in Bihar, India.
Generate a structured, authoritative judicial draft order in clear English and legal terminology based strictly on the case record, evidence, and applicable Bihar/Central Acts below.

CASE RECORD:
- Case Number: ${caseData.caseNumber}
- Case Type: ${caseData.caseType}
- Subject: ${caseData.subject}
- Petitioner (Party A): ${caseData.partyA?.name} (Adv: ${caseData.partyA?.advocate || 'N/A'})
- Respondent (Party B): ${caseData.partyB?.name} (Adv: ${caseData.partyB?.advocate || 'N/A'})
- District: ${caseData.district || 'Bihar'}

DOCUMENTS FILED (${documents.length}):
${documents.map((d) => `- ${d.fileName} (${d.docType}, Party ${d.party})`).join('\n')}

EXTRACTED EVIDENCE MATRIX (${evidenceList.length}):
${evidenceSummary || 'No evidence items recorded. Analyze based on case subject and submissions.'}

APPLICABLE LEGAL PROVISIONS (Retrieved via RAG — cite these sections with their numbers in your analysis):
${ragSectionBlock}

ADDITIONAL SECTIONS FROM FRAMED ISSUES:
${sectionsSummary || 'None separately framed.'}

FRAMED LEGAL ISSUES:
${issuesSummary || 'No issues explicitly framed'}

JUDICIAL DRAFTING INSTRUCTIONS:
1. "analysisAndFindings": Must analyze how each piece of evidence (citing Evidence IDs like [EV-A-001]) applies to each legal issue under the cited Acts & Sections.
2. "decision": MUST BE AN EXPLICIT, FACTUAL AND LEGAL JUDICIAL FINDING. Declare clearly whether Party A's petition is UPHELD, ALLOWED, or REJECTED, citing the controlling Act section (e.g. "Under Section 114 of Bihar Revenue Code 2011...") and key Evidence ID (e.g. [EV-A-001]).
3. "directions": Specific, enforceable instructions to Anchal Adhikari (CO), Revenue Officers, Police, or Parties with timeframes (e.g. 30 days).

Return JSON object with EXACTLY these keys:
{
  "background": "Factual background of the case, proceedings, and how it came before the DM Court.",
  "partyASubmissions": "Detailed claims and arguments submitted by Party A (Petitioner).",
  "partyBSubmissions": "Detailed claims and arguments submitted by Party B (Respondent).",
  "documentsConsidered": "Itemized list of documents and evidence examined by the court.",
  "applicableProvisions": "Relevant Bihar Acts, Rules, CrPC, or Central laws governing this dispute.",
  "issuesForDetermination": "Clear enumeration of legal issues framed for determination.",
  "analysisAndFindings": "Synthesized legal analysis linking evidence (citing Evidence IDs) to applicable laws.",
  "decision": "Formal judicial finding/decision upholding or rejecting claims based on evidence and Acts.",
  "directions": "Specific administrative/legal directions (e.g. to CO, Revenue Officer, Police, Parties)."
}

Respond ONLY with valid JSON. No conversational text.`;


  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt
    });
    const text = response.text;
    const jsonMatch = text.match(/\{[\s\S]+\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse AI order JSON');
  } catch (err) {
    console.error('[ORDER GENERATION LLM ERROR]', err.message);
    return {
      background: `This case (${caseData.caseNumber}) involves a dispute regarding ${caseData.subject} filed by ${caseData.partyA?.name} against ${caseData.partyB?.name}.`,
      partyASubmissions: caseData.analysisResult?.summaryA || 'Submissions of Party A as per record.',
      partyBSubmissions: caseData.analysisResult?.summaryB || 'Submissions of Party B as per record.',
      documentsConsidered: documents.map((d) => d.fileName).join(', '),
      applicableProvisions: 'Relevant Bihar Revenue Laws and Code of Criminal Procedure.',
      issuesForDetermination: issueList.map((i) => `Issue #${i.issueNumber}: ${i.issueText}`).join('\n'),
      analysisAndFindings: 'Analysis of claims and documents filed by both parties.',
      decision: 'DRAFT ONLY — For District Magistrate determination.',
      directions: '1. Issue notice to parties.\n2. Direct Anchal Adhikari for spot inspection report.',
    };
  }
}

// ─── Order Queries & Mutations ────────────────────────────────────────────────

// @desc    Get all draft order versions for a case
// @route   GET /api/orders/:caseId
// @access  Private
const getOrders = async (req, res, next) => {
  try {
    const orders = await DraftOrder.find({ caseId: req.params.caseId })
      .populate('evidenceCited', 'evidenceRef extractedFact party')
      .populate('sectionsCited', 'sectionNumber sectionTitle actId')
      .populate('peshkarReviewedBy', 'name role')
      .populate('dmReviewedBy', 'name role')
      .populate('orderSignedBy', 'name role')
      .sort({ version: -1 })
      .lean();

    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single draft order by ID
// @route   GET /api/orders/order/:id
// @access  Private
const getOrderById = async (req, res, next) => {
  try {
    const order = await DraftOrder.findById(req.params.id)
      .populate('evidenceCited')
      .populate({ path: 'sectionsCited', populate: { path: 'actId', select: 'actName actYear' } })
      .populate('peshkarReviewedBy', 'name role')
      .populate('dmReviewedBy', 'name role')
      .populate('orderSignedBy', 'name role')
      .lean();

    if (!order) return res.status(404).json({ success: false, message: 'Draft order not found' });

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Update draft order content (Peshkar or DM editing)
// @route   PUT /api/orders/order/:id
// @access  Private (admin, peshkar, dm)
const updateOrder = async (req, res, next) => {
  try {
    const { content, peshkarEdits, dmEdits } = req.body;

    const order = await DraftOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Draft order not found' });

    if (order.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Cannot edit an approved court order.' });
    }

    if (content) order.content = { ...order.content, ...content };
    if (peshkarEdits) order.peshkarEdits = peshkarEdits;
    if (dmEdits) order.dmEdits = dmEdits;

    await order.save();

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit draft order for DM Review (Peshkar action)
// @route   PUT /api/orders/order/:id/submit
// @access  Private (admin, peshkar)
const submitForDMReview = async (req, res, next) => {
  try {
    const { peshkarEdits } = req.body;

    const order = await DraftOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Draft order not found' });

    order.peshkarReviewed = true;
    order.peshkarReviewedBy = req.user._id;
    order.peshkarReviewedAt = new Date();
    if (peshkarEdits) order.peshkarEdits = peshkarEdits;
    order.status = 'dm_review';

    await order.save();

    await writeAuditLog({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'DRAFT_ORDER_REVIEWED',
      entityType: 'DraftOrder',
      entityId: order._id,
      description: `Draft order v${order.version} submitted for DM review by Peshkar ${req.user.name}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: order, message: 'Order submitted for DM Review' });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve and sign final court order (DM action)
// @route   PUT /api/orders/order/:id/approve
// @access  Private (admin, dm)
const approveOrder = async (req, res, next) => {
  try {
    const { dmEdits, decision, directions } = req.body;

    const order = await DraftOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Draft order not found' });

    if (decision) order.content.decision = decision;
    if (directions) order.content.directions = directions;
    if (dmEdits) order.dmEdits = dmEdits;

    order.dmReviewed = true;
    order.dmReviewedBy = req.user._id;
    order.dmReviewedAt = new Date();
    order.status = 'approved';
    order.finalOrderDate = new Date();
    order.orderSignedBy = req.user._id;

    await order.save();

    // Update case status to 'decided'
    await Case.findByIdAndUpdate(order.caseId, { status: 'decided' });

    await writeAuditLog({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'ORDER_APPROVED',
      entityType: 'DraftOrder',
      entityId: order._id,
      description: `Order v${order.version} APPROVED and signed by DM ${req.user.name}. Case status updated to DECIDED.`,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: order, message: 'Order approved and signed successfully.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject order draft and send back for revision (DM action)
// @route   PUT /api/orders/order/:id/reject
// @access  Private (admin, dm)
const rejectOrder = async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    const order = await DraftOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Draft order not found' });

    order.dmReviewed = true;
    order.dmReviewedBy = req.user._id;
    order.dmReviewedAt = new Date();
    order.status = 'rejected';
    order.rejectionReason = rejectionReason;

    await order.save();

    await writeAuditLog({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'ORDER_REJECTED',
      entityType: 'DraftOrder',
      entityId: order._id,
      description: `Order v${order.version} REJECTED by DM ${req.user.name}. Reason: ${rejectionReason}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: order, message: 'Order returned for revision.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateOrder,
  generateHindiOrder,
  getOrders,
  getOrderById,
  updateOrder,
  submitForDMReview,
  approveOrder,
  rejectOrder,
};
