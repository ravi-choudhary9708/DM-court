const LegalAct = require('../models/LegalAct');
const LegalSection = require('../models/LegalSection');
const LegalRule = require('../models/LegalRule');
const { generateEmbedding } = require('../config/gemini');
const { writeAuditLog } = require('../utils/auditLogger');

// ─── Legal Acts ───────────────────────────────────────────────────────────────

// @desc    Get all legal acts (paginated + filtered)
// @route   GET /api/legal/acts
// @access  Private
const getActs = async (req, res, next) => {
  try {
    const { search, actType, status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (actType) query.actType = actType;
    if (status) query.status = status;
    if (search) query.$text = { $search: search };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [acts, total] = await Promise.all([
      LegalAct.find(query)
        .sort({ actYear: 1, actName: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      LegalAct.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: acts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single act with its section count
// @route   GET /api/legal/acts/:id
// @access  Private
const getActById = async (req, res, next) => {
  try {
    const act = await LegalAct.findById(req.params.id).lean();
    if (!act) return res.status(404).json({ success: false, message: 'Act not found' });

    const sectionCount = await LegalSection.countDocuments({ actId: req.params.id });

    res.json({ success: true, data: { ...act, sectionCount } });
  } catch (error) {
    next(error);
  }
};

// @desc    Create legal act (admin only)
// @route   POST /api/legal/acts
// @access  Private (admin)
const createAct = async (req, res, next) => {
  try {
    const act = await LegalAct.create({ ...req.body, addedBy: req.user._id });

    await writeAuditLog({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'LEGAL_SECTION_ADDED',
      entityType: 'LegalAct',
      entityId: act._id,
      description: `Legal Act added: ${act.actName} (${act.actYear})`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: act });
  } catch (error) {
    next(error);
  }
};

// @desc    Update legal act (admin only)
// @route   PUT /api/legal/acts/:id
// @access  Private (admin)
const updateAct = async (req, res, next) => {
  try {
    const act = await LegalAct.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!act) return res.status(404).json({ success: false, message: 'Act not found' });

    res.json({ success: true, data: act });
  } catch (error) {
    next(error);
  }
};

// ─── Legal Sections ───────────────────────────────────────────────────────────

// @desc    Get all sections for an act
// @route   GET /api/legal/acts/:actId/sections
// @access  Private
const getSections = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [sections, total] = await Promise.all([
      LegalSection.find({ actId: req.params.actId }, { embedding: 0 })
        .sort({ sectionNumber: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      LegalSection.countDocuments({ actId: req.params.actId }),
    ]);

    res.json({
      success: true,
      data: sections,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create section under an act + auto-generate embedding
// @route   POST /api/legal/acts/:actId/sections
// @access  Private (admin)
const createSection = async (req, res, next) => {
  try {
    const act = await LegalAct.findById(req.params.actId);
    if (!act) return res.status(404).json({ success: false, message: 'Act not found' });

    const section = await LegalSection.create({
      ...req.body,
      actId: req.params.actId,
      addedBy: req.user._id,
      embeddingStatus: 'pending',
    });

    // Generate embedding asynchronously (don't block response)
    generateEmbedding(`${section.sectionTitle || ''} ${section.text}`.substring(0, 8000))
      .then(async (embedding) => {
        await LegalSection.findByIdAndUpdate(section._id, { embedding, embeddingStatus: 'done' });
      })
      .catch((err) => {
        console.error(`[EMBEDDING] Section ${section._id} failed:`, err.message);
        LegalSection.findByIdAndUpdate(section._id, { embeddingStatus: 'failed' }).catch(() => {});
      });

    await writeAuditLog({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'LEGAL_SECTION_ADDED',
      entityType: 'LegalSection',
      entityId: section._id,
      description: `Section ${section.sectionNumber} added to ${act.actName}`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: section });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a section (admin only)
// @route   PUT /api/legal/sections/:id
// @access  Private (admin)
const updateSection = async (req, res, next) => {
  try {
    const section = await LegalSection.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });

    // If text changed, regenerate embedding
    if (req.body.text) {
      generateEmbedding(`${section.sectionTitle || ''} ${section.text}`.substring(0, 8000))
        .then(async (embedding) => {
          await LegalSection.findByIdAndUpdate(section._id, { embedding, embeddingStatus: 'done' });
        })
        .catch(() => {});
    }

    res.json({ success: true, data: section });
  } catch (error) {
    next(error);
  }
};

// ─── Legal Rules ──────────────────────────────────────────────────────────────

// @desc    Get all legal rules
// @route   GET /api/legal/rules
// @access  Private
const getRules = async (req, res, next) => {
  try {
    const { caseType, isActive } = req.query;
    const query = {};
    if (caseType) query.caseTypes = caseType;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const rules = await LegalRule.find(query).sort({ ruleCode: 1 }).lean();
    res.json({ success: true, data: rules });
  } catch (error) {
    next(error);
  }
};

// @desc    Create legal rule (admin only)
// @route   POST /api/legal/rules
// @access  Private (admin)
const createRule = async (req, res, next) => {
  try {
    const rule = await LegalRule.create({ ...req.body, addedBy: req.user._id });
    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
};

// @desc    Update legal rule (admin only)
// @route   PUT /api/legal/rules/:id
// @access  Private (admin)
const updateRule = async (req, res, next) => {
  try {
    const rule = await LegalRule.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
    res.json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
};

// ─── RAG Legal Search ─────────────────────────────────────────────────────────

// @desc    Hybrid search over legal sections (keyword + vector)
// @route   GET /api/legal/search?q=...&caseDate=...&topK=5
// @access  Private
const searchLegal = async (req, res, next) => {
  try {
    const { q, caseDate, topK = 5 } = req.query;
    if (!q || q.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Query must be at least 3 characters' });
    }

    const { retrieveRelevantSections, rerankWithGemini } = require('../services/ragService');

    const sections = await retrieveRelevantSections(q, {
      caseDate: caseDate ? new Date(caseDate) : new Date(),
      topK: parseInt(topK),
    });

    // Re-rank with Gemini if we got results
    const reranked = sections.length > 0 ? await rerankWithGemini(q, sections) : [];

    res.json({
      success: true,
      query: q,
      data: reranked,
      count: reranked.length,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActs, getActById, createAct, updateAct,
  getSections, createSection, updateSection,
  getRules, createRule, updateRule,
  searchLegal,
};
