# NyayaSahayak — API Reference

> ⚠️ Update this file whenever you add or modify an API endpoint.

**Base URL**: `http://localhost:5000/api` (Backend) | `http://localhost:8000` (OCR Microservice)
**Auth**: All protected routes require `Authorization: Bearer <token>` header or `token` cookie.

---

## Standalone OCR Microservice (`http://localhost:8000`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Service health status and active OCR engine info |
| GET | `/sample` | Process built-in Bihar court sample document |
| POST | `/ocr` | Upload PDF or Image file (`multipart/form-data`) for multi-page OCR extraction with line-by-line confidence |
| POST | `/ocr/url` | Extract text from a document URL (JSON `{ "url": "https://..." }`) |

### POST `/ocr`
- **Request**: `file` (multipart form file upload: PDF, PNG, JPG)
- **Response**:
```json
{
  "status": "success",
  "total_pages": 1,
  "full_text": "...",
  "average_confidence": 0.92,
  "pages": [
    {
      "page_number": 1,
      "text": "...",
      "confidence": 0.92,
      "line_count": 8,
      "lines": [
        {
          "line_number": 1,
          "text": "न्यायालय समाहर्त्ता...",
          "confidence": 0.98,
          "box": [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
        }
      ]
    }
  ],
  "processing_time_seconds": 0.45
}
```

---

## OCR Testing & Workbench Routes (`/api/ocr`)

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/ocr/health` | No | All | Check OCR microservice connectivity, latency, and model info |
| GET | `/ocr/samples` | No | All | List pre-loaded authentic Bihar DM Court sample petitions and notices |
| POST | `/ocr/process` | No | All | Process uploaded file (PDF/Image) or remote URL, supports engine (`gemini` / `onnx`) + autoRepair |
| POST | `/ocr/clean` | No | All | Clean & reconstruct corrupted Devanagari OCR text, restore matras and spacing using Groq Llama 3.3 70B |
| POST | `/ocr/extract-entities` | Yes | All | Pass OCR text to Groq LLM to extract structured legal metadata (parties, land, acts, relief) |

---

## Auth Routes (`/api/auth`)

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/auth/register` | No | — | Register new user |
| POST | `/auth/login` | No | — | Login |
| GET | `/auth/me` | Yes | All | Get current user |
| POST | `/auth/logout` | Yes | All | Logout |

### POST `/auth/register`
```json
{
  "name": "Ram Kumar",
  "email": "ram@court.bihar.gov.in",
  "password": "securepassword",
  "role": "peshkar",
  "courtName": "DM Court Patna",
  "district": "Patna"
}
```

### POST `/auth/login`
```json
{ "email": "ram@court.bihar.gov.in", "password": "securepassword" }
```
**Response**: `{ success, token, user }`

---

## Cases Routes (`/api/cases`)

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/cases/stats` | Yes | All | Dashboard stats |
| GET | `/cases` | Yes | All | List cases (paginated) |
| POST | `/cases` | Yes | admin, peshkar | Create case |
| GET | `/cases/:id` | Yes | All | Get case by ID |
| PUT | `/cases/:id` | Yes | admin, peshkar | Update case |
| GET | `/cases/:id/rules` | Yes | All | Run rule checks |

### Query Params for GET `/cases`
- `status` — filter by status
- `caseType` — filter by type
- `search` — full-text search
- `page` — page number (default: 1)
- `limit` — results per page (default: 20)

### POST `/cases` Body
```json
{
  "caseNumber": "124/2026",
  "caseType": "land_dispute",
  "subject": "Dispute over ownership of Plot No. 123",
  "partyA": { "name": "Ram Kumar", "address": "Village Rampur, Patna" },
  "partyB": { "name": "Shyam Lal", "address": "Mohalla XYZ, Patna" },
  "filedDate": "2026-01-15",
  "district": "Patna",
  "policeStation": "Phulwari PS"
}
```

---

## Documents Routes (`/api/documents`)

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/documents/upload/:caseId` | Yes | admin, peshkar | Upload document (multipart/form-data) |
| GET | `/documents/:caseId` | Yes | All | Get all docs for a case |
| GET | `/documents/:caseId/ocr-status` | Yes | All | Lightweight OCR status poll (no OCR text) |
| GET | `/documents/queue/stats` | Yes | admin, peshkar | Bull OCR queue stats |
| GET | `/documents/doc/:id` | Yes | All | Get single document (with OCR text) |
| PUT | `/documents/doc/:id/verify` | Yes | admin, peshkar | Verify document |
| POST | `/documents/doc/:id/ocr` | Yes | admin, peshkar | Retry OCR |

