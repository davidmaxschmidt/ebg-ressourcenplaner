import { useState, useMemo } from 'react'
import { useKostenstellen, useZuweisungen, useGanttItems } from '../../api/queries'
import { today } from '../../utils/dates'
import LoadingSpinner from '../shared/LoadingSpinner'

interface BaustellenViewProps {
  onOpenProjekt: (kstId: number) => void
}

export default function BaustellenView({ onOpenProjekt }: BaustellenViewProps) {
  const [search, setSearch] = useState('')
  const todayStr = today()

  const { data: kostenstellen, isLoading } = useKostenstellen()
  const { data: zuweisungen } = useZuweisungen()
  const { data: ganttItems } = useGanttItems()

  const activeKst = useMemo(() => {
    const ksts = kostenstellen?.filter(k => k.Aktiv) ?? []
    if (!search) return ksts
    const s = search.toLowerCase()
    return ksts.filter(k => k.Title.toLowerCase().includes(s))
  }, [kostenstellen, search])

  if (isLoading) return <LoadingSpinner />

  return (
    <>
      <div className="fbar">
        <label>Suche:</label>
        <input
          placeholder="Kostenstelle..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="cards" style={{ overflow: 'auto', flex: 1 }}>
        {activeKst.map(kst => {
          const nr = kst.Title.split(' ')[0]
          const name = kst.Title.substring(nr.length + 1)
          const assigns = zuweisungen?.filter(z => z.KostenstelleId === kst.Id) ?? []
          const activeAssigns = assigns.filter(a => todayStr >= a.Von && todayStr <= a.Bis)
          const kstGantt = ganttItems?.filter(g => g.KostenstelleNr === nr) ?? []

          return (
            <div key={kst.Id} className="card" onClick={() => onOpenProjekt(kst.Id)}>
              <div className="card-nr">{nr}</div>
              <div className="card-name">{name}</div>
              <div className="card-meta">
                <span>BL: {kst.Bauleiter ?? '-'}</span>
                {kst.Auftraggeber && <span>AG: {kst.Auftraggeber}</span>}
              </div>
              <div className="card-tags">
                <span className="chip chip-green">Aktiv</span>
                {kstGantt.length > 0 && (
                  <span className="chip chip-blue">{kstGantt.length} Gantt</span>
                )}
                {assigns.length > 0 && (
                  <span className="chip chip-cyan">{assigns.length} Kolonnen</span>
                )}
                {activeAssigns.length > 0 && (
                  <span className="chip chip-yellow">Heute besetzt</span>
                )}
              </div>
            </div>
          )
        })}
        {activeKst.length === 0 && (
          <div className="empty" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-icon">{'\u2698'}</div>
            <div className="empty-title">Keine Baustellen gefunden</div>
          </div>
        )}
      </div>
    </>
  )
}
