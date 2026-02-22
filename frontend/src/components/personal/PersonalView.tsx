import { useState, useMemo, useCallback } from 'react'
import {
  useMitarbeiter,
  useAbwesenheiten,
  useSetAbwesenheit,
  useDeleteAbwesenheit,
  useKolonnen,
  useZuweisungen,
} from '../../api/queries'
import { getMonthDates, today, getWeekday } from '../../utils/dates'
import { isWochenende, isFeiertag, getFeiertagName, isBetriebsurlaub } from '../../utils/feiertage'
import type { AbwesenheitTyp, Abwesenheit } from '../../api/types'
import LoadingSpinner from '../shared/LoadingSpinner'

interface PersonalViewProps {
  month: number
  year: number
}

const PAINT_TYPES: { typ: AbwesenheitTyp | ''; label: string; cssVar: string }[] = [
  { typ: 'U', label: 'U', cssVar: 'var(--urlaub)' },
  { typ: 'K', label: 'K', cssVar: 'var(--krank)' },
  { typ: 'FE', label: 'FE', cssVar: 'var(--fehlt)' },
  { typ: 'P', label: 'P', cssVar: 'var(--praktikum)' },
  { typ: 'S', label: 'S', cssVar: 'var(--schule)' },
  { typ: 'H', label: 'H', cssVar: 'var(--halbtag)' },
  { typ: '', label: '\u2715', cssVar: '' },
]

const LEGEND_ITEMS = [
  { color: 'var(--urlaub)', label: 'U=Urlaub' },
  { color: 'var(--krank)', label: 'K=Krank' },
  { color: 'var(--feiertag)', label: 'F=Feiertag' },
  { color: 'var(--fehlt)', label: 'FE=Fehlt' },
  { color: 'var(--purple)', label: 'UN=Urlaub nachr.' },
  { color: 'var(--praktikum)', label: 'P=Praktikum' },
  { color: 'var(--halbtag)', label: 'H=Halbtag' },
  { color: 'var(--schule)', label: 'S=Schule' },
  { color: 'var(--cyan)', label: 'Kolonne-Zuweisung' },
]

