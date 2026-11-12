# Implementation Plan: SeatSync

## Overview

Implement SeatSync as a full-stack TypeScript application: an Express.js REST API with Prisma + PostgreSQL on the backend, and a React (Vite) SPA with TanStack Query, shadcn/ui, and React Router v7 on the frontend. Work proceeds in layers — database schema → backend services → API routes → frontend pages — so each layer builds on a verified foundation.

## Tasks

- [ ] 1. Set up backend project structure and database schema
  - Initialise the `backend/` directory with TypeScript, `ts-node`, and `tsconfig.json`
  - Add dependencies: `express`, `prisma`, `@prisma/client`, `zod`, `jsonwebtoken`, `bcryptjs`, `node-cron`, `cors`; dev dependencies: `vitest`, `@vitest/coverage-v8`, `fast-check`, `vitest-mock-extended`
  - Create `prisma/schema.prisma` with all models (`Student`, `Admin`, `Area`, `Seat`, `Session`), enums (`SessionStatus`, `EndedBy`), and relations exactly as specified in the design
  - Write a Prisma migration that adds the two partial unique indexes (`one_active_session_per_seat`, `one_active_session_per_student`) via raw SQL
  - Create `src/lib/prisma.ts` as a singleton `PrismaClient` instance
  - Create `src/lib/errors.ts` with `NotFoundError`, `ConflictError`, `ForbiddenError`, `ValidationError` custom error classes
  - Create `src/lib/jwt.ts` with `signToken(payload)` and `verifyToken(token)` wrappers (8-hour expiry)
  - _Requirements: 13.1, 13.2, 13.3, 9.1_

- [ ] 2. Write the database seed script
  - [ ] 2.1 Implement `prisma/seed.ts`
    - Insert exactly 3 Areas, 38–42 Seats distributed across those areas, 20 Students, 1 Admin with a `bcryptjs`-hashed password
    - Use `upsert` to make the script idempotent (no duplicates on re-run)
    - _Requirements: 13.4, 13.5, 13.6_

  - [ ]* 2.2 Write unit tests for seed idempotency
    - Run seed twice against an in-memory mock and assert row counts are stable
    - _Requirements: 13.6_

