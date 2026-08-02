# NyayaSahayak — End-to-End Technical Architecture & Execution Flow

This document provides a complete, line-by-line, step-by-step engineering breakdown of how NyayaSahayak works across both Frontend (Next.js 14) and Backend (Node.js/Express + MongoDB + Redis + AI).

---

## 🗺️ High-Level System Topology

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           BROWSER (Client Side)                                 │
│  Next.js 14 App Router | React Context (Auth) | Axios Interceptors | Tailwind   │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │ HTTPS / REST (JWT Bearer Token)
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        EXPRESS.JS SERVER (Port 5000)                            │
│                                                                                 │
│  [Middleware Stack]                                                             │
│   ├── cors(), express.json(), express.urlencoded()                              │
│   ├── protect (JWT Verification)                                                │
│   └── authorize('admin', 'peshkar', 'dm') (RBAC)                                │
│                                                                                 │
│  [Router & Controller Layer]                                                    │
│   ├── /api/auth       → authController.js                                       │
│   ├── /api/cases      → caseController.js                                       │
│   ├── /api/documents  → documentController.js (Multer + Cloudinary)             │
│   ├── /api/analysis   → analysisController.js (AI Orchestrator)                 │
│   ├── /api/legal      → legalController.js (RAG Search)                         │
│   └── /api/orders     → orderController.js (Hindi Order Synthesis)              │
│                                                                                 │
│  [Asynchronous Job Queue & Workers]                                             │
│   └── Bull Queue + Redis (OCR & Embedding Worker Threads)                       │
└──────────────────────┬─────────────────────────────┬────────────────────────────┘
                       │                             │
                       ▼                             ▼
