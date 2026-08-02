# NyayaSahayak — Production Deployment Guide

> **System Overview**: NyayaSahayak is an AI-assisted District Magistrate (DM) Court Order Management System built specifically for Bihar DM Courts.

---

## 1. System Requirements & Stack Architecture

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 / 16 (App Router) + JavaScript + Vanilla CSS & Tailwind |
| **Backend API** | Node.js + Express.js (REST API) |
| **Database** | MongoDB 6+ / MongoDB Atlas + Mongoose ORM |
| **Job Queue** | Bull + Redis 6+ |
| **Cloud Storage** | Cloudinary (PDF & Image uploads) |
| **OCR & Vision** | Gemini Vision API (`gemini-2.0-flash`) |
| **LLM & RAG** | Gemini LLM (`gemini-2.0-flash`) & Embeddings (`text-embedding-004`) |
| **Authentication** | JWT (JSON Web Tokens) + bcryptjs |

---

## 2. Environment Variables Setup

### Backend Environment (`backend/.env`)

```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/nyayasahayak
JWT_SECRET=your_super_secure_jwt_secret_key_32bytes_minimum
JWT_EXPIRES_IN=7d

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Gemini AI Credentials
GEMINI_API_KEY=your_google_ai_studio_gemini_api_key

# Redis Configuration (Bull Queue)
REDIS_URL=redis://localhost:6379

# Frontend CORS
CLIENT_URL=http://localhost:3000
```

### Frontend Environment (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## 3. Database Seeding

Run the seed script to populate Bihar Acts, Legal Sections, and Deterministic Court Rules:

```bash
cd backend
npm run seed
```

This populates:
- **10 Legal Acts** (Bihar Land Reforms Act, Bihar Revenue Code 2011, Arms Act 1959, BPEA 2016, CrPC, IPC, TP Act, Evidence Act, Bihar Tenancy Act, Limitation Act 1963)
- **15 Key Legal Sections** with Hindi titles and full text
- **10 Mandatory Court Rules** (RULE-001 to RULE-099)

---

## 4. Running Workers & Production Servers

### Step A: Redis Server
Ensure Redis is running on port 6379:
```bash
redis-server
```

### Step B: Backend API & OCR Worker
Start backend server in production mode using PM2 or Node:
```bash
cd backend
npm start
```
*Note: The OCR worker runs in-process or can be spawned as a separate worker process executing `node src/workers/ocrWorker.js`.*

### Step C: Frontend Next.js Production Build & Start
```bash
cd frontend
npm run build
npm start
```

---

## 5. Security & Judicial Protocol Rules

1. **Role Access**:
   - `admin`: User management, Legal Acts/Sections CRUD, Rule Engine CRUD, Audit Log viewer.
   - `peshkar`: Case creation, document upload, OCR verification, evidence verification, order draft submission.
   - `dm`: DM dashboard, evidence review, order approval & digital signing, order rejection.

2. **Rule 4 Compliance**:
   - AI outputs are strictly advisory.
   - Every AI analysis component displays prominent warnings that the District Magistrate retains full judicial authority.
   - Audit logs are immutable and stored with user ID, role, action timestamp, and IP address.