- [ ] 3. Implement backend service layer
  - [ ] 3.1 Implement `src/services/areaService.ts`
    - `getAreas()` – returns areas with `vacantSeats` count (seats with no non-ended session)
    - `getSeatsForArea(areaId)` – returns seats with status derived from live session data and `occupiedDurationSeconds`
    - _Requirements: 1.1, 2.1_

  - [ ]* 3.2 Write property test for `areaService` — Property 1: Vacant count accuracy
    - **Property 1: Area response includes accurate vacant count**
    - **Validates: Requirements 1.1**
    - Use `fast-check` with mocked Prisma; generate varied seat/session combinations; assert `vacantSeats` equals seats with no non-ended session

  - [ ]* 3.3 Write property test for `areaService` — Property 3: Seat status computed correctly
    - **Property 3: Seat status computed correctly from session table**
    - **Validates: Requirements 2.1**
    - Generate seat + session state combinations; assert returned `status` matches the expected mapping

  - [ ] 3.4 Implement `src/services/studentService.ts`
    - `verifyStudent(studentNumber)` – lookup by PK; throw `NotFoundError` if absent
    - _Requirements: 3.1, 3.3_

  - [ ] 3.5 Implement `src/services/sessionService.ts`
    - `reserveSeat(studentNumber, seatId)` – creates session (`pending`, `expires_at = now + 15 min`) inside a Prisma transaction; throws `ConflictError` on duplicate seat or student
    - `arrive(sessionId, studentNumber)` – transitions `pending → occupied`, sets `arrived_at`; throws `ValidationError` for wrong state/owner
    - `studentTimeout(sessionId, studentNumber)` – ends session (`ended_by: student`); throws `ValidationError` for wrong state
    - `getActive(studentNumber)` – returns the single non-ended session or `null`
    - _Requirements: 4.1, 4.6, 4.7, 5.1, 6.1, 7.1, 7.2_

  - [ ]* 3.6 Write property test for `sessionService` — Property 4: At most one non-ended session per seat
    - **Property 4: At most one non-ended session per seat**
    - **Validates: Requirements 4.6, 13.2**
    - Simulate concurrent reservations for the same seat; assert exactly one succeeds

  - [ ]* 3.7 Write property test for `sessionService` — Property 5: At most one non-ended session per student
    - **Property 5: At most one non-ended session per student**
    - **Validates: Requirements 4.7, 13.3**
    - Simulate multiple reservation attempts from the same student; assert exactly one succeeds

  - [ ]* 3.8 Write property test for `sessionService` — Property 7: Session status round-trip after arrive
    - **Property 7: Session status round-trip after arrive**
    - **Validates: Requirements 5.1**
    - Generate pending sessions; call `arrive`; assert status is `occupied` and `arrived_at` is non-null

  - [ ]* 3.9 Write property test for `sessionService` — Property 8: Student timeout releases seat to vacant
    - **Property 8: Student timeout releases seat to vacant**
    - **Validates: Requirements 6.1**
    - Generate pending/occupied sessions; call `studentTimeout`; assert `ended_by = student` and no non-ended session remains for that seat

  - [ ] 3.10 Implement `src/services/adminService.ts`
    - `login(username, password)` – validates credentials with `bcryptjs`; throws `ForbiddenError` on mismatch; returns signed JWT
    - `getDashboard()` – returns all areas + seats with statuses, including `overdue`
    - `getActiveSessions()` – returns all non-ended sessions with student name, seat, area, elapsed duration
    - `forceTimeout(sessionId, adminId)` – ends session (`ended_by: admin`, records `admin_id`); throws `ValidationError` if already ended
    - _Requirements: 9.1, 10.1, 11.1, 12.1_

  - [ ]* 3.11 Write property test for `adminService` — Property 9: Force-timeout records admin identity
    - **Property 9: Force-timeout releases seat and records admin identity**
    - **Validates: Requirements 11.1**
    - Generate sessions + admin ids; call `forceTimeout`; assert `ended_by = admin`, `admin_id` is set, no non-ended session remains

  - [ ] 3.12 Implement `src/services/backgroundJob.ts`
    - `markOverdueSessions()` – updates all `pending` sessions where `expires_at < now()` to `overdue`
    - Wrap in try/catch; log errors with timestamp and count; do not rethrow
    - Schedule with `node-cron` every minute
    - _Requirements: 8.1, 8.2, 8.3, 8.6_

  - [ ]* 3.13 Write property test for `backgroundJob` — Property 6: Pending-to-overdue transition is complete and exclusive
    - **Property 6: Pending-to-overdue transition is complete and exclusive**
    - **Validates: Requirements 8.2**
    - Generate sessions at varied `expires_at` times; run `markOverdueSessions`; assert all expired-pending → `overdue` and no future-pending changed

- [ ] 4. Checkpoint — Ensure all backend service tests pass
  - Run `vitest --run` in the `backend/` directory; fix any failures before proceeding.

