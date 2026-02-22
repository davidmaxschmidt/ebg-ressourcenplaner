const API_URL = import.meta.env.VITE_API_URL || ''

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...opts?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API ${res.status}: ${body}`)
  }
  return res.json()
}

// --- Mitarbeiter ---
export const getMitarbeiter = () =>
  request<{ value: import('./types').Mitarbeiter[] }>('/api/mitarbeiter').then(r => r.value)

export const createMitarbeiter = (data: Partial<import('./types').Mitarbeiter>) =>
  request<import('./types').Mitarbeiter>('/api/mitarbeiter', { method: 'POST', body: JSON.stringify(data) })

export const updateMitarbeiter = (id: number, data: Partial<import('./types').Mitarbeiter>) =>
  request<void>(`/api/mitarbeiter/${id}`, { method: 'PUT', body: JSON.stringify(data) })

// --- Abwesenheiten ---
export const getAbwesenheiten = (von: string, bis: string) =>
  request<{ value: import('./types').Abwesenheit[] }>(`/api/abwesenheiten?von=${von}&bis=${bis}`).then(r => r.value)

export const createAbwesenheit = (data: Partial<import('./types').Abwesenheit>) =>
  request<import('./types').Abwesenheit>('/api/abwesenheiten', { method: 'POST', body: JSON.stringify(data) })

export const deleteAbwesenheit = (id: number) =>
  request<void>(`/api/abwesenheiten/${id}`, { method: 'DELETE' })

// --- Kostenstellen ---
export const getKostenstellen = () =>
  request<{ value: import('./types').Kostenstelle[] }>('/api/kostenstellen').then(r => r.value)

export const updateKostenstelle = (id: number, data: Partial<import('./types').Kostenstelle>) =>
  request<void>(`/api/kostenstellen/${id}`, { method: 'PUT', body: JSON.stringify(data) })

// --- Kolonnen ---
export const getKolonnen = () =>
  request<{ value: import('./types').Kolonne[] }>('/api/kolonnen').then(r => r.value)

export const createKolonne = (data: Partial<import('./types').Kolonne>) =>
  request<import('./types').Kolonne>('/api/kolonnen', { method: 'POST', body: JSON.stringify(data) })

export const updateKolonne = (id: number, data: Partial<import('./types').Kolonne>) =>
  request<void>(`/api/kolonnen/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const deleteKolonne = (id: number) =>
  request<void>(`/api/kolonnen/${id}`, { method: 'DELETE' })

export const addKolonneMitglied = (kolonneId: number, persNr: string) =>
  request<void>(`/api/kolonnen/${kolonneId}/mitglieder`, { method: 'POST', body: JSON.stringify({ PersNr: persNr }) })

export const removeKolonneMitglied = (kolonneId: number, persNr: string) =>
  request<void>(`/api/kolonnen/${kolonneId}/mitglieder/${persNr}`, { method: 'DELETE' })

// --- Zuweisungen ---
export const getZuweisungen = () =>
  request<{ value: import('./types').Zuweisung[] }>('/api/zuweisungen').then(r => r.value)

export const createZuweisung = (data: Partial<import('./types').Zuweisung>) =>
  request<import('./types').Zuweisung>('/api/zuweisungen', { method: 'POST', body: JSON.stringify(data) })

export const updateZuweisung = (id: number, data: Partial<import('./types').Zuweisung>) =>
  request<void>(`/api/zuweisungen/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const deleteZuweisung = (id: number) =>
  request<void>(`/api/zuweisungen/${id}`, { method: 'DELETE' })

// --- Gantt ---
export const getGanttItems = (kstNr?: string) =>
  request<{ value: import('./types').GanttItem[] }>(`/api/gantt${kstNr ? `?kstNr=${encodeURIComponent(kstNr)}` : ''}`).then(r => r.value)

export const createGanttItem = (data: Partial<import('./types').GanttItem>) =>
  request<import('./types').GanttItem>('/api/gantt', { method: 'POST', body: JSON.stringify(data) })

export const updateGanttItem = (id: number, data: Partial<import('./types').GanttItem>) =>
  request<void>(`/api/gantt/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const deleteGanttItem = (id: number) =>
  request<void>(`/api/gantt/${id}`, { method: 'DELETE' })

// --- Health ---
export const getHealth = () =>
  request<import('./types').HealthResponse>('/api/health')
