import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import UebersichtView from './components/uebersicht/UebersichtView'
import AbwesenheitenView from './components/abwesenheiten/AbwesenheitenView'
import ProjektplanungView from './components/projektplanung/ProjektplanungView'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<UebersichtView />} />
        <Route path="/abwesenheiten" element={<AbwesenheitenView />} />
        <Route path="/projektplanung" element={<ProjektplanungView />} />
      </Route>
    </Routes>
  )
}
