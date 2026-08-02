# NyayaSahayak — Database Schema Reference

> ⚠️ Update this file whenever you add or modify a Mongoose model.

---

## Users Collection (`users`)

**File**: [`backend/src/models/User.js`](../backend/src/models/User.js)

| Field | Type | Notes |
|---|---|---|
| name | String | Required |
| email | String | Required, unique |
| password | String | Hashed via bcryptjs, never returned |
| role | enum | `admin` / `peshkar` / `dm` |
| courtName | String | Name of the court |
| district | String | Default: Bihar |
| isActive | Boolean | For deactivating users |
| lastLogin | Date | Last login timestamp |

---

## Cases Collection (`cases`)

**File**: [`backend/src/models/Case.js`](../backend/src/models/Case.js)

| Field | Type | Notes |
|---|---|---|
| caseNumber | String | Unique, e.g. "124/2026" |
| year | Number | Auto-set to current year |
| caseType | enum | land_dispute / mutation / arms_act / excise / public_order / eviction / succession / other |
| subject | String | Brief subject of case |
| partyA | Object | name, address, contact, advocate |
| partyB | Object | name, address, contact, advocate |
| applicableActs | [ObjectId] | Refs to LegalAct |
| filedDate | Date | |
| nextHearingDate | Date | |
| status | enum | open / hearing / evidence_stage / arguments / order_pending / decided / appealed |
| peshkar | ObjectId | Ref to User |
| dm | ObjectId | Ref to User |
| hearings | Array | {date, notes, nextDate, recordedBy} |
| aiAnalysisStatus | enum | not_started / processing / completed / failed |
| district | String | Default: Bihar |
| policeStation | String | |

**Text Index**: partyA.name, partyB.name, subject

---

## Documents Collection (`documents`)

**File**: [`backend/src/models/Document.js`](../backend/src/models/Document.js)

| Field | Type | Notes |
|---|---|---|
| caseId | ObjectId | Ref to Case |
| party | enum | A / B / court |
| fileName | String | Original filename |
| docType | enum | `petition` / `appeal_petition` / `counter_petition` / `revision_petition` / `application` / `reply` / `affidavit` / `land_record` / `jamabandi` / `revenue_receipt` / `sale_deed` / `partition_deed` / `poa` / `co_report` / `police_report` / `survey_report` / `spot_inspection` / `notice` / `government_order` / `lower_court_record` / `tameela_report` / `identity_proof` / `other` |
| cloudinaryPublicId | String | For Cloudinary operations |
| cloudinaryUrl | String | Public URL |
| cloudinarySecureUrl | String | HTTPS URL |
| fileSize | Number | Bytes |
| ocrStatus | enum | pending / processing / done / failed |
| ocrText | String | Extracted text (Hindi/English/Urdu/Farsi) |
| ocrLanguages | [String] | Detected languages |
| embedding | [Number] | Gemini text-embedding-004 vector (not returned by default) |
| verified | Boolean | Peshkar verification status |
| verifiedBy | ObjectId | Ref to User |

---

## Evidence Collection (`evidences`)

**File**: [`backend/src/models/Evidence.js`](../backend/src/models/Evidence.js)

| Field | Type | Notes |
|---|---|---|
| caseId | ObjectId | Ref to Case |
| documentId | ObjectId | Ref to Document (source) |
| party | enum | A / B / court |
| evidenceRef | String | Unique ref e.g. EV-A-023 |
| extractedFact | String | The specific fact extracted |
| pageNumber | Number | Page in source document |
| paragraphRef | String | e.g. "Para 4" |
| relatedSections | [ObjectId] | Refs to LegalSection |
| relatedIssues | [ObjectId] | Refs to Issue |
| extractionMethod | enum | ai / manual |
| extractionConfidence | Number | 0-100 |
| verifiedByPeshkar | Boolean | Must be true before used in order |

---

## Issues Collection (`issues`)

**File**: [`backend/src/models/Issue.js`](../backend/src/models/Issue.js)

