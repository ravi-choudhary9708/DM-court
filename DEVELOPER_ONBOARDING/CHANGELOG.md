# NyayaSahayak — Changelog

## [2026-08-02] — Added Gitignore Configuration

**Changed by**: AI Agent (Antigravity)

**Files Modified / Created**:
- `backend/.gitignore` — [NEW] Configured ignore rules for Node modules, `.env` credentials, log files, and upload folders.
- `.gitignore` — [NEW] Root ignore configuration protecting `.env`, `node_modules`, `.next` build outputs across frontend and backend.
- `DEVELOPER_ONBOARDING/CHANGELOG.md` — Updated changelog.

**What Changed**: Added `.gitignore` to prevent committing secrets, heavy node_modules, and cache files to the Git repository.

**Why**: To ensure security of API keys / DB connection strings and maintain a clean git repository.

**New Dependencies**: None

---

## [2026-08-02] — Complete End-to-End Technical Deep Dive Documentation

**Changed by**: AI Agent (Antigravity)

**Files Modified / Created**:
- `DEVELOPER_ONBOARDING/END_TO_END_FLOW.md` — [NEW] Comprehensive line-by-line, step-by-step engineering breakdown explaining the full lifecycle from browser click to backend controllers, Bull queues, Gemini Vision OCR, Deterministic Rule Engine, Hybrid RAG, Gemini Drafter, and DM Approval with Immutable Audit Logs.
- `DEVELOPER_ONBOARDING/CHANGELOG.md` — Updated changelog.

**What Changed**: Added full technical flow architecture document answering how every component connects and executes across the frontend and backend stack.

**Why**: To provide clear developer onboarding and structural understanding of the complete request lifecycle and data flow.

**New Dependencies**: None

---

## [2026-08-02] — Full Real-World Bihar DM Court Legal Acts Database

**Changed by**: AI Agent (Antigravity)

**Files Modified / Created**:
- `backend/src/data/acts/blma_2011.json` — [NEW] Bihar Land Mutation Act 2011 (12 sections: §2-§13 including critical §9(6)(A) DM revision powers)
- `backend/src/data/acts/bple_1956.json` — [NEW] Bihar Public Land Encroachment Act 1956 (8 sections: notice, eviction, forcible removal, appeals)
- `backend/src/data/acts/blr_act_1950.json` — [UPDATED] Bihar Land Reforms Act 1950 (8 sections: khas possession, raiyati rights, SC/ST bar, appeals)
- `backend/src/data/acts/crpc_1973.json` — [UPDATED] CrPC 1973 (8 sections: §107, §116, §133, §144, §145, §146, §147, §195)
- `backend/src/data/acts/arms_act_1959.json` — [UPDATED] Arms Act 1959 (8 sections: DM licensing, refusal, revocation, appeals, punishment)
- `backend/src/data/acts/bpea_2016.json` — [UPDATED] Bihar Prohibition & Excise Act 2016 (8 sections: total ban, vehicle seizure, premises sealing, appeals)
- `backend/src/data/acts/brc_2011.json` — [UPDATED] Bihar Revenue Code 2011 (8 sections: revenue hierarchy, Jamabandi, mutation, partition, survey)
- `backend/src/data/acts/bihar_tenancy_1885.json` — [UPDATED] Bihar Tenancy Act 1885 (6 sections: raiyati rights, ejectment, bataidari, limitation)
- `backend/src/data/acts/evidence_act_1872.json` — [UPDATED] Indian Evidence Act 1872 (5 sections: §35 public records, §74 public docs, §79/§90 presumptions, §114)
- `backend/src/data/acts/tp_act_1882.json` — [UPDATED] Transfer of Property Act 1882 (5 sections: sale, mortgage, lease, gift — with Bihar mutation link)
- `backend/src/data/acts/bldra_2009.json` — [NEW] Bihar Land Disputes Resolution Act 2009 (6 sections: DCLR jurisdiction, appeals to DM/Commissioner)
- `backend/src/data/acts/limitation_act_1963.json` — [UPDATED] Limitation Act 1963 (4 sections: bar, condonation, fraud exception, extinguishment)
- `backend/src/utils/seedActs.js` — [NEW] Smart idempotent seeder that auto-reads all JSON files and upserts acts+sections
- `backend/package.json` — Added `seed:acts` npm script

**What Changed**: Replaced the minimal 12-section placeholder database with a comprehensive real-world Bihar DM Court legal acts database:
- **13 Acts** in MongoDB (up from 10)
- **87 Sections** in MongoDB (up from 12) — 7x increase
- All section text is bilingual (English + Hindi) with proper legal language
- Each section has granular keywords for MongoDB text search (BM25 RAG)
- Covers every major case type: land mutation, encroachment, arms licence, excise, land reforms, tenancy, evidence, limitation
- Section §9(6)(A) of BLMA 2011 specifically covers the most common Bihar DM case type (Jamabandi cancellation appeals)

