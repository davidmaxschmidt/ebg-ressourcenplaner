import { useState } from 'react'
import {
  useKolonnen,
  useKostenstellen,
  useCreateZuweisung,
} from '../../api/queries'
import { today, toISO } from '../../utils/dates'

interface AssignModalProps {
  kstId?: number
  onClose: () => void
}

export default function AssignModal({ kstId, onClose }: AssignModalProps) {
  const { data: kolonnen } = useKolonnen()
  const { data: kostenstellen } = useKostenstellen()
  const createZuweisung = useCreateZuweisung()

  const todayStr = today()
  // Default "Bis" to end of current month
  const now = new Date()
  const endOfMonth = toISO(new Date(now.getFullYear(), now.getMonth() + 1, 0))

  const [kolId, setKolId] = useState<string>(kolonnen?.[0]?.Id?.toString() ?? '')
  const [kstIdState, setKstIdState] = useState<string>(kstId?.toString() ?? (kostenstellen?.[0]?.Id?.toString() ?? ''))
  const [vonDate, setVonDate] = useState(todayStr)
  const [bisDate, setBisDate] = useState(endOfMonth)

  const handleSave = async () => {
    if (!kolId || !kstIdState || !vonDate || !bisDate) return

    const kol = kolonnen?.find(k => k.Id === Number(kolId))
    const kst = kostenstellen?.find(k => k.Id === Number(kstIdState))

    await createZuweisung.mutateAsync({
      Title: `${kol?.Title ?? ''} -> ${kst?.Title ?? ''}`,
      KolonneId: Number(kolId),
      KostenstelleId: Number(kstIdState),
      Von: vonDate,
      Bis: bisDate,
    })

    onClose()
  }

  return (
    <div className="modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-h">
          <span>Kolonne zuweisen</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: 18, cursor: 'pointer' }}
          >
            &times;
          </button>
        </div>
        <div className="modal-b">
          <div className="field">
            <label>Kolonne</label>
            <select value={kolId} onChange={e => setKolId(e.target.value)}>
              {kolonnen?.map(k => (
                <option key={k.Id} value={k.Id}>
                  {k.Title} ({k.Mitglieder?.length ?? 0} MA)
                </option>
              ))}
            </select>
          </div>
          {!kstId && (
            <div className="field">
              <label>Baustelle / Kostenstelle</label>
              <select value={kstIdState} onChange={e => setKstIdState(e.target.value)}>
                {kostenstellen?.filter(k => k.Aktiv).map(k => (
                  <option key={k.Id} value={k.Id}>{k.Title}</option>
                ))}
              </select>
            </div>
          )}
          <div className="field">
            <label>Von</label>
            <input type="date" value={vonDate} onChange={e => setVonDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Bis</label>
            <input type="date" value={bisDate} onChange={e => setBisDate(e.target.value)} />
          </div>
        </div>
        <div className="modal-f">
          <button className="btn" onClick={onClose}>Abbrechen</button>
          <button
            className="btn btn-y"
            onClick={handleSave}
            disabled={createZuweisung.isPending || !kolId}
          >
            {createZuweisung.isPending ? 'Zuweisen...' : 'Zuweisen'}
          </button>
        </div>
      </div>
    </div>
  )
}
