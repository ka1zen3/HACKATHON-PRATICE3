/**
 * AdminStudents — bulk student import + live roster page.
 *
 * Import methods:
 *   1. Paste CSV text directly
 *   2. Upload a .csv file
 *
 * Expected CSV columns (header row required):
 *   number, name, program, year
 *
 * Roster shows all students with:
 *   - Search by name or student number
 *   - Live "currently seated" badge if the student has an active session
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  RiUploadLine,
  RiUserAddLine,
  RiCheckLine,
  RiAlertLine,
  RiDeleteBinLine,
  RiDownloadLine,
  RiTeamLine,
  RiCloseLine,
  RiSearchLine,
  RiArmchairLine,
} from 'react-icons/ri'
import { AdminLayout }  from '../../components/AdminLayout.jsx'
import { Button }       from '../../components/Button.jsx'
import { StatusPill }   from '../../components/StatusPill.jsx'
import { useApp }       from '../../context/useApp.js'
import { useAdminApi }  from '../../hooks/useAdminApi.js'
import { normalizeStudentNumber } from '../../data/mockData.js'

/* ── CSV parsing ───────────────────────────────────────────── */
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return { rows: [], errors: ['CSV must have a header row and at least one data row.'] }

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const required = ['number', 'name']
  const missing = required.filter((r) => !header.includes(r))
  if (missing.length) {
    return { rows: [], errors: [`Missing required columns: ${missing.join(', ')}. Got: ${header.join(', ')}`] }
  }

  const idx = {
    number:  header.indexOf('number'),
    name:    header.indexOf('name'),
    program: header.indexOf('program'),
    year:    header.indexOf('year'),
  }

  const rows = []
  const errors = []

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map((c) => c.trim())
    const rawNumber = cells[idx.number] ?? ''
    const name      = cells[idx.name]    ?? ''
    const program   = idx.program >= 0 ? (cells[idx.program] ?? '') : ''
    const year      = idx.year    >= 0 ? (cells[idx.year]    ?? '') : ''

    const number = normalizeStudentNumber(rawNumber)
    if (!number || !/^\d{2}-\d{5}$/.test(number)) {
      errors.push(`Row ${i + 1}: "${rawNumber}" is not a valid student number (expected YY-NNNNN).`)
      continue
    }
    if (!name) {
      errors.push(`Row ${i + 1}: name is empty.`)
      continue
    }

    rows.push({ number, name, program, year })
  }

  return { rows, errors }
}

