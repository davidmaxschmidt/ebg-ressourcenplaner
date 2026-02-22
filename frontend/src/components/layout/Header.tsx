import { NavLink } from 'react-router-dom'

export default function Header() {
  return (
    <header className="app-header">
      <img src={import.meta.env.BASE_URL + 'EBGLOGO.png'} alt="EBG" />
      <div className="header-sep" />
      <span className="header-title">Ressourcenplaner</span>
      <nav className="header-nav">
        <NavLink to="/" end>Uebersicht</NavLink>
        <NavLink to="/abwesenheiten">Abwesenheiten</NavLink>
        <NavLink to="/projektplanung">Projektplanung</NavLink>
      </nav>
    </header>
  )
}
