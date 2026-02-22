import type { Feiertag } from '../api/types'

export const FEIERTAGE_2026: Feiertag[] = [
  { datum: '2026-01-01', name: 'Neujahr' },
  { datum: '2026-02-16', name: 'Rosenmontag' },
  { datum: '2026-04-03', name: 'Karfreitag' },
  { datum: '2026-04-06', name: 'Ostermontag' },
  { datum: '2026-05-01', name: 'Tag der Arbeit' },
  { datum: '2026-05-14', name: 'Christi Himmelfahrt' },
  { datum: '2026-05-25', name: 'Pfingstmontag' },
  { datum: '2026-06-04', name: 'Fronleichnam' },
  { datum: '2026-10-03', name: 'Tag der Deutschen Einheit' },
  { datum: '2026-11-01', name: 'Allerheiligen' },
  { datum: '2026-12-25', name: '1. Weihnachtstag' },
  { datum: '2026-12-26', name: '2. Weihnachtstag' },
  { datum: '2026-12-31', name: 'Silvester' },
  { datum: '2027-01-01', name: 'Neujahr' },
]

export const BETRIEBSURLAUB_2026 = [
  '2026-01-02',
  '2026-02-17',
  '2026-05-15',
  '2026-06-05',
]

const feiertagSet = new Set(FEIERTAGE_2026.map(f => f.datum))
const buSet = new Set(BETRIEBSURLAUB_2026)

export function isFeiertag(datum: string): boolean {
  return feiertagSet.has(datum)
}

export function isBetriebsurlaub(datum: string): boolean {
  return buSet.has(datum)
}

export function isWochenende(datum: string): boolean {
  const d = new Date(datum + 'T00:00:00')
  const day = d.getDay()
  return day === 0 || day === 6
}

export function isArbeitstag(datum: string): boolean {
  return !isWochenende(datum) && !isFeiertag(datum)
}

export function getFeiertagName(datum: string): string | undefined {
  return FEIERTAGE_2026.find(f => f.datum === datum)?.name
}
