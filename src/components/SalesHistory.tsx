import { useSales, CashSession, SaleRecord } from '../store/SalesContext'
import { useAuth } from '../auth/AuthContext'
import { useState, useEffect } from 'react'

export function SalesHistory() {
  const { sales, dailySales, dailyTotal, activeSession, sessionHistory, openSession, closeSession, refreshSales, refreshSessions, getSessionSales } = useSales()
  const { config, isAdmin, user } = useAuth()
  const [showOpenModal, setShowOpenModal] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [openingBalance, setOpeningBalance] = useState(0)
  const [closingBalance, setClosingBalance] = useState(0)
  const [selectedSession, setSelectedSession] = useState<CashSession | null>(null)
  const [sessionSales, setSessionSales] = useState<SaleRecord[]>([])
  const [viewProof, setViewProof] = useState<string | null>(null)

  useEffect(() => {
    refreshSales()
    refreshSessions()
  }, [])

  const totalBs = dailyTotal * config.exchangeRateBCV

  const handleOpen = async () => {
    await openSession(openingBalance, user?.name || 'Admin')
    setShowOpenModal(false)
  }

  const handleClose = async () => {
    if (activeSession) {
      const breakdown = calculateBreakdown()
      await closeSession(activeSession.id, closingBalance, breakdown)
      setShowCloseModal(false)
      alert('Caja cerrada con éxito. El resumen ha sido guardado.')
    }
  }

  const calculateBreakdown = () => {
    return dailySales.reduce((acc: any, s) => {
      const method = s.paymentMethod || 'Otros'
      acc[method] = (acc[method] || 0) + s.total
      acc['_ivaTotal'] = (acc['_ivaTotal'] || 0) + s.iva
      return acc
    }, { _ivaTotal: 0 })
  }

  const handleViewSession = async (session: CashSession) => {
    const sSales = await getSessionSales(session.id)
    setSelectedSession(session)
    setSessionSales(sSales)
  }

  if (selectedSession) {
    return (
      <div className="flex flex-col h-screen bg-slate-950 text-slate-50 p-5">
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedSession(null)} className="p-2 hover:bg-slate-800 rounded-full transition-all">←</button>
            <div>
              <h1 className="text-xl font-bold">Ventas de Sesión: {selectedSession.id.slice(0,8)}</h1>
              <p className="text-[11px] text-slate-500">Cajero: {selectedSession.cashier} | Apertura: {new Date(selectedSession.openedAt).toLocaleString()}</p>
            </div>
          </div>
          <div className="text-right">
             <div className="text-[10px] text-slate-500 uppercase font-black">Total Ventas</div>
             <div className="text-2xl font-black text-green-400 font-mono">${sessionSales.reduce((a,s)=>a+s.total,0).toFixed(2)}</div>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-slate-900/40 border border-slate-800 rounded-2xl">
          <table className="w-full text-left text-sm">
             <thead className="sticky top-0 z-10">
               <tr className="bg-slate-800/90 text-slate-400 text-[9px] uppercase tracking-widest font-bold">
                 <th className="px-6 py-4">ID</th><th className="px-6 py-4">Hora</th><th className="px-6 py-4">Productos</th><th className="px-6 py-4">Método</th><th className="px-6 py-4 text-right">IVA</th><th className="px-6 py-4 text-right">Total USD</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-800/40">
               {sessionSales.map(s => (
                 <tr key={s.id} className="hover:bg-slate-800/20 transition-colors">
                   <td className="px-6 py-4 font-mono text-blue-400 text-xs">{s.saleNumber || s.id.slice(0,8)}</td>
                   <td className="px-6 py-4 font-mono text-xs text-slate-500">{s.time}</td>
                   <td className="px-6 py-4 text-[10px]">{s.items.length} ítems</td>
                   <td className="px-6 py-4"><span className="bg-slate-800 px-1.5 py-0.5 rounded text-[9px] font-bold">{s.paymentMethod}</span></td>
                   <td className="px-6 py-4 text-right font-mono text-xs text-slate-500">${s.iva.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-green-400">${s.total.toFixed(2)}</td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (showHistory) {
    return (
      <div className="flex flex-col h-screen bg-slate-950 text-slate-50 p-5">
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-bold">📜 Historial de Cierres</h1>
            <p className="text-[11px] text-slate-500">Haz clic en una fila para ver el detalle de ventas</p>
          </div>
          <button onClick={() => setShowHistory(false)} className="text-blue-400 text-sm font-bold hover:underline">← Volver a Ventas Hoy</button>
        </header>
        <div className="flex-1 overflow-auto bg-slate-900/40 border border-slate-800 rounded-2xl">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-800/90 text-slate-500 text-[9px] uppercase font-bold tracking-widest">
                <th className="px-6 py-4">Apertura</th>
                <th className="px-6 py-4">Cierre</th>
                <th className="px-6 py-4">Cajero</th>
                <th className="px-6 py-4 text-right">Monto Inicial</th>
                <th className="px-6 py-4 text-right">Monto Final</th>
                <th className="px-6 py-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {sessionHistory.map(s => (
                <tr key={s.id} onClick={() => handleViewSession(s)} className="hover:bg-blue-600/5 cursor-pointer transition-colors group">
                  <td className="px-6 py-4 font-mono text-xs group-hover:text-blue-400">{new Date(s.openedAt).toLocaleString()}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{s.closedAt ? new Date(s.closedAt).toLocaleString() : '-'}</td>
                  <td className="px-6 py-4 text-xs font-bold">{s.cashier}</td>
                  <td className="px-6 py-4 text-right font-mono text-blue-400">${s.openingBalance.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-mono text-green-400">${s.closingBalance?.toFixed(2) || '-'}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${s.status === 'OPEN' ? 'bg-green-500/10 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-50 p-5">
      <header className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">📊 Historial de Ventas</h1>
          <p className="text-[11px] text-slate-500">Registro completo y gestión de caja</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowHistory(true)} className="border border-slate-700 hover:bg-slate-800 px-4 py-2 rounded-lg font-bold text-xs transition-all">📜 Historial</button>
          {!activeSession ? (
             <button onClick={() => setShowOpenModal(true)} className="bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg shadow-blue-900/40">🔓 Abrir Caja</button>
          ) : (
             <button onClick={() => setShowCloseModal(true)} className="bg-green-600 hover:bg-green-700 px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg shadow-green-900/40">🔒 Cerrar Caja</button>
          )}
        </div>
      </header>

      {!activeSession && (
        <div className="flex-1 flex items-center justify-center">
           <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-12 text-center max-w-sm">
              <div className="text-5xl mb-4">🏪</div>
              <h2 className="text-lg font-bold mb-2">Caja Cerrada</h2>
              <p className="text-xs text-slate-500 mb-6">Debes abrir la caja con un monto inicial para registrar nuevas ventas hoy.</p>
              <button onClick={() => setShowOpenModal(true)} className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-bold transition-all shadow-xl shadow-blue-900/20">Abrir Caja Ahora</button>
           </div>
        </div>
      )}

      {activeSession && (
        <>
          <div className="grid grid-cols-5 gap-3 mb-4">
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
              <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Ventas Hoy</div>
              <div className="text-2xl font-black font-mono mt-0.5">{dailySales.length}</div>
            </div>
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
              <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Monto Apertura</div>
              <div className="text-2xl font-black font-mono mt-0.5 text-blue-400">${activeSession.openingBalance.toFixed(2)}</div>
            </div>
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
              <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Total Ventas (USD)</div>
              <div className="text-2xl font-black font-mono mt-0.5 text-green-400">${dailyTotal.toFixed(2)}</div>
            </div>
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
              <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Total Bs</div>
              <div className="text-2xl font-black font-mono mt-0.5 text-amber-400">{totalBs.toFixed(2)}</div>
            </div>
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
              <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Operador Actual</div>
              <div className="text-sm font-bold mt-2 truncate text-slate-300">{user?.name}</div>
            </div>
          </div>

          <div className="flex-1 min-h-0 bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-auto h-full">
              {dailySales.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-600">
                  <div className="text-center"><p className="text-4xl mb-2 opacity-30">📊</p><p className="text-sm font-medium">No hay ventas en esta sesión</p></div>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-800/90 text-slate-400 text-[9px] uppercase tracking-widest font-bold backdrop-blur-sm">
                      <th className="px-4 py-3">ID</th><th className="px-4 py-3">Hora</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Cajero</th><th className="px-4 py-3">Productos</th><th className="px-4 py-3">Método</th><th className="px-4 py-3 text-right">IVA</th><th className="px-4 py-3 text-right">Total USD</th><th className="px-4 py-3 text-right">Total Bs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {dailySales.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-blue-400 text-xs font-bold">{s.saleNumber || s.id.slice(0,8)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{s.time}</td>
                        <td className="px-4 py-3 text-[10px] font-bold text-slate-300">{s.customerName || 'Venta General'}</td>
                        <td className="px-4 py-3 text-xs">{s.cashier}</td>
                        <td className="px-4 py-3">
                           <div className="flex flex-col gap-1">
                              <span className="text-xs font-bold text-slate-300">{s.items.length} ítems:</span>
                              <div className="flex flex-wrap gap-1">
                                {s.items.map((item, idx) => (
                                  <span key={idx} className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-[4px] text-[9px] border border-slate-700">
                                    {item.qty}x {item.name}
                                  </span>
                                ))}
                              </div>
                              {s.paymentRef && <span className="text-[9px] text-blue-500 font-mono mt-1">Ref: {s.paymentRef}</span>}
                           </div>
                        </td>
                        <td className="px-4 py-3">
                           <div className="flex items-center gap-2">
                              <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[9px] font-bold">{s.paymentMethod}</span>
                              {s.paymentProof && (
                                <button onClick={() => setViewProof(s.paymentProof!)} className="hover:scale-110 transition-transform">
                                   <img src={s.paymentProof} className="w-6 h-6 rounded object-cover border border-slate-700 hover:border-blue-500" />
                                </button>
                              )}
                           </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-slate-400">${s.iva.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-green-400">${s.total.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs">{s.totalBs.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* Opening Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-bold mb-4">🔓 Apertura de Caja</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-black text-slate-500 mb-1.5 block">Fondo de Caja (USD)</label>
                <input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-lg font-mono outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button onClick={handleOpen} className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-bold shadow-lg">Abrir Ahora</button>
              <button onClick={() => setShowOpenModal(false)} className="w-full text-slate-500 text-xs font-bold hover:text-white transition-all">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Closing Modal */}
      {showCloseModal && activeSession && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-1">🔒 Cierre de Caja</h2>
            <p className="text-xs text-slate-500 mb-6 font-mono">Sesión: {activeSession.id.slice(0,8)}</p>
            <div className="space-y-3 mb-6 bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
               <div className="flex justify-between text-[11px]"><span className="text-slate-500 uppercase font-bold">Fondo Inicial</span><span className="font-mono text-slate-300">${activeSession.openingBalance.toFixed(2)}</span></div>
               <div className="flex justify-between text-[11px]"><span className="text-slate-500 uppercase font-bold">Total Ventas USD</span><span className="font-mono text-green-400 font-bold">${dailyTotal.toFixed(2)}</span></div>
               <div className="flex justify-between text-[11px]"><span className="text-slate-500 uppercase font-bold">Total IVA Recaudado</span><span className="font-mono text-blue-400 opacity-60">${calculateBreakdown()._ivaTotal.toFixed(2)}</span></div>
               
               <div className="py-2 border-t border-slate-700/50 mt-2">
                 <p className="text-[9px] uppercase font-black text-slate-600 mb-2">Desglose por Método:</p>
                 {Object.entries(calculateBreakdown()).map(([method, amt]: any) => (
                   <div key={method} className="flex justify-between text-[11px] mb-1 italic">
                     <span className="text-slate-500">{method}</span>
                     <span className="font-mono text-slate-400">${amt.toFixed(2)}</span>
                   </div>
                 ))}
               </div>

               <div className="flex justify-between text-sm font-black border-t border-slate-700 pt-3 relative overflow-hidden">
                 <div className="absolute inset-0 bg-blue-500/5 blur-xl -z-10" />
                 <span className="text-white">EFECTIVO ESPERADO</span>
                 <span className="font-mono text-blue-400">${(activeSession.openingBalance + (calculateBreakdown()['Efectivo $'] || 0)).toFixed(2)}</span>
               </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-black text-slate-500 mb-1.5 block">Monto Real en Caja (USD)</label>
                <input type="number" value={closingBalance} onChange={(e) => setClosingBalance(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-lg font-mono outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <button onClick={handleClose} className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-xl font-bold shadow-lg shadow-green-950/20">Cerrar Caja y Guardar</button>
              <button onClick={() => setShowCloseModal(false)} className="w-full text-slate-500 text-xs font-bold hover:text-white transition-all">Seguir Facturando</button>
            </div>
          </div>
        </div>
      )}
      {/* Proof Viewer Modal */}
      {viewProof && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[100] p-6" onClick={() => setViewProof(null)}>
           <div className="relative max-w-4xl w-full flex flex-col items-center animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
              <button 
                onClick={() => setViewProof(null)} 
                className="absolute -top-12 right-0 text-white flex items-center gap-2 font-black text-xs hover:text-blue-400 transition-all uppercase tracking-widest"
              >
                <span>Cerrar</span> <span className="text-2xl">✕</span>
              </button>
              <div className="bg-white p-2 rounded-3xl shadow-2xl overflow-hidden ring-4 ring-white/10">
                <img src={viewProof} className="max-h-[85vh] object-contain rounded-2xl" />
              </div>
              <p className="mt-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Comprobante de Pago Guardado</p>
           </div>
        </div>
      )}
    </div>
  )
}
