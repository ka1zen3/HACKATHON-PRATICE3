# Requirements Document

## Introduction

SeatSync is a web application that allows students to check real-time seat availability in library and study areas before making the trip. Students identify themselves with a student number (no password), browse live seat maps, reserve a specific seat, and manage their active session. Librarians and administrators access a monitoring portal with override capabilities. The system enforces race-safe reservations, a 15-minute pending window, and an overdue state that only librarians can resolve.

---

## Glossary

- **System**: The SeatSync web application (frontend + backend).
- **Student**: An end user who authenticates by student number against the pre-seeded students table. No password is required.
- **Admin**: A librarian or administrator account that authenticates with username and password via JWT.
- **Area**: A named study zone (e.g., "Main Library 2F", "Study Hall") that contains a set of seats.
- **Seat**: A physical seat identified by a label, row, and column within an Area.
- **Session**: A reservation record linking a Student to a Seat, tracking status transitions (pending → occupied → ended, or overdue → ended).
- **Pending**: Session state immediately after reservation; student has 15 minutes to arrive.
- **Occupied**: Session state after the student confirms arrival; elapsed-time counter begins.
- **Overdue**: Session state when the pending timer expires without arrival; visible only to Admin.
- **Vacant**: A seat with no active Session.
- **Force Time-Out**: An Admin action that terminates any active Session and returns the seat to Vacant.
- **Background Job**: A node-cron process running every minute that transitions Pending sessions past their expiry to Overdue.
- **API**: The Express.js REST API backend.
- **JWT**: JSON Web Token used to authenticate Admin requests.
- **Prisma**: The ORM used for database access and migrations.
- **Seed Script**: A script that pre-populates the database with 3 Areas, ~40 Seats, 20 Students, and 1 Admin account.
- **Partial Unique Index**: A PostgreSQL index that enforces at most one non-ended Session per Seat and per Student number.

---

## Requirements

### Requirement 1: Public Live Area Overview

**User Story:** As a student, I want to see all study areas and their available seat counts in real time, so that I can decide which area to visit without making the trip first.

#### Acceptance Criteria

1. THE System SHALL expose a `GET /api/areas` endpoint that returns a list of all active Areas, where an active Area is one with an `active` status flag set to true, each including the Area id, name, description, total seat count, and vacant seat count.
2. WHEN a user opens the Public Live View, THE System SHALL display a list of Areas with the name and the number of vacant seats per Area.
3. IF the list of active Areas is empty, THEN THE System SHALL display a message indicating that no study areas are currently available.
4. WHEN a user enters a search or filter term of 1 to 100 characters in the Area search field, THE System SHALL display only the Areas whose names contain the entered term (case-insensitive); IF no Areas match the entered term, THEN THE System SHALL display a message indicating no matching Areas were found.
5. WHILE the Public Live View is open, THE System SHALL refresh the Area vacancy counts every 5 seconds via polling.
6. IF the `GET /api/areas` request fails, THEN THE System SHALL display an error message indicating that Area data could not be fetched, retain the last successfully fetched Area data on screen, and continue polling every 5 seconds until a successful response is received.

---

### Requirement 2: Live Seat Layout View

**User Story:** As a student, I want to see a visual grid of seats for a specific area in real time, so that I know which seats are available before reserving.

#### Acceptance Criteria

1. THE System SHALL expose a `GET /api/areas/:id/seats` endpoint that returns all active seats for the specified Area, each including the seat id, label, row, col, current status (vacant, pending, occupied, overdue), and occupied duration in seconds for occupied seats.
2. WHEN a user selects an Area, THE System SHALL render a grid of seat boxes laid out according to each seat's row and column values.
3. WHILE the seat layout is displayed, THE System SHALL color vacant seats green, occupied and pending seats red, and overdue seats with the same red color as occupied seats in the student-facing view.
4. WHEN a user taps a seat with status occupied, pending, or overdue, THE System SHALL display the duration that seat has been in its current status, expressed in whole hours and whole minutes (e.g., "Occupied for 1h 20m", omitting hours if zero).
5. WHILE the seat layout is displayed, THE System SHALL refresh seat statuses every 5 seconds via polling.
6. IF the `GET /api/areas/:id/seats` request fails and a prior successful response exists, THEN THE System SHALL display an error message without clearing the last known seat layout; IF the request fails and no prior successful response exists, THEN THE System SHALL display an error message and an empty grid with no seat boxes rendered.
7. WHERE the Admin portal is active, THE System SHALL additionally color overdue seats with a distinct red-orange visual indicator separate from the student-facing occupied color.

---

### Requirement 3: Student Identity Verification

**User Story:** As a student, I want to verify my identity using only my student number, so that I can reserve a seat without creating a separate account.

#### Acceptance Criteria

