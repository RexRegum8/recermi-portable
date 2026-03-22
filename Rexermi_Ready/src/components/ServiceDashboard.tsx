import { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getBaseUrl } from '../utils/api'

export type TicketStatus = 'ENTRY' | 'DIAGNOSIS' | 'BUDGET' | 'REPAIR' | 'QC' | 'DELIVERED'

export const STATUS_CFG: Record<TicketStatus, { label: string; color: string; bg: string; editHint: string }> = {
  ENTRY:     { label: 'Ingreso',     color: 'text-blue-400',   bg: 'bg-blue-500/15 border-blue-500/30',   editHint: 'Registre datos del cliente y dispositivo' },
  DIAGNOSIS: { label: 'Diagnóstico', color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30', editHint: 'Agregue el diagnóstico y repuestos necesarios' },
  BUDGET:    { label: 'Presupuesto', color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/30', editHint: 'Defina el costo de reparación' },
  REPAIR:    { label: 'Reparación',  color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30', editHint: 'Actualice progreso y repuestos usados' },
  QC:        { label: 'Control QC',  color: 'text-cyan-400',   bg: 'bg-cyan-500/15 border-cyan-500/30',   editHint: 'Verifique calidad y marque garantía' },
  DELIVERED: { label: 'Entregado',   color: 'text-green-400',  bg: 'bg-green-500/15 border-green-500/30', editHint: 'Equipo entregado al cliente' },
}
export const STATUS_ORDER: TicketStatus[] = ['ENTRY', 'DIAGNOSIS', 'BUDGET', 'REPAIR', 'QC', 'DELIVERED']

export function ServiceDashboard() {
  const { user, canEdit } = useAuth()
  const [tickets, setTickets] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [newPart, setNewPart] = useState('')
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'ALL'>('ALL')
  // New ticket form
  const [fc, setFc] = useState(''); const [fp, setFp] = useState(''); const [fd, setFd] = useState(''); const [fs, setFs] = useState(''); const [fi, setFi] = useState('')

  const fetchTickets = async () => {
    const baseUrl = getBaseUrl()
    try {
      const res = await fetch(`${baseUrl}/api/tickets`)
      const data = await res.json()
      // Map backend note objects to strings for compatibility if needed, 
      // or just use data as is if we update the JSX
      setTickets(Array.isArray(data) ? data : [])
      if (selected) {
        const updatedSelected = data.find((t: any) => t.id === selected.id)
        if (updatedSelected) setSelected(updatedSelected)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  const handleUpdateTicket = async (id: string, patch: any) => {
    try {
      if (patch.parts && Array.isArray(patch.parts)) {
        patch.parts = JSON.stringify(patch.parts)
      }
      const baseUrl = getBaseUrl()
      await fetch(`${baseUrl}/api/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      })
      await fetchTickets()
    } catch (e) {
      console.error(e)
    }
  }

  const advanceStatus = async (id: string) => {
    const t = tickets.find(t => t.id === id)
    if (!t) return
    const idx = STATUS_ORDER.indexOf(t.status as TicketStatus)
    if (idx < STATUS_ORDER.length - 1) {
      await handleUpdateTicket(id, { status: STATUS_ORDER[idx + 1] })
    }
  }

  const handleAddNote = async (id: string) => {
    if (!newNote.trim()) return
    const baseUrl = getBaseUrl()
    try {
      await fetch(`${baseUrl}/api/tickets/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote, author: user?.name || 'Sistema' })
      })
      setNewNote('')
      await fetchTickets()
    } catch (e) {
      console.error(e)
    }
  }

  const handleCreateTicket = async () => {
    if (!fc || !fd || !fi) return
    const baseUrl = getBaseUrl()
    try {
      await fetch(`${baseUrl}/api/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          customer: fc, phone: fp, device: fd, serial: fs, issue: fi, author: user?.name || '' 
        })
      })
      setFc(''); setFp(''); setFd(''); setFs(''); setFi(''); setShowNew(false)
      await fetchTickets()
    } catch (e) {
      console.error(e)
    }
  }

  const handleAddPart = async (id: string) => {
    if (!newPart.trim()) return
    const currentParts = JSON.parse(selected?.parts || '[]')
    const updatedParts = [...currentParts, newPart.toUpperCase()]
    await handleUpdateTicket(id, { parts: JSON.stringify(updatedParts) })
    setNewPart('')
  }

  const safeTickets = Array.isArray(tickets) ? tickets : []
  const filtered = (filterStatus === 'ALL' ? safeTickets : safeTickets.filter((t) => t.status === filterStatus)) || []
  const counts = STATUS_ORDER.map((s) => ({ status: s, count: safeTickets.filter((t) => t.status === s).length, ...STATUS_CFG[s] }))

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-50 p-5">
      <header className="flex justify-between items-center mb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Centro de Servicio Técnico</h1>
          <p className="text-[11px] text-slate-500">Operador: {user?.name} • Activos: {tickets.filter((t) => t.status !== 'DELIVERED').length}</p>
        </div>
        <button onClick={() => setShowNew(true)} className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg font-bold text-sm transition-all shadow-lg shadow-blue-900/40">+ Nuevo Ingreso</button>
      </header>

      {/* Pipeline */}
      <div className="grid grid-cols-6 gap-2 mb-3">
        {counts.map((s) => (
          <button key={s.status} onClick={() => setFilterStatus(filterStatus === s.status ? 'ALL' : s.status)}
            className={`rounded-lg p-2 border text-center transition-all ${s.bg} ${filterStatus === s.status ? 'ring-2 ring-white/20 scale-[1.02]' : ''}`}>
            <div className={`text-xl font-black font-mono ${s.color}`}>{s.count}</div>
            <div className="text-[8px] uppercase tracking-wider font-bold mt-0.5 opacity-70">{s.label}</div>
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 flex gap-3">
        {/* List */}
        <div className="flex-1 overflow-auto space-y-2 pr-1">
          {(filtered || []).map((t) => {
            const cfg = STATUS_CFG[t.status as TicketStatus] || STATUS_CFG.ENTRY
            return (
              <div key={t.id} onClick={() => setSelected(t)}
                className={`bg-slate-900/70 border rounded-xl p-3 cursor-pointer hover:border-slate-600 transition-all ${selected?.id === t.id ? 'border-blue-500/50 bg-blue-950/20' : 'border-slate-800'}`}>
                <div className="flex justify-between items-start mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-500">{t.id}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    {t.warranty && <span className="text-[8px] font-bold text-green-400 bg-green-500/10 px-1 rounded border border-green-500/20">GARANTÍA</span>}
                  </div>
                  <span className="text-[9px] text-slate-600">{t.date}</span>
                </div>
                <h3 className="font-bold text-sm">{t.device} <span className="text-[9px] text-slate-600 font-mono font-normal">{t.serial}</span></h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{t.customer} — {t.issue}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[9px] text-slate-600">{t.phone}</span>
                  <div className="flex items-center gap-2">
                    {t.cost > 0 && <span className="text-[11px] font-mono text-green-400 font-bold">${t.cost}</span>}
                    {t.status !== 'DELIVERED' && canEdit && (
                      <button onClick={(e) => { e.stopPropagation(); advanceStatus(t.id) }}
                        className="bg-blue-600/15 text-blue-400 border border-blue-500/25 px-2 py-0.5 rounded text-[9px] font-bold hover:bg-blue-600/25 transition-all">Avanzar ▸</button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Detail Panel */}
        {selected ? (
          <aside className="w-80 bg-slate-900/70 border border-slate-800 rounded-xl p-4 shrink-0 overflow-auto flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-bold text-base">{selected.device}</h2>
                <p className="text-xs text-slate-400">{selected.customer} • {selected.phone}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            {/* Status Context */}
            <div className={`p-2.5 rounded-lg border ${(STATUS_CFG[selected.status as TicketStatus] || STATUS_CFG.ENTRY).bg}`}>
              <span className={`text-[9px] font-bold uppercase ${(STATUS_CFG[selected.status as TicketStatus] || STATUS_CFG.ENTRY).color}`}>{(STATUS_CFG[selected.status as TicketStatus] || STATUS_CFG.ENTRY).label}</span>
              <p className="text-[10px] text-slate-400 mt-0.5">{(STATUS_CFG[selected.status as TicketStatus] || STATUS_CFG.ENTRY).editHint}</p>
            </div>

            {/* Editable Fields */}
            <div className="space-y-2.5">
              <div className="flex justify-between text-xs"><span className="text-slate-500">Ticket</span><span className="font-mono">{selected.id}</span></div>
              <div className="flex justify-between text-xs"><span className="text-slate-500">Serial</span><span className="font-mono text-blue-400">{selected.serial || 'N/A'}</span></div>
              
              {/* Editable Diagnosis */}
              <div>
                <label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Diagnóstico</label>
                {canEdit ? (
                  <textarea value={selected.diagnosis || ''} onChange={(e) => handleUpdateTicket(selected.id, { diagnosis: e.target.value })}
                    rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-[11px] outline-none focus:ring-1 focus:ring-blue-500 resize-none" placeholder="Escriba el diagnóstico..." />
                ) : (
                  <p className="text-[11px] text-slate-300 bg-slate-800/30 px-2 py-1.5 rounded-md">{selected.diagnosis || 'Pendiente'}</p>
                )}
              </div>

              {/* Editable Cost */}
              <div>
                <label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Costo de Reparación (USD)</label>
                {canEdit ? (
                  <input type="number" value={selected.cost} onChange={(e) => handleUpdateTicket(selected.id, { cost: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-[11px] font-mono outline-none focus:ring-1 focus:ring-blue-500" />
                ) : (
                  <p className="text-[11px] font-mono text-green-400 bg-slate-800/30 px-2 py-1.5 rounded-md">${selected.cost.toFixed(2)}</p>
                )}
              </div>

              {/* Warranty Toggle */}
              {canEdit && (
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={selected.warranty} onChange={(e) => handleUpdateTicket(selected.id, { warranty: e.target.checked })}
                    className="w-3.5 h-3.5 rounded accent-green-500" />
                  <span>Incluir garantía</span>
                </label>
              )}

              {/* Parts */}
              <div>
                <label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Repuestos</label>
                <div className="flex flex-wrap gap-1 mb-1">
                  {JSON.parse(selected.parts || '[]').map((p: string, i: number) => (
                    <span key={i} className="bg-slate-800 text-blue-400 text-[9px] font-mono px-1.5 py-0.5 rounded border border-slate-700 flex items-center gap-1">
                      {p}
                      {canEdit && <button onClick={() => {
                        const current = JSON.parse(selected.parts || '[]');
                        const updated = current.filter((_: any, j: number) => j !== i);
                        handleUpdateTicket(selected.id, { parts: JSON.stringify(updated) });
                      }} className="text-slate-600 hover:text-red-400 text-[8px]">✕</button>}
                    </span>
                  ))}
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    <input value={newPart} onChange={(e) => setNewPart(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddPart(selected.id)}
                      placeholder="SKU repuesto..." className="flex-1 bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-[10px] outline-none focus:ring-1 focus:ring-blue-500 font-mono" />
                    <button onClick={() => handleAddPart(selected.id)} className="bg-blue-600 hover:bg-blue-700 px-2 rounded-md text-[10px] font-bold transition-all">+</button>
                  </div>
                )}
              </div>
            </div>

            {/* Progress */}
            <div>
              <p className="text-[9px] uppercase tracking-widest text-slate-600 font-bold mb-1.5">Progreso</p>
              <div className="flex gap-1">
                {STATUS_ORDER.map((s, i) => {
                  const reached = STATUS_ORDER.indexOf(selected.status as TicketStatus) >= i
                  return <div key={s} title={STATUS_CFG[s].label} className={`flex-1 h-2 rounded-full ${reached ? 'bg-blue-500' : 'bg-slate-700'}`} />
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="flex-1 min-h-0">
              <p className="text-[9px] uppercase tracking-widest text-slate-600 font-bold mb-1">Notas / Historial</p>
              <div className="space-y-1 mb-1.5 max-h-[100px] overflow-auto">
                {selected.notes?.map((n: any, i: number) => (
                  <div key={i} className="bg-slate-800/50 text-[10px] text-slate-400 px-2 py-1 rounded border border-slate-700/50">
                    <span className="font-bold text-blue-400">[{n.author}]</span> {n.content}
                  </div>
                ))}
              </div>
              <div className="flex gap-1">
                <input value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddNote(selected.id)}
                  placeholder="Agregar nota..." className="flex-1 bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-[10px] outline-none focus:ring-1 focus:ring-blue-500" />
                <button onClick={() => handleAddNote(selected.id)} className="bg-blue-600 hover:bg-blue-700 px-2 rounded-md text-[10px] font-bold transition-all">+</button>
              </div>
            </div>

            {/* Advance */}
            {canEdit && selected.status !== 'DELIVERED' && (
              <button onClick={() => advanceStatus(selected.id)}
                className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-lg text-xs font-bold transition-all">
                Avanzar a: {(STATUS_CFG[STATUS_ORDER[Math.min(STATUS_ORDER.indexOf(selected.status as TicketStatus) + 1, 5)]] || STATUS_CFG.ENTRY).label} ▸
              </button>
            )}
          </aside>
        ) : (
          <aside className="w-80 bg-slate-900/30 border border-slate-800/50 rounded-xl flex items-center justify-center shrink-0">
            <div className="text-center text-slate-700"><p className="text-3xl mb-2">🛠️</p><p className="text-xs font-medium">Seleccione un ticket</p></div>
          </aside>
        )}
      </div>

      {/* New Ticket Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowNew(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-7 w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-1">Nuevo Ingreso de Equipo</h2>
            <p className="text-xs text-slate-400 mb-5">Complete los datos del cliente y dispositivo</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Cliente *</label><input value={fc} onChange={(e) => setFc(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nombre" /></div>
                <div><label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Teléfono</label><input value={fp} onChange={(e) => setFp(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="0414-..." /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Dispositivo *</label><input value={fd} onChange={(e) => setFd(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="iPhone 15 Pro" /></div>
                <div><label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Serial / IMEI</label><input value={fs} onChange={(e) => setFs(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono" placeholder="IMEI/Serial" /></div>
              </div>
              <div><label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Problema *</label><textarea value={fi} onChange={(e) => setFi(e.target.value)} rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Descripción del problema..." /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowNew(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold hover:bg-slate-800 transition-all">Cancelar</button>
              <button onClick={handleCreateTicket} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all shadow-lg">✅ Crear Ticket</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
