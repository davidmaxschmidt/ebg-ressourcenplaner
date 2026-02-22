import { useState, useMemo, useCallback } from 'react'
import { useMitarbeiter, useAbwesenheiten, useSetAbwesenheit, useDeleteAbwesenheit } from '../../api/queries'
import { getMonthDates, today, monthName } from '../../utils/dates'
import { isWochenende, isFeiertag, isBetriebsurlaub, getFeiertagName } from '../../utils/feiertage'
import { ABWESENHEIT_COLORS } from '../../utils/colors'
import type { AbwesenheitTyp, Mitarbeiter, Abwesenheit } from '../../api/types'
import LoadingSpinner from '../shared/LoadingSpinner'
import MitarbeiterModal from './MitarbeiterModal'

const GRUPPEN_ORDER = [
  'Geschaeftsleitung', 'Bauleiter', 'Poliere', 'Leitungsbau', 'Kanalbau',
  'Hausanschluss', 'Werkstatt/Lager', 'Buero', 'Azubis', 'Minijob',
  'Praktikanten', 'Zeitarbeit', 'Subunternehmer', 'Geraetefahrer', 'Sonstige',
]

const PAINT_TYPES: AbwesenheitTyp[] = ['U', 'K', 'FE', 'P', 'S', 'H', 'UN', 'BU']

