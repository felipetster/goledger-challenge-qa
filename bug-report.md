# Bug Report — GoLedger QA Challenge

**Candidate:** Felipe Castro
**Repository:** https://github.com/felipetster/goledger-challenge-qa
**Date:** 2026-04-05
**Scope:** Go REST API (`api/`) + React front-end (`web/`)

---

## Summary

| ID | Title | Component | Severity |
|----|-------|-----------|----------|
| BUG-001 | Logout does not clear the JWT token from storage | Web | Critical |
| BUG-002 | Password comparison uses string length instead of value | API | Critical |
| BUG-003 | `DELETE /books` is publicly accessible without authentication | API | Critical |
| BUG-004 | `GET /me` exposes the user's plaintext password in the response | API | Critical |
| BUG-005 | Passwords are stored in plaintext in memory | API | High |
| BUG-006 | `createBook` request does not include the Authorization header | Web | High |
| BUG-007 | Pagination offset is calculated incorrectly | API | High |
| BUG-008 | `UpdateBookTenant` uses the read-only query path instead of invoke | API | High |
| BUG-009 | Books search with no active genre filter always returns empty | API | High |
| BUG-010 | "Previous page" button always navigates to page 1 | Web | Medium |
| BUG-011 | `createBook` error message is generic and hides the real API error | Web | Medium |
| BUG-012 | Register page has no password confirmation field | Web | Low |

---

## Blockchain Ledger Integrity Impact

Two bugs in this report are not merely software defects — they represent failures of ledger integrity that are especially significant in a Hyperledger Fabric context.

**BUG-008** is the most critical from a business standpoint. The `UpdateBookTenant` handler calls `ccapi.Query("updateBookTenant")` instead of `ccapi.Invoke`. In the CCAPI architecture, `/query` is a read-only path — it never writes to the blockchain. The consequence is that tenant assignments appear successful to the caller (the API returns 200) but are never committed to the ledger. This was confirmed by calling `readAsset` and `readAssetHistory` directly on the CCAPI after a `PUT /books/tenant` request: the asset state is unchanged and the transaction does not appear in the asset's history. In a real-world scenario — asset lending, custody tracking, or any auditable ownership transfer — this silent failure would produce records that are irreconcilable with the actual ledger state.

**BUG-003** compounds this risk. Because `DELETE /books` requires no authentication, any unauthenticated client can permanently remove assets from the blockchain. Unlike a traditional database, blockchain deletions are irreversible by design — there is no rollback. A missing authentication check at this layer is not a recoverable error.

Together, these two bugs mean the system can silently fail to write state changes while also allowing unauthorized state destruction — undermining the core guarantees that make a blockchain-based system valuable.

---

## BUG-001 — Logout does not clear the JWT token from storage

**Component:** Web
**File:** `web/src/App.tsx` — `handleLogout`
**Endpoint / Page:** All pages — Logout button
**Severity:** Critical

**Description:**
The `handleLogout` function resets React state but never calls `removeToken()` to delete the JWT from `localStorage`. On the next page load, `isTokenPresent()` returns `true` and the application restores the authenticated session automatically, bypassing logout entirely.

**Steps to Reproduce:**
1. Open `http://localhost:3000` and log in with `admin / admin123`.
2. Click the **Logout** button in the navbar.
3. Press **F5** to refresh the page.

**Expected Behaviour:**
The user remains on the login screen. The session is fully terminated.

**Actual Behaviour:**
The user is redirected back to the Books page as if still authenticated.

**Proposed Fix:**
```typescript
const handleLogout = useCallback(() => {
  removeToken(); // ← add this
  setAuthenticated(false);
  setCurrentPage('login');
}, []);
```

---

## BUG-002 — Password comparison uses string length instead of value

**Component:** API
**File:** `api/handlers/auth.go` — `Login`
**Endpoint / Page:** `POST /auth/login`
**Severity:** Critical

**Description:**
The login handler compares only the **length** of the submitted password against the stored password. Any string with the same number of characters as the real password authenticates successfully.

**Steps to Reproduce:**
1. Send `POST /auth/login` with `{"username":"admin","password":"XXXXXXXX"}` (8 characters, any value).
2. Observe a valid JWT token is returned.