**Why**: The original seed data had only placeholder text. Real legal RAG requires the actual statutory text so that section-level citations in orders are accurate and traceable.

**New Dependencies**: None

---

> ⚠️ MANDATORY: Every developer and AI agent MUST add an entry here after every change.

## Format

```
## [YYYY-MM-DD] — [Brief Title]
**Changed by**: AI Agent / [Human Name]
**Files Modified**: list of files
**What Changed**: description
**Why**: reason
**New Dependencies** (if any): package + version
```

---

## [2026-07-21] — Initial Project Scaffold

**Changed by**: AI Agent (Antigravity)

**Files Created**:
- `DEVELOPER_ONBOARDING/README.md` — Main onboarding guide
- `DEVELOPER_ONBOARDING/CHANGELOG.md` — This file
- `DEVELOPER_ONBOARDING/ARCHITECTURE.md` — System architecture
- `DEVELOPER_ONBOARDING/DATABASE_SCHEMA.md` — Mongoose model reference
- `DEVELOPER_ONBOARDING/API_REFERENCE.md` — API endpoint reference
- `.agents/AGENTS.md` — Mandatory AI agent rules (auto-loaded by Antigravity)
- `backend/package.json` — Backend Node.js config
- `backend/src/app.js` — Express app entry
- `backend/src/server.js` — Server start
- `backend/src/config/db.js` — MongoDB connection
- `backend/src/config/cloudinary.js` — Cloudinary config
- `backend/src/config/gemini.js` — Gemini API config
- `backend/src/models/` — All Mongoose models (User, Case, Document, Evidence, Issue, LegalAct, LegalSection, LegalRule, AIAnalysis, DraftOrder, AuditLog)
- `backend/src/routes/` — Auth, Cases, Documents, Legal, Analysis, Orders
- `backend/src/controllers/` — All controllers
- `backend/src/middleware/auth.js` — JWT auth middleware
- `backend/src/middleware/roles.js` — Role-based access
- `backend/src/middleware/errorHandler.js` — Global error handler
- `backend/src/services/geminiService.js` — Gemini LLM + OCR + Embeddings
- `backend/src/services/ragService.js` — RAG retrieval pipeline
- `backend/src/services/ruleEngine.js` — Legal rule checker
- `backend/src/workers/ocrWorker.js` — Bull OCR job worker
- `backend/src/utils/auditLogger.js` — Audit log writer
- `backend/.env.example` — Environment variable template
- `frontend/` — Next.js 14 app scaffolded
- `frontend/app/` — App router pages (login, dashboard, cases)
- `frontend/components/` — UI components

**What Changed**: Complete initial project scaffold from scratch.

**Why**: Sprint 0 + Sprint 1 — establishing the full project foundation.

**New Dependencies**:
- Backend: express, mongoose, jsonwebtoken, bcryptjs, cloudinary, multer-storage-cloudinary, @google/generative-ai, bull, redis, dotenv, cors, morgan, express-validator, uuid, multer
- Frontend: next, react, react-dom, axios, js-cookie

---

## [2026-07-27] — Sprint 2: Document Upload UI + Case Detail Page

**Changed by**: AI Agent (Antigravity)

**Files Created**:
- `frontend/lib/auth.js` — SSR-safe auth helpers: getToken, getUser, requireAuth, hasRole, clearAuth
- `frontend/app/cases/[id]/page.js` — Full case detail page with 4 tabs (Overview, Documents, AI Analysis placeholder, Draft Order placeholder)
- `frontend/components/DocumentUploadModal.js` — Drag-and-drop upload modal with party selector, docType, description, progress bar
- `frontend/components/FileViewerModal.js` — Split-pane file viewer: PDF iframe / image + OCR extracted text, verify + retry OCR actions

**What Changed**:
- Clicking "Open →" on any case now loads a full detail page instead of 404-ing
- Overview tab: parties, case metadata, hearing log (add/view), rule check panel
- Documents tab: 3-column layout (Party A / Party B / Court), upload per column, OCR status badges, auto-polls every 10s while OCR is pending
- AI Analysis tab: placeholder with advisory notice, disabled "Run Analysis" button (Sprint 3)
- Draft Order tab: placeholder with workflow overview (Sprint 4)

**Why**: Sprint 2 — Document Upload milestone. Backend document API already existed from Sprint 1; this sprint delivers the full frontend for uploading, viewing, and tracking document OCR status.

