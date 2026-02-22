import { useState, useCallback } from 'react'
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'
import DashboardView from './components/dashboard/DashboardView'
import PersonalView from './components/personal/PersonalView'
import BaustellenView from './components/baustellen/BaustellenView'
import ProjektDetailView from './components/baustellen/ProjektDetailView'
import KolonnenView from './components/kolonnen/KolonnenView'
import PlanungView from './components/planung/PlanungView'

export type ViewId = 'dashboard' | 'personal' | 'baustellen' | 'projekt' | 'kolonnen' | 'planung'

export default function App() {
  const now = new Date()
  const [activeView, setActiveView] = useState<ViewId>('dashboard')
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [projektKstId, setProjektKstId] = useState<number | null>(null)

  const openProjekt = useCallback((kstId: number) => {
    setProjektKstId(kstId)
    setActiveView('projekt')
  }, [])

  const goBack = useCallback(() => {
    setActiveView('baustellen')
    setProjektKstId(null)
  }, [])

  return (
    <div className="app">
      <Header />
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        month={month}
        year={year}
        onMonthChange={setMonth}
        onYearChange={setYear}
      />
      <main className="main">
        <div className={`view${activeView === 'dashboard' ? ' act' : ''}`}>
          <DashboardView month={month} year={year} onOpenProjekt={openProjekt} />
        </div>
        <div className={`view${activeView === 'personal' ? ' act' : ''}`}>
          <PersonalView month={month} year={year} />
        </div>
        <div className={`view${activeView === 'baustellen' ? ' act' : ''}`}>
          <BaustellenView onOpenProjekt={openProjekt} />
        </div>
        <div className={`view${activeView === 'projekt' ? ' act' : ''}`}>
          {projektKstId !== null && (
            <ProjektDetailView kstId={projektKstId} month={month} year={year} onBack={goBack} />
          )}
        </div>
        <div className={`view${activeView === 'kolonnen' ? ' act' : ''}`}>
          <KolonnenView month={month} year={year} />
        </div>
        <div className={`view${activeView === 'planung' ? ' act' : ''}`}>
          <PlanungView month={month} year={year} />
        </div>
      </main>
    </div>
  )
}