- [ ] 5. Implement backend middleware and route layer
  - [ ] 5.1 Implement `src/middleware/auth.ts`
    - `requireAdmin` middleware: extracts Bearer token, calls `verifyToken`, attaches `req.admin`, returns 401 on failure
    - _Requirements: 9.4, 9.5_

  - [ ] 5.2 Implement `src/middleware/validate.ts`
    - Generic Zod-schema validation middleware factory for body and query params; returns 400 with `{ error, field }` on failure
    - _Requirements: 14.1, 14.2_

  - [ ] 5.3 Implement `src/middleware/errorHandler.ts`
    - Maps `NotFoundError → 404`, `ConflictError → 409`, `ValidationError → 400`, `ForbiddenError → 401`, unknown → 500
    - Logs full error + stack server-side; never sends stack trace to client
    - _Requirements: 14.3_

  - [ ] 5.4 Implement `src/routes/areas.ts`
    - `GET /api/areas` → `areaService.getAreas()`
    - `GET /api/areas/:id/seats` → `areaService.getSeatsForArea(id)`
    - _Requirements: 1.1, 2.1_

  - [ ] 5.5 Implement `src/routes/students.ts`
    - `POST /api/students/verify` → `studentService.verifyStudent(studentNumber)` with Zod validation
    - _Requirements: 3.1, 3.3, 14.2_

  - [ ] 5.6 Implement `src/routes/sessions.ts`
    - `POST /api/sessions` → `sessionService.reserveSeat(studentNumber, seatId)`
    - `POST /api/sessions/:id/arrive` → `sessionService.arrive(id, studentNumber)`
    - `POST /api/sessions/:id/timeout` → `sessionService.studentTimeout(id, studentNumber)`
    - `GET /api/sessions/active?studentNumber=` → `sessionService.getActive(studentNumber)`
    - _Requirements: 4.1, 5.1, 6.1, 7.1_

  - [ ] 5.7 Implement `src/routes/admin.ts`
    - `POST /api/admin/login` → `adminService.login()`
    - `GET /api/admin/dashboard` (JWT required) → `adminService.getDashboard()`
    - `GET /api/admin/sessions` (JWT required) → `adminService.getActiveSessions()`
    - `POST /api/admin/sessions/:id/force-timeout` (JWT required) → `adminService.forceTimeout(id, adminId)`
    - _Requirements: 9.1, 10.1, 11.1, 12.1_

  - [ ] 5.8 Implement `src/app.ts`
    - Register CORS, JSON body parser, request logger
    - Mount route modules under `/api`
    - Register global `errorHandler`
    - Start the node-cron background job on startup
    - _Requirements: 8.1_

  - [ ]* 5.9 Write property test for input validation — Property 10: Input validation rejects invalid student numbers
    - **Property 10: Input validation rejects invalid student numbers**
    - **Validates: Requirements 3.1, 14.2**
    - Generate strings with non-numeric chars, length < 7, or length > 11; assert API returns HTTP 400

- [ ] 6. Checkpoint — Ensure all backend tests pass and server starts cleanly
  - Run `vitest --run` and start the server (`ts-node src/app.ts`) to verify no startup errors.

