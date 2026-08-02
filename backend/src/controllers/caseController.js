const Case = require('../models/Case');
const { writeAuditLog } = require('../utils/auditLogger');
const { runRuleChecks, getRuleCheckSummary } = require('../services/ruleEngine');

// @desc    Create a new case
// @route   POST /api/cases
// @access  Private (peshkar, admin)
const createCase = async (req, res, next) => {
  try {
    const caseData = {
      ...req.body,
      peshkar: req.user._id,
    };

    const newCase = await Case.create(caseData);

    await writeAuditLog({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'CASE_CREATED',
      entityType: 'Case',
      entityId: newCase._id,
      description: `Case ${newCase.caseNumber} created by ${req.user.name}`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: newCase });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all cases (with filters)
// @route   GET /api/cases
// @access  Private
const getCases = async (req, res, next) => {
  try {
    const { status, caseType, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (caseType) query.caseType = caseType;
    if (search) {
      query.$text = { $search: search };
    }

    // Peshkars see their own cases; DMs and admins see all
    if (req.user.role === 'peshkar') {
      query.peshkar = req.user._id;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const cases = await Case.find(query)
      .populate('peshkar', 'name email')
      .populate('dm', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Case.countDocuments(query);

    res.json({
      success: true,
      data: cases,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single case with full details
// @route   GET /api/cases/:id
// @access  Private
const getCaseById = async (req, res, next) => {
  try {
    const caseData = await Case.findById(req.params.id)
      .populate('peshkar', 'name email role')
      .populate('dm', 'name email role')
      .populate('applicableActs', 'actName actYear shortName');

    if (!caseData) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    res.json({ success: true, data: caseData });
  } catch (error) {
    next(error);
  }
};

// @desc    Update case
// @route   PUT /api/cases/:id
// @access  Private (peshkar, admin)
const updateCase = async (req, res, next) => {
  try {
    const caseData = await Case.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!caseData) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    await writeAuditLog({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'CASE_UPDATED',
      entityType: 'Case',
      entityId: caseData._id,
      description: `Case ${caseData.caseNumber} updated`,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: caseData });
  } catch (error) {
    next(error);
  }
};

// @desc    Run rule checks for a case
// @route   GET /api/cases/:id/rules
// @access  Private
const runCaseRuleChecks = async (req, res, next) => {
  try {
    const caseData = await Case.findById(req.params.id);
    if (!caseData) return res.status(404).json({ success: false, message: 'Case not found' });

    const results = await runRuleChecks(caseData);
    const summary = getRuleCheckSummary(results);

    await writeAuditLog({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'RULE_CHECK_RUN',
      entityType: 'Case',
      entityId: caseData._id,
      description: `Rule checks run for Case ${caseData.caseNumber}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: { results, summary } });
  } catch (error) {
    next(error);
  }
};

// @desc    Dashboard stats
// @route   GET /api/cases/stats
// @access  Private
const getDashboardStats = async (req, res, next) => {
  try {
    const query = req.user.role === 'peshkar' ? { peshkar: req.user._id } : {};

    const [total, open, hearing, orderPending, decided] = await Promise.all([
      Case.countDocuments(query),
      Case.countDocuments({ ...query, status: 'open' }),
      Case.countDocuments({ ...query, status: 'hearing' }),
      Case.countDocuments({ ...query, status: 'order_pending' }),
      Case.countDocuments({ ...query, status: 'decided' }),
    ]);

    // Recent cases
    const recentCases = await Case.find(query)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('peshkar', 'name')
      .lean();

    res.json({
      success: true,
      data: { total, open, hearing, orderPending, decided, recentCases },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createCase, getCases, getCaseById, updateCase, runCaseRuleChecks, getDashboardStats };
