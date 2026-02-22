import { useState } from 'react'
import Modal from '../shared/Modal'
import { useCreateMitarbeiter } from '../../api/queries'

const GRUPPEN = [
  'Geschaeftsleitung', 'Bauleiter', 'Poliere', 'Leitungsbau', 'Kanalbau',
  'Hausanschluss', 'Werkstatt/Lager', 'Buero', 'Azubis', 'Minijob',
  'Praktikanten', 'Zeitarbeit', 'Subunternehmer', 'Geraetefahrer', 'Sonstige',
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function MitarbeiterModal({ open, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [persNr, setPersNr] = useState('')
  const [gruppe, setGruppe] = useState('Leitungsbau')
  const [urlaubstage, setUrlaubstage] = useState(24)

  const create = useCreateMitarbeiter()

  const handleSubmit = () => {
    if (!title || !persNr) return
    create.mutate({
      Title: title,
      PersNr: persNr,
      Gruppe: gruppe,
      Urlaubstage: urlaubstage,
      Aktiv: true,
    }, {
      onSuccess: () => {
        setTitle('')
        setPersNr('')
        onClose()
      }
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Neuer Mitarbeiter">
      <label>Name (Nachname, Vorname)</label>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Mustermann M." />

      <label>Personal-Nr.</label>
      <input value={persNr} onChange={e => setPersNr(e.target.value)} placeholder="1234" />

      <label>Gruppe</label>
      <select value={gruppe} onChange={e => setGruppe(e.target.value)}>
        {GRUPPEN.map(g => <option key={g} value={g}>{g}</option>)}
      </select>

      <label>Urlaubstage/Jahr</label>
      <input
        type="number"
        value={urlaubstage}
        onChange={e => setUrlaubstage(parseInt(e.target.value) || 0)}
      />

      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Abbrechen</button>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={create.isPending}>
          {create.isPending ? 'Speichern...' : 'Anlegen'}
        </button>
      </div>
    </Modal>
  )
}