export default function PersonalView({ month, year }: PersonalViewProps) {
  const [paintTyp, setPaintTyp] = useState<AbwesenheitTyp | ''>('U')
  const [searchFilter, setSearchFilter] = useState('')
  const [gruppeFilter, setGruppeFilter] = useState('')
  const [availFilter, setAvailFilter] = useState('')

  const dates = useMemo(() => getMonthDates(year, month), [year, month])
  const von = dates[0]
  const bis = dates[dates.length - 1]
  const todayStr = today()

  const { data: mitarbeiter, isLoading: loadingMa } = useMitarbeiter()
  const { data: abwesenheiten, isLoading: loadingAbs } = useAbwesenheiten(von, bis)
  const { data: kolonnen } = useKolonnen()
  const { data: zuweisungen } = useZuweisungen()
  const setAbwesenheit = useSetAbwesenheit()
  const deleteAbwesenheit = useDeleteAbwesenheit()

  // Build absence map: "PersNr-YYYY-MM-DD" -> Abwesenheit
  const absMap = useMemo(() => {
    const map = new Map<string, Abwesenheit>()
    abwesenheiten?.forEach(a => map.set(`${a.PersNr}-${a.Datum}`, a))
    return map
  }, [abwesenheiten])

  // Today's absent PersNrs
  const todayAbsent = useMemo(() => {
    return new Set(abwesenheiten?.filter(a => a.Datum === todayStr).map(a => a.PersNr) ?? [])
  }, [abwesenheiten, todayStr])

  // Groups
  const gruppen = useMemo(() => {
    const set = new Set<string>()
    mitarbeiter?.filter(m => m.Aktiv).forEach(m => set.add(m.Gruppe))
    return Array.from(set).sort()
  }, [mitarbeiter])

  // Active MA, filtered
  const activeMa = useMemo(() => {
    return mitarbeiter?.filter(m => m.Aktiv) ?? []
  }, [mitarbeiter])

  const filteredGruppen = useMemo(() => {
    const grouped = new Map<string, typeof activeMa>()
    for (const ma of activeMa) {
      if (gruppeFilter && ma.Gruppe !== gruppeFilter) continue
      const search = searchFilter.toLowerCase()
      if (search) {
        const name = `${ma.Vorname ?? ''} ${ma.Title}`.toLowerCase()
        if (!name.includes(search) && !ma.PersNr.includes(search)) continue
      }
      if (availFilter === '1' && todayAbsent.has(ma.PersNr)) continue
      if (availFilter === '0' && !todayAbsent.has(ma.PersNr)) continue

      if (!grouped.has(ma.Gruppe)) grouped.set(ma.Gruppe, [])
      grouped.get(ma.Gruppe)!.push(ma)
    }
    return grouped
  }, [activeMa, gruppeFilter, searchFilter, availFilter, todayAbsent])

  // Get kolonne for a PersNr
  const getKolonne = useCallback((persNr: string) => {
    return kolonnen?.find(k => k.Mitglieder?.some(m => m.PersNr === persNr))
  }, [kolonnen])

  // Get kolonne assignments for a date
  const getKolAssignment = useCallback((persNr: string, datum: string) => {
    const kol = getKolonne(persNr)
    if (!kol) return null
    return zuweisungen?.find(z => z.KolonneId === kol.Id && datum >= z.Von && datum <= z.Bis) ?? null
  }, [getKolonne, zuweisungen])

  // Count used vacation days for a MA
  const getUsedUrlaubstage = useCallback((persNr: string) => {
    return abwesenheiten?.filter(a => a.PersNr === persNr && a.Typ === 'U').length ?? 0
  }, [abwesenheiten])

  // Handle cell click
  const handleCellClick = useCallback((persNr: string, datum: string) => {
    if (isWochenende(datum) || isFeiertag(datum)) return

    const key = `${persNr}-${datum}`
    const existing = absMap.get(key)

    if (paintTyp === '') {
      // Delete mode
      if (existing) {
        deleteAbwesenheit.mutate(existing.Id)
      }
    } else {
      if (existing) {
        // If same type, delete it (toggle). If different type, delete then re-create
        if (existing.Typ === paintTyp) {
          deleteAbwesenheit.mutate(existing.Id)
        } else {
          deleteAbwesenheit.mutate(existing.Id, {
            onSuccess: () => {
              setAbwesenheit.mutate({ PersNr: persNr, Datum: datum, Typ: paintTyp })
            }
          })
        }
      } else {
        setAbwesenheit.mutate({ PersNr: persNr, Datum: datum, Typ: paintTyp })
      }
    }
  }, [paintTyp, absMap, setAbwesenheit, deleteAbwesenheit])

  if (loadingMa || loadingAbs) return <LoadingSpinner />

  return (
    <>
      {/* Edit Toolbar */}
      <div className="edit-bar">
        <span style={{ color: 'var(--text2)' }}>Bearbeiten:</span>
        <div className="paint">
          {PAINT_TYPES.map(pt => (
            <div
              key={pt.label}
              className={`paint-btn${paintTyp === pt.typ ? ' act' : ''}`}
              style={{
                background: pt.cssVar || 'var(--bg4)',
                border: !pt.cssVar ? '1px dashed var(--border)' : undefined,
              }}
              title={pt.label}
              onClick={() => setPaintTyp(pt.typ)}
            >
              {pt.label}
            </div>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', color: 'var(--text3)', fontSize: 10 }}>
          Klick auf Zelle setzt Abwesenheit
        </span>
      </div>

      {/* Filter Bar */}
      <div className="fbar">
        <label>Suche:</label>
        <input
          placeholder="Name/PersNr..."
          value={searchFilter}
          onChange={e => setSearchFilter(e.target.value)}
        />
        <label>Gruppe:</label>
        <select value={gruppeFilter} onChange={e => setGruppeFilter(e.target.value)}>
          <option value="">Alle</option>
          {gruppen.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <label>Verfuegbarkeit:</label>
        <select value={availFilter} onChange={e => setAvailFilter(e.target.value)}>
          <option value="">Alle</option>
          <option value="1">Nur heute verfuegbar</option>
          <option value="0">Nur heute abwesend</option>
        </select>
      </div>

      {/* Gantt Table */}
      <div className="gantt-wrap">
        <table className="gt">
          <thead>
            <tr>
              <th className="gt-lbl" style={{ background: 'var(--bg3)' }}>Mitarbeiter</th>
              <th className="gt-hd" style={{ minWidth: 30 }} title="Urlaubstage">UT</th>
              <th className="gt-hd" style={{ minWidth: 30 }} title="Kolonne">KOL</th>
              {dates.map(d => {
                const we = isWochenende(d)
                const isToday = d === todayStr
                return (
                  <th
                    key={d}
                    className={`gt-hd${we ? ' we' : ''}${isToday ? ' today' : ''}`}
                  >
                    {parseInt(d.slice(8, 10))}
                  </th>
                )
              })}
            </tr>
            <tr>
              <th className="gt-lbl" style={{ background: 'var(--bg3)' }} />
              <th className="gt-hd" />
              <th className="gt-hd" />
              {dates.map(d => {
                const we = isWochenende(d)
                const isToday = d === todayStr
                return (
                  <th
                    key={`wd-${d}`}
                    className={`gt-hd${we ? ' we' : ''}${isToday ? ' today' : ''}`}
                    style={{ fontSize: 8 }}
                  >
                    {getWeekday(d).slice(0, 2)}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {/* Feiertage Row */}
            <tr className="gt-grp">
              <td className="gt-lbl">Feiertage / Betriebsurlaub</td>
              <td className="gt-d" />
              <td className="gt-d" />
              {dates.map(d => {
                const we = isWochenende(d)
                const isToday = d === todayStr
                const ftName = getFeiertagName(d)
                const bu = isBetriebsurlaub(d)
                return (
                  <td
                    key={d}
                    className={`gt-d${isToday ? ' today' : ''}${we && !ftName && !bu ? ' we' : ''}`}
                    title={ftName ?? undefined}
                  >
                    {ftName ? <span className="mk mk-F">F</span> :
                     bu ? <span className="mk mk-BU">B</span> : null}
                  </td>
                )
              })}
            </tr>

            {/* Groups + Mitarbeiter */}
            {Array.from(filteredGruppen.entries()).map(([gruppe, members]) => (
              <GroupRows
                key={gruppe}
                gruppe={gruppe}
                members={members}
                dates={dates}
                todayStr={todayStr}
                absMap={absMap}
                getKolonne={getKolonne}
                getKolAssignment={getKolAssignment}
                getUsedUrlaubstage={getUsedUrlaubstage}
                onCellClick={handleCellClick}
                kostenstellen={undefined}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="legend">
        {LEGEND_ITEMS.map(item => (
          <div key={item.label} className="leg-i">
            <div className="leg-c" style={{ background: item.color }} />
            {item.label}
          </div>
        ))}
      </div>
    </>
  )
}

// Extracted group rows component to reduce re-render scope
interface GroupRowsProps {
  gruppe: string
  members: {
    Id: number
    PersNr: string
    Title: string
    Vorname?: string
    Gruppe: string
    Notizen?: string
    Urlaubstage: number
    Aktiv: boolean
  }[]
  dates: string[]
  todayStr: string
  absMap: Map<string, Abwesenheit>
  getKolonne: (persNr: string) => { Id: number; Title: string } | undefined
  getKolAssignment: (persNr: string, datum: string) => { KostenstelleId: number } | null
  getUsedUrlaubstage: (persNr: string) => number
  onCellClick: (persNr: string, datum: string) => void
  kostenstellen: undefined
}

function GroupRows({
  gruppe,
  members,
  dates,
  todayStr,
  absMap,
  getKolonne,
  getKolAssignment,
  getUsedUrlaubstage,
  onCellClick,
}: GroupRowsProps) {
  return (
    <>
      {/* Group Header */}
      <tr className="gt-grp">
        <td className="gt-lbl">{gruppe} ({members.length})</td>
        <td className="gt-d" />
        <td className="gt-d" />
        {dates.map(d => (
          <td key={d} className={`gt-d${isWochenende(d) ? ' we' : ''}`} />
        ))}
      </tr>

      {/* Individual Rows */}
      {members.map(ma => {
        const kol = getKolonne(ma.PersNr)
        const usedUT = getUsedUrlaubstage(ma.PersNr)
        const remainingUT = ma.Urlaubstage - usedUT
        const utColor = remainingUT > 20 ? 'var(--green)' : remainingUT > 10 ? 'var(--y)' : remainingUT > 0 ? 'var(--orange)' : 'var(--red)'
        const displayName = ma.Vorname ? `${ma.Vorname} ${ma.Title}` : ma.Title

        return (
          <tr key={ma.Id}>
            <td className="gt-lbl">
              <div className="n">{displayName}</div>
              <div className="s">{ma.PersNr}{ma.Notizen ? ` \u00B7 ${ma.Notizen}` : ''}</div>
            </td>
            <td className="gt-d" style={{ fontSize: 10, fontWeight: 600, color: utColor, minWidth: 30 }}>
              {remainingUT}
            </td>
            <td className="gt-d" style={{ fontSize: 8, color: 'var(--cyan)', minWidth: 30 }}>
              {kol ? kol.Title.substring(0, 6) : ''}
            </td>
            {dates.map(d => {
              const we = isWochenende(d)
              const isToday = d === todayStr
              const ft = isFeiertag(d)
              const abs = absMap.get(`${ma.PersNr}-${d}`)
              const kolAss = getKolAssignment(ma.PersNr, d)

              if (ft || we) {
                return (
                  <td key={d} className={`gt-d${we ? ' we' : ''}${isToday ? ' today' : ''}`} />
                )
              }

              if (abs) {
                return (
                  <td
                    key={d}
                    className={`gt-d editable${isToday ? ' today' : ''}`}
                    onClick={() => onCellClick(ma.PersNr, d)}
                  >
                    <span className={`mk mk-${abs.Typ}`}>{abs.Typ}</span>
                  </td>
                )
              }

              if (kolAss) {
                return (
                  <td
                    key={d}
                    className={`gt-d editable${isToday ? ' today' : ''}`}
                    onClick={() => onCellClick(ma.PersNr, d)}
                    title="Kolonne-Zuweisung"
                  >
                    <span className="mk mk-KOL">K</span>
                  </td>
                )
              }

              return (
                <td
                  key={d}
                  className={`gt-d${isToday ? ' today' : ''} editable`}
                  onClick={() => onCellClick(ma.PersNr, d)}
                />
              )
            })}
          </tr>
        )
      })}
    </>
  )
}
