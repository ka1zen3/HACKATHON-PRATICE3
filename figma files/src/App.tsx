import { useEffect, useMemo, useState, type ReactNode } from "react";

type StudentScreen = "home" | "area" | "verify" | "select" | "active";
type AdminScreen = "login" | "dashboard" | "sessions";
type SeatStatus = "vacant" | "occupied" | "pending" | "overdue";

type Seat = {
  id: string;
  status: SeatStatus;
  duration?: string;
  student?: string;
  timeIn?: string;
};

const areas = [
  {
    name: "Main Library",
    detail: "Ground floor · Quiet zone",
    vacant: 12,
    total: 30,
    icon: "books",
  },
  { name: "Study Hall", detail: "Second floor · Group study", vacant: 8, total: 20, icon: "users" },
  { name: "Reading Room", detail: "Third floor · Silent zone", vacant: 6, total: 16, icon: "lamp" },
];

const seatStatuses: SeatStatus[] = [
  "occupied",
  "vacant",
  "vacant",
  "occupied",
  "vacant",
  "pending",
  "vacant",
  "occupied",
  "vacant",
  "vacant",
  "occupied",
  "vacant",
  "vacant",
  "vacant",
  "occupied",
  "vacant",
  "pending",
  "occupied",
  "occupied",
  "vacant",
  "vacant",
  "occupied",
  "vacant",
  "vacant",
  "vacant",
  "occupied",
  "vacant",
  "vacant",
  "occupied",
  "vacant",
];

const baseSeats: Seat[] = seatStatuses.map((status, index) => ({
  id: `${String.fromCharCode(65 + Math.floor(index / 6))}${(index % 6) + 1}`,
  status,
  duration: status === "occupied" ? ["24m", "1h 20m", "48m", "2h 06m"][index % 4] : undefined,
}));

const adminSeats: Seat[] = baseSeats.map((seat, index) => ({
  ...seat,
  status: [3, 10, 20].includes(index) ? "overdue" : seat.status,
  student: ["Jamie Cruz", "Mika Santos", "Alex Rivera", "Sam Lee"][index % 4],
  timeIn: ["08:14 AM", "09:05 AM", "10:22 AM"][index % 3],
}));

const adminSessions = [
  {
    seat: "A4",
    student: "Jamie Cruz",
    number: "2024-01842",
    status: "overdue" as SeatStatus,
    time: "8:14 AM",
    duration: "2h 46m",
  },
  {
    seat: "B5",
    student: "Mika Santos",
    number: "2023-10421",
    status: "overdue" as SeatStatus,
    time: "9:05 AM",
    duration: "1h 55m",
  },
  {
    seat: "D3",
    student: "Alex Rivera",
    number: "2024-02581",
    status: "occupied" as SeatStatus,
    time: "10:22 AM",
    duration: "38m",
  },
  {
    seat: "A1",
    student: "Sam Lee",
    number: "2022-03149",
    status: "occupied" as SeatStatus,
    time: "10:31 AM",
    duration: "29m",
  },
  {
    seat: "C5",
    student: "Bea Lim",
    number: "2024-01602",
    status: "pending" as SeatStatus,
    time: "10:47 AM",
    duration: "13m",
  },
];

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
    arrow: (
      <>
        <path d="m9 18 6-6-6-6" />
      </>
    ),
    back: (
      <>
        <path d="m15 18-6-6 6-6" />
      </>
    ),
    chair: (
      <>
        <path d="M7 12V5a2 2 0 0 1 4 0v7M11 7h4a2 2 0 0 1 2 2v4H7" />
        <path d="M5 13h14v4H5zM7 17v3M17 17v3" />
      </>
    ),
    books: (
      <>
        <path d="M4 19V5M8 19V5M12 19V7M16 19 14 6l4-1 2 13z" />
        <path d="M3 19h18" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 19v-2a6 6 0 0 1 12 0v2M16 4a3 3 0 0 1 0 6M17 13a5 5 0 0 1 4 5v1" />
      </>
    ),
    lamp: (
      <>
        <path d="M9 4h6l3 8H6zM12 12v7M8 20h8" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    list: (
      <>
        <path d="M9 6h11M9 12h11M9 18h11" />
        <circle cx="4" cy="6" r="1" />
        <circle cx="4" cy="12" r="1" />
        <circle cx="4" cy="18" r="1" />
      </>
    ),
    logout: (
      <>
        <path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" />
      </>
    ),
    alert: (
      <>
        <path d="M12 3 2.5 20h19z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7h-5V2" />
        <path d="M20 7a9 9 0 1 0 1 8" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}

function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className={`logo ${light ? "logo-light" : ""}`}>
      <span>
        <Icon name="chair" size={19} />
      </span>
      <strong>SeatSync</strong>
    </div>
  );
}

