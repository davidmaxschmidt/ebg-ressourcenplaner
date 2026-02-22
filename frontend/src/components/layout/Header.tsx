import { useHealth } from '../../api/queries'
import { today, formatDate, getWeekday } from '../../utils/dates'
import { useQueryClient } from '@tanstack/react-query'

export default function Header() {
  const { data: health } = useHealth()
  const qc = useQueryClient()
  const todayStr = today()
  const isLive = health?.status === 'ok' && health?.tokenOk

  const handleRefresh = () => {
    qc.invalidateQueries()
  }

  return (
    <header className="hdr">
      <div className="logo">
        <span className="logo-t">EBG</span>
      </div>
      <div className="hdr-sep" />
      <div className="hdr-title">
        <span>EBG</span> Ressourcenplaner
      </div>
      <div className="hdr-r">
        <div className="badge">
          <div className={`dot ${isLive ? 'dot-g' : 'dot-r'}`} />
          <span>{isLive ? 'Live' : 'Offline'}</span>
        </div>
        <div className="badge">
          {getWeekday(todayStr)}, {formatDate(todayStr)}
        </div>
        <button className="btn" onClick={handleRefresh}>
          Aktualisieren
        </button>
      </div>
    </header>
  )
}
