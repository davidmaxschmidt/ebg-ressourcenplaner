import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from './client'
import type { Mitarbeiter, Abwesenheit, AbwesenheitTyp } from './types'

// --- Mitarbeiter ---
export function useMitarbeiter() {
  return useQuery({
    queryKey: ['mitarbeiter'],
    queryFn: api.getMitarbeiter,
    staleTime: 5 * 60_000,
  })
}

export function useCreateMitarbeiter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Mitarbeiter>) => api.createMitarbeiter(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mitarbeiter'] }),
  })
}

export function useUpdateMitarbeiter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Mitarbeiter> }) =>
      api.updateMitarbeiter(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mitarbeiter'] }),
  })
}

// --- Abwesenheiten ---
export function useAbwesenheiten(von: string, bis: string) {
  return useQuery({
    queryKey: ['abwesenheiten', von, bis],
    queryFn: () => api.getAbwesenheiten(von, bis),
    staleTime: 2 * 60_000,
    enabled: !!von && !!bis,
  })
}

export function useSetAbwesenheit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { PersNr: string; Datum: string; Typ: AbwesenheitTyp }) =>
      api.createAbwesenheit(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['abwesenheiten'] }),
  })
}

export function useDeleteAbwesenheit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.deleteAbwesenheit(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['abwesenheiten'] }),
  })
}

// --- Kostenstellen ---
export function useKostenstellen() {
  return useQuery({
    queryKey: ['kostenstellen'],
    queryFn: api.getKostenstellen,
    staleTime: 10 * 60_000,
  })
}

export function useUpdateKostenstelle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<import('./types').Kostenstelle> }) =>
      api.updateKostenstelle(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kostenstellen'] }),
  })
}

// --- Kolonnen ---
export function useKolonnen() {
  return useQuery({
    queryKey: ['kolonnen'],
    queryFn: api.getKolonnen,
    staleTime: 5 * 60_000,
  })
}

export function useCreateKolonne() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<import('./types').Kolonne>) => api.createKolonne(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kolonnen'] }),
  })
}

export function useDeleteKolonne() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.deleteKolonne(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kolonnen'] }),
  })
}

export function useAddKolonneMitglied() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ kolonneId, persNr }: { kolonneId: number; persNr: string }) =>
      api.addKolonneMitglied(kolonneId, persNr),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kolonnen'] }),
  })
}

export function useRemoveKolonneMitglied() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ kolonneId, persNr }: { kolonneId: number; persNr: string }) =>
      api.removeKolonneMitglied(kolonneId, persNr),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kolonnen'] }),
  })
}

// --- Zuweisungen ---
export function useZuweisungen() {
  return useQuery({
    queryKey: ['zuweisungen'],
    queryFn: api.getZuweisungen,
    staleTime: 5 * 60_000,
  })
}

export function useCreateZuweisung() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<import('./types').Zuweisung>) => api.createZuweisung(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zuweisungen'] }),
  })
}

export function useDeleteZuweisung() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.deleteZuweisung(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zuweisungen'] }),
  })
}

// --- Gantt ---
export function useGanttItems(kstNr?: string) {
  return useQuery({
    queryKey: ['gantt', kstNr],
    queryFn: () => api.getGanttItems(kstNr),
    staleTime: 5 * 60_000,
  })
}

export function useCreateGanttItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<import('./types').GanttItem>) => api.createGanttItem(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gantt'] }),
  })
}

export function useUpdateGanttItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<import('./types').GanttItem> }) =>
      api.updateGanttItem(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gantt'] }),
  })
}

export function useDeleteGanttItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.deleteGanttItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gantt'] }),
  })
}

// --- Health ---
export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
    staleTime: 30_000,
  })
}

// --- Helpers ---
export function useAbwesenheitMap(von: string, bis: string) {
  const { data: abwesenheiten } = useAbwesenheiten(von, bis)
  const map = new Map<string, Abwesenheit>()
  abwesenheiten?.forEach(a => map.set(`${a.PersNr}-${a.Datum}`, a))
  return map
}