function Toast({ toast }: { toast: { type: "success" | "error"; message: string } | null }) {
  if (!toast) return null;
  return (
    <div className={`toast toast-${toast.type}`}>
      <span>
        <Icon name={toast.type === "success" ? "check" : "alert"} size={17} />
      </span>
      {toast.message}
    </div>
  );
}

function SeatGrid({
  mode,
  selected,
  onSelect,
}: {
  mode: "live" | "select" | "admin";
  selected?: string;
  onSelect?: (seat: Seat) => void;
}) {
  const seats = mode === "admin" ? adminSeats : baseSeats;
  return (
    <div className={`seat-grid ${mode === "admin" ? "admin-grid" : ""}`}>
      {seats.map((seat) => {
        const disabled = mode === "select" && seat.status !== "vacant";
        return (
          <button
            key={seat.id}
            disabled={disabled}
            className={`seat seat-${seat.status} ${selected === seat.id ? "seat-selected" : ""}`}
            onClick={() => onSelect?.(seat)}
            aria-label={`${seat.id}, ${seat.status}`}
          >
            {seat.id}
          </button>
        );
      })}
    </div>
  );
}

function Legend({ admin = false }: { admin?: boolean }) {
  return (
    <div className="legend">
      <span>
        <i className="dot vacant" />
        Vacant
      </span>
      <span>
        <i className="dot occupied" />
        Occupied
      </span>
      <span>
        <i className="dot pending" />
        Pending
      </span>
      {admin && (
        <span>
          <i className="dot overdue" />
          Overdue
        </span>
      )}
    </div>
  );
}

function StudentHeader({
  title,
  onBack,
  onAdmin,
}: {
  title?: string;
  onBack?: () => void;
  onAdmin?: () => void;
}) {
  return (
    <header className="mobile-header">
      {onBack ? (
        <button className="icon-button" onClick={onBack}>
          <Icon name="back" />
        </button>
      ) : (
        <Logo />
      )}
      {title && <strong className="header-title">{title}</strong>}
      {onBack ? (
        <div className="header-spacer" />
      ) : (
        <button className="admin-link" onClick={onAdmin}>
          Admin
        </button>
      )}
    </header>
  );
}

function SkeletonHome() {
  return (
    <div className="skeleton-wrap">
      <div className="skeleton skeleton-input" />
      <div className="skeleton-chips">
        <i />
        <i />
        <i />
      </div>
      {[1, 2, 3].map((i) => (
        <div className="skeleton skeleton-card" key={i} />
      ))}
    </div>
  );
}

