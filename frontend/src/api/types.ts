export interface Mitarbeiter {
  Id: number
  PersNr: string
  Title: string       // Nachname
  Vorname?: string
  Gruppe: string
  Notizen?: string
  Urlaubstage: number
  Aktiv: boolean
}

export interface Abwesenheit {
  Id: number
  Title: string        // PersNr-YYYY-MM-DD
  PersNr: string
  Datum: string        // ISO date
  Typ: AbwesenheitTyp
}

export type AbwesenheitTyp = 'U' | 'K' | 'FE' | 'P' | 'S' | 'H' | 'UN' | 'BU'

export const ABWESENHEIT_LABELS: Record<AbwesenheitTyp, string> = {
  U: 'Urlaub',
  K: 'Krank',
  FE: 'Fehlt entschuldigt',
  P: 'Praktikum',
  S: 'Schule',
  H: 'Halbtag',
  UN: 'Urlaub nachmittags',
  BU: 'Betriebsurlaub',
}

export interface Kostenstelle {
  Id: number
  Title: string        // z.B. "24.002 DU-Am Unkelstein (Netze DU)"
  Aktiv: boolean
  Bauleiter?: string
  Auftraggeber?: string
  StartDatum?: string
  EndeDatum?: string
}

export interface Kolonne {
  Id: number
  Title: string        // Kolonnenname
  Polier?: string
  Mitglieder?: KolonneMitglied[]
}

export interface KolonneMitglied {
  Id: number
  KolonneId: number
  PersNr: string
}

export interface Zuweisung {
  Id: number
  Title: string
  KolonneId: number
  KostenstelleId: number
  Von: string
  Bis: string
}

export interface GanttItem {
  Id: number
  Title: string
  KostenstelleNr?: string
  StartDatum: string
  EndeDatum: string
  Fortschritt?: number
}

export interface Feiertag {
  datum: string
  name: string
}

export interface HealthResponse {
  status: string
  tokenOk: boolean
  listsAvailable: string[]
}