**Expected Behaviour:**
Only the exact password `admin123` produces a successful login.

**Actual Behaviour:**
Any 8-character string authenticates as `admin`.

**Proposed Fix:**
```go
if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
    c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
    return
}
```

---

## BUG-003 — `DELETE /books` is publicly accessible without authentication

**Component:** API
**File:** `api/routes/routes.go`
**Endpoint / Page:** `DELETE /books`
**Severity:** Critical

**Description:**
The `DELETE /books` route is registered outside the authenticated route group. Any caller — with or without a valid JWT — can delete books from the blockchain. The bug is acknowledged in a comment left in the source code itself.

**Steps to Reproduce:**
1. Send `DELETE http://localhost:8080/books?title=X&author=Y` with no `Authorization` header.
2. Observe the request reaches the handler and attempts deletion on the blockchain.

**Expected Behaviour:**
HTTP 401 for requests without a valid JWT token.

**Actual Behaviour:**
The request is processed without any authentication check.

**Proposed Fix:**
```go
api := r.Group("/")
api.Use(middleware.AuthRequired())
{
    api.GET("/books", handlers.GetBooks)
    api.POST("/books", handlers.CreateBook)
    api.DELETE("/books", handlers.DeleteBook) // ← move here
    api.PUT("/books/tenant", handlers.UpdateBookTenant)
}
```

---

## BUG-004 — `GET /me` exposes the user's plaintext password in the response

**Component:** API
**File:** `api/models/user.go` — `User` struct
**Endpoint / Page:** `GET /me`
**Severity:** Critical

**Description:**
The `User` struct serializes the `Password` field to JSON. When `GetProfile` returns the full `User` object, the response body includes the user's plaintext password.

**Steps to Reproduce:**
1. Authenticate via `POST /auth/login` and obtain a JWT token.
2. Send `GET /me` with the token in the `Authorization` header.
3. Inspect the response body.

**Expected Behaviour:**
The password field is not present in the response.

**Actual Behaviour:**
The response includes `"password": "admin123"` in plaintext.

**Proposed Fix:**
```go
type User struct {
    ID       int    `json:"id"`
    Username string `json:"username"`
    Password string `json:"-"` // ← never serialize
    Role     string `json:"role"`
}
```

---

## BUG-005 — Passwords are stored in plaintext in memory

**Component:** API
**File:** `api/models/user.go`
**Endpoint / Page:** `POST /auth/register`, `POST /auth/login`
**Severity:** High

**Description:**
User passwords are stored as raw strings in the in-memory user store with no hashing. Any memory dump, log output, or unintended serialization (see BUG-004) exposes all credentials immediately.

**Expected Behaviour:**
Passwords are hashed with bcrypt before storage.

**Actual Behaviour:**
Passwords are stored and returned as plaintext strings.

**Proposed Fix:**
```go
hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
models.AddUser(req.Username, string(hashedPassword), "user")
```

---

## BUG-006 — `createBook` does not include the Authorization header

**Component:** Web
**File:** `web/src/api.ts` — `createBook`
**Endpoint / Page:** Books page — Create New Book form
**Severity:** High

**Description:**
The `createBook` function omits the `Authorization: Bearer <token>` header. Every other API call in `api.ts` includes this header. As a result, `POST /books` always returns 401 and book creation is completely non-functional from the UI.

**Steps to Reproduce:**
1. Log in and navigate to the Books page.
2. Click **+ New Book**, fill in Title and Author, click **Create Book**.
3. The request returns HTTP 401. The error shown is generic (see BUG-011).

**Expected Behaviour:**
The book is created successfully.

**Actual Behaviour:**
The request fails with 401 on every attempt.