1. THE System SHALL accept a student number consisting of 7 to 11 numeric characters as the sole input for identity verification.
2. WHEN a student clicks "Time-In / Reserve a Seat", THE System SHALL display a student number input form before allowing seat selection.
3. WHEN a student submits their student number, THE System SHALL look up the student record and display a confirmation screen showing the student's full name and student number with an "Is this you?" prompt.
4. WHEN a student confirms their identity on the confirmation screen, THE System SHALL proceed to the seat selection step.
5. IF the submitted student number does not match any record in the students table, THEN THE System SHALL display an error message indicating the student number was not found and allow the student to re-enter their student number up to 5 times before disabling further attempts for that session.
6. IF the verified student already has an active reservation with a status of pending or occupied, THEN THE System SHALL display an error message indicating an active reservation already exists and redirect the student to their Active Session screen.
7. IF the student identity verification service is unavailable during a lookup attempt, THEN THE System SHALL display an error message indicating the service is temporarily unavailable and allow the student to retry the lookup.

---

### Requirement 4: Seat Reservation

**User Story:** As a verified student, I want to reserve a specific vacant seat, so that the seat is held for me while I travel to the library.

#### Acceptance Criteria

1. WHEN a verified student submits a seat reservation request for a vacant seat, THE System SHALL create a reservation with a pending status that expires 15 minutes from the time of creation and return the created reservation details.
2. WHEN a verified student selects a vacant seat and explicitly confirms the reservation, THE System SHALL submit the reservation request and transition the seat status to pending.
3. WHEN a seat reservation is created successfully, THE System SHALL display the Active Session screen showing the seat label, area name, session status, and a countdown timer initialized to 15 minutes.
4. IF the selected seat is no longer vacant at the time the reservation request is processed, THEN THE System SHALL reject the request and display an error message indicating the seat is unavailable and prompting the student to choose another seat.
5. IF the student already has an active reservation at the time of the reservation request, THEN THE System SHALL reject the request and display an error message indicating the student already has an active reservation.
6. THE System SHALL ensure that at most one non-ended reservation exists per seat at any given time, such that any concurrent or subsequent reservation request for the same seat is rejected while a pending or active reservation exists.
7. THE System SHALL ensure that at most one non-ended reservation exists per student at any given time, such that any concurrent or subsequent reservation request from the same student is rejected while a pending or active reservation exists.
8. WHEN the 15-minute reservation countdown timer reaches zero, THE System SHALL cancel the reservation and transition the seat status back to vacant.
9. IF an unverified student attempts to submit a seat reservation request, THEN THE System SHALL reject the request and display an error message indicating that verification is required before reserving a seat.

---

### Requirement 5: Arrival Confirmation

**User Story:** As a student with a pending reservation, I want to confirm my arrival at the seat, so that my reservation changes to occupied and others can see the seat is taken.

#### Acceptance Criteria

1. THE System SHALL expose a `POST /api/sessions/:id/arrive` endpoint that transitions a Session from `pending` to `occupied` and sets `arrived_at` to the current timestamp.
2. WHEN a student on the Active Session screen taps "I'm here", THE System SHALL call `POST /api/sessions/:id/arrive`.
3. WHEN the arrive call succeeds, THE System SHALL update the Active Session screen to show `Occupied` status and replace the countdown timer with an elapsed-time counter starting from `arrived_at`.
4. IF `POST /api/sessions/:id/arrive` is called on a Session that is not in `pending` status or is not owned by the requesting student, THEN THE System SHALL return HTTP 400, keep the student on the Active Session screen, and display an error message indicating the confirmation is not valid.
5. WHILE a Session is in `pending` status, THE System SHALL display the remaining time until expiry as a countdown on the Active Session screen, updating every second.
6. IF the arrive call fails due to a network or server error (non-400 response or no response within 10 seconds), THEN THE System SHALL display an error message indicating the request failed and allow the student to retry by tapping "I'm here" again.
7. WHEN the pending reservation countdown reaches zero, THE System SHALL disable the "I'm here" button and display a message indicating the reservation has expired.

---

### Requirement 6: Student Time-Out

**User Story:** As a student, I want to release my seat when I leave, so that the seat becomes available for other students.

#### Acceptance Criteria

1. THE System SHALL expose a `POST /api/sessions/:id/timeout` endpoint that accepts Sessions in `pending` or `occupied` status, sets the Session's `ended_at` to the current timestamp, sets `ended_by` to `student`, and returns the seat to `vacant` status.
2. WHEN a student on the Active Session screen taps "Time Out", THE System SHALL call `POST /api/sessions/:id/timeout`.
3. WHEN the timeout call succeeds, THE System SHALL navigate the student back to the Public Live View and display a message indicating the session has ended and the seat is now available, for a minimum of 3 seconds before the message is dismissed.
4. IF `POST /api/sessions/:id/timeout` is called on a Session that is already ended, THEN THE System SHALL return HTTP 400 and display an error message indicating the session has already ended.
5. IF the timeout call fails due to a network or server error (non-400 response or no response within 10 seconds), THEN THE System SHALL display an error message indicating the request failed and allow the student to retry by tapping "Time Out" again.

