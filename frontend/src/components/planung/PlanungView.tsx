import { useState, useMemo, useCallback } from 'react'
import {
  useMitarbeiter,
  useAbwesenheiten,
  useKolonnen,
  useKostenstellen,
  useZuweisungen,
} from '../../api/queries'
import { getMonthDates, today } from '../../utils/dates'
import { isWochenende, isFeiertag } from '../../utils/feiertage'
import LoadingSpinner from '../shared/LoadingSpinner'

interface PlanungViewProps {
  month: number
  year: number
}

export default function PlanungView({ month, year }: PlanungViewProps) {
  const [tab, setTab] = useState(0)

  const dates = useMemo(() => getMonthDates(year, month), [year, month])
  const von = dates[0]
  const bis = dates[dates.length - 1]
  const todayStr = today()

  const { data: mitarbeiter } = useMitarbeiter()
  const { data: abwesenheiten, isLoading } = useAbwesenheiten(von, bis)
  const { data: kolonnen } = useKolonnen()
  const { data: kostenstellen } = useKostenstellen()
  const { data: zuweisungen } = useZuweisungen()

  // Absence map
  const absMap = useMemo(() => {
    const map = new Map<string, string>()
    abwesenheiten?.forEach(a => map.set(`${a.PersNr}-${a.Datum}`, a.Typ))
    return map
  }, [abwesenheiten])

  // Kolonne availability for a date
  const getKolAvail = useCallback((kolId: number, datum: string) => {
    const kol = kolonnen?.find(k => k.Id === kolId)
    if (!kol || !kol.Mitglieder) return { total: 0, avail: 0, pct: 0 }
    const total = kol.Mitglieder.length
    if (isWochenende(datum) || isFeiertag(datum)) return { total, avail: 0, pct: 0 }
    const avail = kol.Mitglieder.filter(m => !absMap.has(`${m.PersNr}-${datum}`)).length
    return { total, avail, pct: total > 0 ? Math.round((avail / total) * 100) : 0 }
  }, [kolonnen, absMap])

  if (isLoading) return <LoadingSpinner />

  return (
    <>
      {/* Tabs */}
      <div className="tabs">
        <div className={`tab${tab === 0 ? ' act' : ''}`} onClick={() => setTab(0)}>
          Verfuegbarkeitsmatrix
        </div>
        <div className={`tab${tab === 1 ? ' act' : ''}`} onClick={() => setTab(1)}>
          Baustellenbesetzung
        </div>
      </div>

      {/* Tab 0: Verfuegbarkeitsmatrix */}
      {tab === 0 && (
        <div className="gantt-wrap" style={{ flex: 1 }}>
          <table className="gt">
            <thead>
              <tr>
                <th className="gt-lbl" style={{ background: 'var(--bg3)' }}>Kolonne / Mitarbeiter</th>
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
              {!kolonnen?.length && (
                <tr>
                  <td colSpan={dates.length + 1} style={{ padding: 30, textAlign: 'center', color: 'var(--text3)' }}>
                    Erstelle Kolonnen um die Verfuegbarkeitsmatrix zu sehen
                  </td>
                </tr>
              )}
              {kolonnen?.map(kol => {
                const assigns = zuweisungen?.filter(z => z.KolonneId === kol.Id) ?? []
                return (
                  <KolonneAvailRow
                    key={kol.Id}
                    kol={kol}
                    dates={dates}
                    todayStr={todayStr}
                    absMap={absMap}
                    getKolAvail={getKolAvail}
                    assigns={assigns}
                    kostenstellen={kostenstellen}
                    mitarbeiter={mitarbeiter}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 1: Baustellenbesetzung */}
      {tab === 1 && (
        <div style={{ overflow: 'auto', flex: 1 }}>
          <table className="gt">
            <thead>
              <tr>
                <th className="gt-lbl" style={{ background: 'var(--bg3)' }}>Baustelle</th>
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
              {kostenstellen?.filter(k => k.Aktiv).map(kst => {
                const kstAssigns = zuweisungen?.filter(z => z.KostenstelleId === kst.Id) ?? []
                const nr = kst.Title.split(' ')[0]
                const name = kst.Title.substring(nr.length + 1)
                return (
                  <tr key={kst.Id}>
                    <td className="gt-lbl">
                      <div className="n">{nr}</div>
                      <div className="s">{name.substring(0, 25)}</div>
                    </td>
                    {dates.map(d => {
                      const we = isWochenende(d)
                      const isToday = d === todayStr
                      const dayAssigns = kstAssigns.filter(a => d >= a.Von && d <= a.Bis)

                      if (dayAssigns.length > 0) {
                        let totalMa = 0
                        let availMa = 0
                        dayAssigns.forEach(a => {
                          const av = getKolAvail(a.KolonneId, d)
                          totalMa += av.total
                          availMa += av.avail
                        })
                        const c = totalMa > 0
                          ? (availMa >= totalMa * 0.8 ? 'var(--green)' : availMa >= totalMa * 0.5 ? 'var(--orange)' : 'var(--red)')
                          : 'var(--text3)'
                        return (
                          <td key={d} className={`gt-d${isToday ? ' today' : ''}`} title={`${availMa} MA verfuegbar`}>
                            <span className="mk" style={{ background: c, fontSize: 7 }}>{availMa}</span>
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
        </div>
      )}
    </>
  )
}

// Sub-component for a kolonne row + its member rows in the availability matrix
interface KolonneAvailRowProps {
  kol: { Id: number; Title: string; Mitglieder?: { PersNr: string }[] }
  dates: string[]
  todayStr: string
  absMap: Map<string, string>
  getKolAvail: (kolId: number, datum: string) => { total: number; avail: number; pct: number }
  assigns: { KolonneId: number; KostenstelleId: number; Von: string; Bis: string }[]
  kostenstellen: { Id: number; Title: string }[] | undefined
  mitarbeiter: { PersNr: string; Title: string; Vorname?: string }[] | undefined
}

function KolonneAvailRow({
  kol,
  dates,
  todayStr,
  absMap,
  getKolAvail,
  assigns,
  kostenstellen,
  mitarbeiter,
}: KolonneAvailRowProps) {
  return (
    <>
      {/* Kolonne summary row */}
      <tr className="gt-grp">
        <td className="gt-lbl">{kol.Title} ({kol.Mitglieder?.length ?? 0} MA)</td>
        {dates.map(d => {
          const isToday = d === todayStr
          const av = getKolAvail(kol.Id, d)
          const c = av.pct >= 80 ? 'var(--green)' : av.pct >= 50 ? 'var(--orange)' : 'var(--red)'
          const asg = assigns.find(z => d >= z.Von && d <= z.Bis)

          if (asg) {
            const kstItem = kostenstellen?.find(k => k.Id === asg.KostenstelleId)
            return (
              <td key={d} className={`gt-d${isToday ? ' today' : ''}`} title={`${kstItem?.Title ?? '?'}: ${av.avail}/${av.total}`}>
                <span className="mk" style={{ background: c, fontSize: 7 }}>{av.avail}</span>
              </td>
            )
          }
          return (
            <td key={d} className={`gt-d${isToday ? ' today' : ''}`}>
              <span style={{ fontSize: 9, color: c }}>{av.avail}</span>
            </td>
          )
        })}
      </tr>

      {/* Individual member rows */}
      {kol.Mitglieder?.map(m => {
        const ma = mitarbeiter?.find(x => x.PersNr === m.PersNr)
        const displayName = ma ? (ma.Vorname ? `${ma.Vorname} ${ma.Title}` : ma.Title) : m.PersNr
        return (
          <tr key={m.PersNr}>
            <td className="gt-lbl">
              <div className="n" style={{ fontSize: 10 }}>{displayName}</div>
            </td>
            {dates.map(d => {
              const we = isWochenende(d)
              const isToday = d === todayStr
              const absTyp = absMap.get(`${m.PersNr}-${d}`)
              if (absTyp) {
                return (
                  <td key={d} className={`gt-d${isToday ? ' today' : ''}`}>
                    <span className={`mk mk-${absTyp}`} style={{ fontSize: 8 }}>{absTyp}</span>
                  </td>
                )
              }
              return (
                <td key={d} className={`gt-d${we ? ' we' : ''}${isToday ? ' today' : ''}`}>
                  {!we && !isFeiertag(d) && (
                    <span className="mk" style={{ background: 'var(--green)', opacity: 0.2 }} />
                  )}
                </td>
              )
            })}
          </tr>
        )
      })}
    </>
  )
}