┌───────────────────────────────┐     ┌───────────────────────────────────────────┐
│       MONGODB CLUSTER         │     │         EXTERNAL CLOUD SERVICES           │
│  ├── cases, users, documents  │     │  ├── Cloudinary (Secure PDF/Img Storage)  │
│  ├── evidences, issues        │     │  ├── Gemini Vision (Multilingual OCR)     │
│  ├── legalacts, legalsections │     │  ├── Gemini text-embedding-004 (RAG)      │
│  ├── draftorders (versioned)  │     │  └── Gemini 2.0 Flash (LLM Drafter)       │
│  └── auditlogs (immutable)    │     └───────────────────────────────────────────┘
└───────────────────────────────┘
```

---

## 🔄 Complete Step-by-Step Lifecycle of a Case

---

### Step 1: User Login & Session Bootstrap

#### Frontend Action:
1. User enters Email (`peshkar@madhubani.bihar.gov.in`) and Password (`password123`) at `/login`.
2. Frontend calls `api.post('/api/auth/login', { email, password })`.

#### Backend Execution:
* **Route**: `POST /api/auth/login` in [`backend/src/routes/authRoutes.js`](file:///c:/Users/Admin/Desktop/dm%20court/backend/src/routes/authRoutes.js)
* **Controller**: `login()` in [`backend/src/controllers/authController.js`](file:///c:/Users/Admin/Desktop/dm%20court/backend/src/controllers/authController.js)
1. Finds user in Mongo: `User.findOne({ email }).select('+password')`.
2. Compares password hash: `await bcrypt.compare(password, user.password)`.
3. Generates signed JWT Token containing `{ id: user._id, role: user.role }` with 7-day expiry.
4. Returns user profile + JWT token.

#### Frontend Storage:
* `localStorage.setItem('token', token)`
* Axios request interceptor attaches header: `Authorization: Bearer <token>` to all subsequent requests.

---

### Step 2: Creating a New Court Case

#### Frontend Action:
* Peshkar navigates to `/cases/new` and fills:
  * Case Number: `16/2025-26`
  * Case Type: `mutation` (or `land_dispute`, `arms_act`, `excise`, `eviction`)
  * District: `Madhubani`, Police Station: `Jaynagar`
  * Party A (Appellant): `Hari Thakur`
  * Party B (Respondent): `Sushila Devi`
  * Subject: `Jamabandi Cancellation Appeal - Khata No 381, Khesra 355`
* Submits form → `POST /api/cases`.

#### Backend Execution:
* **Route**: `POST /api/cases` (`protect`, `authorize('admin', 'peshkar')`)
* **Controller**: `createCase()` in [`backend/src/controllers/caseController.js`](file:///c:/Users/Admin/Desktop/dm%20court/backend/src/controllers/caseController.js)
1. Validates required fields and cleans up duplicate strings (e.g. `JaynagarJaynagar` → `Jaynagar`).
2. Mongoose writes to `cases` collection:
   ```json
   {
     "_id": "65b21f...",
     "caseNumber": "16/2025-26",
     "caseType": "mutation",
     "status": "filed",
     "partyA": { "name": "Hari Thakur", "address": "Kamla Road, Jaynagar" },
     "partyB": { "name": "Sushila Devi", "address": "Kamla Road, Jaynagar" },
     "aiAnalysisStatus": "pending",
     "createdBy": "user_id_1"
   }
   ```
3. Creates an immutable entry in `AuditLog` (`CASE_CREATED`).

---

### Step 3: Document Upload & Cloud Storage

#### Frontend Action:
* Peshkar drags & drops `petition.pdf`, `jamabandi_381.pdf`, `sale_deed_1985.pdf`.
* Selects Party (`party_a` / `party_b`) and Doc Type (`petition` / `jamabandi` / `sale_deed`).
* Uploads via multipart form data: `POST /api/documents/:caseId/upload`.

#### Backend Execution:
* **Route**: `POST /api/documents/:caseId/upload`
* **Middleware**: `multer.single('file')` streams the binary file into memory/temp storage.
* **Controller**: `uploadDocument()` in [`backend/src/controllers/documentController.js`](file:///c:/Users/Admin/Desktop/dm%20court/backend/src/controllers/documentController.js)
1. Uploads file stream directly to **Cloudinary**:
   ```javascript
   const uploadResult = await cloudinary.uploader.upload(file.path, {
     resource_type: 'auto',
     folder: `nyayasahayak/cases/${caseId}`
   });
   ```
2. Saves document metadata in MongoDB with `ocrStatus: 'pending'`:
   ```javascript
   const document = await Document.create({
     caseId,
     fileName: file.originalname,
     fileUrl: uploadResult.secure_url,
     fileType: file.mimetype,
     docType: req.body.docType,
     party: req.body.party,
     ocrStatus: 'pending'
   });
   ```
3. Pushes job to Redis Bull Queue: `ocrQueue.add({ documentId: document._id })`.

---

### Step 4: Async OCR & Vision Text Extraction (Bull Worker)

#### Worker Execution:
* **File**: [`backend/src/workers/ocrWorker.js`](file:///c:/Users/Admin/Desktop/dm%20court/backend/src/workers/ocrWorker.js)
1. Bull worker picks up `{ documentId }` from Redis.
2. Downloads PDF/image from Cloudinary URL and converts pages to Base64 buffers.
3. Sends each page to **Gemini Vision API** with prompt:
   > *"Extract all text verbatim from this Indian court/revenue document. Preserve Devanagari Hindi, English, and historic revenue terms (खतियान, खेसरा, मौजा). Maintain paragraph structure."*
4. Receives raw transcription and stores structured page arrays in MongoDB:
   ```javascript
   await Document.findByIdAndUpdate(documentId, {
     ocrStatus: 'done',
     ocrText: extractedFullText,
     ocrPages: [
       { pageNumber: 1, text: "न्यायालय अपर समाहर्त्ता, मधुबनी..." },
       { pageNumber: 2, text: "खाता संख्या 381, खेसरा 355..." }
     ]
   });
   ```

---

### Step 5: Deterministic Rule Engine (Pre-AI Safety Gate)

#### Execution:
* **File**: [`backend/src/services/ruleEngine.js`](file:///c:/Users/Admin/Desktop/dm%20court/backend/src/services/ruleEngine.js)
* **Zero AI involved — 100% deterministic code logic**.
1. Reads all uploaded documents for the case.
2. Checks case-type-specific statutory rules:
   * **Rule 10 (Land Cases)**: Is there at least one document proving possession/Jamabandi for Party A?
   * **Rule 30 (Arms Act)**: Is a Police Verification Report attached? If `false` → Flags hard block: *"Police Report Mandatory"*.
   * **Rule 99 (Limitation)**: Computes date difference between dispute origin and filing date. If > 3 years → Adds warning flag: *"Dispute exceeds 3-year limitation under Section 3 of Limitation Act 1963"*.
3. Returns validation summary to frontend before AI analysis can be triggered.

---

### Step 6: AI Analysis Orchestration (Non-Blocking Event Loop)

#### Frontend Action:
* Peshkar clicks **"Run AI Analysis"** button on Case Overview page.
* Frontend sends `POST /api/analysis/:caseId/run`.

#### Backend Execution:
* **Controller**: `runAnalysis()` in [`backend/src/controllers/analysisController.js`](file:///c:/Users/Admin/Desktop/dm%20court/backend/src/controllers/analysisController.js)
1. Validates that OCR is complete on documents.
2. Updates `Case.aiAnalysisStatus = 'processing'`.
3. **Immediately returns HTTP 200 JSON** to browser so the HTTP connection does not time out.
4. Executes `runAnalysisBackground()` asynchronously in the Node.js event loop:

```
                  ┌────────────────────────────────────────┐
                  │       runAnalysisBackground()          │
                  └───────────────────┬────────────────────┘
                                      │
           ┌──────────────────────────┴──────────────────────────┐
           ▼                                                     ▼
 [Part A: Evidence Extraction]                         [Part B: Hybrid RAG Search]
 Extract facts from OCR text                           Query MongoDB text + Vectors
 Create `Evidence` records                             Match BLMA 2011, BRC 2011
 Tag to Document + PageNumber                          Filter by temporal dates
           │                                                     │
           └──────────────────────────┬──────────────────────────┘
                                      │
                                      ▼
                         [Part C: Issue Framing]
                         Gemini LLM frames legal issues
                         Links each issue to Evidence & LegalSections
                                      │
                                      ▼
                         `Case.aiAnalysisStatus = 'done'`
