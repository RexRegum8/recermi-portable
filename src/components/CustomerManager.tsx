import { useState, useEffect } from 'react'
import { getBaseUrl } from '../utils/api'
import { useAuth } from '../auth/AuthContext'
import { useProductStore, LoyaltyReward } from '../store/ProductStore'

export function CustomerManager() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any | null>(null)
  const [activeHistoryTab, setActiveHistoryTab] = useState<'sales' | 'tickets' | 'orders'>('sales')
  const { user, isAdmin } = useAuth()
  const { rewards } = useProductStore()
  const [showRewardsModal, setShowRewardsModal] = useState(false)

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/api/customers`)
      const data = await res.json()
      setCustomers(data)
    } catch (e: any) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchDetails = async (id: string) => {
    try {
      const res = await fetch(`${getBaseUrl()}/api/customers/${id}`)
      const data = await res.json()
      setSelected(data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este cliente y todo su historial?')) return
    try {
      await fetch(`${getBaseUrl()}/api/customers/${id}`, { method: 'DELETE' })
      setCustomers(customers.filter(c => c.id !== id))
      setSelected(null)
    } catch (e: any) {
      alert('Error al eliminar')
    }
  }

  const handleUpdatePoints = async (id: string, newPoints: number) => {
    if (!isAdmin) return
    try {
      await fetch(`${getBaseUrl()}/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: newPoints })
      })
      fetchDetails(id)
      fetchCustomers()
    } catch (e) { console.error(e) }
  }

  const handleRedeemReward = async (reward: LoyaltyReward) => {
    if (!selected) return
    if (selected.points < reward.pointsCost) {
      alert('Puntos insuficientes para este canje.')
      return
    }
    if (!confirm(`¿Canjear ${reward.pointsCost} puntos por: ${reward.name}?`)) return
    
    try {
      const res = await fetch(`${getBaseUrl()}/api/loyalty/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: selected.id, rewardId: reward.id })
      })
      if (!res.ok) {
         const err = await res.json()
         throw new Error(err.error || 'Error al canjear')
      }
      alert('Canje procesado exitosamente.')
      setShowRewardsModal(false)
      fetchDetails(selected.id)
      fetchCustomers()
    } catch (e: any) { alert(e.message) }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-50 p-5 overflow-hidden">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Directorio de Clientes</h1>
          <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold">Gestión de Perfiles y Programa de Puntos</p>
        </div>
        <div className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 text-xs font-bold text-slate-400">
          Total Clientes: <span className="text-blue-400 ml-1">{customers.length}</span>
        </div>
      </header>

      <div className="flex-1 flex gap-5 min-h-0">
        {/* Customer Grid */}
        <div className="flex-1 overflow-auto custom-scrollbar pr-2">
          {loading ? (
             <div className="grid grid-cols-3 gap-4 animate-pulse">
               {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 bg-slate-900 rounded-3xl" />)}
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customers.map(c => (
                <div key={c.id} onClick={() => fetchDetails(c.id)}
                  className={`bg-slate-900/60 border rounded-[2rem] p-6 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${selected?.id === c.id ? 'border-blue-500 bg-blue-950/20 shadow-lg shadow-blue-900/10' : 'border-slate-800 hover:border-slate-700'}`}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-3xl overflow-hidden shadow-inner border border-slate-700">
                      {c.photo ? <img src={c.photo} className="w-full h-full object-cover" /> : '👤'}
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-white leading-tight">{c.name}</h3>
                      <p className="text-[10px] text-slate-500 font-mono italic">CI: {c.ci || 'Sin Registro'}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/50">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-500 uppercase font-black">Fidelidad</span>
                      <span className="text-blue-400 font-black">{c.points} PUNTOS</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-500 uppercase font-black">Actividad</span>
                      <span className="text-slate-300 font-bold">{(c._count?.sales || 0) + (c._count?.tickets || 0) + (c._count?.orders || 0)} Total</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-600 font-medium">Desde: {new Date(c.createdAt).toLocaleDateString()}</span>
                    <span className="text-blue-500 font-black uppercase tracking-tighter">Ver Historial ▸</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selected ? (
          <aside className="w-[450px] bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 flex flex-col gap-6 shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-start">
              <div className="flex gap-4 items-center">
                 <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center text-4xl shadow-2xl border border-slate-700">
                   {selected.photo ? <img src={selected.photo} className="w-full h-full object-cover rounded-3xl" /> : '👤'}
                 </div>
                 <div>
                   <h2 className="text-xl font-black text-white">{selected.name}</h2>
                   <p className="text-xs text-slate-500 font-mono">{selected.email || 'Sin Email'}</p>
                 </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 text-slate-600 hover:text-white transition-colors">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="bg-slate-950/50 p-4 rounded-3xl border border-slate-800">
                  <p className="text-[9px] font-black text-slate-600 uppercase mb-1">Puntos Acumulados</p>
                  <p className="text-2xl font-black text-blue-400 leading-none">{selected.points} pts</p>
                  {isAdmin && (
                    <div className="flex gap-1 mt-3">
                       <button onClick={() => handleUpdatePoints(selected.id, selected.points + 10)} className="bg-blue-600/10 text-blue-500 px-2 py-0.5 rounded-lg text-[10px] font-bold border border-blue-500/20">+10</button>
                       <button onClick={() => handleUpdatePoints(selected.id, Math.max(0, selected.points - 10))} className="bg-red-600/10 text-red-500 px-2 py-0.5 rounded-lg text-[10px] font-bold border border-red-500/20">-10</button>
                    </div>
                  )}
               </div>
               <div className="bg-slate-950/50 p-4 rounded-3xl border border-slate-800">
                  <p className="text-[9px] font-black text-slate-600 uppercase mb-1">Documento CI</p>
                  <p className="text-lg font-bold font-mono text-slate-300">{selected.ci || 'P-00000000'}</p>
                  <p className="text-[9px] text-slate-500 mt-2">📞 {selected.phone || 'N/A'}</p>
               </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
               <div className="flex gap-2 mb-4 bg-slate-950 p-1 rounded-2xl border border-slate-800">
                  {(['sales', 'tickets', 'orders'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveHistoryTab(tab)}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeHistoryTab === tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-600 hover:text-slate-300'}`}>
                      {tab === 'sales' ? 'Compras' : tab === 'tickets' ? 'Servicios' : 'Pedidos'}
                    </button>
                  ))}
               </div>

               <div className="flex-1 overflow-auto custom-scrollbar space-y-2 pr-1">
                  {activeHistoryTab === 'sales' && (
                    selected.sales?.length === 0 ? <p className="text-center py-10 text-[10px] text-slate-700 italic font-bold">Sin historial de facturación</p> :
                    selected.sales?.map((s: any) => (
                      <div key={s.id} className="bg-slate-800/40 p-3 rounded-2xl border border-slate-800/50 flex justify-between items-center group hover:border-slate-700">
                         <div>
                            <p className="font-bold text-xs text-white">{s.saleNumber}</p>
                            <p className="text-[9px] text-slate-500">{new Date(s.createdAt).toLocaleDateString()}</p>
                         </div>
                         <p className="font-mono font-black text-green-400 text-sm">${s.total.toFixed(2)}</p>
                      </div>
                    ))
                  )}

                  {activeHistoryTab === 'tickets' && (
                    selected.tickets?.length === 0 ? <p className="text-center py-10 text-[10px] text-slate-700 italic font-bold">Sin historial técnico</p> :
                    selected.tickets?.map((t: any) => (
                      <div key={t.id} className="bg-slate-800/40 p-3 rounded-2xl border border-slate-800/50 group hover:border-slate-700 transition-all">
                         <div className="flex justify-between items-start mb-1">
                            <p className="font-bold text-xs text-white">{t.tkNumber}</p>
                            <span className="text-[8px] bg-blue-600/20 text-blue-400 px-1.5 rounded-full font-black uppercase">{t.status}</span>
                         </div>
                         <p className="text-[10px] text-slate-400 font-medium">{t.device}</p>
                         <p className="text-[9px] text-slate-600 italic mt-1 font-mono">Cost: ${t.cost.toFixed(2)}</p>
                      </div>
                    ))
                  )}

                  {activeHistoryTab === 'orders' && (
                    selected.orders?.length === 0 ? <p className="text-center py-10 text-[10px] text-slate-700 italic font-bold">Sin pedidos online</p> :
                    selected.orders?.map((o: any) => (
                      <div key={o.id} className="bg-slate-800/40 p-3 rounded-2xl border border-slate-800/50 flex justify-between items-center group hover:border-slate-700">
                         <div>
                            <p className="font-bold text-xs text-white">ORD-{o.id.substring(0,5)}</p>
                            <p className="text-[9px] text-slate-500">{new Date(o.createdAt).toLocaleDateString()}</p>
                         </div>
                         <span className="text-[8px] bg-yellow-600/20 text-yellow-400 px-1.5 rounded-full font-black uppercase">{o.status}</span>
                      </div>
                    ))
                  )}
               </div>
            </div>

            <div className="pt-5 border-t border-slate-800 flex gap-3">
               <button onClick={() => handleDelete(selected.id)} className="flex-1 py-4 bg-red-900/20 border border-red-500/20 text-red-500 rounded-3xl text-xs font-black hover:bg-red-500 hover:text-white transition-all">
                 ELIMINAR CLIENTE
               </button>
               {isAdmin && (
                  <button onClick={() => setShowRewardsModal(true)} className="flex-1 py-4 bg-blue-600 text-white rounded-3xl text-xs font-black shadow-xl shadow-blue-900/40 transition-all hover:scale-105 active:scale-95">
                    RECOMPENSAS PUNTOS
                  </button>
               )}
            </div>
          </aside>
        ) : (
          <aside className="w-[450px] bg-slate-900/30 border border-slate-800 border-dashed rounded-[3.5rem] flex flex-col items-center justify-center text-slate-700 opacity-50">
             <span className="text-7xl mb-6">📂</span>
             <p className="text-sm font-black uppercase tracking-tighter">Seleccione un Cliente</p>
            <p className="text-[10px] font-bold mt-2">Para ver perfil detallado e historial</p>
          </aside>
        )}
      </div>

      {showRewardsModal && selected && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-6">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95">
             <div className="flex justify-between items-start mb-6">
                <div>
                   <h3 className="text-xl font-black text-white flex items-center gap-2"><span className="text-3xl">🎁</span> Tienda de Recompensas</h3>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Gastar puntos de {selected.name}</p>
                </div>
                <div className="text-right">
                   <p className="text-[10px] uppercase font-bold text-slate-500">Saldo Disponible</p>
                   <p className="text-2xl font-black text-blue-400">{selected.points} pts</p>
                </div>
             </div>
             
             <div className="space-y-3 max-h-[50vh] overflow-auto pr-2 custom-scrollbar">
                {rewards.filter(r => r.isActive).length === 0 ? (
                  <p className="text-center text-slate-500 p-4 text-sm font-bold">No hay recompensas activas. Regístrelas en Inventario.</p>
                ) : (
                  rewards.filter(r => r.isActive).map(r => (
                    <div key={r.id} className="bg-slate-800/50 border border-slate-700 p-4 rounded-2xl flex justify-between items-center group transition-colors hover:bg-slate-800">
                       <div>
                          <h4 className="font-bold text-white text-sm">{r.name}</h4>
                          <p className="text-[10px] text-slate-400 max-w-[250px]">{r.description}</p>
                       </div>
                       <button onClick={() => handleRedeemReward(r)} disabled={selected.points < r.pointsCost} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:hover:bg-blue-600 px-4 py-2 rounded-xl text-xs font-black text-white shadow-lg transition-all flex flex-col items-center">
                          <span>CANJEAR</span>
                          <span className="text-[9px] font-mono text-blue-200">-{r.pointsCost} pts</span>
                       </button>
                    </div>
                  ))
                )}
             </div>

             <div className="mt-6 pt-4 border-t border-slate-800">
               <button onClick={() => setShowRewardsModal(false)} className="w-full py-3 text-xs font-bold text-slate-500 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-2xl transition-all">CERRAR</button>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
