-- ============================================================
-- SeatSync — full schema
-- Run in Supabase project → SQL editor
--
-- If you see FK type-mismatch errors, the tables already exist
-- with wrong column types from a previous run.
-- The DROP CASCADE block below clears them first.
-- ============================================================

-- ── Drop existing tables (safe re-run) ──────────────────────
drop table if exists public.sessions    cascade;
drop table if exists public.seats       cascade;
drop table if exists public.area_tables cascade;
drop table if exists public.areas       cascade;
drop table if exists public.students    cascade;

-- ── students ────────────────────────────────────────────────
create table if not exists public.students (
  number      text primary key,          -- canonical YY-NNNNN
  name        text not null,
  program     text not null default '',
  year        text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.students enable row level security;
create policy "service role only" on public.students
  as restrictive to public using (false);

-- ── areas (static floor-plan definition) ────────────────────
create table if not exists public.areas (
  id          text primary key,          -- 'reading' | 'thesis' | 'periodicals' | 'carrels'
  name        text not null,
  short       text not null,
  floor       text not null,
  prefix      text not null,
  blurb       text not null default '',
  amenities   text[] not null default '{}',
  cols        int  not null default 4,
  sort_order  int  not null default 0
);

alter table public.areas enable row level security;
create policy "service role only" on public.areas
  as restrictive to public using (false);

-- ── tables (sub-groups within an area) ──────────────────────
create table if not exists public.area_tables (
  id          text primary key,          -- 'A-L1', 'B-T1', etc.
  area_id     text not null references public.areas(id) on delete cascade,
  label       text not null,
  type        text not null,             -- 'long' | 'square' | 'carrel'
  seats       int  not null default 1,
  cols        int  not null default 1,
  sort_order  int  not null default 0
);

alter table public.area_tables enable row level security;
create policy "service role only" on public.area_tables
  as restrictive to public using (false);

-- ── seats ───────────────────────────────────────────────────
create table if not exists public.seats (
  id          text primary key,          -- 'A01', 'B03', etc.
  label       text not null,
  area_id     text not null references public.areas(id),
  table_id    text not null references public.area_tables(id),
  sort_order  int  not null default 0
);

alter table public.seats enable row level security;
create policy "service role only" on public.seats
  as restrictive to public using (false);

-- ── sessions ────────────────────────────────────────────────
-- One row per active session. Released sessions are soft-deleted
-- (status = 'released') so there is a full audit trail.
create table if not exists public.sessions (
  id              text primary key,       -- 'S-A01-<timestamp>'
  seat_id         text not null references public.seats(id),
  area_id         text not null,
  student_number  text not null,
  student_name    text not null,
  status          text not null,          -- 'pending' | 'occupied' | 'overdue' | 'released'
  reserved_at     timestamptz,
  claim_deadline  timestamptz,
  occupied_at     timestamptz,
  due_at          timestamptz,
  released_at     timestamptz,
  released_by_id  bigint references public.staff(id),
  release_reason  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.sessions enable row level security;
create policy "service role only" on public.sessions
  as restrictive to public using (false);

-- ── updated_at trigger (shared) ─────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger students_updated_at before update on public.students
  for each row execute function public.set_updated_at();

create trigger sessions_updated_at before update on public.sessions
  for each row execute function public.set_updated_at();

-- ── seed: areas ─────────────────────────────────────────────
insert into public.areas (id, name, short, floor, prefix, blurb, amenities, cols, sort_order) values
  ('reading',     'Reading & Study Section',          'Reading',     '2nd floor · Area A', 'A', 'Long tables with reading lamps and 4-seater clusters. Quiet conversation allowed.', array['Lamps','Power','Quiet'],           8, 1),
  ('thesis',      'Thesis & Feasibility Section',     'Thesis',      '2nd floor · Area B', 'B', 'Smaller 4-seat tables near the reference shelves. Silence required.',              array['Silent','Reference shelves','Power'], 4, 2),
  ('periodicals', 'Periodicals & Information Section','Periodicals', '2nd floor · Area C', 'C', 'A long reading table in the centre of the room. Walk-in browsing area.',           array['Newspapers','Journals','Natural light'], 8, 3),
  ('carrels',     'Individual Carrels',               'Carrels',     '2nd floor · Area D', 'D', 'Single isolated desks for deep focus. No neighbours, no distractions.',            array['Silent','Single desk','Power'],      4, 4)
on conflict (id) do nothing;

-- ── seed: area_tables ───────────────────────────────────────
insert into public.area_tables (id, area_id, label, type, seats, cols, sort_order) values
  ('A-L1','reading',     'Long Table 1', 'long',   8, 8, 1),
  ('A-L2','reading',     'Long Table 2', 'long',   8, 8, 2),
  ('A-S1','reading',     'Table A',      'square', 4, 2, 3),
  ('A-S2','reading',     'Table B',      'square', 4, 2, 4),
  ('A-S3','reading',     'Table C',      'square', 4, 2, 5),
  ('A-S4','reading',     'Table D',      'square', 4, 2, 6),
  ('B-T1','thesis',      'Table T1',     'square', 4, 2, 1),
  ('B-T2','thesis',      'Table T2',     'square', 4, 2, 2),
  ('B-T3','thesis',      'Table T3',     'square', 4, 2, 3),
  ('B-T4','thesis',      'Table T4',     'square', 4, 2, 4),
  ('C-P1','periodicals', 'Reading Table','long',   8, 8, 1),
  ('D-C1','carrels',     'Carrel 1',     'carrel', 1, 1, 1),
  ('D-C2','carrels',     'Carrel 2',     'carrel', 1, 1, 2),
  ('D-C3','carrels',     'Carrel 3',     'carrel', 1, 1, 3),
  ('D-C4','carrels',     'Carrel 4',     'carrel', 1, 1, 4),
  ('D-C5','carrels',     'Carrel 5',     'carrel', 1, 1, 5),
  ('D-C6','carrels',     'Carrel 6',     'carrel', 1, 1, 6),
  ('D-C7','carrels',     'Carrel 7',     'carrel', 1, 1, 7),
  ('D-C8','carrels',     'Carrel 8',     'carrel', 1, 1, 8)
on conflict (id) do nothing;

-- ── seed: seats ─────────────────────────────────────────────
insert into public.seats (id, label, area_id, table_id, sort_order) values
  -- Area A — Reading (32 seats)
  ('A01','A01','reading','A-L1',1), ('A02','A02','reading','A-L1',2),
  ('A03','A03','reading','A-L1',3), ('A04','A04','reading','A-L1',4),
  ('A05','A05','reading','A-L1',5), ('A06','A06','reading','A-L1',6),
  ('A07','A07','reading','A-L1',7), ('A08','A08','reading','A-L1',8),
  ('A09','A09','reading','A-L2',9), ('A10','A10','reading','A-L2',10),
  ('A11','A11','reading','A-L2',11),('A12','A12','reading','A-L2',12),
  ('A13','A13','reading','A-L2',13),('A14','A14','reading','A-L2',14),
  ('A15','A15','reading','A-L2',15),('A16','A16','reading','A-L2',16),
  ('A17','A17','reading','A-S1',17),('A18','A18','reading','A-S1',18),
  ('A19','A19','reading','A-S1',19),('A20','A20','reading','A-S1',20),
  ('A21','A21','reading','A-S2',21),('A22','A22','reading','A-S2',22),
  ('A23','A23','reading','A-S2',23),('A24','A24','reading','A-S2',24),
  ('A25','A25','reading','A-S3',25),('A26','A26','reading','A-S3',26),
  ('A27','A27','reading','A-S3',27),('A28','A28','reading','A-S3',28),
  ('A29','A29','reading','A-S4',29),('A30','A30','reading','A-S4',30),
  ('A31','A31','reading','A-S4',31),('A32','A32','reading','A-S4',32),
  -- Area B — Thesis (16 seats)
  ('B01','B01','thesis','B-T1',1), ('B02','B02','thesis','B-T1',2),
  ('B03','B03','thesis','B-T1',3), ('B04','B04','thesis','B-T1',4),
  ('B05','B05','thesis','B-T2',5), ('B06','B06','thesis','B-T2',6),
  ('B07','B07','thesis','B-T2',7), ('B08','B08','thesis','B-T2',8),
  ('B09','B09','thesis','B-T3',9), ('B10','B10','thesis','B-T3',10),
  ('B11','B11','thesis','B-T3',11),('B12','B12','thesis','B-T3',12),
  ('B13','B13','thesis','B-T4',13),('B14','B14','thesis','B-T4',14),
  ('B15','B15','thesis','B-T4',15),('B16','B16','thesis','B-T4',16),
  -- Area C — Periodicals (8 seats)
  ('C01','C01','periodicals','C-P1',1),('C02','C02','periodicals','C-P1',2),
  ('C03','C03','periodicals','C-P1',3),('C04','C04','periodicals','C-P1',4),
  ('C05','C05','periodicals','C-P1',5),('C06','C06','periodicals','C-P1',6),
  ('C07','C07','periodicals','C-P1',7),('C08','C08','periodicals','C-P1',8),
  -- Area D — Carrels (8 seats)
  ('D01','D01','carrels','D-C1',1),('D02','D02','carrels','D-C2',2),
  ('D03','D03','carrels','D-C3',3),('D04','D04','carrels','D-C4',4),
  ('D05','D05','carrels','D-C5',5),('D06','D06','carrels','D-C6',6),
  ('D07','D07','carrels','D-C7',7),('D08','D08','carrels','D-C8',8)
on conflict (id) do nothing;

-- ── seed: demo students ──────────────────────────────────────
insert into public.students (number, name, program, year) values
  ('24-00457', 'Alex Rivera',   'BS Information Systems',    '2nd year'),
  ('24-00123', 'Maya Reyes',    'BS Computer Science',       '3rd year'),
  ('23-00871', 'Daniel Cruz',   'BS Architecture',           '4th year'),
  ('22-01456', 'Sam Ortega',    'BA Communication',          '5th year'),
  ('25-00311', 'Liza Tan',      'BS Biology',                '1st year'),
  ('23-00174', 'Jordan Santos', 'BS Computer Engineering',   '3rd year'),
  ('23-00412', 'Noah Lim',      'BS Information Technology', '3rd year'),
  ('24-00618', 'Iris Bautista', 'BS Accountancy',            '2nd year'),
  ('22-00225', 'Rafael Cruz',   'BS Civil Engineering',      '5th year'),
  ('23-00733', 'Ava Santos',    'BA Psychology',             '3rd year'),
  ('25-00642', 'Miguel Reyes',  'BS Computer Science',       '1st year'),
  ('24-00903', 'Ella Garcia',   'BS Nursing',                '2nd year'),
  ('25-00118', 'Bea Ramos',     'BS Biology',                '1st year'),
  ('24-00999', 'Team Hive',     'BS Information Systems',    '2nd year'),
  ('25-00744', 'Kai Delos Santos','BS Architecture',         '1st year'),
  ('24-00381', 'Mika Alvarez',  'BA Communication',          '2nd year'),
  ('23-00595', 'Jules Mendoza', 'BS Computer Engineering',   '3rd year'),
  ('24-00815', 'Paolo Reyes',   'BS Information Technology', '2nd year'),
  ('22-00467', 'Tessa Lim',     'BS Accountancy',            '5th year'),
  ('25-00290', 'Nico Tan',      'BS Civil Engineering',      '1st year')
on conflict (number) do update
  set name = excluded.name, program = excluded.program, year = excluded.year;
