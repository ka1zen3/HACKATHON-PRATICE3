# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Students and library patrons who need a study seat now, and librarians who monitor seat usage and intervene when sessions run long.

## Product Purpose

SeatSync turns a library's physical seats into a live, reservable map. Students time in, claim a seat, and track their session; librarians see every seat in real time, spot sessions that need attention, and release seats when necessary.

## Positioning

One shared live seat map for both sides of the desk: the same vacancy truth a student taps is the operational view the librarian acts on, with a timed grace period and elapsed-session tracking built in.

## Operating Context

Used on campus, often on a phone while walking into the library, and on a desktop at the circulation desk. Students move between the live map, the reserve flow, and an active-session timer. Librarians keep the live monitor open during a shift and use the sessions table for handoff and review.

## Capabilities and Constraints

- Public live seat map with area filtering; seats show vacant, occupied, pending, and overdue states.
- Two-step student time-in: student number, then identity confirmation.
- Seat reservation with confirmation.
- Active session: 15-minute pending grace window, "I'm here" claim, elapsed occupied timer, and time out.
- Admin login, live monitoring, needs-attention list, forced time-out, and an active-sessions table.
- This build ships with realistic local mock data. The backend currently exposes only a health check; API wiring is a later step.

## Brand Commitments

- Product name: SeatSync.
- Visual direction is supplied by design2.md (editorial, warm-paper surface, one electric accent, large radii, no shadows) adapted to green hues, with design1.md's practical shadcn-style controls for the login surface.

## Evidence on Hand

No real seat data, student records, or staff accounts exist yet. All names, seat counts, sessions, and credentials in this build are clearly demo material and must not be presented as live records.

## Product Principles

1. Live truth over decoration: availability is the first thing anyone should see.
2. One vocabulary across student and staff surfaces: a seat means the same thing everywhere.
3. Time is visible: every state that involves waiting or duration shows the clock.
4. Calm urgency: overdue and pending states are clear without alarming the room.
5. The interface disappears into the task; the brand lives in scale, type, and a single green charge.

## Accessibility & Inclusion

Keyboard-operable seat grid and controls, visible focus states, status communicated with text and icon as well as color, and reduced-motion support.