function LiveHome({
  goArea,
  reserve,
  goAdmin,
  toast,
}: {
  goArea: (name: string) => void;
  reserve: () => void;
  goAdmin: () => void;
  toast: (type: "success" | "error", message: string) => void;
}) {
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(timer);
  }, []);

  const filtered = areas.filter(
    (a) =>
      (filter === "All" || a.name === filter) && a.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="student-shell with-cta">
      <StudentHeader onAdmin={goAdmin} />
      <main>
        <div className="eyebrow">
          <span className="live-dot" />
          Live availability
        </div>
        <h1>Find your seat</h1>
        <p className="subhead">See what's open before you arrive.</p>
        {loading ? (
          <SkeletonHome />
        ) : (
          <>
            <label className="search">
              <Icon name="search" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search an area..."
              />
            </label>
            <div className="chips" aria-label="Filter by area">
              {["All", ...areas.map((a) => a.name)].map((item) => (
                <button
                  key={item}
                  className={filter === item ? "active" : ""}
                  onClick={() => setFilter(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="section-heading">
              <h2>Library areas</h2>
              <span>Updated just now</span>
            </div>
            {filtered.length ? (
              <div className="area-list">
                {filtered.map((area) => (
                  <button className="area-card" key={area.name} onClick={() => goArea(area.name)}>
                    <div className="area-icon">
                      <Icon name={area.icon} />
                    </div>
                    <div className="area-copy">
                      <div>
                        <h3>{area.name}</h3>
                        <Icon name="arrow" size={18} />
                      </div>
                      <p>{area.detail}</p>
                      <div className="availability">
                        <span>
                          <b>{area.vacant}</b> of {area.total} seats vacant
                        </span>
                        <strong>{Math.round((area.vacant / area.total) * 100)}%</strong>
                      </div>
                      <div className="progress">
                        <i style={{ width: `${(area.vacant / area.total) * 100}%` }} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div>
                  <Icon name="search" size={25} />
                </div>
                <h3>No areas found</h3>
                <p>Try another search or filter.</p>
                <button
                  onClick={() => {
                    setQuery("");
                    setFilter("All");
                    toast("success", "Filters cleared");
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </>
        )}
      </main>
      <div className="bottom-cta">
        <button className="button primary large" onClick={reserve}>
          <Icon name="clock" />
          Time-In / Reserve a Seat
        </button>
      </div>
    </div>
  );
}

function AreaView({
  area,
  back,
  reserve,
}: {
  area: string;
  back: () => void;
  reserve: () => void;
}) {
  const [popover, setPopover] = useState<Seat | null>(null);
  return (
    <div className="student-shell area-shell with-cta">
      <StudentHeader title={area} onBack={back} />
      <main>
        <div className="area-summary">
          <div>
            <span>Available now</span>
            <strong>
              12 <small>/ 30 seats</small>
            </strong>
          </div>
          <div className="pulse-orbit">
            <i />
          </div>
        </div>
        <div className="map-heading">
          <div>
            <h2>Seat map</h2>
            <p>Tap an occupied seat for details.</p>
          </div>
          <button className="icon-button">
            <Icon name="refresh" size={18} />
          </button>
        </div>
        <Legend />
        <div className="seat-map-card">
          <div className="window-label">
            <span />
            WINDOW
            <span />
          </div>
          <SeatGrid
            mode="live"
            onSelect={(seat) => (seat.status === "occupied" ? setPopover(seat) : undefined)}
          />
          <div className="entrance">ENTRANCE</div>
        </div>
      </main>
      {popover && (
        <div className="seat-popover">
          <button onClick={() => setPopover(null)}>
            <Icon name="close" size={16} />
          </button>
          <span>{popover.id}</span>
          <div>
            <strong>Currently occupied</strong>
            <p>Occupied for {popover.duration}</p>
          </div>
        </div>
      )}
      <div className="bottom-cta">
        <button className="button primary large" onClick={reserve}>
          Time-In / Reserve a Seat
        </button>
      </div>
    </div>
  );
}

function Verify({
  back,
  next,
  notify,
}: {
  back: () => void;
  next: () => void;
  notify: (type: "success" | "error", message: string) => void;
}) {
  const [number, setNumber] = useState("");
  const [found, setFound] = useState(false);
  const submit = () => {
    if (number.replace(/\D/g, "").length < 6)
      return notify("error", "Enter a valid student number");
    setFound(true);
  };
  return (
    <div className="student-shell soft-bg">
      <StudentHeader title="Verify identity" onBack={back} />
      <main className="centered-main">
        <div className="stepper">
          <i className="current" />
          <i />
          <i />
          <span>Step 1 of 3</span>
        </div>
        {!found ? (
          <div className="verify-card">
            <div className="verify-icon">
              <Icon name="users" size={25} />
            </div>
            <h1>Let's find you</h1>
            <p>Enter your student number to continue.</p>
            <label className="field">
              <span>Student number</span>
              <input
                autoFocus
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="e.g. 2024-01842"
              />
            </label>
            <button className="button primary" onClick={submit}>
              Continue <Icon name="arrow" size={17} />
            </button>
            <small>Your information is used only to verify your library access.</small>
          </div>
        ) : (
          <div className="verify-card identity-card">
            <div className="verify-icon success">
              <Icon name="check" size={27} />
            </div>
            <h1>Is this you?</h1>
            <p>Check your details before continuing.</p>
            <div className="person">
              <div>JC</div>
              <span>
                <strong>Jamie Cruz</strong>
                <small>Student</small>
              </span>
            </div>
            <dl>
              <div>
                <dt>Student number</dt>
                <dd>{number}</dd>
              </div>
              <div>
                <dt>Program</dt>
                <dd>BS Information Technology</dd>
              </div>
            </dl>
            <button className="button primary" onClick={next}>
              <Icon name="check" size={17} />
              Yes, this is me
            </button>
            <button className="button ghost" onClick={() => setFound(false)}>
              Back
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function SelectSeat({ back, confirm }: { back: () => void; confirm: (seat: string) => void }) {
  const [selected, setSelected] = useState<string>();
  return (
    <div className={`student-shell ${selected ? "sheet-open" : ""}`}>
      <StudentHeader title="Select a seat" onBack={back} />
      <main>
        <div className="stepper compact">
          <i />
          <i className="current" />
          <i />
          <span>Step 2 of 3</span>
        </div>
        <div className="select-title">
          <h1>Main Library</h1>
          <p>Choose any available seat.</p>
        </div>
        <Legend />
        <div className="seat-map-card">
          <div className="window-label">
            <span />
            WINDOW
            <span />
          </div>
          <SeatGrid mode="select" selected={selected} onSelect={(seat) => setSelected(seat.id)} />
          <div className="entrance">ENTRANCE</div>
        </div>
        <p className="hint">
          <Icon name="check" size={15} /> Only green seats can be selected
        </p>
      </main>
      {selected && (
        <>
          <div className="sheet-scrim" onClick={() => setSelected(undefined)} />
          <div className="bottom-sheet">
            <i className="handle" />
            <div className="sheet-seat">{selected}</div>
            <div className="sheet-copy">
              <span>Confirm your seat</span>
              <h2>Reserve Seat {selected}?</h2>
              <p>Main Library · Ground floor</p>
            </div>
            <button className="button primary large" onClick={() => confirm(selected)}>
              Confirm reservation
            </button>
            <button className="button ghost" onClick={() => setSelected(undefined)}>
              Choose another seat
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function TimerRing({ seconds }: { seconds: number }) {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  const progress = (seconds / 900) * 283;
  return (
    <div className="timer-ring">
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" />
        <circle
          className="ring-progress"
          cx="50"
          cy="50"
          r="45"
          style={{ strokeDashoffset: 283 - progress }}
        />
      </svg>
      <div>
        <strong>
          {mins}:{secs}
        </strong>
        <span>to check in</span>
      </div>
    </div>
  );
}

function ActiveSession({
  home,
  notify,
  seat,
}: {
  home: () => void;
  notify: (type: "success" | "error", message: string) => void;
  seat: string;
}) {
  const [status, setStatus] = useState<"pending" | "occupied">("pending");
  const [seconds, setSeconds] = useState(900);
  const [elapsed, setElapsed] = useState(2530);
  const [dialog, setDialog] = useState(false);
  useEffect(() => {
    const timer = setInterval(
      () =>
        status === "pending" ? setSeconds((s) => Math.max(0, s - 1)) : setElapsed((s) => s + 1),
      1000,
    );
    return () => clearInterval(timer);
  }, [status]);
  const time = `${String(Math.floor(elapsed / 3600)).padStart(2, "0")}:${String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  return (
    <div className="student-shell active-shell">
      <StudentHeader title="Active session" onBack={home} />
      <main>
        <div className="stepper compact complete">
          <i />
          <i />
          <i className="current" />
          <span>Step 3 of 3</span>
        </div>
        <div className="session-card">
          <div className={`status-pill ${status}`}>
            <i />
            {status === "pending" ? "Pending check-in" : "Session active"}
          </div>
          <p>Your seat</p>
          <div className="seat-name">{seat}</div>
          <h2>Main Library</h2>
          <span>Ground floor · Quiet zone</span>
          <div className="divider" />
          {status === "pending" ? (
            <>
              <TimerRing seconds={seconds} />
              <h3>Are you at your seat?</h3>
              <p className="helper">
                Check in before the timer ends or your reservation will be released.
              </p>
              <button
                className="button primary large"
                onClick={() => {
                  setStatus("occupied");
                  notify("success", `You’re checked in at Seat ${seat}`);
                }}
              >
                <Icon name="check" />
                I'm here
              </button>
            </>
          ) : (
            <>
              <div className="elapsed">
                <span>Time in</span>
                <strong>{time}</strong>
                <small>Started today at 10:18 AM</small>
              </div>
              <div className="session-note">
                <Icon name="clock" />
                <p>
                  <strong>Leaving the library?</strong>
                  <br />
                  Remember to time out so others can use this seat.
                </p>
              </div>
              <button className="button danger large" onClick={() => setDialog(true)}>
                Time Out
              </button>
            </>
          )}
        </div>
      </main>
      {dialog && (
        <ConfirmDialog
          title={`Time out from Seat ${seat}?`}
          body="This will end your current session and make the seat available to other students."
          action="Yes, time out"
          onCancel={() => setDialog(false)}
          onConfirm={() => {
            setDialog(false);
            notify("success", "Session ended successfully");
            home();
          }}
        />
      )}
    </div>
  );
}

function ConfirmDialog({
  title,
  body,
  action,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  action: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="dialog-backdrop">
      <div className="dialog">
        <div className="dialog-icon">
          <Icon name="alert" size={24} />
        </div>
        <h2>{title}</h2>
        <p>{body}</p>
        <div>
          <button className="button ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="button danger" onClick={onConfirm}>
            {action}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminSidebar({
  screen,
  navigate,
  logout,
}: {
  screen: AdminScreen;
  navigate: (s: AdminScreen) => void;
  logout: () => void;
}) {
  return (
    <aside className="admin-sidebar">
      <Logo light />
      <nav>
        <span>Workspace</span>
        <button
          className={screen === "dashboard" ? "active" : ""}
          onClick={() => navigate("dashboard")}
        >
          <Icon name="dashboard" />
          Dashboard
        </button>
        <button
          className={screen === "sessions" ? "active" : ""}
          onClick={() => navigate("sessions")}
        >
          <Icon name="list" />
          Active Sessions <b>5</b>
        </button>
      </nav>
      <div className="admin-user">
        <div>AD</div>
        <span>
          <strong>Admin User</strong>
          <small>Library staff</small>
        </span>
        <button onClick={logout}>
          <Icon name="logout" />
        </button>
      </div>
    </aside>
  );
}

function AdminLogin({ login, student }: { login: () => void; student: () => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="login-page">
      <div className="login-brand">
        <Logo light />
        <div>
          <span>LIBRARY OPERATIONS</span>
          <h1>
            Better spaces.
            <br />
            Smarter <em>seating.</em>
          </h1>
          <p>
            Monitor library capacity, manage active sessions, and keep every seat working for your
            students.
          </p>
        </div>
        <small>© 2025 SeatSync · School Library System</small>
      </div>
      <div className="login-panel">
        <button className="back-student" onClick={student}>
          <Icon name="back" size={17} />
          Back to student view
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            login();
          }}
        >
          <div className="secure">
            <Icon name="chair" size={24} />
          </div>
          <span>ADMIN PORTAL</span>
          <h2>Welcome back</h2>
          <p>Sign in to manage your library.</p>
          <label className="field">
            <span>Username</span>
            <input required defaultValue="admin" placeholder="Enter your username" />
          </label>
          <label className="field password">
            <span>Password</span>
            <input
              required
              type={show ? "text" : "password"}
              defaultValue="seatsync"
              placeholder="Enter your password"
            />
            <button type="button" onClick={() => setShow(!show)}>
              <Icon name="eye" size={18} />
            </button>
          </label>
          <div className="remember">
            <label>
              <input type="checkbox" /> Remember me
            </label>
            <button type="button">Forgot password?</button>
          </div>
          <button className="button primary large">
            Sign in to dashboard <Icon name="arrow" size={17} />
          </button>
          <small>Demo credentials are pre-filled.</small>
        </form>
      </div>
    </div>
  );
}

function AdminLayout({
  screen,
  navigate,
  logout,
  children,
}: {
  screen: AdminScreen;
  navigate: (s: AdminScreen) => void;
  logout: () => void;
  children: ReactNode;
}) {
  return (
    <div className="admin-layout">
      <AdminSidebar screen={screen} navigate={navigate} logout={logout} />
      <section className="admin-content">{children}</section>
    </div>
  );
}

function AdminHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="admin-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="admin-actions">
        <button className="refresh-button">
          <Icon name="refresh" size={16} />
          Refresh
        </button>
        <span className="sync-status">
          <i />
          Live · updated just now
        </span>
        <div className="avatar">AD</div>
      </div>
    </header>
  );
}

function AdminDashboard({
  navigate,
  notify,
}: {
  navigate: (s: AdminScreen) => void;
  notify: (type: "success" | "error", message: string) => void;
}) {
  const [overdue, setOverdue] = useState(adminSessions.filter((s) => s.status === "overdue"));
  const [dialog, setDialog] = useState<(typeof adminSessions)[number] | null>(null);
  const stats = [
    { label: "Vacant", value: 26, status: "vacant", detail: "of 66 total seats" },
    { label: "Pending", value: 2, status: "pending", detail: "awaiting check-in" },
    { label: "Occupied", value: 35, status: "occupied", detail: "53% capacity" },
    { label: "Overdue", value: overdue.length, status: "overdue", detail: "needs attention" },
  ];
  return (
    <AdminLayout screen="dashboard" navigate={navigate} logout={() => navigate("login")}>
      <AdminHeader
        title="Good morning, Admin"
        subtitle="Here’s what’s happening across the library today."
      />
      <main className="admin-main">
        <div className="stats-grid">
          {stats.map((stat) => (
            <div className={`stat-card ${stat.status}`} key={stat.label}>
              <div className="stat-top">
                <span>{stat.label}</span>
                <i>
                  <Icon
                    name={
                      stat.status === "overdue"
                        ? "alert"
                        : stat.status === "vacant"
                          ? "check"
                          : "clock"
                    }
                    size={18}
                  />
                </i>
              </div>
              <strong>{stat.value}</strong>
              <small>{stat.detail}</small>
            </div>
          ))}
        </div>
        <section className="attention-panel">
          <div className="panel-header">
            <div>
              <span className="panel-icon">
                <Icon name="alert" size={19} />
              </span>
              <span>
                <h2>Needs attention</h2>
                <p>Sessions that have exceeded the allowed duration.</p>
              </span>
            </div>
            <b>{overdue.length} overdue</b>
          </div>
          {overdue.length ? (
            <div className="attention-list">
              {overdue.map((item) => (
                <div className="attention-row" key={item.seat}>
                  <span className="seat-badge">{item.seat}</span>
                  <div>
                    <strong>{item.student}</strong>
                    <small>{item.number}</small>
                  </div>
                  <span className="area-column">
                    Main Library<small>Ground floor</small>
                  </span>
                  <strong className="overdue-time">
                    {item.duration}
                    <small>overdue by 46 min</small>
                  </strong>
                  <button className="button outline-danger" onClick={() => setDialog(item)}>
                    Force Time-Out
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-admin">
              <div>
                <Icon name="check" />
              </div>
              <span>
                <strong>All caught up</strong>
                <small>No overdue sessions need attention.</small>
              </span>
            </div>
          )}
        </section>
        <section className="map-panel">
          <div className="panel-header">
            <div>
              <span>
                <h2>Live seat map</h2>
                <p>Main Library · Ground floor</p>
              </span>
            </div>
            <button>
              View all areas <Icon name="arrow" size={16} />
            </button>
          </div>
          <Legend admin />
          <div className="admin-map-wrap">
            <div className="admin-map">
              <div className="window-label">
                <span />
                WINDOW
                <span />
              </div>
              <SeatGrid mode="admin" />
              <div className="entrance">ENTRANCE</div>
            </div>
            <div className="map-summary">
              <span>
                <i className="vacant" />
                Vacant<strong>12</strong>
              </span>
              <span>
                <i className="occupied" />
                Occupied<strong>14</strong>
              </span>
              <span>
                <i className="pending" />
                Pending<strong>1</strong>
              </span>
              <span>
                <i className="overdue" />
                Overdue<strong>{overdue.length}</strong>
              </span>
              <hr />
              <p>
                <i /> Updates automatically
              </p>
            </div>
          </div>
        </section>
      </main>
      {dialog && (
        <ConfirmDialog
          title={`Force time-out Seat ${dialog.seat}?`}
          body={`${dialog.student}'s session will end immediately and the seat will become available.`}
          action="Force time-out"
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            setOverdue((items) => items.filter((i) => i.seat !== dialog.seat));
            setDialog(null);
            notify("success", "Session ended and seat released");
          }}
        />
      )}
    </AdminLayout>
  );
}

function ActiveSessions({
  navigate,
  notify,
}: {
  navigate: (s: AdminScreen) => void;
  notify: (type: "success" | "error", message: string) => void;
}) {
  const [sessions, setSessions] = useState(adminSessions);
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<(typeof adminSessions)[number] | null>(null);
  const filtered = useMemo(
    () =>
      sessions.filter((s) =>
        `${s.seat} ${s.student} ${s.number}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [sessions, query],
  );
  return (
    <AdminLayout screen="sessions" navigate={navigate} logout={() => navigate("login")}>
      <AdminHeader
        title="Active Sessions"
        subtitle="Monitor and manage students currently using library seats."
      />
      <main className="admin-main">
        <section className="table-panel">
          <div className="table-tools">
            <label className="search admin-search">
              <Icon name="search" size={18} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search seat or student..."
              />
            </label>
            <div>
              <button className="filter active">
                All <b>{sessions.length}</b>
              </button>
              <button className="filter">Occupied</button>
              <button className="filter">Pending</button>
              <button className="filter">Overdue</button>
            </div>
          </div>
          {filtered.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Seat</th>
                    <th>Student</th>
                    <th>Status</th>
                    <th>Time-in</th>
                    <th>Duration</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.seat}>
                      <td>
                        <span className="seat-badge">{item.seat}</span>
                      </td>
                      <td>
                        <strong>{item.student}</strong>
                        <small>{item.number}</small>
                      </td>
                      <td>
                        <span className={`table-status ${item.status}`}>
                          <i />
                          {item.status}
                        </span>
                      </td>
                      <td>{item.time}</td>
                      <td>
                        <strong className={item.status === "overdue" ? "red-text" : ""}>
                          {item.duration}
                        </strong>
                      </td>
                      <td>
                        <button
                          className="button outline-danger small"
                          onClick={() => setDialog(item)}
                        >
                          Force Time-Out
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state table-empty">
              <div>
                <Icon name="search" />
              </div>
              <h3>No sessions found</h3>
              <p>No active sessions match “{query}”.</p>
              <button onClick={() => setQuery("")}>Clear search</button>
            </div>
          )}
          <footer className="table-footer">
            Showing {filtered.length} of {sessions.length} active sessions{" "}
            <span>Updated just now</span>
          </footer>
        </section>
      </main>
      {dialog && (
        <ConfirmDialog
          title={`Force time-out Seat ${dialog.seat}?`}
          body={`${dialog.student}'s session will end immediately. This action cannot be undone.`}
          action="Force time-out"
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            setSessions((items) => items.filter((i) => i.seat !== dialog.seat));
            setDialog(null);
            notify("success", `${dialog.student} was timed out`);
          }}
        />
      )}
    </AdminLayout>
  );
}

export default function App() {
  const [studentScreen, setStudentScreen] = useState<StudentScreen>("home");
  const [adminScreen, setAdminScreen] = useState<AdminScreen | null>(null);
  const [area, setArea] = useState("Main Library");
  const [selectedSeat, setSelectedSeat] = useState("B4");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const notify = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3200);
  };
  const studentHome = () => {
    setAdminScreen(null);
    setStudentScreen("home");
  };
  return (
    <>
      {adminScreen === "login" && (
        <AdminLogin login={() => setAdminScreen("dashboard")} student={studentHome} />
      )}
      {adminScreen === "dashboard" && <AdminDashboard navigate={setAdminScreen} notify={notify} />}
      {adminScreen === "sessions" && <ActiveSessions navigate={setAdminScreen} notify={notify} />}
      {!adminScreen && studentScreen === "home" && (
        <LiveHome
          goArea={(name) => {
            setArea(name);
            setStudentScreen("area");
          }}
          reserve={() => setStudentScreen("verify")}
          goAdmin={() => setAdminScreen("login")}
          toast={notify}
        />
      )}
      {!adminScreen && studentScreen === "area" && (
        <AreaView
          area={area}
          back={() => setStudentScreen("home")}
          reserve={() => setStudentScreen("verify")}
        />
      )}
      {!adminScreen && studentScreen === "verify" && (
        <Verify
          back={() => setStudentScreen("home")}
          next={() => setStudentScreen("select")}
          notify={notify}
        />
      )}
      {!adminScreen && studentScreen === "select" && (
        <SelectSeat
          back={() => setStudentScreen("verify")}
          confirm={(seat) => {
            setSelectedSeat(seat);
            setStudentScreen("active");
            notify("success", `Seat ${seat} reserved for 15 minutes`);
          }}
        />
      )}
      {!adminScreen && studentScreen === "active" && (
        <ActiveSession home={studentHome} notify={notify} seat={selectedSeat} />
      )}
      <Toast toast={toast} />
    </>
  );
}