```

---

### Step 7: Hybrid RAG (Retrieval-Augmented Generation) Engine

#### Execution:
* **File**: [`backend/src/services/ragService.js`](file:///c:/Users/Admin/Desktop/dm%20court/backend/src/services/ragService.js)
* **Goal**: Retrieve exact statutory sections from our 87-section database for the case issues.

1. **Step A: Keyword Search (BM25 via MongoDB `$text` Index)**
   ```javascript
   const keywordResults = await LegalSection.find({
     $text: { $search: "Jamabandi Cancellation Appeal Revision Collector" },
     effectiveFrom: { $lte: caseDate },
     $or: [{ effectiveTo: null }, { effectiveTo: { $gte: caseDate } }]
   }, { score: { $meta: 'textScore' } }).lean();
   ```

2. **Step B: Vector Search (Cosine Similarity on 768-dim Embeddings)**
   * Calls Gemini Embedding API: `queryEmbedding = await generateEmbedding(query)`.
   * Calculates dot product / magnitude against stored section vectors:
     $$\text{Cosine Similarity} = \frac{\mathbf{A} \cdot \mathbf{B}}{\|\mathbf{A}\| \|\mathbf{B}\|}$$

3. **Step C: Weighted Merge & Deduplication**
   $$\text{Combined Score} = (\text{Keyword Score} \times 0.4) + (\text{Vector Score} \times 0.6)$$

4. **Result**: Top matching sections identified (e.g., *Bihar Land Mutation Act 2011 §9(6)(A)*, *Indian Evidence Act 1872 §35*).

---

### Step 8: Hindi Draft Order Generation & Resilient Fallback

#### Frontend Action:
* Peshkar / DM clicks **"Generate Draft Order"** at `/cases/:caseId/order`.
* Frontend sends `POST /api/orders/:caseId/generate`.

#### Backend Execution:
* **Controller**: `generateOrder()` in [`backend/src/controllers/orderController.js`](file:///c:/Users/Admin/Desktop/dm%20court/backend/src/controllers/orderController.js)
1. Fetches Case details, verified Evidence list, framed Issues, and cited LegalSections.
2. Calls `synthesizeHindiOrderWithAI()` with full legal context prompt.

```
                     ┌────────────────────────────────────┐
                     │    synthesizeHindiOrderWithAI()    │
                     └─────────────────┬──────────────────┘
                                       │
                        ┌──────────────┴──────────────┐
                        ▼                             ▼
                 [Try: Gemini LLM]           [Catch: API Error / 429]
                 Calls Gemini Flash API      Traps quota / network error
                 Generates custom Hindi      Switches instantly to:
                 order draft                 Bihar Legal Template Engine
                        │                             │
                        └──────────────┬──────────────┘
                                       │
                                       ▼
                     Saves DraftOrder v1 in MongoDB
                     Status: 'draft', GeneratedByAI: true
