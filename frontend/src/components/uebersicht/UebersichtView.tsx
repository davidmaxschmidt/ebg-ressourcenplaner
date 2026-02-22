import { useState, useMemo } from 'react'
import { useMitarbeiter, useAbwesenheiten, useKolonnen, useZuweisungen, useKostenstellen } from '../../api/queries'
import { today, getWeekDates, getMonday, formatDate, getWeekday } from '../../utils/dates'
import { isWochenende, isFeiertag } from '../../utils/feiertage'
import { ABWESENHEIT_COLORS } from '../../utils/colors'
import type { Abwesenheit } from '../../api/types'
import LoadingSpinner from '../shared/LoadingSpinner'

export default function UebersichtView() {
  const todayStr = today()
  const monday = getMonday(todayStr)
  const dates = useMemo(() => getWeekDates(monday, 4), [monday])
  const von = dates[0]
  const bis = dates[dates.length - 1]

  const { data: mitarbeiter, isLoading: l1 } = useMitarbeiter()
  const { data: abwesenheiten, isLoading: l2 } = useAbwesenheiten(von, bis)
  const { data: kolonnen, isLoading: l3 } = useKolonnen()
  const { data: zuweisungen, isLoading: l4 } = useZuweisungen()
  const { data: kostenstellen, isLoading: l5 } = useKostenstellen()

  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const abMap = useMemo(() => {
    const m = new Map<string, Abwesenheit>()
    abwesenheiten?.forEach(a => m.set(`${a.PersNr}-${a.Datum}`, a))
    return m
  }, [abwesenheiten])

  const maMap = useMemo(() => {
    const m = new Map<string, typeof mitarbeiter extends (infer T)[] | undefined ? T : never>()
    mitarbeiter?.forEach(ma => m.set(ma.PersNr, ma))
    return m
  }, [mitarbeiter])

  if (l1 || l2 || l3 || l4 || l5) return <LoadingSpinner />

  // Find active zuweisungen in the 4-week window
  const activeZuw = zuweisungen?.filter(z => z.Von <= bis && z.Bis >= von) || []
  const activeKstIds = new Set(activeZuw.map(z => z.KostenstelleId))

  const kstMap = new Map(kostenstellen?.map(k => [k.Id, k]) || [])
  const kolMap = new Map(kolonnen?.map(k => [k.Id, k]) || [])

  // Group zuweisungen by KST
  const zuwByKst = new Map<number, typeof activeZuw>()
  activeZuw.forEach(z => {
    if (!zuwByKst.has(z.KostenstelleId)) zuwByKst.set(z.KostenstelleId, [])
    zuwByKst.get(z.KostenstelleId)!.push(z)
  })

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // KPIs
  const totalMa = mitarbeiter?.length || 0
  const absentToday = abwesenheiten?.filter(a => a.Datum === todayStr).length || 0

  return (
    <div>
      {/* KPI Bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: 120, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{totalMa}</div>
          <div style={{ fontSize: 12, color: 'var(--t2)' }}>Mitarbeiter</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 120, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--success)' }}>{totalMa - absentToday}</div>
          <div style={{ fontSize: 12, color: 'var(--t2)' }}>Verfuegbar heute</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 120, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--danger)' }}>{absentToday}</div>
          <div style={{ fontSize: 12, color: 'var(--t2)' }}>Abwesend heute</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 120, textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{activeKstIds.size}</div>
          <div style={{ fontSize: 12, color: 'var(--t2)' }}>Aktive Baustellen</div>
        </div>
      </div>

      {/* Projekt-Karten */}
      {Array.from(activeKstIds).map(kstId => {
        const kst = kstMap.get(kstId)
        if (!kst) return null
        const zuws = zuwByKst.get(kstId) || []
        const isOpen = expanded.has(kstId)

        // Count absences in this project's kolonnen
        let totalMembers = 0
        let absentMembers = 0
        zuws.forEach(z => {
          const kol = kolMap.get(z.KolonneId)
          kol?.Mitglieder?.forEach(m => {
            totalMembers++
            if (abMap.has(`${m.PersNr}-${todayStr}`)) absentMembers++
          })
        })

        return (
          <div key={kstId} className="projekt-row">
            <div className="projekt-header" onClick={() => toggleExpand(kstId)}>
              <span className="projekt-icon">{isOpen ? 'v' : '>'}</span>
              <div className="projekt-info">
                <div className="projekt-title">{kst.Title}</div>
                <div className="projekt-meta">
                  {kst.Bauleiter && `BL: ${kst.Bauleiter}`}
                  {kst.StartDatum && ` | ${formatDate(kst.StartDatum)} - ${kst.EndeDatum ? formatDate(kst.EndeDatum) : '...'}`}
                </div>
              </div>
              {absentMembers > 0 ? (
                <span className="chip chip-red">{absentMembers} abwesend</span>
              ) : totalMembers > 0 ? (
                <span className="chip chip-green">voll besetzt</span>
              ) : (
                <span className="chip chip-gray">keine Kolonne</span>
              )}
            </div>

            {isOpen && (
              <div className="projekt-body">
                {zuws.map(z => {
                  const kol = kolMap.get(z.KolonneId)
                  if (!kol) return null
                  return (
                    <div key={z.Id} className="kolonne-row">
                      <div className="kolonne-title">
                        Kolonne {kol.Title} ({kol.Mitglieder?.length || 0} MA)
                        {kol.Polier && <span style={{ color: 'var(--t2)', fontWeight: 400 }}>Polier: {kol.Polier}</span>}
                      </div>
                      {kol.Mitglieder?.map(m => {
                        const ma = maMap.get(m.PersNr)
                        if (!ma) return null
                        return (
                          <div key={m.PersNr} className="ma-dot" style={{ marginLeft: 16 }}>
                            <span>{ma.Title}</span>
                            <div className="ma-dots">
                              {dates.filter(d => !isWochenende(d) && !isFeiertag(d)).slice(0, 20).map(d => {
                                const abw = abMap.get(`${m.PersNr}-${d}`)
                                const color = abw ? ABWESENHEIT_COLORS[abw.Typ] : 'var(--success)'
                                return (
                                  <span
                                    key={d}
                                    className="dot"
                                    style={{ background: color, width: 10, height: 10 }}
                                    title={`${formatDate(d)} ${getWeekday(d)} ${abw ? abw.Typ : 'verfuegbar'}`}
                                  />
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
                {zuws.length === 0 && (
                  <div style={{ color: 'var(--t2)', fontSize: 13, padding: '8px 0' }}>
                    Keine Kolonnen zugewiesen
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {activeKstIds.size === 0 && (
        <div className="card" style={{ textAlign: 'center', color: 'var(--t2)' }}>
          Keine aktiven Baustellen in den naechsten 4 Wochen.
          <br />
          Kolonnen und Zuweisungen koennen unter "Projektplanung" erstellt werden.
        </div>
      )}
    </div>
  )
}
