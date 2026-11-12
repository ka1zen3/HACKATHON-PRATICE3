[SeatSync Web App]
│
├── 🌐 PUBLIC ROUTES (No Auth Required)
│   ├── / (Home)
│   │   ├── Area Selector / Search Filter
│   │   ├── Live Seat Grid (View Only)
│   │   │   ├── 🟩 Vacant
│   │   │   └── 🟥 Occupied (Tap shows: "Occupied for 1h 20m")
│   │   └── CTA: [ Time-In / Reserve a Seat ]
│   │
│   └── /login (Triggered by CTA)
│       ├── Step 1: Input Student Number
│       └── Step 2: Confirmation ("Is this you, [Name]?")
│
├── 🎓 STUDENT ROUTES (Session / Student ID Context)
│   ├── /reserve
│   │   └── Interactive Seat Grid (Click a Green Box to Reserve)
│   │       └── Modal: "Confirm Reservation for Seat [X]?"
│   │
│   └── /session
│       ├── Active Timer (Pending: 15-min countdown)
│       ├── "I'm Here" Button (Moves Pending -> Occupied)
│       ├── Elapsed Timer (Occupied state)
│       └── [ Time Out ] Button (Releases Seat)
│
└── 🛡️ ADMIN / LIBRARIAN ROUTES (JWT Protected)
    ├── /admin/login (Username & Password)
    ├── /admin/dashboard
    │   ├── "Needs Attention" List (Overdue seats & minutes)
    │   ├── Live Monitoring Grid (Same as student, plus Overdue state)
    │   └── Force Time-Out / Vacate Button (With Confirm Modal)
    │
    └── /admin/sessions (Data Table)
        └── Active Sessions (Seat, Student, Status, Started At, Duration)