```

3. **Generated Order Content Structure**:
   * **न्यायालय शीर्षक**: `न्यायालय समाहर्त्ता, Madhubani`
   * **वाद संख्या एवं पक्षकार**: `वाद संख्या-16/2025-26 | Hari Thakur बनाम Sushila Devi`
   * **प्रस्तुत वाद का संक्षिप्त विवरण**: Case coordinates (Khata 381, Khesra 355, Thana Jaynagar).
   * **पक्षकारों के तर्क**: Appellant vs Respondent claims.
   * **सुसंगत विधियां**: *बिहार भूमि दाखिल-खारिज अधिनियम 2011 की धारा-9(6)(A)*.
   * **निष्कर्ष एवं आदेश**: Operative directions to Circle Officer.

---

### Step 9: DM Live Review, Edit & Final Approval

#### Frontend Action:
1. District Magistrate logs in (`dm@madhubani.bihar.gov.in`).
2. Opens `/cases/:caseId/order`.
3. Reviews the generated order in a **Rich Text Editor**.
4. DM can edit any paragraph, add remarks, or modify the operative order directly in the browser.
5. Clicks **"Approve & Sign Order"** → `POST /api/orders/:orderId/approve`.

#### Backend Execution:
* **Route**: `POST /api/orders/:id/approve` (`protect`, `authorize('dm')`)
1. Checks that caller has the `dm` role.
2. Updates `DraftOrder.status = 'approved'` and `Case.status = 'disposed'`.
3. Records an immutable entry in `auditlogs` collection:
   ```json
   {
     "action": "ORDER_APPROVED_BY_DM",
     "userId": "dm_user_id",
     "userName": "District Magistrate Madhubani",
     "userRole": "dm",
     "entityType": "DraftOrder",
     "entityId": "order_id_123",
     "description": "Final order approved and signed for case 16/2025-26",
     "timestamp": "2026-08-02T17:00:00Z",
     "ipAddress": "192.168.1.50"
   }
   ```
4. Frontend displays the approved, certified order with options to print or export as PDF.

---

## 📊 Summary of Data Transformations

| Stage | Input | Output | Storage Location |
|---|---|---|---|
| **1. Ingestion** | Scanned Paper PDF / Image | Cloudinary URL | `documents.fileUrl` |
| **2. OCR** | Binary File Buffer | Bilingual Text (Hindi/Eng) | `documents.ocrPages` |
| **3. Rules** | Document List + Case Type | Validation Flags (Pass/Fail) | Memory / API Response |
| **4. RAG** | Case Subject & Issues | Top Matched Acts & Sections | `issues.applicableSections` |
| **5. Analysis** | OCR Text + Laws | Extracted Facts & Issues | `evidences`, `issues` |
| **6. Drafting** | Facts + Issues + Laws | Formatted Hindi Court Order | `draftorders.content` |
| **7. Approval** | DM Review & Edits | Final Signed Order + Audit Log | `draftorders`, `auditlogs` |
