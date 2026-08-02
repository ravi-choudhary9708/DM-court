# NyayaSahayak — AI Agent Rules (MANDATORY)

This file is automatically loaded by Antigravity and any AI agent working in this workspace.

## ⚠️ YOU MUST FOLLOW THESE RULES ON EVERY TASK

### 1. Always Update DEVELOPER_ONBOARDING Before Ending Your Turn

After every change — no matter how small — you MUST update:

- `DEVELOPER_ONBOARDING/CHANGELOG.md` — Add an entry: what you changed, why, which files
- `DEVELOPER_ONBOARDING/DATABASE_SCHEMA.md` — If you changed any Mongoose model
- `DEVELOPER_ONBOARDING/API_REFERENCE.md` — If you added or changed any API endpoint

**Do not end your turn without updating the changelog.**

### 2. Tech Stack is Fixed — Do Not Change Without Explicit User Approval

| Component | Locked Choice |
|---|---|
| Frontend | Next.js 14 + JavaScript (NO TypeScript) |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Storage | Cloudinary |
| OCR | Gemini Vision API |
| LLM | Gemini API (gemini-2.0-flash) |
| Embeddings | Gemini Embedding API (text-embedding-004) |
| Queue | Bull + Redis |
| Auth | JWT + bcryptjs |

Do NOT introduce new dependencies without noting them in CHANGELOG.md.

### 3. Language Support — Always Keep in Mind

Documents can contain:
- Hindi (Devanagari script)
- English
- Urdu/Farsi words (often in older court documents)

OCR, search, and AI prompts must handle multilingual content. Never hardcode English-only assumptions.

### 4. AI Must Never Be the Decision Maker

This is a legal system. The following are ABSOLUTE rules:
- The LLM suggests — the DM decides
- Every AI output must be traceable to: Document → Page → Evidence ID
- Every legal claim must cite: Act → Section → Source (from our DB, not LLM memory)
- Never show a "win probability" percentage to users
- All AI-generated content must be clearly labelled as AI-generated in the UI

### 5. Jurisdiction: Bihar DM Courts

When adding legal content, default acts/rules are:
- Bihar Land Reforms Act
- Bihar Revenue Code
- Bihar Prohibition and Excise Act
- Arms Act 1959
- Code of Criminal Procedure (CrPC)
- Indian Penal Code (IPC)
- Transfer of Property Act
- Evidence Act 1872

### 6. Project Structure — Do Not Reorganize Without Approval

```
backend/src/
  config/     ← DB, Cloudinary, Gemini
  models/     ← Mongoose models only
  routes/     ← Express route files only
  controllers/← Business logic only
  middleware/ ← Auth, roles, error handling
  services/   ← External service integrations
  workers/    ← Bull job workers
  utils/      ← Pure utility functions

frontend/
  app/        ← Next.js App Router pages
  components/ ← Reusable UI components
  lib/        ← API client, auth helpers
```

### 7. Security Rules

- Never log JWT tokens, passwords, or Gemini API keys
- All routes except /api/auth/* require authentication
- Role-based middleware must be applied: admin > peshkar > dm
- Audit log must be written for all sensitive actions (order approval, document upload, user creation)
- Never store actual PDF/document text in plain logs

### 8. Code Style

- JavaScript only (no TypeScript)
- ES modules in frontend (`import/export`)
- CommonJS in backend (`require/module.exports`) unless project uses ESM
- Use async/await, not callbacks
- Always handle errors with try/catch
- Meaningful variable names — no single letters except in loops
- Comments in English, but UI strings may be in Hindi/English

### 9. Before You Start Any Task

1. Read `DEVELOPER_ONBOARDING/CHANGELOG.md` to understand recent changes
2. Check `DEVELOPER_ONBOARDING/DATABASE_SCHEMA.md` for current model state
3. Check `DEVELOPER_ONBOARDING/API_REFERENCE.md` for existing endpoints
4. Do not duplicate what already exists

### 10. After You Finish Any Task

Update CHANGELOG.md with this format:

```markdown
## [YYYY-MM-DD] — [Brief Title]
**Changed by**: AI Agent / [Human Name]
**Files Modified**: list of files
**What Changed**: clear description
**Why**: reason for the change
**New Dependencies** (if any): package names + versions
```