### POST `/documents/upload/:caseId`
Content-Type: `multipart/form-data`

| Field | Type | Notes |
|---|---|---|
| document | File | PDF, JPG, PNG — max 20MB |
| party | String | "A", "B", or "court" |
| docType | String | See Document model enum |
| docTypeLabel | String | Human-readable label |
| description | String | Optional description |

### GET `/documents/:caseId?party=A`
**Response**:
```json
{
  "success": true,
  "data": [...],
  "grouped": { "A": [...], "B": [...], "court": [...] }
}
```

---

## Health Check

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Server status |

**Response**: `{ success, message, timestamp, version }`

---

## Error Response Format

All errors return:
```json
{
  "success": false,
  "message": "Human-readable error message"
}
```

## Success Response Format

All success responses return:
```json
{
  "success": true,
  "data": { ... }
}
```

---

## Legal Knowledge Base Routes (`/api/legal`) — Sprint 4

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/legal/acts` | Yes | All | List all acts (paginated, filterable) |
| POST | `/legal/acts` | Yes | admin | Create new act |
| GET | `/legal/acts/:id` | Yes | All | Get single act + section count |
| PUT | `/legal/acts/:id` | Yes | admin | Update act |
| GET | `/legal/acts/:actId/sections` | Yes | All | List sections for an act |
| POST | `/legal/acts/:actId/sections` | Yes | admin | Create section (auto-generates embedding) |
| PUT | `/legal/sections/:id` | Yes | admin | Update section (re-embeds if text changed) |
| GET | `/legal/rules` | Yes | All | List legal rules |
| POST | `/legal/rules` | Yes | admin | Create rule |
| PUT | `/legal/rules/:id` | Yes | admin | Update/toggle rule |
| GET | `/legal/search?q=&caseDate=&topK=` | Yes | All | Hybrid RAG search (keyword + vector + Gemini rerank) |

---

## AI Analysis Routes (`/api/analysis`) — Sprint 5

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/analysis/:caseId/run` | Yes | admin, peshkar | Trigger async AI analysis for a case |
| GET | `/analysis/:caseId` | Yes | All | Get full analysis (evidence, issues, summaries) |
| GET | `/analysis/:caseId/status` | Yes | All | Get lightweight analysis status (for polling) |
| PUT | `/analysis/evidence/:id/verify` | Yes | admin, peshkar | Verify/reject evidence item + add notes |
| PUT | `/analysis/issues/:id/notes` | Yes | admin, peshkar | Update Peshkar notes on a framed issue |

---

## Order Routes (`/api/orders`) — Sprint 6

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/orders/:caseId/generate` | Yes | admin, peshkar | Generate structured English draft order using Gemini LLM (9 sections) |
| POST | `/orders/:caseId/generate-hindi` | Yes | admin, peshkar | Generate authentic Hindi court order in **न्यायालय समाहर्त्ता** format |
| GET | `/orders/:caseId` | Yes | All | Get all draft order versions for a case |
| GET | `/orders/order/:id` | Yes | All | Get single draft order details (includes `hindiContent` if generated) |
| PUT | `/orders/order/:id` | Yes | admin, peshkar, dm | Edit draft order section content |
| PUT | `/orders/order/:id/submit` | Yes | admin, peshkar | Submit draft order for DM review |
| PUT | `/orders/order/:id/approve` | Yes | admin, dm | Approve & digitally sign final court order (sets case to decided) |
| PUT | `/orders/order/:id/reject` | Yes | admin, dm | Reject order draft with revision notes |

### POST `/orders/:caseId/generate-hindi`
Generates a full Hindi court order prose matching the real Bihar DM court format.
**Response fields**: Returns updated `DraftOrder` with `hindiContent` (full Hindi prose), `hindiGeneratedAt`, `orderLanguage: 'bilingual'`.
The Hindi order follows the exact structure:
1. `न्यायालय समाहर्त्ता, [District]` header
2. Case number + party listing
3. Background paragraph (how case came to court)
4. Numbered appellant arguments (1, 2, 3...)
5. Respondent counter-arguments
6. Court analysis & findings
7. Decision (`खारिज/स्वीकार किया जाता है`)
8. Directions to Anchal Adhikari / Revenue Officer
9. Signature block: `जिला पदाधिकारी, [District]`


---

## Audit Log Routes (`/api/audit`) — Sprint 9

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/audit?action=&userRole=&search=&page=` | Yes | admin | Get paginated, filterable system audit log trail |



