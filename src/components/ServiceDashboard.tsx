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
  const { user, config, canEdit } = useAuth()
  const [tickets, setTickets] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [newPart, setNewPart] = useState('')
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'ALL'>('ALL')
  
  // Fidelity linking for closure
  const [customers, setCustomers] = useState<any[]>([])
  const [selectedCustId, setSelectedCustId] = useState<string | null>(null)

  // New ticket form
  const [fc, setFc] = useState(''); const [fp, setFp] = useState(''); const [fd, setFd] = useState(''); const [fs, setFs] = useState(''); const [fi, setFi] = useState('')

  const fetchTickets = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/api/tickets`)
      const data = await res.json()
      setTickets(Array.isArray(data) ? data : [])
      if (selected) {
        const up = data.find((t: any) => t.id === selected.id)
        if (up) setSelected(up)
      }
    } catch (e) { console.error(e) }
  }

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/api/customers`)
      const data = await res.json()
      setCustomers(data)
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    fetchTickets()
    fetchCustomers()
  }, [])

  const handleUpdateTicket = async (id: string, patch: any) => {
    try {
      await fetch(`${getBaseUrl()}/api/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      })
      await fetchTickets()
    } catch (e) { console.error(e) }
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
    try {
      await fetch(`${getBaseUrl()}/api/tickets/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote, author: user?.name || 'Sistema' })
      })
      setNewNote('')
      await fetchTickets()
    } catch (e) { console.error(e) }
  }

  const handleCreateTicket = async () => {
    if (!fc || !fd || !fi) return
    try {
      await fetch(`${getBaseUrl()}/api/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer: fc, phone: fp, device: fd, serial: fs, issue: fi, author: user?.name || '' })
      })
      setFc(''); setFp(''); setFd(''); setFs(''); setFi(''); setShowNew(false)
      await fetchTickets()
    } catch (e) { console.error(e) }
  }

  const handleCloseTicket = async (id: string, method: string) => {
    try {
      const resp = await fetch(`${getBaseUrl()}/api/tickets/${id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: method, customerId: selectedCustId })
      })
      if (resp.ok) {
        alert('Venta procesada. El ticket ha sido cerrado.')
        await fetchTickets()
        setSelectedCustId(null)
      } else {
        const err = await resp.json()
        alert(err.error || 'Error al procesar')
      }
    } catch (e) { console.error(e) }
  }

  const handleAddPart = async (id: string) => {
    if (!newPart.trim()) return
    let currentParts: any[] = []
    try { currentParts = JSON.parse(selected?.parts || '[]') } catch(e) { currentParts = [] }
    const updatedParts = [...currentParts, newPart.toUpperCase()]
    await handleUpdateTicket(id, { parts: JSON.stringify(updatedParts) })
    setNewPart('')
  }

  const handlePrintTicket = (t: any) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    let parts: string[] = []
    try { parts = JSON.parse(t.parts || '[]') } catch(e) { parts = [] }

    printWindow.document.write(`
      <html>
        <head>
          <title>Servicio Técnico - ${t.tkNumber}</title>
          <style>
            body { font-family: monospace; padding: 20px; color: #333; max-width: 300px; margin: 0 auto; line-height: 1.4; }
            h2 { text-align: center; margin-bottom: 5px; }
            .info { text-align: center; font-size: 10px; margin-bottom: 15px; border-bottom: 1px dashed #ccc; padding-bottom: 10px; }
            .section { margin-bottom: 15px; font-size: 11px; }
            .label { font-weight: bold; text-transform: uppercase; font-size: 9px; color: #666; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 5px; }
            .footer { text-align: center; font-size: 9px; margin-top: 25px; border-top: 1px solid #eee; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h2>${config.storeName}</h2>
          <div class="info">${config.storeRIF}<br>${config.storeAddress}<br>${config.storePhone}</div>
          <div style="text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 10px;">RECIBO DE SERVICIO<br>${t.tkNumber}</div>
          
          <div class="section">
            <span class="label">Cliente:</span><br>${t.customer} (${t.phone})
          </div>
          <div class="section">
            <span class="label">Equipo:</span><br>${t.device}<br>${t.serial ? `S/N: ${t.serial}` : ''}
          </div>
          <div class="section">
            <span class="label">Falla:</span><br>${t.issue}
          </div>
          <div class="section">
            <span class="label">Diagnóstico:</span><br>${t.diagnosis || 'N/A'}
          </div>
          
          ${parts.length > 0 ? `
            <div class="section">
              <span class="label">Partes/Repuestos:</span>
              <table>${parts.map(p => `<tr><td>• ${p}</td></tr>`).join('')}</table>
            </div>
          ` : ''}
          
          <div class="section" style="border-top: 1px dashed #ccc; padding-top: 10px; font-size: 14px; display: flex; justify-content: space-between; font-weight: bold;">
            <span>TOTAL:</span><span>$${t.cost.toFixed(2)}</span>
          </div>
          
          <div class="section">
            <span class="label">Garantía:</span><br>${t.warranty ? `${t.warrantyDays} días de garantía técnica` : 'Sin garantía especificada'}
          </div>

          <div class="footer">Este recibo es su comprobante de reparación.<br>¡Gracias por su confianza!</div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const counts = STATUS_ORDER.map((s) => ({ status: s, count: tickets.filter((t) => t.status === s).length, ...STATUS_CFG[s] }))
  const filtered = filterStatus === 'ALL' ? tickets : tickets.filter(t => t.status === filterStatus)

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-50 p-4">
      <header className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Servicio Técnico <span className="text-blue-500">Rexermi OS</span></h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Taller y Reparaciones en Tiempo Real</p>
        </div>
        <button onClick={() => setShowNew(true)} className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-xl font-bold text-sm shadow-xl shadow-blue-900/30 transition-all">+ Nuevo Equipo</button>
      </header>

      {/* States Pipeline */}
      <div className="grid grid-cols-6 gap-2 mb-4">
        {counts.map((s) => (
          <button key={s.status} onClick={() => setFilterStatus(filterStatus === s.status ? 'ALL' : s.status)}
            className={`rounded-2xl p-3 border transition-all text-center group ${s.bg} ${filterStatus === s.status ? 'ring-2 ring-white/20' : 'hover:scale-[1.02]'}`}>
            <div className={`text-2xl font-black font-mono tracking-tighter ${s.color}`}>{s.count}</div>
            <div className="text-[8px] uppercase font-black mt-1 opacity-50">{s.label}</div>
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 flex gap-4">
        {/* Ticket List */}
        <div className="flex-1 overflow-auto space-y-2 pr-1 custom-scrollbar">
          {filtered.map(t => {
             const cfg = STATUS_CFG[t.status as TicketStatus] || STATUS_CFG.ENTRY
             const isPaid = t.diagnosis?.includes('[PAGADO]')
             return (
               <div key={t.id} onClick={() => setSelected(t)}
                 className={`p-4 rounded-2xl border transition-all cursor-pointer group ${selected?.id === t.id ? 'bg-blue-950/20 border-blue-500/50 shadow-lg shadow-blue-900/10' : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'}`}>
                 <div className="flex justify-between items-start mb-2">
                   <div className="flex items-center gap-2">
                     <span className="font-mono text-[10px] text-blue-500 font-bold">{t.tkNumber}</span>
                     <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                     {isPaid && <span className="bg-green-500/10 text-green-400 border border-green-500/30 rounded-full px-2 py-0.5 text-[8px] font-black">PAGADO</span>}
                   </div>
                   <span className="text-[9px] text-slate-600 font-medium">{new Date(t.date).toLocaleDateString()}</span>
                 </div>
                 <h3 className="text-sm font-bold tracking-tight">{t.device}</h3>
                 <div className="flex justify-between items-end mt-2">
                   <div>
                     <p className="text-[11px] text-slate-300 font-medium">{t.customer}</p>
                     <p className="text-[10px] text-slate-500 italic line-clamp-1">"{t.issue}"</p>
                   </div>
                   <div className="text-right">
                     {t.cost > 0 && <div className="text-sm font-mono font-black text-green-400 opacity-90">${t.cost.toFixed(2)}</div>}
                     <div className="text-[9px] text-slate-600 font-mono">{t.phone}</div>
                   </div>
                 </div>
               </div>
             )
          })}
        </div>

        {/* Panel Detalle */}
        {selected ? (
          <aside className="w-96 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col gap-5 overflow-auto shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-black text-blue-400 leading-tight">{selected.tkNumber}</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{selected.device}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-600 hover:text-white p-2">✕</button>
            </div>

            <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800 space-y-4">
              {/* Customer Info */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-lg">👤</div>
                <div>
                  <p className="text-xs font-bold">{selected.customer}</p>
                  <p className="text-[10px] text-slate-500">{selected.phone}</p>
                </div>
              </div>

              {/* Status Stepper */}
              <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Etapa Actual</p>
                <div className="flex gap-1.5">
                  {STATUS_ORDER.map((s, i) => {
                    const active = STATUS_ORDER.indexOf(selected.status as TicketStatus) >= i
                    return <div key={s} className={`flex-1 h-1.5 rounded-full ${active ? 'bg-blue-500' : 'bg-slate-800'}`} title={STATUS_CFG[s].label} />
                  })}
                </div>
                <p className={`text-[10px] font-bold ${STATUS_CFG[selected.status as TicketStatus].color}`}>{STATUS_CFG[selected.status as TicketStatus].label}: <span className="text-slate-500 font-normal italic">{STATUS_CFG[selected.status as TicketStatus].editHint}</span></p>
              </div>
            </div>

            {/* Stage-Specific Fields */}
            <div className="flex-1 space-y-5">
              {/* Diagnosis Field (Universal after ENTRY) */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Diagnóstico Técnico</label>
                <textarea value={selected.diagnosis || ''} onChange={e => handleUpdateTicket(selected.id, { diagnosis: e.target.value })}
                  placeholder="Escriba los resultados de la revisión..." className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs outline-none focus:ring-1 focus:ring-blue-500 resize-none min-h-[80px]" />
              </div>

              {/* Cost & Parts (Universal after DIAGNOSIS) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Costo Cobrado ($)</label>
                  <input type="number" value={selected.cost} onChange={e => handleUpdateTicket(selected.id, { cost: parseFloat(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-green-400 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Garantía (Días)</label>
                  <input type="number" value={selected.warrantyDays || 0} onChange={e => handleUpdateTicket(selected.id, { warrantyDays: parseInt(e.target.value), warranty: parseInt(e.target.value) > 0 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono outline-none" />
                </div>
              </div>

              {/* Parts Tracker */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Repuestos / Insumos Usados</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(() => {
                    let ps = []
                    try { ps = JSON.parse(selected.parts || '[]') } catch(e) { ps = [] }
                    return ps.map((p: string, i: number) => (
                      <span key={i} className="bg-slate-950 border border-slate-800 text-blue-400 text-[9px] font-black px-2 py-1 rounded-md flex items-center gap-2">
                        {p}
                        <button onClick={() => {
                          const updated = ps.filter((_: any, j: number) => j !== i)
                          handleUpdateTicket(selected.id, { parts: JSON.stringify(updated) })
                        }} className="text-slate-600 hover:text-red-400">✕</button>
                      </span>
                    ))
                  })()}
                </div>
                <div className="flex gap-2">
                  <input value={newPart} onChange={e => setNewPart(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddPart(selected.id)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-[10px] outline-none" placeholder="Añadir repuesto..." />
                  <button onClick={() => handleAddPart(selected.id)} className="bg-blue-600 px-3 rounded-lg text-xs font-bold">+</button>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="space-y-3 mt-auto border-t border-slate-800 pt-5">
              <button onClick={() => handlePrintTicket(selected)} className="w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl text-xs font-bold transition-all border border-slate-700">🖨️ Imprimir Recibo Servicio</button>
              
              {selected.status !== 'DELIVERED' ? (
                <button onClick={() => advanceStatus(selected.id)} className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl text-xs font-black shadow-xl shadow-blue-900/40 uppercase tracking-widest">
                  Avanzar a {STATUS_CFG[STATUS_ORDER[Math.min(STATUS_ORDER.indexOf(selected.status as TicketStatus) + 1, 5)]].label} ▸
                </button>
              ) : !selected.diagnosis?.includes('[PAGADO]') ? (
                <div className="space-y-3">
                   <div className="relative">
                      <select value={selectedCustId || ''} onChange={e => setSelectedCustId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-500">
                        <option value="">-- Vincular Cliente (Fidelización) --</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.points} pts)</option>)}
                      </select>
                      {selectedCustId && <p className="text-[9px] text-blue-500 mt-1 font-bold text-center animate-pulse">+ Ganará {Math.floor(selected.cost / 10 * (config.ptsPer10Usd || 1))} puntos</p>}
                   </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleCloseTicket(selected.id, 'Efectivo $')} className="bg-green-600 py-3 rounded-xl text-[10px] font-black hover:bg-green-500">💵 COBRAR $</button>
                    <button onClick={() => handleCloseTicket(selected.id, 'P. Móvil')} className="bg-indigo-600 py-3 rounded-xl text-[10px] font-black hover:bg-indigo-500">📱 P. MÓVIL</button>
                  </div>
                </div>
              ) : (
                <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-center py-3 rounded-xl text-xs font-black">ENTREGADO Y PAGADO ✅</div>
              )}
            </div>
          </aside>
        ) : (
          <aside className="w-96 bg-slate-900/30 border border-slate-800 border-dashed rounded-[3rem] flex flex-col items-center justify-center text-slate-700 opacity-50">
            <span className="text-6xl mb-4">🛠️</span>
            <p className="text-xs font-black uppercase tracking-widest">Seleccione Ticket para Gestionar</p>
          </aside>
        )}
      </div>

      {/* New Ticket Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-6">
          <div className="bg-slate-900 border border-slate-700 rounded-[2.5rem] p-8 w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-black mb-1">Ingreso de Equipo</h2>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-6">Recepción en Taller</p>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Cliente *</label><input value={fc} onChange={e => setFc(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-sm outline-none" placeholder="Nombre completo" /></div>
                <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Celular</label><input value={fp} onChange={e => setFp(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-sm outline-none" placeholder="04xx-xxxxxxx" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Equipo *</label><input value={fd} onChange={e => setFd(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-sm outline-none" placeholder="Modelo / Marca" /></div>
                <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Serial / IMEI</label><input value={fs} onChange={e => setFs(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-sm font-mono outline-none" placeholder="Identificador único" /></div>
              </div>
              <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Falla Reportada *</label><textarea value={fi} onChange={e => setFi(e.target.value)} rows={3} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-sm outline-none resize-none" placeholder="Detalle el problema..." /></div>
            </div>

            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowNew(false)} className="flex-1 py-4 rounded-2xl bg-slate-800 font-bold text-sm">CANCELAR</button>
              <button onClick={handleCreateTicket} className="flex-1 py-4 rounded-2xl bg-blue-600 font-black text-sm shadow-xl shadow-blue-900/40">CREAR TICKET</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