/* ── Preview table ─────────────────────────────────────────── */
function PreviewTable({ rows, onRemove }) {
  return (
    <div className="overflow-x-auto rounded-card border border-ash">
      <table className="w-full min-w-[560px] text-left">
        <thead className="border-b border-ash bg-parchment">
          <tr className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
            <th className="py-2.5 pl-4 pr-3">Number</th>
            <th className="px-3 py-2.5">Name</th>
            <th className="px-3 py-2.5">Program</th>
            <th className="px-3 py-2.5">Year</th>
            <th className="py-2.5 pl-3 pr-4" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-ash/50 text-[13px] last:border-0 hover:bg-parchment/40">
              <td className="numeric py-2.5 pl-4 pr-3 font-semibold">{row.number}</td>
              <td className="px-3 py-2.5">{row.name}</td>
              <td className="px-3 py-2.5 text-ink-soft">{row.program || '—'}</td>
              <td className="px-3 py-2.5 text-ink-soft">{row.year || '—'}</td>
              <td className="py-2.5 pl-3 pr-4 text-right">
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  aria-label={`Remove ${row.name}`}
                  className="grid size-7 place-items-center rounded-full text-stone transition-colors hover:bg-danger-wash hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                >
                  <RiDeleteBinLine size={14} aria-hidden="true" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── Sample CSV download ───────────────────────────────────── */
const SAMPLE_CSV = `number,name,program,year
23-00174,Jordan Santos,BS Computer Engineering,3rd year
24-00512,Maria Dela Cruz,BS Nursing,1st year
22-00831,Carlos Reyes,BA Political Science,4th year`

function downloadSample() {
  const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = 'students_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

/* ── Main page ─────────────────────────────────────────────── */
export default function AdminStudents() {
  const { studentsMap, seats, importStudents: ctxImport } = useApp()
  const { getStudents, importStudents: apiImport } = useAdminApi()

  const [csvText,    setCsvText]    = useState('')
  const [preview,    setPreview]    = useState(null)
  const [result,     setResult]     = useState(null)
  const [parseError, setParseError] = useState([])
  const [rosterQ,    setRosterQ]    = useState('')
  // DB-loaded students (array); falls back to studentsMap values when offline
  const [dbStudents, setDbStudents] = useState(null)
  const fileRef = useRef(null)

  // Load students from the API once on mount
  useEffect(() => {
    getStudents().then(({ data }) => {
      if (data) setDbStudents(data)
    })
  }, [getStudents])

  // The authoritative list: DB if available, context otherwise
  const allStudents = useMemo(() => {
    if (dbStudents) return dbStudents
    return Object.values(studentsMap).sort((a, b) => a.name.localeCompare(b.name))
  }, [dbStudents, studentsMap])

  // Build a live map: studentNumber → seat (if currently seated)
  const seatedMap = useMemo(() => {
    const map = {}
    for (const seat of seats) {
      if (seat.session?.studentNumber) {
        map[seat.session.studentNumber] = seat
      }
    }
    return map
  }, [seats])

  const studentList = useMemo(() => {
    const q = rosterQ.trim().toLowerCase()
    return allStudents.filter((s) => {
      if (!q) return true
      return (
        s.name.toLowerCase().includes(q) ||
        s.number.toLowerCase().includes(q) ||
        (s.program ?? '').toLowerCase().includes(q)
      )
    })
  }, [allStudents, rosterQ])

  const totalCount  = allStudents.length
  const seatedCount = Object.keys(seatedMap).length

  const handleParse = useCallback(() => {
    const { rows, errors } = parseCSV(csvText)
    setParseError(errors)
    setPreview(rows.length > 0 ? { rows } : null)
    setResult(null)
  }, [csvText])

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target.result
      setCsvText(text)
      const { rows, errors } = parseCSV(text)
      setParseError(errors)
      setPreview(rows.length > 0 ? { rows } : null)
      setResult(null)
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [])

  const handleRemove = useCallback((index) => {
    setPreview((prev) => {
      if (!prev) return prev
      const rows = prev.rows.filter((_, i) => i !== index)
      return rows.length > 0 ? { rows } : null
    })
  }, [])

  const handleImport = useCallback(async () => {
    if (!preview?.rows?.length) return
    // Write to DB
    const { data, error } = await apiImport(preview.rows)
    if (error) {
      // Fallback to in-memory import
      const { added, updated } = ctxImport(preview.rows)
      setResult({ added, updated, offline: true })
    } else {
      ctxImport(preview.rows) // keep context in sync too
      setResult({ added: data?.count ?? preview.rows.length, updated: 0 })
      // Refresh DB roster
      const { data: fresh } = await getStudents()
      if (fresh) setDbStudents(fresh)
    }
    setPreview(null)
    setCsvText('')
    setParseError([])
  }, [preview, apiImport, ctxImport, getStudents])

  const handleClear = () => {
    setCsvText('')
    setPreview(null)
    setResult(null)
    setParseError([])
  }

  return (
    <AdminLayout>
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <StatusPill status="neutral">
            <RiTeamLine size={12} className="mr-1" aria-hidden="true" />
            Students
          </StatusPill>
          <h1 className="mt-3 text-[clamp(1.9rem,4vw,2.8rem)] font-bold leading-[1] tracking-[-0.03em]">
            Student records
          </h1>
          <p className="mt-2 max-w-[54ch] text-sm leading-relaxed text-ink-soft">
            {totalCount} students loaded · {seatedCount} currently seated. Import a CSV to add or update records.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadSample}
          className="inline-flex items-center gap-2 rounded-pill border border-ash bg-canvas px-4 py-2 text-[12px] font-semibold text-ink-soft transition-colors hover:border-ink hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
        >
          <RiDownloadLine size={14} aria-hidden="true" />
          Download CSV template
        </button>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_380px] xl:items-start">
        {/* ── Import panel ──────────────────────────────── */}
        <section className="rounded-card border border-ash bg-canvas p-5 sm:p-6">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em]">Bulk import</h2>
          <p className="mt-1 text-[12px] text-ink-soft">
            Paste CSV text or upload a file. Required columns:{' '}
            <code className="rounded bg-parchment px-1">number</code>,{' '}
            <code className="rounded bg-parchment px-1">name</code>. Optional:{' '}
            <code className="rounded bg-parchment px-1">program</code>,{' '}
            <code className="rounded bg-parchment px-1">year</code>.
          </p>

          {/* Success result */}
          {result && (
            <div className="mt-4 flex items-start gap-3 rounded-inner border border-signal-line bg-signal-wash p-4">
              <RiCheckLine size={18} className="mt-0.5 shrink-0 text-signal-deep" aria-hidden="true" />
              <div className="text-sm">
                <p className="font-semibold text-signal-deep">Import complete</p>
                <p className="mt-0.5 text-ink-soft">
                  {result.added} added · {result.updated} updated
                  {result.offline && ' (saved locally — backend offline)'}
                </p>
              </div>
              <button type="button" onClick={() => setResult(null)} className="ml-auto text-stone hover:text-ink">
                <RiCloseLine size={16} aria-hidden="true" />
              </button>
            </div>
          )}

          {/* File upload */}
          <div className="mt-5">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-inner border border-dashed border-ash bg-parchment px-5 py-3 text-[13px] font-semibold text-ink-soft transition-colors hover:border-ink hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              <RiUploadLine size={16} aria-hidden="true" />
              Upload .csv file
            </button>
          </div>

          {/* Paste area */}
          <div className="mt-4">
            <label htmlFor="csv-paste" className="text-[12px] font-semibold text-ink">
              Or paste CSV text
            </label>
            <textarea
              id="csv-paste"
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={`number,name,program,year\n23-00174,Jordan Santos,BS Computer Engineering,3rd year`}
              className="mt-2 w-full resize-y rounded-input border border-ash bg-parchment p-3 font-mono text-[12px] text-ink placeholder:text-stone focus:border-ink focus:outline-none focus:ring-2 focus:ring-lime"
            />
          </div>

          {/* Parse errors */}
          {parseError.length > 0 && (
            <div className="mt-3 rounded-inner border border-amber/30 bg-amber-wash p-3">
              <p className="text-[12px] font-semibold text-amber">
                <RiAlertLine size={14} className="mr-1 inline" aria-hidden="true" />
                {parseError.length} issue{parseError.length > 1 ? 's' : ''} found
              </p>
              <ul className="mt-2 space-y-1">
                {parseError.map((e, i) => (
                  <li key={i} className="text-[11px] text-amber/80">{e}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="md" onClick={handleParse} disabled={!csvText.trim()}>
              Preview import
              <RiUserAddLine size={16} aria-hidden="true" />
            </Button>
            {(csvText || preview || parseError.length > 0) && (
              <Button variant="outline" size="md" onClick={handleClear}>
                Clear
              </Button>
            )}
          </div>

          {/* Preview table */}
          {preview && (
            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[13px] font-semibold">
                  {preview.rows.length} row{preview.rows.length !== 1 ? 's' : ''} to import
                </p>
                <Button size="sm" onClick={handleImport}>
                  <RiCheckLine size={14} aria-hidden="true" />
                  Confirm import
                </Button>
              </div>
              <PreviewTable rows={preview.rows} onRemove={handleRemove} />
            </div>
          )}
        </section>

        {/* ── Current student roster ────────────────────── */}
        <aside>
          <div className="rounded-card border border-ash bg-canvas p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-semibold">Current roster</h2>
              <span className="numeric rounded-pill border border-ash bg-parchment px-2.5 py-1 text-[11px] font-semibold">
                {totalCount}
              </span>
            </div>

            {/* Search */}
            <div className="relative mt-3">
              <label htmlFor="roster-search" className="sr-only">Search students</label>
              <RiSearchLine
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone"
                aria-hidden="true"
              />
              <input
                id="roster-search"
                type="search"
                value={rosterQ}
                onChange={(e) => setRosterQ(e.target.value)}
                placeholder="Name, number, or program"
                className="h-9 w-full rounded-input border border-ash bg-parchment pl-8 pr-8 text-[12px] text-ink placeholder:text-stone focus:border-signal-deep focus:outline-none focus:ring-2 focus:ring-signal/40"
              />
              {rosterQ && (
                <button
                  type="button"
                  onClick={() => setRosterQ('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full text-stone hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
                >
                  <RiCloseLine size={12} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* List */}
            <ul className="mt-3 max-h-[520px] divide-y divide-ash overflow-y-auto">
              {studentList.length === 0 ? (
                <li className="py-8 text-center text-[12px] text-ink-soft">
                  No students match &ldquo;{rosterQ}&rdquo;
                </li>
              ) : (
                studentList.map((s) => {
                  const activeSeat = seatedMap[s.number]
                  return (
                    <li key={s.number} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold">{s.name}</p>
                        <p className="numeric text-[11px] text-ink-soft">{s.number}</p>
                        {s.program && (
                          <p className="truncate text-[11px] text-stone">{s.program}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {activeSeat ? (
                          <span className="inline-flex items-center gap-1 rounded-pill border border-signal-line bg-signal-wash px-2 py-0.5 text-[10px] font-semibold text-signal-deep">
                            <RiArmchairLine size={11} aria-hidden="true" />
                            {activeSeat.label}
                          </span>
                        ) : (
                          <span className="text-[11px] text-stone">{s.year || '—'}</span>
                        )}
                      </div>
                    </li>
                  )
                })
              )}
            </ul>

            {rosterQ && (
              <p className="mt-2 text-[11px] text-ink-soft">
                {studentList.length} of {totalCount} shown
              </p>
            )}
          </div>
        </aside>
      </div>
    </AdminLayout>
  )
}
