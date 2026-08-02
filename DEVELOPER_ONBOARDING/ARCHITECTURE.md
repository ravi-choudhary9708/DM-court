# NyayaSahayak — System Architecture

## Overview

NyayaSahayak is a hybrid Legal AI system — not a pure LLM. It combines:

1. **MongoDB** — structured case/evidence data
2. **Gemini Vision** — OCR for multilingual PDFs
3. **Gemini Embeddings + Cosine Search** — RAG for legal retrieval
4. **Rule Engine** — deterministic mandatory checks
5. **Gemini LLM** — summarisation, analysis, draft generation

## Why Hybrid (Not Pure LLM)?

| Risk | How Mitigated |
|---|---|
| LLM invents a law | RAG: law comes from our DB, not LLM memory |
| LLM invents a fact | Evidence objects: every fact traced to document + page |
| Wrong legal version | `effectiveFrom`/`effectiveTo` on every LegalSection |
| LLM decides outcome | Only suggests; DM makes final decision |

---

## Request Flow

```
User (Browser)
     │
     ▼
Next.js Frontend (port 3000)
     │  REST API calls
     ▼
Express Backend (port 5000)
     │
     ├── Auth Middleware (JWT verification)
     ├── Role Middleware (admin/peshkar/dm)
     │
     ├── Cases Router → Case Controller → MongoDB (Mongoose)
     ├── Documents Router → Document Controller → Cloudinary + MongoDB
     ├── Legal Router → Legal Controller → MongoDB
     ├── Analysis Router → Analysis Controller → AI Orchestrator
     └── Orders Router → Order Controller → MongoDB
                                │
                     ┌──────────┴──────────┐
                     ▼                     ▼
              Gemini Service         Rule Engine
              (OCR, RAG, LLM)    (Zero-AI checks)
                     │
              ┌──────┴──────┐
              ▼             ▼
        Embeddings       LLM
        (text-embedding)  (gemini-2.0-flash)
```

## OCR Pipeline (Async)

```
Document Upload → Cloudinary → Save to MongoDB (ocrStatus: pending)
      │
      ▼
Bull Queue Job Created
      │
      ▼
OCR Worker picks up job
      │
      ▼
Fetch doc from Cloudinary → Convert to base64 image
      │
      ▼
Gemini Vision API → Extract text (Hindi/English/Urdu/Farsi)
      │
      ▼
Save ocrText to MongoDB → Update ocrStatus: done
      │
      ▼
Generate Embedding → Save to MongoDB (embedding field)
```

## RAG Pipeline

```
Query (e.g., "applicable law for land mutation Bihar")
      │
      ▼
Generate query embedding (Gemini text-embedding-004)
      │
      ├── Vector Search: cosine similarity against LegalSection embeddings
      ├── Keyword Search: MongoDB text index on LegalSection.text
      │
      ▼
Merge results, deduplicate
      │
      ▼
Filter: jurisdiction=Bihar, effectiveFrom <= case date, effectiveTo >= case date
      │
      ▼
Score with Gemini re-ranking prompt (top 5)
      │
      ▼
Pass to Gemini LLM with strict prompt:
"Use ONLY the provided passages. Cite section ID. 
 Say 'Not found in database' if unsure."
```

## Rule Engine

Zero AI involved. Pure conditional logic.

```
For each MANDATORY rule in LegalRule collection:
  Evaluate condition against case documents
  If PASS → record satisfied
  If FAIL → block/flag with specific message
  
Output shown to Peshkar before AI analysis runs
```

## Role Hierarchy

```
Admin
  └── Peshkar (DM Court Clerk)
        └── DM (District Magistrate)

Each role can only access their permitted routes (enforced server-side).
```

## Data Classification

Documents uploaded to this system may contain sensitive PII.
- All Cloudinary uploads should use signed URLs with restricted access
- MongoDB should run with auth enabled in production
- JWT tokens expire in 7 days
- Audit log is append-only (never delete, never update)