**New Dependencies**: None

---

## [2026-07-27] — Sprint 3: OCR Pipeline Hardening

**Changed by**: AI Agent (Antigravity)

**Files Modified**:
- `backend/src/workers/ocrWorker.js` — Added `OCR_FAILED` + `EMBEDDING_FAILED` audit events, `stalled` job handler, clears `ocrError` on success, logs text length + embeddingStatus
- `backend/src/models/AuditLog.js` — Added `OCR_FAILED` and `EMBEDDING_FAILED` to action enum; removed spurious role constraint (userRole is now free-text to allow `'system'`)
- `backend/src/routes/documents.js` — Added `GET /:caseId/ocr-status` (lightweight poll) and `GET /queue/stats` (Bull queue stats)
- `backend/src/controllers/documentController.js` — Added `getOcrStatus` and `getQueueStats` controller functions
- `frontend/lib/api.js` — Added `documentsAPI.ocrStatus()` and `documentsAPI.queueStats()`
- `frontend/app/cases/[id]/page.js` — Upgraded OCR polling to use lightweight `/ocr-status` endpoint (merges only status fields, not full docs)
- `DEVELOPER_ONBOARDING/API_REFERENCE.md` — Documented two new endpoints

**What Changed**:
- OCR pipeline is now production-grade: failure audit trail, stall recovery, embedding failure non-fatal
- Frontend polls `/ocr-status` every 10s (lightweight) instead of re-fetching full documents
- Queue stats endpoint enables a future admin dashboard to monitor Bull queue health

**Why**: Sprint 3 — OCR Pipeline. Backend OCR core existed from Sprint 1; this sprint hardens it with proper audit logging, failure handling, and efficient frontend polling.

**New Dependencies**: None

---

## [2026-07-27] — Sprint 4: Legal Knowledge Base

**Changed by**: AI Agent (Antigravity)

**Files Created**:
- `backend/src/controllers/legalController.js` — Full CRUD for Acts, Sections, Rules + RAG search endpoint
- `backend/src/routes/legal.js` — Express router: `/api/legal/*`
- `backend/src/utils/seed.js` — Bihar DM Court seed: 10 Acts, 15 key sections, 10 deterministic rules
- `frontend/app/legal/page.js` — Legal DB browser: split-pane Acts list + Sections accordion + RAG search
- `frontend/app/admin/rules/page.js` — Admin Rules CRUD page with inline modal form

**Files Modified**:
- `backend/src/app.js` — Registered `/api/legal` route
- `frontend/lib/api.js` — Added `legalAPI` export (acts, sections, rules, RAG search)
- `DEVELOPER_ONBOARDING/API_REFERENCE.md` — Documented all 11 new legal endpoints

**What Changed**:
- `GET /api/legal/search` — Hybrid RAG: MongoDB text search + cosine similarity on embeddings + Gemini rerank
- Section embeddings auto-generated on create; re-generated when text is updated
- Seed populates: BLR Act, BRC 2011, Arms Act, BPEA 2016, CrPC, IPC, TP Act, Evidence Act, Bihar Tenancy, Limitation Act
- Legal Rules engine: RULE-001 to RULE-099 covering land disputes, mutations, arms, excise, limitation
- Admin Rules page: create/edit/toggle rules with condition type, case type, action config
- All RAG results clearly labelled as AI-generated in the UI

**Why**: Sprint 4 — Legal Knowledge Base. Required for Sprint 5 (AI Analysis) which relies on RAG search over Bihar laws.

**New Dependencies**: None

---

## [2026-07-27] — Sprint 5: AI Analysis & Evidence Verification

**Changed by**: AI Agent (Antigravity)

**Files Created**:
- `backend/src/controllers/analysisController.js` — Async AI analysis pipeline (fact extraction, party summaries, legal issue framing + RAG law matching, evidence verification)
- `backend/src/routes/analysis.js` — Express router for `/api/analysis/*`
- `frontend/components/EvidenceCard.js` — UI component for extracted evidence with confidence scores, document line traceability, and Peshkar verification/notes

**Files Modified**:
- `backend/src/models/Case.js` — Added `analysisResult` sub-schema for storing AI party summaries and metadata
- `backend/src/app.js` — Registered `/api/analysis` route
- `frontend/lib/api.js` — Exported `analysisAPI` methods
- `frontend/app/cases/[id]/page.js` — Fully wired AI Analysis tab UI (Party Summaries, Framed Legal Issues with RAG provisions, Extracted Evidence List, Peshkar Verify actions, Rule 4 Advisory alert)
- `DEVELOPER_ONBOARDING/API_REFERENCE.md` — Documented 5 new AI Analysis endpoints

