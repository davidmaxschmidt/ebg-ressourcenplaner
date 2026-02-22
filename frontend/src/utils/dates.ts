export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function addDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return toISO(d)
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function getMonthDates(year: number, month: number): string[] {
  const days = getDaysInMonth(year, month)
  const dates: string[] = []
  for (let d = 1; d <= days; d++) {
    dates.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  return dates
}

export function getWeekDates(startDate: string, weeks: number): string[] {
  const dates: string[] = []
  for (let i = 0; i < weeks * 7; i++) {
    dates.push(addDays(startDate, i))
  }
  return dates
}

export function getMonday(date: string): string {
  const d = new Date(date + 'T00:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return toISO(d)
}

export function formatDate(date: string): string {
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

export function formatDateFull(date: string): string {
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function getWeekday(date: string): string {
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('de-DE', { weekday: 'short' })
}

export function getWeekNumber(date: string): number {
  const d = new Date(date + 'T00:00:00')
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function today(): string {
  return toISO(new Date())
}

export function monthName(month: number): string {
  return ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][month]
}

export function isInRange(date: string, von: string, bis: string): boolean {
  return date >= von && date <= bis
}

export function daysBetween(von: string, bis: string): number {
  const a = new Date(von + 'T00:00:00')
  const b = new Date(bis + 'T00:00:00')
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}
