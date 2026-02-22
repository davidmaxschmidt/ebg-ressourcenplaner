import { useState, useMemo, useCallback } from 'react'
import {
  useKostenstellen,
  useKolonnen,
  useZuweisungen,
  useGanttItems,
  useMitarbeiter,
  useAbwesenheiten,
} from '../../api/queries'
import { getMonthDates, today, isInRange } from '../../utils/dates'
import { isWochenende, isFeiertag } from '../../utils/feiertage'
import AssignModal from '../kolonnen/AssignModal'
import LoadingSpinner from '../shared/LoadingSpinner'

interface ProjektDetailViewProps {
  kstId: number
  month: number
  year: number
  onBack: () => void
}

export default function ProjektDetailView({ kstId, month, year, onBack }: ProjektDetailViewProps) {
  const [showAssignModal, setShowAssignModal] = useState(false)

  const dates = useMemo(() => getMonthDates(year, month), [year, month])
  const von = dates[0]
  const bis = dates[dates.length - 1]
  const todayStr = today()

  const { data: kostenstellen, isLoading: loadingKst } = useKostenstellen()
  const { data: kolonnen } = useKolonnen()
  const { data: zuweisungen } = useZuweisungen()
  const { data: mitarbeiter } = useMitarbeiter()
  const { data: abwesenheiten } = useAbwesenheiten(von, bis)

  const kst = kostenstellen?.find(k => k.Id === kstId)
  const nr = kst?.Title.split(' ')[0] ?? ''
  const name = kst ? kst.Title.substring(nr.length + 1) : ''

  const { data: ganttItems } = useGanttItems(nr || undefined)

  const assigns = useMemo(() => {
    return zuweisungen?.filter(z => z.KostenstelleId === kstId) ?? []
  }, [zuweisungen, kstId])

  // Absence map
  const absMap = useMemo(() => {
    const map = new Map<string, string>()
    abwesenheiten?.forEach(a => map.set(`${a.PersNr}-${a.Datum}`, a.Typ))
    return map
  }, [abwesenheiten])

  // Get kolonne availability for a date
  const getKolAvail = useCallback((kolId: number, datum: string) => {
    const kol = kolonnen?.find(k => k.Id === kolId)
    if (!kol || !kol.Mitglieder) return { total: 0, avail: 0, pct: 0 }
    const total = kol.Mitglieder.length
    const avail = kol.Mitglieder.filter(m => {
      if (isWochenende(datum) || isFeiertag(datum)) return false
      return !absMap.has(`${m.PersNr}-${datum}`)
    }).length
    return { total, avail, pct: total > 0 ? Math.round((avail / total) * 100) : 0 }
  }, [kolonnen, absMap])

  // Team members from assigned kolonnen
  const teamMembers = useMemo(() => {
    const members: { persNr: string; kolName: string }[] = []
    const seen = new Set<string>()
    assigns.forEach(a => {
      const kol = kolonnen?.find(k => k.Id === a.KolonneId)
      if (!kol?.Mitglieder) return
      kol.Mitglieder.forEach(m => {
        if (!seen.has(m.PersNr)) {
          seen.add(m.PersNr)
          members.push({ persNr: m.PersNr, kolName: kol.Title })
        }
      })
    })
    return members
  }, [assigns, kolonnen])

  if (loadingKst) return <LoadingSpinner />
  if (!kst) return <div style={{ padding: 20, color: 'var(--text3)' }}>Kostenstelle nicht gefunden</div>

  return (
    <>
      {/* Header */}
      <div className="proj-header">
        <button className="proj-back" onClick={onBack}>&larr;</button>
        <div>
          <div className="proj-nr">{nr}</div>
          <div className="proj-title">{name}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => setShowAssignModal(true)}>
            + Kolonne zuweisen
          </button>
        </div>
      </div>

      {/* 4-panel Grid */}
      <div className="proj-grid">
        {/* Panel 1: Projektinfo */}
        <div className="pnl">
          <div className="pnl-h">Projektinfo</div>
          <div className="pnl-b">
            <div className="info-grid">
              <span className="info-label">Kostenstelle:</span>
              <span className="info-value">{nr}</span>
              <span className="info-label">Bauleiter:</span>
              <span className="info-value">{kst.Bauleiter ?? '-'}</span>
              <span className="info-label">Auftraggeber:</span>
              <span className="info-value">{kst.Auftraggeber ?? '-'}</span>
              <span className="info-label">Gantt-Vorgaenge:</span>
              <span className="info-value">{ganttItems?.length ?? 0}</span>
              <span className="info-label">Zugewiesene Kolonnen:</span>
              <span className="info-value">{assigns.length}</span>
              <span className="info-label">Status:</span>
              <span className="info-value">
                <span className="chip chip-green">Aktiv</span>
              </span>
            </div>
          </div>
        </div>

        {/* Panel 2: Bauzeitenplan Gantt */}
        <div className="pnl">
          <div className="pnl-h">Bauzeitenplan</div>
          <div className="pnl-b" style={{ overflowX: 'auto' }}>
            {ganttItems && ganttItems.length > 0 ? (
              <table className="gt">
                <thead>
                  <tr>
                    <th className="gt-lbl" style={{ background: 'var(--bg3)' }}>Vorgang</th>
                    {dates.map(d => (
                      <th
                        key={d}
                        className={`gt-hd${isWochenende(d) ? ' we' : ''}${d === todayStr ? ' today' : ''}`}
                      >
                        {parseInt(d.slice(8, 10))}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ganttItems.map(g => (
                    <tr key={g.Id}>
                      <td className="gt-lbl">
                        <div className="n">{g.Title}</div>
                        <div className="s">
                          {g.StartDatum?.slice(0, 10)} - {g.EndeDatum?.slice(0, 10)}
                        </div>
                      </td>
                      {dates.map(d => {
                        const we = isWochenende(d)
                        const isToday = d === todayStr
                        const inRange = g.StartDatum && g.EndeDatum && isInRange(d, g.StartDatum.slice(0, 10), g.EndeDatum.slice(0, 10))
                        return (
                          <td
                            key={d}
                            className={`gt-d${isToday ? ' today' : ''}${we && !inRange ? ' we' : ''}`}
                          >
                            {inRange && <span className="mk mk-U" />}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)' }}>
                Keine Gantt-Vorgaenge
              </div>
            )}
          </div>
        </div>

        {/* Panel 3: Zugewiesene Kolonnen */}
        <div className="pnl">
          <div className="pnl-h">
            Zugewiesene Kolonnen
            <span className="cnt">{assigns.length}</span>
          </div>
          <div className="pnl-b" style={{ overflowX: 'auto' }}>
            {assigns.length > 0 ? (
              <table className="gt">
                <thead>
                  <tr>
                    <th className="gt-lbl" style={{ background: 'var(--bg3)' }}>Kolonne</th>
                    {dates.map(d => (
                      <th
                        key={d}
                        className={`gt-hd${isWochenende(d) ? ' we' : ''}${d === todayStr ? ' today' : ''}`}
                      >
                        {parseInt(d.slice(8, 10))}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assigns.map(a => {
                    const kol = kolonnen?.find(k => k.Id === a.KolonneId)
                    if (!kol) return null
                    return (
                      <tr key={a.Id}>
                        <td className="gt-lbl">
                          <div className="n">{kol.Title}</div>
                          <div className="s">{kol.Mitglieder?.length ?? 0} MA &middot; {a.Von} - {a.Bis}</div>
                        </td>
                        {dates.map(d => {
                          const we = isWochenende(d)
                          const isToday = d === todayStr
                          const inRange = isInRange(d, a.Von, a.Bis)
                          if (inRange) {
                            const av = getKolAvail(a.KolonneId, d)
                            const c = av.pct >= 80 ? 'var(--green)' : av.pct >= 50 ? 'var(--orange)' : 'var(--red)'
                            return (
                              <td
                                key={d}
                                className={`gt-d${isToday ? ' today' : ''}`}
                                title={`${av.avail}/${av.total} verfuegbar`}
                              >
                                <span className="mk" style={{ background: c, fontSize: 7 }}>
                                  {av.avail}
                                </span>
                              </td>
                            )
                          }
                          return (
                            <td key={d} className={`gt-d${we ? ' we' : ''}${isToday ? ' today' : ''}`} />
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)' }}>
                Noch keine Kolonnen zugewiesen
              </div>
            )}
          </div>
        </div>

        {/* Panel 4: Verfuegbarkeit Teammitglieder */}
        <div className="pnl">
          <div className="pnl-h">Verfuegbarkeit Teammitglieder</div>
          <div className="pnl-b" style={{ overflowX: 'auto' }}>
            {teamMembers.length > 0 ? (
              <table className="gt">
                <thead>
                  <tr>
                    <th className="gt-lbl" style={{ background: 'var(--bg3)' }}>Mitarbeiter</th>
                    {dates.map(d => (
                      <th
                        key={d}
                        className={`gt-hd${isWochenende(d) ? ' we' : ''}${d === todayStr ? ' today' : ''}`}
                      >
                        {parseInt(d.slice(8, 10))}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map(tm => {
                    const ma = mitarbeiter?.find(m => m.PersNr === tm.persNr)
                    const displayName = ma ? (ma.Vorname ? `${ma.Vorname} ${ma.Title}` : ma.Title) : tm.persNr
                    return (
                      <tr key={tm.persNr}>
                        <td className="gt-lbl">
                          <div className="n">{displayName}</div>
                          <div className="s">{tm.kolName}</div>
                        </td>
                        {dates.map(d => {
                          const we = isWochenende(d)
                          const isToday = d === todayStr
                          const absTyp = absMap.get(`${tm.persNr}-${d}`)
                          if (absTyp) {
                            return (
                              <td key={d} className={`gt-d${isToday ? ' today' : ''}`}>
                                <span className={`mk mk-${absTyp}`}>{absTyp}</span>
                              </td>
                            )
                          }
                          return (
                            <td key={d} className={`gt-d${we ? ' we' : ''}${isToday ? ' today' : ''}`}>
                              {!we && !isFeiertag(d) && (
                                <span className="mk" style={{ background: 'var(--green)', opacity: 0.3 }} />
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)' }}>
                Weise erst Kolonnen zu um Mitarbeiter-Verfuegbarkeit zu sehen
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <AssignModal kstId={kstId} onClose={() => setShowAssignModal(false)} />
      )}
    </>
  )
}