**What Changed**:
- Asynchronous AI analysis execution (returns 200 immediately, background pipeline runs Gemini fact extraction & framing)
- Automated evidence extraction linked to case documents with confidence metrics
- Automated framing of legal issues linked to RAG-retrieved legal sections
- Peshkar verification workflow: single-click verification/rejection with optional notes
- Full compliance with Rule 4: Advisory notices displayed, AI never makes final judicial decisions

**Why**: Sprint 5 — AI Analysis milestone. Provides automated evidence matrix and legal issue synthesis to assist court staff prior to order drafting.

**New Dependencies**: None

---

## [2026-07-27] — Sprint 6: Order Generation & Approval Workflow

**Changed by**: AI Agent (Antigravity)

**Files Created**:
- `backend/src/controllers/orderController.js` — Order generation via Gemini 2.0 Flash, section content management, version tracking, Peshkar submission, and DM approval/rejection logic
- `backend/src/routes/orders.js` — Express router for `/api/orders/*`
- `frontend/components/OrderEditor.js` — Order Workbench component featuring multi-version selector, structured 9-section editor, Peshkar & DM review buttons, rejection modal, and official printable Court Order View with DM digital signature seal

**Files Modified**:
- `backend/src/app.js` — Registered `/api/orders` route
- `frontend/lib/api.js` — Exported `ordersAPI` methods
- `frontend/app/cases/[id]/page.js` — Embedded `OrderEditor` into Draft Order tab
- `DEVELOPER_ONBOARDING/API_REFERENCE.md` — Documented 7 new Order API endpoints

**What Changed**:
- Structured 9-section court order synthesis using Gemini LLM (Background, Party A/B claims, Documents, Laws, Issues, Findings, Decision, Directions)
- Version control for court order iterations (v1, v2, etc.)
- Multi-tier approval workflow: Draft -> Peshkar Review -> DM Review -> Approved / Rejected
- DM approval updates case status to `decided` and logs immutable audit trail
- Printable Official Court Order View with Bihar DM seal, audit hash, and formal digital signature block

**Why**: Sprint 6 — Order Generation & Approval Workflow milestone. Delivers the core judicial outcome generation and approval process for Bihar DM Courts.

**New Dependencies**: None

---

## [2026-07-27] — Sprint 9: Polish, Audit Trail & Production Readiness

**Changed by**: AI Agent (Antigravity)

**Files Created**:
- `backend/src/controllers/auditController.js` — Paginated and filterable Audit Log search controller
- `backend/src/routes/audit.js` — Express router for `/api/audit` (admin-only)
- `frontend/app/admin/audit/page.js` — System Audit Trail viewer page with action badges, user/role filters, search bar, and pagination
- `DEVELOPER_ONBOARDING/DEPLOYMENT.md` — Complete production deployment, seeding, worker execution, and environment setup documentation

**Files Modified**:
- `backend/src/app.js` — Registered `/api/audit` route
- `frontend/lib/api.js` — Exported `auditAPI.list()` method
- `frontend/app/dashboard/page.js` — Added quick header navigation links for Legal DB, Rules Engine, and Audit Trail
- `DEVELOPER_ONBOARDING/API_REFERENCE.md` — Documented `/api/audit` endpoint

**What Changed**:
- Full immutable system audit log UI inspection for system administrators
- Filter by user role (`admin`, `peshkar`, `dm`, `system`), action type, or text search
- Complete production deployment & setup guide (`DEPLOYMENT.md`)
- Production build validation for all 11 application routes with 0 errors

**Why**: Sprint 9 — Polish + Audit + Production milestone. Completes the 10-sprint project roadmap.

**New Dependencies**: None



---

## [2026-08-01] — Hindi Court Order Generation + Petition-Based Document Upload

**Changed by**: AI Agent (Antigravity)

**Files Modified**:
- `backend/src/models/Document.js` — Added petition-specific docType enum values: `petition`, `appeal_petition`, `counter_petition`, `revision_petition`, `partition_deed`, `poa`, `spot_inspection`, `lower_court_record`, `tameela_report`
- `backend/src/models/DraftOrder.js` — Added `hindiContent` (String), `hindiGeneratedAt` (Date), `orderLanguage` enum fields
- `backend/src/controllers/orderController.js` — Added `generateHindiOrder` controller + `synthesizeHindiOrderWithAI()` private function
- `backend/src/routes/orders.js` — Added `POST /api/orders/:caseId/generate-hindi` route
- `frontend/lib/api.js` — Added `ordersAPI.generateHindi()` method
- `frontend/components/DocumentUploadModal.js` — Replaced generic DOC_TYPES with party-specific `DOC_TYPES_BY_PARTY`, added `PARTY_CONFIG` with Hindi role labels and context guidance banners
- `frontend/components/OrderEditor.js` — Added Hindi generate button, third view mode `'hindi'` (authentic न्यायालय समाहर्त्ता format), Print support for both views
- `frontend/app/cases/[id]/page.js` — Updated DocumentColumn calls with petition-type titles (अर्जी/Petition, प्रतिउत्तर/Counter, न्यायालय अभिलेख), added 3-column petition summary bar

