import { useState, useMemo } from 'react'
import { useKostenstellen, useGanttItems, useCreateGanttItem, useUpdateGanttItem, useDeleteGanttItem, useKolonnen, useZuweisungen, useUpdateKostenstelle } from '../../api/queries'
import { getMonthDates, monthName, formatDate } from '../../utils/dates'
import { isWochenende, isFeiertag } from '../../utils/feiertage'
import type { GanttItem } from '../../api/types'
import LoadingSpinner from '../shared/LoadingSpinner'
import Modal from '../shared/Modal'

const COLORS = ['#4A90D9', '#E74C3C', '#27AE60', '#F39C12', '#9B59B6', '#1ABC9C', '#E67E22', '#34495E']

export default function ProjektplanungView() {
  const { data: kostenstellen, isLoading: l1 } = useKostenstellen()
  const { data: kolonnen } = useKolonnen()
  const { data: zuweisungen } = useZuweisungen()

  const [selectedKst, setSelectedKst] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<GanttItem | null>(null)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formStart, setFormStart] = useState('')
  const [formEnd, setFormEnd] = useState('')

  // KST metadata edit
  const [editBl, setEditBl] = useState('')
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')

  const kst = kostenstellen?.find(k => k.Title === selectedKst)
  const kstNr = selectedKst ? selectedKst.split(' ')[0] : ''

  const { data: ganttItems, isLoading: l2 } = useGanttItems(kstNr || undefined)
  const createGantt = useCreateGanttItem()
  const updateGantt = useUpdateGanttItem()
  const deleteGantt = useDeleteGanttItem()
  const updateKst = useUpdateKostenstelle()

  // Timeline: show 6 months from project start or current month
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [viewStartMonth, setViewStartMonth] = useState(() => new Date().getMonth())

  const allDates = useMemo(() => {
    const dates: string[] = []
    for (let m = 0; m < 6; m++) {
      const mo = (viewStartMonth + m) % 12
      const yr = viewYear + Math.floor((viewStartMonth + m) / 12)
      dates.push(...getMonthDates(yr, mo))
    }
    return dates
  }, [viewYear, viewStartMonth])

  // Month headers
  const monthHeaders = useMemo(() => {
    const headers: { name: string; span: number }[] = []
    let curMonth = ''
    let count = 0
    allDates.forEach(d => {
      const m = d.slice(0, 7)
      if (m !== curMonth) {
        if (curMonth) headers.push({ name: curMonth, span: count })
        curMonth = m
        count = 1
      } else {
        count++
      }
    })
    if (curMonth) headers.push({ name: curMonth, span: count })
    return headers
  }, [allDates])

  const kolMap = new Map(kolonnen?.map(k => [k.Id, k]) || [])
  const kstZuweisungen = zuweisungen?.filter(z => kst && z.KostenstelleId === kst.Id) || []

  const openAddModal = () => {
    setEditItem(null)
    setFormTitle('')
    setFormStart('')
    setFormEnd('')
    setShowModal(true)
  }

  const openEditModal = (item: GanttItem) => {
    setEditItem(item)
    setFormTitle(item.Title)
    setFormStart(item.StartDatum)
    setFormEnd(item.EndeDatum)
    setShowModal(true)
  }

  const handleSave = () => {
    if (!formTitle || !formStart || !formEnd) return
    if (editItem) {
      updateGantt.mutate({ id: editItem.Id, data: { Title: formTitle, StartDatum: formStart, EndeDatum: formEnd } })
    } else {
      createGantt.mutate({ Title: formTitle, KostenstelleNr: kstNr, StartDatum: formStart, EndeDatum: formEnd })
    }
    setShowModal(false)
  }

  const handleSaveKstMeta = () => {
    if (!kst) return
    updateKst.mutate({
      id: kst.Id,
      data: {
        Bauleiter: editBl || undefined,
        StartDatum: editStart || undefined,
        EndeDatum: editEnd || undefined,
      },
    })
  }

  if (l1) return <LoadingSpinner />

  return (
    <div>
      {/* KST Selector */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedKst}
            onChange={e => {
              setSelectedKst(e.target.value)
              const k = kostenstellen?.find(x => x.Title === e.target.value)
              if (k) {
                setEditBl(k.Bauleiter || '')
                setEditStart(k.StartDatum || '')
                setEditEnd(k.EndeDatum || '')
                if (k.StartDatum) {
                  const d = new Date(k.StartDatum)
                  setViewYear(d.getFullYear())
                  setViewStartMonth(d.getMonth())
                }
              }
            }}
            style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontFamily: 'inherit', fontSize: 14 }}
          >
            <option value="">Kostenstelle waehlen...</option>
            {kostenstellen?.map(k => (
              <option key={k.Id} value={k.Title}>{k.Title}</option>
            ))}
          </select>

          {selectedKst && (
            <>
              <button className="btn btn-primary btn-sm" onClick={openAddModal}>
                + Teilschritt
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setViewStartMonth(m => Math.max(0, m - 1))}>
                &larr;
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setViewStartMonth(m => m + 1)}>
                &rarr;
              </button>
            </>
          )}
        </div>

        {kst && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 13 }}>
            <label style={{ margin: 0 }}>BL:</label>
            <input value={editBl} onChange={e => setEditBl(e.target.value)} placeholder="Bauleiter" style={{ width: 150, padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 13, fontFamily: 'inherit' }} />
            <label style={{ margin: 0 }}>Start:</label>
            <input type="date" value={editStart} onChange={e => setEditStart(e.target.value)} style={{ padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 13, fontFamily: 'inherit' }} />
            <label style={{ margin: 0 }}>Ende:</label>
            <input type="date" value={editEnd} onChange={e => setEditEnd(e.target.value)} style={{ padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, fontSize: 13, fontFamily: 'inherit' }} />
            <button className="btn btn-primary btn-sm" onClick={handleSaveKstMeta}>Speichern</button>
          </div>
        )}
      </div>

      {/* Gantt Timeline */}
      {selectedKst && (
        <div className="card" style={{ padding: 0 }}>
          {l2 ? <LoadingSpinner /> : (
            <div className="gantt-wrapper">
              <table className="gantt-table">
                <thead>
                  <tr>
                    <th className="sticky-col gantt-label" rowSpan={2}>Vorgang</th>
                    {monthHeaders.map(mh => {
                      const [y, m] = mh.name.split('-')
                      return (
                        <th key={mh.name} colSpan={mh.span} style={{ fontSize: 11, padding: '4px 2px' }}>
                          {monthName(parseInt(m) - 1)} {y}
                        </th>
                      )
                    })}
                  </tr>
                  <tr>
                    {allDates.map(d => {
                      const day = new Date(d + 'T00:00:00').getDate()
                      const we = isWochenende(d)
                      return (
                        <th
                          key={d}
                          className={`gantt-cell ${we ? 'gantt-cell-we' : ''}`}
                          style={{ fontSize: 9, padding: '2px 0', width: 16, minWidth: 16 }}
                        >
                          {day % 5 === 1 ? day : ''}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {ganttItems?.map((item, i) => (
                    <tr key={item.Id}>
                      <td className="sticky-col gantt-label" style={{ cursor: 'pointer' }} onClick={() => openEditModal(item)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{item.Title}</span>
                          <button
                            className="btn btn-sm"
                            style={{ padding: '2px 6px', fontSize: 10, color: 'var(--danger)', background: 'none' }}
                            onClick={e => { e.stopPropagation(); deleteGantt.mutate(item.Id) }}
                          >
                            x
                          </button>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--t2)' }}>
                          {formatDate(item.StartDatum)} - {formatDate(item.EndeDatum)}
                        </div>
                      </td>
                      {allDates.map(d => {
                        const inRange = d >= item.StartDatum && d <= item.EndeDatum
                        const we = isWochenende(d)
                        const ft = isFeiertag(d)
                        return (
                          <td
                            key={d}
                            className={`gantt-cell ${we ? 'gantt-cell-we' : ''} ${ft ? 'gantt-cell-ft' : ''}`}
                            style={{
                              background: inRange ? COLORS[i % COLORS.length] : undefined,
                              width: 16,
                              minWidth: 16,
                            }}
                          />
                        )
                      })}
                    </tr>
                  ))}
                  {(!ganttItems || ganttItems.length === 0) && (
                    <tr>
                      <td className="sticky-col gantt-label" colSpan={allDates.length + 1} style={{ color: 'var(--t2)', padding: 16, textAlign: 'center' }}>
                        Noch keine Teilschritte. Klicke "+ Teilschritt" um anzufangen.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Zugewiesene Kolonnen */}
          {kstZuweisungen.length > 0 && (
            <div style={{ padding: 16, borderTop: '1px solid var(--bl)' }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Zugewiesene Kolonnen</div>
              {kstZuweisungen.map(z => {
                const kol = kolMap.get(z.KolonneId)
                return (
                  <div key={z.Id} style={{ fontSize: 12, padding: '4px 0', display: 'flex', gap: 8 }}>
                    <span style={{ fontWeight: 500 }}>{kol?.Title || `Kolonne ${z.KolonneId}`}</span>
                    <span style={{ color: 'var(--t2)' }}>{formatDate(z.Von)} - {formatDate(z.Bis)}</span>
                    <span className="chip chip-gray">{kol?.Mitglieder?.length || 0} MA</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Teilschritt Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Teilschritt bearbeiten' : 'Neuer Teilschritt'}>
        <label>Bezeichnung</label>
        <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="z.B. Erdarbeiten" />
        <label>Start</label>
        <input type="date" value={formStart} onChange={e => setFormStart(e.target.value)} />
        <label>Ende</label>
        <input type="date" value={formEnd} onChange={e => setFormEnd(e.target.value)} />
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Abbrechen</button>
          <button className="btn btn-primary" onClick={handleSave}>
            {editItem ? 'Aktualisieren' : 'Anlegen'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
