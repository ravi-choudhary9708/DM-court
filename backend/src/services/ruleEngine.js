const LegalRule = require('../models/LegalRule');
const Document = require('../models/Document');

/**
 * Run all applicable legal rules against a case
 * Zero AI — pure deterministic logic
 * @param {Object} caseData - The case document
 * @returns {Array} Rule check results
 */
const runRuleChecks = async (caseData) => {
  // Fetch all active mandatory rules for this case type
  const rules = await LegalRule.find({
    isActive: true,
    $or: [
      { caseTypes: caseData.caseType },
      { caseTypes: { $size: 0 } }, // Rules that apply to all case types
    ],
    jurisdiction: { $in: [caseData.district, 'Bihar', 'All'] },
  });

  // Fetch all documents for this case
  const documents = await Document.find({ caseId: caseData._id }).lean();

  const results = [];

  for (const rule of rules) {
    const result = await evaluateRule(rule, caseData, documents);
    results.push(result);
  }

  return results;
};

/**
 * Evaluate a single rule against case data
 */
const evaluateRule = async (rule, caseData, documents) => {
  const baseResult = {
    ruleCode: rule.ruleCode,
    description: rule.description,
    descriptionHindi: rule.descriptionHindi,
    mandatory: rule.mandatory,
    action: rule.action,
  };

  const { condition } = rule;

  switch (condition.type) {
    case 'document_required': {
      const party = condition.party;
      let docsToCheck = documents;

      if (party === 'A') docsToCheck = documents.filter((d) => d.party === 'A');
      else if (party === 'B') docsToCheck = documents.filter((d) => d.party === 'B');
      else if (party === 'court') docsToCheck = documents.filter((d) => d.party === 'court');

      const found = docsToCheck.some((d) => d.docType === condition.documentType);

      return {
        ...baseResult,
        status: found ? 'SATISFIED' : 'FAILED',
        evidence: found
          ? `${condition.documentType} document found for Party ${party}`
          : null,
        message: found
          ? null
          : rule.message || `${condition.documentType} document is missing for Party ${party}`,
      };
    }

    case 'field_required': {
      const fieldValue = getNestedValue(caseData, condition.field);
      const satisfied = fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
      return {
        ...baseResult,
        status: satisfied ? 'SATISFIED' : 'FAILED',
        message: satisfied ? null : rule.message || `Required field '${condition.field}' is missing`,
      };
    }

    case 'date_check': {
      const filedDate = new Date(caseData.filedDate);
      const limitDate = new Date();
      limitDate.setFullYear(limitDate.getFullYear() - 3); // e.g. 3 year limitation
      const withinLimit = filedDate >= limitDate;
      return {
        ...baseResult,
        status: withinLimit ? 'SATISFIED' : 'FAILED',
        message: withinLimit ? null : rule.message || 'Case may be time-barred. Verify limitation period.',
      };
    }

    default:
      return {
        ...baseResult,
        status: 'SKIPPED',
        message: `Rule type '${condition.type}' requires manual verification`,
      };
  }
};

const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

/**
 * Get a summary of rule check results
 */
const getRuleCheckSummary = (results) => {
  const total = results.length;
  const satisfied = results.filter((r) => r.status === 'SATISFIED').length;
  const failed = results.filter((r) => r.status === 'FAILED').length;
  const skipped = results.filter((r) => r.status === 'SKIPPED').length;
  const blockers = results.filter((r) => r.status === 'FAILED' && r.action === 'BLOCK_PROCEED');

  return {
    total,
    satisfied,
    failed,
    skipped,
    hasBlockers: blockers.length > 0,
    blockers,
    canProceed: blockers.length === 0,
  };
};

module.exports = { runRuleChecks, getRuleCheckSummary };