**What Changed**:
- **Hindi Court Order**: Gemini 2.0 Flash now generates orders in authentic Bihar DM Court format — formal Hindi prose, numbered paragraphs, proper legal terminology (अपीलकर्त्ता, प्रतिवादी, जमाबंदी), standard जिला पदाधिकारी signature block
- **Petition-Based Document Upload**: Document types now grouped by party role (Appellant/Respondent/Court) with contextual Hindi guidance text
- **Order Editor**: 3-tab view (Edit Draft | English Order | हिंदी आदेश), Print support, AI-generated label on Hindi draft
- **Document Column Headers**: Now show real court terminology instead of generic "Party A/B/Court"

**Why**: User requested the system generate orders matching the actual OCR'd DM court order format, and improve document upload UX to distinguish petitions from counter-petitions for both parties.

**New Dependencies**: None

---

## [2026-08-01] — Added Template-Based Hindi Order Fallback (No API Required)

**Changed by**: AI Agent (Antigravity)

**Files Modified**:
- `backend/src/controllers/orderController.js` — `synthesizeHindiOrderWithAI` now tries Gemini first, then falls back to a rich Bihar DM Court format template using real case data (party names, district, case type, police station, sections, evidence, documents)

**What Changed**: The function now has two paths: (1) Gemini AI call, and (2) a detailed template-based order that generates a realistic, properly structured `न्यायालय समाहर्त्ता` format order without any external API. The template includes: header, case number, parties, preamble, 3 appellant arguments, 3 respondent counter-arguments, court analysis, order, directions, and signature block.

**Why**: Gemini free-tier quota was exhausted. Template fallback allows full UI testing without any API dependency.

**New Dependencies**: None

---

## [2026-08-01] — Switched LLM Model to gemini-1.5-flash (Quota Fix)

**Changed by**: AI Agent (Antigravity)

**Files Modified**:
- `backend/src/config/gemini.js` — Switched `getLLMModel()` and `getVisionModel()` from `gemini-2.0-flash` to `gemini-1.5-flash`

**What Changed**: Model changed to `gemini-1.5-flash` which has a separate free-tier quota.

**Why**: The `gemini-2.0-flash` free tier quota was exhausted (limit: 0) on the current Google Cloud project, causing all AI generation (Hindi order, analysis) to return 429 errors. `gemini-1.5-flash` has independent quota limits.

**New Dependencies**: None

---

## [2026-08-01] — Bug Fix: Hindi Order District Concatenation + Better Error Reporting

**Changed by**: AI Agent (Antigravity)

**Files Modified**:
- `frontend/app/cases/new/page.js` — Changed default district from `'Patna'` to `''` (blank) to prevent concatenation bugs
- `backend/src/controllers/orderController.js` — Added district sanitization logic (detects known Bihar districts from garbled strings), improved Gemini error logging (shows full error + API key prefix), improved fallback message to guide user to fix API key

**What Changed**:
- District field no longer pre-fills with 'Patna', preventing `PatnaMadhubaniMadhubani` type concatenation
- `synthesizeHindiOrderWithAI` now cleans district strings longer than 20 chars by finding known district names
- Error fallback now detects invalid API key and shows actionable fix instructions in Hindi

**Why**: Testing revealed that (1) the district form default + user input was concatenating, and (2) the Gemini API key in `.env` was invalid (starts with `AQ.` instead of `AIza`), causing all Hindi order generation to silently fail.

**New Dependencies**: None

---

## [2026-08-01] — Added Demo Login Credentials to README

**Changed by**: AI Agent (Antigravity)

**Files Modified**:
- `DEVELOPER_ONBOARDING/README.md` — Added a dedicated `🔑 Demo Login Credentials` section with all 3 seed user accounts, seed command instructions, and role access summary

**What Changed**:
- README now includes a clear table of email/password pairs for admin, peshkar, and dm roles
- Added `npm run seed` instruction and security warning about changing passwords before real deployment

**Why**: User asked for the login credentials to be documented in the README for easy developer onboarding reference.

**New Dependencies**: None
