# GoLedger QA Challenge — Submission

**Candidate:** Felipe Castro
**Submission date:** 2026-04-05

---

## Deliverables

### 1. Bug Report
**File:** [`bug-report.md`](./bug-report.md)

12 bugs documented across the API (Go/Gin) and front-end (React), each with:
- Root cause identified in the source code
- Steps to reproduce
- Expected vs actual behaviour
- Proposed fix with code snippet

Includes a dedicated **Blockchain Ledger Integrity** section covering the two bugs with direct impact on ledger state — verified by calling the CCAPI directly.

### 2. Test Cases Spreadsheet
**Link:** [Google Sheets — GoLedger QA Test Cases](https://docs.google.com/spreadsheets/d/19-7wtD_V3TinnmnoFnZ5kLBObXbx01p5Dk5xElJb7Y8/edit?usp=sharing)

22 test cases across 5 modules (Auth, Books-Web, Books-API, Libraries & Persons, Security) in GIVEN/WHEN/THEN format, with test data, environment, expected vs actual results, and severity classification.

### 3. Postman Collection
**File:** [`GoLedger_QA.postman_collection.json`](./GoLedger_QA.postman_collection.json)

20+ automated requests across 6 folders:

| Folder | Description |
|--------|-------------|
| Auth | Login, bypass by length (BUG-002), password exposure (BUG-004) |
| Books | DELETE without auth (BUG-003), empty array without genre (BUG-009), offset (BUG-007) |
| Libraries | Create, count books, auth validation |
| Persons | Create, auth validation |
| Security | Token reuse after logout (BUG-001), auth bypass, data exposure |
| CCAPI Direct | Direct ledger validation — BUG-008 proof via `readAsset` + `readAssetHistory` |

**How to run:**
1. Import `GoLedger_QA.postman_collection.json` into Postman
2. Run `Auth → TC-AUTH-001` first — it saves the JWT token automatically
3. Run the full collection via **Run collection**

### 4. Playwright Tests
**Location:** `web/tests/`

| File | Coverage |
|------|----------|
| `auth.spec.ts` | Login flow, BUG-001 (logout token persistence) |
| `books.spec.ts` | BUG-006 (missing auth header), BUG-011 (generic error), BUG-010 (prev page) |
| `register.spec.ts` | BUG-012 (no password confirmation), register flow |

Tests that cover bugs are **intentionally failing** — each failure message describes the bug and its root cause in the source code.

**How to run:**
```bash
cd web
npm install
npx playwright install chromium
npx playwright test
```

Expected result: 5 failed (bugs), 6 passed (positive flows).

---

## Setup

### API
```bash
cd api
cp .env.example .env
# Fill in CCAPI_ORG_URL, CCAPI_AUTH_USERNAME, CCAPI_AUTH_PASSWORD
docker-compose up --build
```

### Web
```bash
cd web
cp .env.example .env
npm install
npm run dev
```

API runs on `http://localhost:8080` — Swagger at `http://localhost:8080/docs/index.html`
Web runs on `http://localhost:3000`