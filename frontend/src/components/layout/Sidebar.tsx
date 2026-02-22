import type { ViewId } from '../../App'
import { useMitarbeiter, useKostenstellen, useKolonnen } from '../../api/queries'
import { monthName } from '../../utils/dates'

interface SidebarProps {
  activeView: ViewId
  onNavigate: (view: ViewId) => void
  month: number
  year: number
  onMonthChange: (m: number) => void
  onYearChange: (y: number) => void
}

const NAV_ITEMS: { id: ViewId; icon: string; label: string; showCount?: boolean }[] = [
  { id: 'dashboard', icon: '\u25A0', label: 'Dashboard' },
  { id: 'personal', icon: '\u262F', label: 'Personal', showCount: true },
  { id: 'baustellen', icon: '\u2698', label: 'Baustellen', showCount: true },
  { id: 'kolonnen', icon: '\u2699', label: 'Kolonnen', showCount: true },
  { id: 'planung', icon: '\u2637', label: 'Planung' },
]

export default function Sidebar({ activeView, onNavigate, month, year, onMonthChange, onYearChange }: SidebarProps) {
  const { data: mitarbeiter } = useMitarbeiter()
  const { data: kostenstellen } = useKostenstellen()
  const { data: kolonnen } = useKolonnen()

  const activeMa = mitarbeiter?.filter(m => m.Aktiv) ?? []
  const activeKst = kostenstellen?.filter(k => k.Aktiv) ?? []

  const counts: Record<string, number> = {
    personal: activeMa.length,
    baustellen: activeKst.length,
    kolonnen: kolonnen?.length ?? 0,
  }

  // Build month options for current year and next
  const months: { label: string; month: number; year: number }[] = []
  for (let y = year; y <= year + 1; y++) {
    for (let m = 0; m < 12; m++) {
      months.push({ label: `${monthName(m)} ${y}`, month: m, year: y })
    }
  }

  const handleMonthSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [m, y] = e.target.value.split('-').map(Number)
    onMonthChange(m)
    onYearChange(y)
  }

  return (
    <nav className="side">
      <div className="nav-s">Ansichten</div>
      {NAV_ITEMS.map(item => (
        <div
          key={item.id}
          className={`nav-i${activeView === item.id || (item.id === 'baustellen' && activeView === 'projekt') ? ' act' : ''}`}
          onClick={() => onNavigate(item.id)}
        >
          <span>{item.icon}</span> {item.label}
          {item.showCount && (
            <span className="nav-c">{counts[item.id] ?? '-'}</span>
          )}
        </div>
      ))}
      <div className="nav-s" style={{ marginTop: 16 }}>Zeitraum</div>
      <div style={{ padding: '6px 14px' }}>
        <select
          value={`${month}-${year}`}
          onChange={handleMonthSelect}
          style={{
            width: '100%',
            background: 'var(--bg3)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            padding: 5,
            borderRadius: 'var(--r)',
            fontSize: 11,
          }}
        >
          {months.map(m => (
            <option key={`${m.month}-${m.year}`} value={`${m.month}-${m.year}`}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div className="side-spacer" />
    </nav>
  )
}