| Field | Type | Notes |
|---|---|---|
| caseId | ObjectId | Ref to Case |
| issueNumber | Number | Sequential |
| issueText | String | The legal question to decide |
| supportingEvidenceA | [ObjectId] | Evidence refs for Party A |
| supportingEvidenceB | [ObjectId] | Evidence refs for Party B |
| applicableSections | [ObjectId] | Relevant LegalSection refs |
| aiAnalysis | String | AI suggestion — must be reviewed by Peshkar |
| contradictions | Array | {evidenceA, evidenceB, description} |
| peshkarNotes | String | |
| status | enum | pending / analysed / reviewed / decided |
| dmFinding | String | DM's actual finding on this issue |

---

## Legal Acts Collection (`legalacts`)

**File**: [`backend/src/models/LegalAct.js`](../backend/src/models/LegalAct.js)

| Field | Type | Notes |
|---|---|---|
| actName | String | Official name |
| actNameHindi | String | Hindi name |
| actYear | Number | |
| shortName | String | e.g. "BLR Act" |
| jurisdiction | String | Default: Bihar |
| actType | enum | central / state / rule / notification / circular / order |
| status | enum | active / repealed / amended |
| officialSource | String | URL to gazette |

---

## Legal Sections Collection (`legalsections`)

**File**: [`backend/src/models/LegalSection.js`](../backend/src/models/LegalSection.js)

| Field | Type | Notes |
|---|---|---|
| actId | ObjectId | Ref to LegalAct |
| sectionNumber | String | e.g. "48", "4A", "144" |
| sectionTitle | String | |
| sectionTitleHindi | String | |
| text | String | Full section text |
| textHindi | String | Hindi text if available |
| summary | String | AI-generated short summary |
| effectiveFrom | Date | **Critical** — law version |
| effectiveTo | Date | null = still in force |
| versionNote | String | Amendment notes |
| embedding | [Number] | Gemini embedding (select: false) |
| keywords | [String] | For keyword search |

**Text Index**: sectionNumber, sectionTitle, text, keywords

---

## Legal Rules Collection (`legalrules`)

**File**: [`backend/src/models/LegalRule.js`](../backend/src/models/LegalRule.js)

| Field | Type | Notes |
|---|---|---|
| ruleCode | String | e.g. RULE-001 |
| description | String | What the rule checks |
| caseTypes | [String] | Empty = applies to all |
| condition | Object | {type, documentType, party, field} |
| action | enum | BLOCK_PROCEED / FLAG_INCOMPLETE / WARN / INFO |
| message | String | Message shown to Peshkar |
| mandatory | Boolean | |
| isActive | Boolean | |

---

## Draft Orders Collection (`draftorders`)

**File**: [`backend/src/models/DraftOrder.js`](../backend/src/models/DraftOrder.js)

| Field | Type | Notes |
|---|---|---|
| caseId | ObjectId | Ref to Case |
| version | Number | Increments on revision |
| content | Object | {background, partyASubmissions, partyBSubmissions, documentsConsidered, applicableProvisions, issuesForDetermination, analysisAndFindings, decision*, directions*} |
| hindiContent | String | Full Hindi court order prose in न्यायालय समाहर्त्ता format (generated by Gemini) |
| hindiGeneratedAt | Date | When Hindi order was generated |
| orderLanguage | enum | `english` / `hindi` / `bilingual` |
| evidenceCited | [ObjectId] | Evidence used |
| sectionsCited | [ObjectId] | Law cited |
| generatedByAI | Boolean | Always true for AI drafts |
| peshkarReviewed | Boolean | |
| dmReviewed | Boolean | |
| status | enum | draft / peshkar_review / dm_review / approved / rejected / revised |

*decision and directions are filled by the DM — NOT by AI

---

## Audit Logs Collection (`auditlogs`)

**File**: [`backend/src/models/AuditLog.js`](../backend/src/models/AuditLog.js)

**IMMUTABLE** — entries can never be modified or deleted.

| Field | Type | Notes |
|---|---|---|
| timestamp | Date | Auto-set, immutable |
| userId | ObjectId | Who performed the action |
| userName | String | Cached name |
| userRole | String | Cached role |
| action | enum | See AuditLog model for full enum list |
| entityType | String | e.g. "Case", "Document" |
| entityId | String | ID of the affected entity |
| description | String | Human-readable description |
| ipAddress | String | |
