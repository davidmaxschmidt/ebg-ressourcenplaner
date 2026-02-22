import { useState, useMemo } from 'react'
import {
  useMitarbeiter,
  useKolonnen,
  useCreateKolonne,
  useAddKolonneMitglied,
  useRemoveKolonneMitglied,
} from '../../api/queries'

interface KolonneModalProps {
  editId: number | null
  onClose: () => void
}

export default function KolonneModal({ editId, onClose }: KolonneModalProps) {
  const { data: mitarbeiter } = useMitarbeiter()
  const { data: kolonnen } = useKolonnen()
  const createKolonne = useCreateKolonne()
  const addMitglied = useAddKolonneMitglied()
  const removeMitglied = useRemoveKolonneMitglied()

  const editKol = editId !== null ? kolonnen?.find(k => k.Id === editId) : null

  const [name, setName] = useState(editKol?.Title ?? '')
  const [polier, setPolier] = useState(editKol?.Polier ?? '')
  const [search, setSearch] = useState('')
  const [selectedPersNrs, setSelectedPersNrs] = useState<Set<string>>(
    new Set(editKol?.Mitglieder?.map(m => m.PersNr) ?? [])
  )

  // Filter out inactive groups
  const EXCLUDED_GROUPS = ['Krankengeld / Ausgesteuert', 'Ausgeschiedene Mitarbeiter']
  const maList = useMemo(() => {
    return mitarbeiter?.filter(m => m.Aktiv && !EXCLUDED_GROUPS.includes(m.Gruppe)) ?? []
  }, [mitarbeiter])

  const filteredMa = useMemo(() => {
    if (!search) return maList
    const s = search.toLowerCase()
    return maList.filter(m => {
      const fullName = `${m.Vorname ?? ''} ${m.Title}`.toLowerCase()
      return fullName.includes(s) || m.PersNr.includes(s)
    })
  }, [maList, search])

  const toggleMember = (persNr: string) => {
    setSelectedPersNrs(prev => {
      const next = new Set(prev)
      if (next.has(persNr)) {
        next.delete(persNr)
      } else {
        next.add(persNr)
      }
      return next
    })
  }

  const handleSave = async () => {
    if (!name.trim()) return

    if (editKol) {
      // For edit: add/remove members
      const currentPersNrs = new Set(editKol.Mitglieder?.map(m => m.PersNr) ?? [])
      const toAdd = [...selectedPersNrs].filter(p => !currentPersNrs.has(p))
      const toRemove = [...currentPersNrs].filter(p => !selectedPersNrs.has(p))

      // Process additions and removals
      for (const persNr of toAdd) {
        await addMitglied.mutateAsync({ kolonneId: editKol.Id, persNr })
      }
      for (const persNr of toRemove) {
        await removeMitglied.mutateAsync({ kolonneId: editKol.Id, persNr })
      }
    } else {
      // Create new kolonne
      const newKol = await createKolonne.mutateAsync({
        Title: name.trim(),
        Polier: polier.trim() || undefined,
      })

      // Add members
      if (newKol?.Id) {
        for (const persNr of selectedPersNrs) {
          await addMitglied.mutateAsync({ kolonneId: newKol.Id, persNr })
        }
      }
    }

    onClose()
  }

  return (
    <div className="modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-h">
          <span>{editKol ? 'Kolonne bearbeiten' : 'Neue Kolonne'}</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: 18, cursor: 'pointer' }}
          >
            &times;
          </button>
        </div>
        <div className="modal-b">
          <div className="field">
            <label>Kolonnen-Name</label>
            <input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>Polier / Vorarbeiter</label>
            <input value={polier} onChange={e => setPolier(e.target.value)} />
          </div>
          <div className="field">
            <label>Mitglieder auswaehlen ({selectedPersNrs.size})</label>
            <input
              placeholder="Suche Mitarbeiter..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ marginBottom: 8 }}
            />
            <div className="check-list">
              {filteredMa.map(m => {
                const displayName = m.Vorname ? `${m.Vorname} ${m.Title}` : m.Title
                return (
                  <label key={m.PersNr} className="check-item">
                    <input
                      type="checkbox"
                      checked={selectedPersNrs.has(m.PersNr)}
                      onChange={() => toggleMember(m.PersNr)}
                    />
                    <span>{displayName}</span>
                    <span className="check-meta">{m.PersNr} &middot; {m.Gruppe}</span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>
        <div className="modal-f">
          <button className="btn" onClick={onClose}>Abbrechen</button>
          <button
            className="btn btn-y"
            onClick={handleSave}
            disabled={createKolonne.isPending || addMitglied.isPending}
          >
            {createKolonne.isPending || addMitglied.isPending ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
