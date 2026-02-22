import type { AbwesenheitTyp } from '../api/types'

export const ABWESENHEIT_COLORS: Record<AbwesenheitTyp, string> = {
  U: '#4A90D9',   // Urlaub - blau
  K: '#E74C3C',   // Krank - rot
  FE: '#F39C12',  // Fehlt entschuldigt - orange
  P: '#9B59B6',   // Praktikum - lila
  S: '#1ABC9C',   // Schule - tuerkis
  H: '#95A5A6',   // Halbtag - grau
  UN: '#6BAED6',  // Urlaub nachmittags - hellblau
  BU: '#34495E',  // Betriebsurlaub - dunkelgrau
}

export const FEIERTAG_COLOR = '#BDBDBD'
export const WOCHENENDE_COLOR = '#F5F5F5'
export const VERFUEGBAR_COLOR = '#27AE60'
export const HEUTE_COLOR = '#FFF200'

export function availabilityColor(percent: number): string {
  if (percent >= 80) return '#27AE60'
  if (percent >= 50) return '#F39C12'
  return '#E74C3C'
}
