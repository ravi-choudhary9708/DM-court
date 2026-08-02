u# 🏛️ NyayaSahayak — Developer Onboarding

> **AI-Assisted DM Court Order System for Bihar**
> Every developer and AI agent working on this project MUST read this file first and MUST update the changelog after every change.

---

## ⚠️ MANDATORY RULE FOR ALL CONTRIBUTORS (HUMAN OR AI)

> After EVERY change you make to this project — no matter how small — you MUST update:
> 1. [`CHANGELOG.md`](./CHANGELOG.md) — what you added/changed/fixed and why
> 2. [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md) — if you changed any Mongoose model
> 3. [`API_REFERENCE.md`](./API_REFERENCE.md) — if you added/changed any API endpoint
>
> **Failure to update these docs breaks the project for the next contributor.**

---

## 📋 Project Overview

**NyayaSahayak** is an AI copilot for District Magistrate Courts in Bihar. It helps Peshkars and DMs draft orders faster by:

- Accepting document uploads from both parties
- Running OCR (Gemini Vision) to extract text from Hindi/English/Urdu/Farsi PDFs
- Analysing evidence and finding applicable Bihar laws using RAG
- Generating structured draft orders — the DM always makes the final decision

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 + JavaScript (no TypeScript) |
| Styling | Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Document Storage | Cloudinary |
| OCR | Gemini Vision API |
| LLM | Gemini API (gemini-2.0-flash) |
| Embeddings | Gemini Embedding API (text-embedding-004) |
| Job Queue | Bull + Redis |
| Auth | JWT + bcryptjs |

---

## 🗂️ Project Structure

```
dm court/
├── DEVELOPER_ONBOARDING/      ← YOU ARE HERE — always update this
│   ├── README.md
│   ├── CHANGELOG.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   └── API_REFERENCE.md
├── .agents/
│   └── AGENTS.md              ← AI agent rules
├── backend/                   ← Node.js + Express API
│   ├── src/
│   │   ├── config/            ← DB, Cloudinary, Gemini config
│   │   ├── models/            ← Mongoose models
│   │   ├── routes/            ← Express route definitions
│   │   ├── controllers/       ← Business logic
│   │   ├── middleware/        ← Auth, roles, error handling
│   │   ├── services/          ← Gemini OCR, RAG, rule engine
│   │   ├── workers/           ← Bull job workers
│   │   └── utils/             ← Helpers, audit logger
│   ├── .env.example
│   └── package.json
└── frontend/                  ← Next.js app
    ├── app/                   ← App router pages
    ├── components/            ← UI components
    ├── lib/                   ← API client, auth helpers
    └── package.json
```

---

## ⚙️ Local Setup

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas URI)
- Redis (for Bull job queue)
- Cloudinary account
- Google AI Studio API key (Gemini)

### 1. Backend

```bash
cd backend
cp .env.example .env
# Fill in your .env values
npm install
npm run dev
```

Backend runs on: `http://localhost:5000`

### 2. Frontend

```bash
cd frontend
cp .env.local.example .env.local
# Fill in your .env.local values
npm install
npm run dev
```

Frontend runs on: `http://localhost:3000`

---

## 🔐 Environment Variables

### Backend `.env`

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/nyayasahayak
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

GEMINI_API_KEY=your_gemini_api_key

REDIS_URL=redis://localhost:6379
```

### Frontend `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## 👥 User Roles

| Role | Access |
|---|---|
| `admin` | Full system access, user management, legal DB |
| `peshkar` | Case management, document upload, AI analysis, draft review |
| `dm` | View cases, review/approve/reject draft orders |

---

## 🔑 Demo Login Credentials

> **First run `npm run seed` in the backend folder to create these users.**

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@nyayasahayak.gov.in` | `Admin@123456` |
| **Peshkar** | `peshkar@nyayasahayak.gov.in` | `Peshkar@123456` |
| **DM** | `dm@nyayasahayak.gov.in` | `DM@123456` |

### Seed command:
```bash
cd backend
npm run seed
```

**Role access summary:**
- **Admin** → Can create users, manage legal DB, view audit logs, do everything Peshkar + DM can do
- **Peshkar** → Upload documents for parties, run AI analysis, prepare draft orders, submit for DM review
- **DM** → Review draft orders, approve & digitally sign final court order, reject with revision notes

> ⚠️ **Security**: These are demo credentials only. Change all passwords before any real deployment.

---


## 🔄 Core Workflow

```
Case Filed → Documents Uploaded → OCR → Evidence Extracted
→ Legal RAG Search → Rule Engine Check → AI Analysis
→ Evidence-Law Matrix → Draft Order Generated
→ Peshkar Reviews → DM Approves/Edits/Rejects → Final Order
```

---

## 📝 Contributing Guidelines

1. Always branch from `main`
2. Update `CHANGELOG.md` before raising a PR
3. Update `DATABASE_SCHEMA.md` if models change
4. Update `API_REFERENCE.md` if endpoints change
5. Never commit `.env` files
6. All AI-generated code must be reviewed by a human before merge

---

## 🤖 For AI Agents

Read [`../. agents/AGENTS.md`](../.agents/AGENTS.md) — it is mandatory and workspace-scoped.