- [ ] 7. Set up frontend project structure
  - In `frontend/` install dependencies: `react-router-dom` v7, `@tanstack/react-query`, `axios`, `shadcn/ui` (init), `tailwindcss`; dev: `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
  - Configure `vite.config.ts` with Vitest and jsdom environment
  - Create `src/lib/axios.ts` – Axios instance with base URL; request interceptor that attaches `Authorization: Bearer <token>` from `sessionStorage` when present
  - Create `src/contexts/AdminAuthContext.tsx` – stores JWT in React Context + `sessionStorage`; provides `login(token)` and `logout()` helpers
  - Create `src/lib/queryClient.ts` – TanStack Query `QueryClient` configured with appropriate defaults
  - _Requirements: 9.2, 9.4_

- [ ] 8. Implement shared and core frontend components
  - [ ] 8.1 Implement `AreaCard` component
    - Displays area name and `vacantSeats` count; accepts click handler to navigate to seat layout
    - _Requirements: 1.2_

  - [ ] 8.2 Implement `AreaSearchBar` component
    - Controlled input; calls `onSearch(term)` callback; trims and passes raw value up to parent for client-side filtering
    - _Requirements: 1.4_

  - [ ]* 8.3 Write unit tests for `AreaSearchBar` filtering
    - Test that only areas whose names contain the search term (case-insensitive) are displayed; test empty-state message
    - _Requirements: 1.4_

  - [ ] 8.4 Implement `SeatGrid` and `SeatBox` components
    - `SeatGrid` renders a CSS grid using each seat's `row`/`col` values
    - `SeatBox` is color-coded: green for `vacant`, red for `pending`/`occupied`, red-orange for `overdue` (admin view flag prop)
    - On tap of a non-vacant seat, display a tooltip/popover with the duration in "Xh Ym" format (omit hours if zero)
    - Minimum 44×44 CSS pixels per box on viewports < 1024px
    - _Requirements: 2.2, 2.3, 2.4, 15.3_

  - [ ]* 8.5 Write unit tests for `SeatGrid`
    - Render with a fixed seat array; assert correct number of boxes rendered with correct color classes per status
    - _Requirements: 2.2, 2.3_

  - [ ] 8.6 Implement `VerificationForm` component
    - Student number input (numeric, 7–11 chars); tracks attempt count; disables input after 5 failed attempts; displays inline validation errors
    - _Requirements: 3.1, 3.5, 14.4_

  - [ ]* 8.7 Write unit tests for `VerificationForm`
    - Assert input is disabled after 5 failed attempts; assert inline error shown for bad format
    - _Requirements: 3.5, 14.4_

  - [ ] 8.8 Implement `ActiveSessionScreen` component
    - Displays seat label, area name, session status, and either a countdown (`pending`) or elapsed timer (`occupied`/`overdue`)
    - Countdown updates every second; disables "I'm here" button at zero and shows expiry message
    - Displays "Time Out" button; shows success message for ≥ 3 s after timeout before navigating away
    - _Requirements: 4.3, 5.5, 5.7, 6.3, 7.3_

  - [ ]* 8.9 Write unit tests for `ActiveSessionScreen`
    - Assert countdown decrements each second; assert "I'm here" button disables at zero
    - _Requirements: 5.5, 5.7_

- [ ] 9. Implement frontend page routes (student portal)
  - [ ] 9.1 Implement `PublicLiveView` page (`/`)
    - Fetches `GET /api/areas` with `useQuery(['areas'], refetchInterval: 5000)`
    - Renders `AreaCard` list; renders `AreaSearchBar` with client-side filter
    - Displays empty-state message when no areas; displays error toast on fetch failure while keeping stale data
    - Shows "Time-In / Reserve a Seat" button that navigates to `/verify`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ] 9.2 Implement `SeatLayoutView` page (`/areas/:areaId`)
    - Fetches `GET /api/areas/:id/seats` with `useQuery(['seats', areaId], refetchInterval: 5000)`
    - Renders `SeatGrid`; on vacant-seat click navigates to `/verify?seatId=<id>`
    - Displays error behaviour per requirement 2.6
    - _Requirements: 2.2, 2.5, 2.6_

  - [ ] 9.3 Implement `VerificationFlow` page (`/verify`)
    - Step 1: `VerificationForm` → calls `POST /api/students/verify`
    - Step 2: `IdentityConfirmation` – shows student's full name and "Is this you?" with Confirm / Back
    - On confirm: checks for active session; if exists redirects to `/session`; else navigates to seat selection (back to `/areas/:areaId` with seat pre-selected)
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ] 9.4 Implement `ActiveSessionScreen` page (`/session`)
    - Fetches `GET /api/sessions/active?studentNumber=` on mount
    - Integrates `ActiveSessionScreen` component
    - "I'm here" calls `POST /api/sessions/:id/arrive`; on success refreshes session data
    - "Time Out" calls `POST /api/sessions/:id/timeout`; on success navigates to `/`
    - On network/server error shows retry UI per requirements 5.6, 6.5
    - _Requirements: 4.3, 5.2, 5.3, 5.6, 6.2, 6.3, 6.5, 7.3, 7.4_

- [ ] 10. Implement frontend admin portal pages
  - [ ] 10.1 Implement `AdminLogin` page (`/admin/login`)
    - Form with username + password; calls `POST /api/admin/login`
    - On success: stores JWT via `AdminAuthContext`, redirects to `/admin/dashboard`
    - On 401: displays "Invalid username or password"
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ] 10.2 Implement `AdminDashboard` page (`/admin/dashboard`)
    - Fetches `GET /api/admin/dashboard` with `useQuery(['adminDashboard'], refetchInterval: 5000)`
    - Renders `SeatGrid` with admin view flag (shows overdue seats in red-orange)
    - Renders `AdminNeedsAttention` list: student full name, seat label, minutes elapsed since `expires_at`
    - On "Vacate" tap: opens `AdminVacateDialog` confirmation; on confirm calls `POST /api/admin/sessions/:id/force-timeout`; on success invalidates `['adminDashboard']` query
    - _Requirements: 10.1, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [ ] 10.3 Implement `AdminSessionsTable` page (`/admin/sessions`)
    - Fetches `GET /api/admin/sessions` with `useQuery(['adminSessions'], refetchInterval: 5000)`
    - Displays sortable table: seat label, area, student name, student number, status, start time, elapsed HH:MM
    - Default sort: most recent first
    - Non-blocking stale-data indicator on poll failure
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [ ] 10.4 Implement protected route guard and narrow-screen notice
    - Wrap admin routes in a `RequireAdmin` component that reads `AdminAuthContext` and redirects to `/admin/login` if no JWT
    - On viewports < 1024px inside admin routes, render an overlay notice that the portal is optimised for 1024px+
    - _Requirements: 9.5, 15.2, 15.4_

- [ ] 11. Checkpoint — Ensure all frontend tests pass
  - Run `vitest --run` in the `frontend/` directory; fix any failures before proceeding.

- [ ] 12. Wire together and integration-test the full stack
  - [ ] 12.1 Write integration test: reservation race condition
    - Two simultaneous `POST /api/sessions` requests for the same seat against a real Postgres instance (Testcontainers or local Docker)
    - Assert exactly one 201 and one 409 response
    - _Requirements: 4.6, 13.2_

  - [ ]* 12.2 Write integration test: full session lifecycle
    - Reserve → arrive → timeout; verify seat returns to `vacant` after each step
    - _Requirements: 4.1, 5.1, 6.1_

  - [ ]* 12.3 Write integration test: background job overdue transition
    - Insert `pending` sessions with `expires_at` in the past; run `markOverdueSessions()`; assert all are `overdue`
    - _Requirements: 8.2_

  - [ ]* 12.4 Write integration test: admin login → JWT → protected endpoint
    - Login, extract token, call `GET /api/admin/dashboard` with token; assert 200; call without token; assert 401
    - _Requirements: 9.1, 9.4, 9.5_

  - [ ]* 12.5 Write integration test: seed script idempotency
    - Run seed twice; assert row counts for all tables are stable
    - _Requirements: 13.6_

- [ ] 13. Final checkpoint — Ensure all tests pass
  - Run `vitest --run` in both `backend/` and `frontend/`; ensure zero failures before closing out.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP.
- Each task references specific requirements for traceability.
- Property tests use `fast-check` with mocked Prisma (minimum 100 iterations each).
- Integration tests (task 12) require a running PostgreSQL instance; use Testcontainers or a local Docker container.
- The design document is at `.kiro/specs/seat-check/design.md` and is the authoritative reference for interface shapes, Prisma schema, and API contracts during implementation.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["2.2", "3.1", "3.4", "3.10", "3.12"] },
    { "id": 2, "tasks": ["3.2", "3.3", "3.5", "3.11", "3.13"] },
    { "id": 3, "tasks": ["3.6", "3.7", "3.8", "3.9", "5.1", "5.2", "5.3"] },
    { "id": 4, "tasks": ["5.4", "5.5", "5.6", "5.7", "5.9"] },
    { "id": 5, "tasks": ["5.8", "8.1", "8.2", "8.4", "8.6", "8.8"] },
    { "id": 6, "tasks": ["8.3", "8.5", "8.7", "8.9", "9.1"] },
    { "id": 7, "tasks": ["9.2", "9.3", "10.1"] },
    { "id": 8, "tasks": ["9.4", "10.2", "10.3", "10.4"] },
    { "id": 9, "tasks": ["12.1", "12.2", "12.3", "12.4", "12.5"] }
  ]
}
```