---

### Requirement 7: Active Session Retrieval

**User Story:** As a student, I want to retrieve my current active session after re-opening the app, so that I can manage my reservation without losing track of it.

#### Acceptance Criteria

1. WHEN a request is made to retrieve the active session for a given student number, THE System SHALL return the active Session with status `pending`, `occupied`, or `overdue` for that student, including the session status, seat identifier, room identifier, and the relevant timestamp (`expires_at` for `pending` sessions or `arrived_at` for `occupied` and `overdue` sessions).
2. IF no active Session exists for the given student number, THEN THE System SHALL return an empty session response indicating no active session was found.
3. WHEN a verified student opens the app and an active Session exists for that student, THE System SHALL display the Active Session screen showing the current session status, seat identifier, room identifier, and a countdown timer to `expires_at` if the session is `pending`, or an elapsed timer since `arrived_at` if the session is `occupied` or `overdue`.
4. IF a verified student opens the app and no active Session exists for that student, THEN THE System SHALL display the Public Live View instead of the Active Session screen.

---

### Requirement 8: Pending-to-Overdue Background Transition

**User Story:** As a librarian, I want expired pending reservations to be automatically flagged, so that I can identify ghost seats that need manual cleanup.

#### Acceptance Criteria

1. THE System SHALL run a background job using node-cron that executes every minute.
2. WHEN the background job runs, THE System SHALL query all Sessions with status `pending` where `expires_at` is in the past, and update each such Session's status to `overdue`.
3. THE Background_Job SHALL NOT automatically end or release overdue Sessions; the Admin must perform a Force Time-Out to release them.
4. WHILE a Session is in `overdue` status, THE System SHALL display the seat as unavailable to students.
5. WHILE a Session is in `overdue` status, THE System SHALL display the seat with a visual overdue indicator that is distinct from the `pending` and `occupied` seat indicators in the Admin view.
6. IF the background job encounters an error during execution, THEN THE System SHALL log the error with a timestamp and the count of Sessions that could not be updated, without terminating the background job.

---

### Requirement 9: Admin Authentication

**User Story:** As a librarian, I want to log in with a username and password, so that I can access protected monitoring and management features.

#### Acceptance Criteria

1. THE System SHALL expose a `POST /api/admin/login` endpoint that accepts a username and password, validates credentials against the admins table, and returns a signed JWT with an expiry of 8 hours on success.
2. WHEN an admin submits valid credentials, THE System SHALL retain the JWT on the client so that it is present in all subsequent admin API requests, and redirect the admin to the Admin Dashboard.
3. IF the submitted credentials do not match any admin record, THEN THE System SHALL return HTTP 401 and display the message "Invalid username or password."
4. WHILE an Admin is authenticated, THE System SHALL include the JWT as a Bearer token in the Authorization header of all subsequent admin API requests.
5. IF an admin API request is received with a JWT that is absent, incorrectly signed, or expired, THEN THE System SHALL return HTTP 401 and redirect the client to the admin login page.

---

### Requirement 10: Admin Live Monitoring Dashboard

**User Story:** As a librarian, I want to see the full live seat layout including overdue seats, so that I can quickly identify problem seats that need action.

#### Acceptance Criteria

1. THE System SHALL expose a `GET /api/admin/dashboard` endpoint (JWT-required) that returns all Areas with their seats and statuses, including the `overdue` state.
2. THE System SHALL mark a Session as `overdue` when the current time exceeds the session's `expires_at` timestamp.
3. WHEN an authenticated Admin opens the Dashboard, THE System SHALL display the same seat grid as the student view, with overdue seats rendered in a distinct visual style that differs from both the vacant state and the normally occupied state.
4. WHEN an authenticated Admin opens the Dashboard, THE System SHALL display a "Needs Attention" list at the top containing all Seats with an `overdue` Session, showing the student's full name, seat label, and the number of whole minutes elapsed since `expires_at`.
5. WHILE the Admin Dashboard is open, THE System SHALL refresh all seat statuses and the "Needs Attention" list every 5 seconds via polling.

---

### Requirement 11: Admin Force Time-Out

**User Story:** As a librarian, I want to forcibly release any active session, so that I can reclaim ghost seats without waiting for the student.

#### Acceptance Criteria