**Proposed Fix:**
```typescript
const res = await fetch(`${API_BASE}/books`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`, // ← add this
  },
  body: JSON.stringify(data),
});
```

---

## BUG-007 — Pagination offset is calculated incorrectly

**Component:** API
**File:** `api/handlers/books.go` — `GetBooks`
**Endpoint / Page:** `GET /books`
**Severity:** High

**Description:**
The pagination offset is computed as `page * limit` instead of `(page - 1) * limit`. On page 1 with a limit of 10, the offset becomes 10, skipping the first 10 results entirely.

**Expected Behaviour:**
Page 1 returns the first `limit` results (offset 0).

**Actual Behaviour:**
Page 1 always returns an empty array. The first page of results is never accessible.

**Proposed Fix:**
```go
offset := (page - 1) * limit // ← was: page * limit
```

---

## BUG-008 — `UpdateBookTenant` uses the read-only query path instead of invoke

**Component:** API
**File:** `api/handlers/books.go` — `UpdateBookTenant`
**Endpoint / Page:** `PUT /books/tenant`
**Severity:** High

**Description:**
The `UpdateBookTenant` handler calls `ccapi.Query` instead of `ccapi.Invoke`. The CCAPI `/query` path is read-only and never writes to the blockchain ledger. Tenant assignments therefore never persist. This was verified directly against the CCAPI: after calling `PUT /books/tenant`, `readAsset` and `readAssetHistory` on the CCAPI show the asset unchanged with no record of the assignment transaction.

**Steps to Reproduce:**
1. Authenticate and send `PUT /books/tenant` with a valid book title, author, and tenant CPF.
2. Call `POST /query/readAssetHistory` on the CCAPI for the same book.
3. The tenant assignment does not appear in the asset history.

**Expected Behaviour:**
The tenant assignment is written to the blockchain and reflected on subsequent reads.

**Actual Behaviour:**
The assignment goes through the read-only query path. No state change is committed to the ledger. The CCAPI returns an error (`Invalid username or password` wrapping a query-not-found response) which the API surfaces as a 401.

**Proposed Fix:**
```go
result, status, err := ccapi.Invoke(config.GetCCAPIOrgURL(), http.MethodPut, "updateBookTenant", params)
```

---

## BUG-009 — Books search with no genre filter always returns empty

**Component:** API
**File:** `api/handlers/books.go` — `GetBooks`
**Endpoint / Page:** `GET /books`
**Severity:** High

**Description:**
When no `genre` query parameter is provided, `filteredBooks` is never populated — it remains `nil`. The pagination logic operates on `filteredBooks` instead of the full `books` slice, so the endpoint always returns an empty array regardless of how many books exist for the requested author.

**Expected Behaviour:**
All books by the author are returned (subject to pagination).

**Actual Behaviour:**
An empty array is always returned when `genre` is omitted.

**Proposed Fix:**
Always populate `filteredBooks` from the full result set, then apply genre filtering as a secondary step. Fix the pagination to operate on `filteredBooks` in both cases, and correct the offset calculation (see BUG-007).

---

## BUG-010 — "Previous page" button always navigates to page 1

**Component:** Web
**File:** `web/src/pages/BooksPage.tsx` — `handlePrev`
**Endpoint / Page:** Books page — pagination controls
**Severity:** Medium

**Description:**
`handlePrev` hardcodes `prev = 1` instead of decrementing the current page. Clicking "← Prev" from any page always jumps to page 1.

**Proposed Fix:**
```typescript
const handlePrev = () => {
  const prev = page - 1; // ← was: const prev = 1
  setPage(prev);
  handleSearch(prev);
};
```

---

## BUG-011 — `createBook` error message is generic and hides the real API error

**Component:** Web
**File:** `web/src/pages/BooksPage.tsx` — `handleCreate`
**Endpoint / Page:** Books page — Create New Book form
**Severity:** Medium

**Description:**
The `catch` block in `handleCreate` discards the actual error object and displays a hardcoded generic message. Users and developers have no way to understand what failed.

**Proposed Fix:**
```typescript
} catch (err) {
  setCreateError(err instanceof Error ? err.message : 'An error occurred. Please try again.');
}
```

---

## BUG-012 — Register page has no password confirmation field

**Component:** Web
**File:** `web/src/pages/RegisterPage.tsx`
**Endpoint / Page:** `/register`
**Severity:** Low

**Description:**
The registration form has no "Confirm Password" field. Users can register with a mistyped password and then be unable to log in.

**Proposed Fix:**
```typescript
if (password !== confirmPassword) {
  setError('Passwords do not match.');
  return;
}
```

---

*Report generated as part of the GoLedger QA Challenge submission.*