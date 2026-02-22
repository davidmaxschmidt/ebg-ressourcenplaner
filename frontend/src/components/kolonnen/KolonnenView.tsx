import { useState, useMemo, useCallback } from 'react'
import {
  useMitarbeiter,
  useAbwesenheiten,
  useKolonnen,
  useKostenstellen,
  useZuweisungen,
  useDeleteKolonne,
} from '../../api/queries'
import { today, getMonthDates } from '../../utils/dates'
import { isWochenende, isFeiertag } from '../../utils/feiertage'
import KolonneModal from './KolonneModal'
import LoadingSpinner from '../shared/LoadingSpinner'

interface KolonnenViewProps {
  month: number
  year: number
}

export default function KolonnenView({ month, year }: KolonnenViewProps) {
  const [editKolId, setEditKolId] = useState<number | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)

  const todayStr = today()
  const dates = useMemo(() => getMonthDates(year, month), [year, month])
  const von = dates[0]
  const bis = dates[dates.length - 1]

  const { data: kolonnen, isLoading: loadingKol } = useKolonnen()
  const { data: mitarbeiter } = useMitarbeiter()
  const { data: abwesenheiten } = useAbwesenheiten(von, bis)
  const { data: kostenstellen } = useKostenstellen()
  const { data: zuweisungen } = useZuweisungen()
  const deleteKolonne = useDeleteKolonne()

  // Absence map for today
  const todayAbsent = useMemo(() => {
    return new Set(
      abwesenheiten?.filter(a => a.Datum === todayStr).map(a => a.PersNr) ?? []
    )
  }, [abwesenheiten, todayStr])

  const isAvailable = useCallback((persNr: string) => {
    if (isWochenende(todayStr) || isFeiertag(todayStr)) return false
    return !todayAbsent.has(persNr)
  }, [todayStr, todayAbsent])

  const getKolAvail = useCallback((kol: { Mitglieder?: { PersNr: string }[] }) => {
    const members = kol.Mitglieder ?? []
    const total = members.length
    const avail = members.filter(m => isAvailable(m.PersNr)).length
    return { total, avail, pct: total > 0 ? Math.round((avail / total) * 100) : 0 }
  }, [isAvailable])

  const handleDelete = useCallback((id: number) => {
    if (window.confirm('Kolonne wirklich loeschen?')) {
      deleteKolonne.mutate(id)
    }
  }, [deleteKolonne])

  if (loadingKol) return <LoadingSpinner />

  return (
    <>
      <div className="fbar">
        <button className="btn btn-y" onClick={() => setShowNewModal(true)}>
          + Neue Kolonne
        </button>
      </div>

      <div className="cards" style={{ overflow: 'auto', flex: 1 }}>
        {kolonnen && kolonnen.length > 0 ? (
          kolonnen.map(kol => {
            const assigns = zuweisungen?.filter(z => z.KolonneId === kol.Id) ?? []
            const av = getKolAvail(kol)
            const avCol = av.pct >= 80 ? 'var(--green)' : av.pct >= 50 ? 'var(--orange)' : 'var(--red)'

            return (
              <div key={kol.Id} className="kol-card">
                <div className="kol-name">
                  <span className="chip chip-cyan">{kol.Title}</span>
                  <button
                    className="btn btn-sm"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => setEditKolId(kol.Id)}
                  >
                    Bearbeiten
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() => handleDelete(kol.Id)}
                  >
                    {'\u2715'}
                  </button>
                </div>
                <div className="kol-polier">
                  Polier: {kol.Polier || '-'} &middot; {kol.Mitglieder?.length ?? 0} Mitglieder
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: avCol }}>
                  Heute: {av.avail}/{av.total} verfuegbar ({av.pct}%)
                </div>
                <div className="avail-bar">
                  <div
                    className="avail-fill"
                    style={{ width: `${av.pct}%`, background: avCol }}
                  />
                </div>
                <div className="kol-members">
                  {kol.Mitglieder?.map(m => {
                    const ma = mitarbeiter?.find(x => x.PersNr === m.PersNr)
                    const avail = isAvailable(m.PersNr)
                    const displayName = ma ? (ma.Vorname ? `${ma.Vorname} ${ma.Title}` : ma.Title) : m.PersNr
                    return (
                      <div key={m.PersNr} className="kol-m">
                        <span>{displayName}</span>
                        <div
                          className="avail"
                          style={{ background: avail ? 'var(--green)' : 'var(--red)' }}
                        />
                      </div>
                    )
                  })}
                </div>
                {assigns.length > 0 && (
                  <div className="kol-assign">
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>
                      BAUSTELLEN-ZUWEISUNGEN
                    </div>
                    {assigns.map(a => {
                      const kstItem = kostenstellen?.find(k => k.Id === a.KostenstelleId)
                      const active = todayStr >= a.Von && todayStr <= a.Bis
                      return (
                        <div key={a.Id} className="kol-assign-item">
                          <span style={{ color: active ? 'var(--y)' : 'var(--text3)' }}>
                            {kstItem?.Title ?? '?'}
                          </span>
                          <span>{a.Von} - {a.Bis}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div className="empty" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-icon">{'\u2699'}</div>
            <div className="empty-title">Noch keine Kolonnen erstellt</div>
            <div className="empty-desc">
              Klicke oben auf &quot;+ Neue Kolonne&quot; um ein Team zu erstellen und Mitarbeiter zuzuweisen.
            </div>
          </div>
        )}
      </div>

      {/* New/Edit Modal */}
      {(showNewModal || editKolId !== null) && (
        <KolonneModal
          editId={editKolId}
          onClose={() => {
            setShowNewModal(false)
            setEditKolId(null)
          }}
        />
      )}
    </>
  )
}