1. THE System SHALL provide an authenticated Admin-only action to force-end an active Session, which records the ending timestamp, marks the action as admin-initiated, records the identity of the acting Admin, and returns the associated Seat to `vacant` status.
2. WHEN an Admin taps "Vacate" on any Seat with an active Session, THE System SHALL display a confirmation dialog before executing the force time-out.
3. WHEN the Admin cancels the confirmation dialog, THE System SHALL dismiss the dialog and leave the Session and Seat status unchanged.
4. WHEN the Admin confirms the force time-out, THE System SHALL submit the force time-out action and update the Seat to `vacant` on the dashboard within 2 seconds of receiving a successful response.
5. IF the force time-out action fails due to a system or network error, THEN THE System SHALL display an error message indicating the action could not be completed and leave the Seat status unchanged on the dashboard.
6. IF the Session is already ended at the time of the force time-out call, THEN THE System SHALL reject the request and display an error message indicating the Session has already ended.

---

### Requirement 12: Admin Active Sessions Table

**User Story:** As a librarian, I want a table of all active sessions, so that I can audit seat usage at a glance.

#### Acceptance Criteria

1. THE System SHALL provide an authenticated Admin-only view that lists all Sessions with status `pending`, `occupied`, or `overdue`, displaying for each: seat label, area name, student full name, student number, session status, session start time, and elapsed duration in HH:MM format.
2. WHEN an authenticated Admin opens the Active Sessions table, THE System SHALL display all active Sessions sorted by session start time, most recent first.
3. IF the Active Sessions table fails to load due to a system or network error, THEN THE System SHALL display an error message indicating the data could not be retrieved.
4. WHILE the Admin Sessions table is open, THE System SHALL refresh the session list every 5 seconds; IF a refresh poll fails, THEN THE System SHALL display a non-blocking indicator that the last refresh failed and continue attempting subsequent polls.

---

### Requirement 13: Database Schema and Seed

**User Story:** As a developer, I want a complete database schema and seed script, so that the application can be set up and demonstrated immediately.

#### Acceptance Criteria

1. THE System SHALL include SQL migrations defining the following tables: `students`, `admins`, `areas`, `seats`, `sessions`, with all columns specified in the data model.
2. THE System SHALL include a unique partial index on the `sessions` table that prevents more than one non-ended Session per `seat_id`.
3. THE System SHALL include a unique partial index on the `sessions` table that prevents more than one non-ended Session per `student_number`.
4. THE System SHALL include a seed script that inserts exactly 3 Areas, between 38 and 42 Seats distributed across those Areas, exactly 20 Students, and exactly 1 Admin account with a securely hashed password.
5. THE System SHALL store admin passwords as cryptographic hashes; plain-text passwords SHALL NOT be stored in the database.
6. THE System SHALL ensure the seed script is idempotent, so that running it multiple times produces the same final data state without duplicating records or raising errors.

---

### Requirement 14: Input Validation and Error Handling

**User Story:** As a developer, I want consistent input validation and error responses, so that the API is robust and the UI can display meaningful messages.

#### Acceptance Criteria

1. IF a request body is missing a required field or contains a malformed field value, THEN THE API SHALL return HTTP 400 with an error message indicating the name of the invalid field and the reason it was rejected.
2. WHEN a student number contains non-numeric characters or exceeds 20 characters or is fewer than 1 character, THE API SHALL return HTTP 400 with the message "Invalid student number format."
3. IF an unexpected server error occurs, THEN THE API SHALL return HTTP 500 with the message "An unexpected error occurred" and log the full error server-side without exposing stack traces to the client.
4. WHEN a user submits a form, THE Frontend SHALL validate all fields against their constraints and display field-level validation errors inline next to each invalid input without sending the request to the API.
5. WHEN THE API returns HTTP 400 in response to a form submission, THE Frontend SHALL display the field-level error message returned by the API inline next to the relevant input field.

---

### Requirement 15: Responsive and Mobile-First UI

**User Story:** As a student using a phone, I want the seat reservation interface to work well on a small screen, so that I can check and reserve seats on the go.

#### Acceptance Criteria

1. THE Frontend SHALL render the Student Portal (Public Live View, verification flow, seat selection, and Active Session screen) in a mobile-first layout at screen widths from 375px to 1023px such that all content is accessible without horizontal scrolling.
2. THE Frontend SHALL render the Admin Portal (Dashboard, Needs Attention list, Active Sessions table) at screen widths of 1024px and above such that all content is accessible without horizontal scrolling.
3. WHEN the seat grid is rendered on a viewport narrower than 1024px, THE Frontend SHALL ensure each seat box is at minimum 44x44 CSS pixels.
4. IF the Admin Portal is accessed on a viewport narrower than 1024px, THEN THE Frontend SHALL display a notice indicating the portal is optimized for screens 1024px and wider.