export default function AbwesenheitenView() {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth())
  const [paintMode, setPaintMode] = useState<AbwesenheitTyp | 'clear' | null>(null)
  const [search, setSearch] = useState('')
  const [gruppeFilter, setGruppeFilter] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [showModal, setShowModal] = useState(false)

  const dates = useMemo(() => getMonthDates(year, month), [year, month])
  const von = dates[0]
  const bis = dates[dates.length - 1]
  const todayStr = today()

  const { data: mitarbeiter, isLoading: maLoading } = useMitarbeiter()
  const { data: abwesenheiten, isLoading: abLoading } = useAbwesenheiten(von, bis)
  const setAbwesenheit = useSetAbwesenheit()
  const deleteAbw = useDeleteAbwesenheit()

  // Build lookup: "PersNr-YYYY-MM-DD" → Abwesenheit
  const abMap = useMemo(() => {
    const m = new Map<string, Abwesenheit>()
    abwesenheiten?.forEach(a => m.set(`${a.PersNr}-${a.Datum}`, a))
    return m
  }, [abwesenheiten])

  // Group mitarbeiter
  const grouped = useMemo(() => {
    if (!mitarbeiter) return []
    let filtered = mitarbeiter
    if (search) {
      const s = search.toLowerCase()
      filtered = filtered.filter(m =>
        m.Title.toLowerCase().includes(s) || m.PersNr.includes(s)
      )
    }
    if (gruppeFilter) {
      filtered = filtered.filter(m => m.Gruppe === gruppeFilter)
    }

    const groups: { name: string; members: Mitarbeiter[] }[] = []
    const byGruppe = new Map<string, Mitarbeiter[]>()
    filtered.forEach(m => {
      const g = m.Gruppe || 'Sonstige'
      if (!byGruppe.has(g)) byGruppe.set(g, [])
      byGruppe.get(g)!.push(m)
    })

    GRUPPEN_ORDER.forEach(g => {
      if (byGruppe.has(g)) {
        groups.push({ name: g, members: byGruppe.get(g)! })
        byGruppe.delete(g)
      }
    })
    // remaining groups
    byGruppe.forEach((members, name) => {
      groups.push({ name, members })
    })

    return groups
  }, [mitarbeiter, search, gruppeFilter])

  // Count vacation days used this year
  const vacDaysUsed = useCallback((persNr: string) => {
    if (!abwesenheiten) return 0
    return abwesenheiten.filter(a => a.PersNr === persNr && a.Typ === 'U').length
  }, [abwesenheiten])

  const handleCellClick = useCallback((persNr: string, datum: string) => {
    if (!paintMode) return
    if (isWochenende(datum) || isFeiertag(datum)) return

    const key = `${persNr}-${datum}`
    const existing = abMap.get(key)

    if (paintMode === 'clear') {
      if (existing) deleteAbw.mutate(existing.Id)
    } else {
      setAbwesenheit.mutate({ PersNr: persNr, Datum: datum, Typ: paintMode })
    }
  }, [paintMode, abMap, setAbwesenheit, deleteAbw])

  const toggleGroup = (name: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  if (maLoading || abLoading) return <LoadingSpinner />

  return (
    <div>
      {/* Controls */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={prevMonth}>&larr;</button>
          <strong style={{ minWidth: 140, textAlign: 'center' }}>
            {monthName(month)} {year}
          </strong>
          <button className="btn btn-ghost btn-sm" onClick={nextMonth}>&rarr;</button>

          <div style={{ flex: 1 }} />

          <div className="filter-bar" style={{ padding: 0 }}>
            <input
              placeholder="Suche (Name/PersNr)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 180 }}
            />
            <select value={gruppeFilter} onChange={e => setGruppeFilter(e.target.value)}>
              <option value="">Alle Gruppen</option>
              {GRUPPEN_ORDER.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            + Mitarbeiter
          </button>
        </div>

        {/* Paint toolbar */}
        <div className="edit-toolbar">
          {PAINT_TYPES.map(typ => (
            <button
              key={typ}
              className={`paint-btn ${paintMode === typ ? 'active' : ''}`}
              style={{ background: ABWESENHEIT_COLORS[typ] }}
              onClick={() => setPaintMode(paintMode === typ ? null : typ)}
            >
              {typ}
            </button>
          ))}
          <button
            className={`paint-btn paint-btn-clear ${paintMode === 'clear' ? 'active' : ''}`}
            onClick={() => setPaintMode(paintMode === 'clear' ? null : 'clear')}
          >
            &times;
          </button>
          {paintMode && (
            <span style={{ fontSize: 12, color: '#888', alignSelf: 'center', marginLeft: 8 }}>
              Klicke auf Zellen zum {paintMode === 'clear' ? 'Loeschen' : 'Setzen'}
            </span>
          )}
        </div>
      </div>

      {/* Gantt Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="gantt-wrapper">
          <table className="gantt-table">
            <thead>
              <tr>
                <th className="sticky-col gantt-label">Mitarbeiter</th>
                <th className="gantt-col-ut">UT</th>
                {dates.map(d => {
                  const we = isWochenende(d)
                  const ft = isFeiertag(d)
                  const day = new Date(d + 'T00:00:00').getDate()
                  const wd = new Date(d + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'narrow' })
                  return (
                    <th
                      key={d}
                      className={`gantt-cell ${we ? 'gantt-cell-we' : ''} ${ft ? 'gantt-cell-ft' : ''} ${d === todayStr ? 'gantt-cell-heute' : ''}`}
                      title={ft ? getFeiertagName(d) : d}
                    >
                      <div style={{ fontSize: 10, lineHeight: 1 }}>{wd}</div>
                      <div style={{ fontSize: 11, fontWeight: 600 }}>{day}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {grouped.map(group => (
                <>
                  <tr key={`g-${group.name}`} className="gruppe-header" onClick={() => toggleGroup(group.name)}>
                    <td className="sticky-col" colSpan={2} style={{ background: '#f0f0f0' }}>
                      {collapsed.has(group.name) ? '>' : 'v'} {group.name} ({group.members.length})
                    </td>
                    {dates.map(d => <td key={d} className="gantt-cell" style={{ background: '#f0f0f0' }} />)}
                  </tr>
                  {!collapsed.has(group.name) && group.members.map(ma => {
                    const used = vacDaysUsed(ma.PersNr)
                    const total = ma.Urlaubstage || 0
                    return (
                      <tr key={ma.PersNr}>
                        <td className="sticky-col gantt-label" title={`${ma.PersNr} - ${ma.Title}`}>
                          {ma.Title}
                        </td>
                        <td className="gantt-col-ut" style={{
                          color: used > total ? 'var(--danger)' : used >= total ? 'var(--warning)' : 'var(--success)',
                          background: '#fff',
                        }}>
                          {used}/{total}
                        </td>
                        {dates.map(d => {
                          const we = isWochenende(d)
                          const ft = isFeiertag(d)
                          const bu = isBetriebsurlaub(d)
                          const key = `${ma.PersNr}-${d}`
                          const abw = abMap.get(key)

                          let cls = 'gantt-cell'
                          let label = ''

                          if (abw) {
                            cls += ` gantt-cell-${abw.Typ.toLowerCase()}`
                            label = abw.Typ
                          } else if (bu) {
                            cls += ' gantt-cell-bu'
                            label = 'BU'
                          } else if (ft) {
                            cls += ' gantt-cell-ft'
                          } else if (we) {
                            cls += ' gantt-cell-we'
                          }

                          if (d === todayStr) cls += ' gantt-cell-heute'

                          return (
                            <td
                              key={d}
                              className={cls}
                              onClick={() => handleCellClick(ma.PersNr, d)}
                              style={{ cursor: paintMode ? 'crosshair' : 'default' }}
                            >
                              {label && <span style={{ fontSize: 9 }}>{label}</span>}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <MitarbeiterModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  )
}
