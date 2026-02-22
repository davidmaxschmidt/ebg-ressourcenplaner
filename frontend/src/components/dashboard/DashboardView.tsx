import { useMitarbeiter, useAbwesenheiten, useKostenstellen, useKolonnen, useZuweisungen, useGanttItems } from '../../api/queries'
import { today, getMonthDates } from '../../utils/dates'
import { isWochenende, isFeiertag } from '../../utils/feiertage'
import { ABWESENHEIT_LABELS } from '../../api/types'
import type { AbwesenheitTyp } from '../../api/types'
import LoadingSpinner from '../shared/LoadingSpinner'

interface DashboardViewProps {
  month: number
  year: number
  onOpenProjekt: (kstId: number) => void
}

export default function DashboardView({ month, year, onOpenProjekt }: DashboardViewProps) {
  const todayStr = today()
  const dates = getMonthDates(year, month)
  const von = dates[0]
  const bis = dates[dates.length - 1]

  const { data: mitarbeiter, isLoading: loadingMa } = useMitarbeiter()
  const { data: abwesenheiten, isLoading: loadingAbs } = useAbwesenheiten(von, bis)
  const { data: kostenstellen } = useKostenstellen()
  const { data: kolonnen } = useKolonnen()
  const { data: zuweisungen } = useZuweisungen()
  const { data: ganttItems } = useGanttItems()

  if (loadingMa || loadingAbs) return <LoadingSpinner />

  const activeMa = mitarbeiter?.filter(m => m.Aktiv) ?? []
  const activeKst = kostenstellen?.filter(k => k.Aktiv) ?? []

  // Today's absences
  const todayAbs = abwesenheiten?.filter(a => a.Datum === todayStr) ?? []
  const todayAbsPersNrs = new Set(todayAbs.map(a => a.PersNr))
  const absentToday = activeMa.filter(m => todayAbsPersNrs.has(m.PersNr))
  const availableToday = activeMa.length - absentToday.length

  const urlaubToday = todayAbs.filter(a => a.Typ === 'U').length
  const krankToday = todayAbs.filter(a => a.Typ === 'K').length
  const capacityPct = activeMa.length > 0 ? Math.round((availableToday / activeMa.length) * 100) : 0

  // Active assignments today
  const activeAssignments = zuweisungen?.filter(z => todayStr >= z.Von && todayStr <= z.Bis) ?? []

  // Kolonne member count
  const totalKolMembers = kolonnen?.reduce((sum, k) => sum + (k.Mitglieder?.length ?? 0), 0) ?? 0

  // Gantt planned
  const plannedGantt = ganttItems?.length ?? 0

  const chipClass = (typ: AbwesenheitTyp) => {
    if (typ === 'U') return 'chip-blue'
    if (typ === 'K') return 'chip-red'
    if (typ === 'FE') return 'chip-orange'
    return 'chip-gray'
  }

  // Get kolonne name for a PersNr
  const getKolonneName = (persNr: string): string => {
    const kol = kolonnen?.find(k => k.Mitglieder?.some(m => m.PersNr === persNr))
    return kol?.Title ?? '-'
  }

  // Get availability for a kolonne on a date
  const getKolAvail = (kolId: number, date: string) => {
    const kol = kolonnen?.find(k => k.Id === kolId)
    if (!kol || !kol.Mitglieder) return { total: 0, avail: 0, pct: 0 }
    const total = kol.Mitglieder.length
    const absentPersNrs = new Set(
      abwesenheiten?.filter(a => a.Datum === date).map(a => a.PersNr) ?? []
    )
    const avail = kol.Mitglieder.filter(m => !absentPersNrs.has(m.PersNr) && !isWochenende(date) && !isFeiertag(date)).length
    return { total, avail, pct: total > 0 ? Math.round((avail / total) * 100) : 0 }
  }

  return (
    <>
      {/* KPI Cards */}
      <div className="pnl">
        <div className="kpis">
          <div className="kpi">
            <div className="kpi-l">Mitarbeiter</div>
            <div className="kpi-v">{activeMa.length}</div>
            <div className="kpi-s">{new Set(activeMa.map(m => m.Gruppe)).size} Gruppen</div>
          </div>
          <div className="kpi">
            <div className="kpi-l">Heute abwesend</div>
            <div className="kpi-v" style={{ color: 'var(--red)' }}>{absentToday.length}</div>
            <div className="kpi-s">{urlaubToday} Urlaub, {krankToday} krank</div>
          </div>
          <div className="kpi">
            <div className="kpi-l">Heute verfuegbar</div>
            <div className="kpi-v" style={{ color: 'var(--green)' }}>{availableToday}</div>
            <div className="kpi-s">{capacityPct}% Kapazitaet</div>
          </div>
          <div className="kpi">
            <div className="kpi-l">Baustellen</div>
            <div className="kpi-v" style={{ color: 'var(--y)' }}>{activeKst.length}</div>
            <div className="kpi-s">{activeAssignments.length} mit Kolonne heute</div>
          </div>
          <div className="kpi">
            <div className="kpi-l">Kolonnen</div>
            <div className="kpi-v" style={{ color: 'var(--cyan)' }}>{kolonnen?.length ?? 0}</div>
            <div className="kpi-s">{totalKolMembers} Mitglieder</div>
          </div>
          <div className="kpi">
            <div className="kpi-l">Gantt-Vorgaenge</div>
            <div className="kpi-v" style={{ color: 'var(--blue)' }}>{plannedGantt}</div>
            <div className="kpi-s">{plannedGantt} geplant</div>
          </div>
        </div>
      </div>

      {/* Today's Absences */}
      <div className="pnl pnl-grow">
        <div className="pnl-h">
          Heutige Abwesenheiten
          <span className="cnt">{absentToday.length}</span>
        </div>
        <div className="pnl-b">
          {absentToday.length > 0 ? (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>PersNr</th>
                  <th>Typ</th>
                  <th>Gruppe</th>
                  <th>Kolonne</th>
                </tr>
              </thead>
              <tbody>
                {absentToday.map(ma => {
                  const abs = todayAbs.find(a => a.PersNr === ma.PersNr)
                  const typ = abs?.Typ ?? 'U'
                  return (
                    <tr key={ma.Id}>
                      <td><b>{ma.Vorname ? `${ma.Vorname} ${ma.Title}` : ma.Title}</b></td>
                      <td>{ma.PersNr}</td>
                      <td>
                        <span className={`chip ${chipClass(typ)}`}>
                          {ABWESENHEIT_LABELS[typ] ?? typ}
                        </span>
                      </td>
                      <td>{ma.Gruppe}</td>
                      <td>{getKolonneName(ma.PersNr)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--green)' }}>
              Keine Abwesenheiten heute
            </div>
          )}
        </div>
      </div>

      {/* Active Assignments */}
      <div className="pnl pnl-grow">
        <div className="pnl-h">
          Aktive Baustellen-Zuweisungen
          <span className="cnt">{activeAssignments.length}</span>
        </div>
        <div className="pnl-b">
          {activeAssignments.length > 0 ? (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Baustelle</th>
                  <th>Kolonne</th>
                  <th>Verfuegbarkeit</th>
                  <th>Zeitraum</th>
                </tr>
              </thead>
              <tbody>
                {activeAssignments.map(z => {
                  const kst = kostenstellen?.find(k => k.Id === z.KostenstelleId)
                  const kol = kolonnen?.find(k => k.Id === z.KolonneId)
                  const av = getKolAvail(z.KolonneId, todayStr)
                  const avCol = av.pct >= 80 ? 'var(--green)' : av.pct >= 50 ? 'var(--orange)' : 'var(--red)'
                  return (
                    <tr
                      key={z.Id}
                      className="clickable"
                      onClick={() => kst && onOpenProjekt(kst.Id)}
                    >
                      <td><b>{kst?.Title ?? '?'}</b></td>
                      <td><span className="chip chip-cyan">{kol?.Title ?? '?'}</span></td>
                      <td>
                        <span style={{ color: avCol }}>
                          {av.avail}/{av.total} ({av.pct}%)
                        </span>
                        <div className="avail-bar">
                          <div
                            className="avail-fill"
                            style={{ width: `${av.pct}%`, background: avCol }}
                          />
                        </div>
                      </td>
                      <td>{z.Von} &rarr; {z.Bis}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)' }}>
              Keine aktiven Zuweisungen. Erstelle Kolonnen und weise sie Baustellen zu.
            </div>
          )}
        </div>
      </div>
    </>
  )
}
