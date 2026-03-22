import { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'
import { QRCodeSVG } from 'qrcode.react'
import { useProductStore, Product } from '../store/ProductStore'
import { getBaseUrl } from '../utils/api'

export function InventoryManager() {
  const { user, canEdit, canAdd } = useAuth()
  const { products, rewards, createProduct, updateProduct, recordMovement, createReward, updateReward, deleteReward } = useProductStore()
  const [activeView, setActiveView] = useState<'products' | 'movements' | 'audit' | 'rewards'>('products')
  const [filter, setFilter] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS')
  
  const [showNew, setShowNew] = useState(false)
  const [showMov, setShowMov] = useState(false)
  const [showNewReward, setShowNewReward] = useState(false)
  const [showQR, setShowQR] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [history, setHistory] = useState<any[]>([])
  const [allMovements, setAllMovements] = useState<any[]>([])
  const [selectedHistory, setSelectedHistory] = useState<Product | null>(null)

  // Form states
  const [nn, setNn] = useState(''); const [ns, setNs] = useState(''); const [nc, setNc] = useState('Repuesto')
  const [np, setNp] = useState(''); const [nco, setNco] = useState(''); const [nst, setNst] = useState(''); const [nm, setNm] = useState('5')
  const [nw, setNw] = useState('Principal'); const [ngx, setNgx] = useState('30'); const [ni, setNi] = useState('')

  // Movement Form
  const [ms, setMs] = useState(''); const [mq, setMq] = useState(''); const [mt, setMt] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN'); const [mr, setMr] = useState('')
  
  // Reward Form
  const [rn, setRn] = useState(''); const [rd, setRd] = useState(''); const [rc, setRc] = useState('100')

  useEffect(() => {
    if (activeView === 'movements') {
      fetch(`${getBaseUrl()}/api/products/movements`)
        .then(res => res.json())
        .then(setAllMovements)
    }
  }, [activeView])

  const categories = ['TODOS', ...Array.from(new Set(products.map(p => p.category)))]

  const filtered = products.filter((p) => {
    const matchesFilter = p.sku?.toLowerCase().includes(filter.toLowerCase()) || p.name?.toLowerCase().includes(filter.toLowerCase())
    const matchesCategory = selectedCategory === 'TODOS' || p.category === selectedCategory
    return matchesFilter && matchesCategory
  })

  const lowStock = products.filter(p => p.stock <= p.minStock)

  const handleCreateProduct = async () => {
    if (!ns || !nn || !np) return
    await createProduct({ 
      sku: ns.toUpperCase(), name: nn, category: nc, 
      stock: Number(nst) || 0, minStock: Number(nm) || 5, 
      price: Number(np) || 0, cost: Number(nco) || 0, warehouse: nw,
      warrantyDays: Number(ngx) || 30,
      image: ni || '📦'
    })
    setNs(''); setNn(''); setNp(''); setNco(''); setNst(''); setNi(''); setShowNew(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setNi(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleCreateReward = async () => {
    if (!rn || !rc) return
    await createReward({ name: rn, description: rd, pointsCost: Number(rc), isActive: true })
    setRn(''); setRd(''); setRc('100'); setShowNewReward(false)
  }

  const handleCreateMovement = async () => {
    if (!ms || !mq) return
    const prod = products.find((p) => p.sku.toLowerCase() === ms.toLowerCase())
    if (!prod) return
    await recordMovement(prod.id, { 
      quantity: Number(mq), type: mt, reason: mr || `${mt} manual`, user: user?.name || '' 
    })
    setMs(''); setMq(''); setMr(''); setShowMov(false)
  }

  const fetchHistory = async (p: Product) => {
    try {
      const res = await fetch(`${getBaseUrl()}/api/products/${p.id}/history`)
      const data = await res.json()
      setHistory(data)
      setSelectedHistory(p)
    } catch (e) { console.error(e) }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-50 p-5 overflow-hidden">
      <header className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Gestión de Inventario Rexermi</h1>
          <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold">Control de Existencias, Auditoría y Fidelización</p>
        </div>
        <div className="flex gap-2">
           <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex">
             {(['products', 'movements', 'audit', 'rewards'] as const).map(v => (
               <button key={v} onClick={() => setActiveView(v)}
                 className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${activeView === v ? 'bg-blue-600' : 'text-slate-500 hover:text-slate-300'}`}>
                 {v === 'products' ? 'PRODUCTOS' : v === 'movements' ? 'MOVIMIENTOS' : v === 'audit' ? 'AUDITORÍA' : 'RECOMPENSAS'}
               </button>
             ))}
           </div>
           {canAdd && (
              <div className="flex gap-2">
                <button onClick={() => setShowMov(true)} className="bg-amber-600/20 text-amber-400 border border-amber-500/30 px-4 py-2 rounded-xl text-xs font-black">⚙️ Movimiento</button>
                {activeView === 'rewards' ? 
                  <button onClick={() => setShowNewReward(true)} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl text-xs font-black shadow-lg">+ Canje</button> :
                  <button onClick={() => setShowNew(true)} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl text-xs font-black shadow-lg">+ Producto</button>
                }
              </div>
           )}
        </div>
      </header>

      {/* FILTERS SECTION */}
      {activeView === 'products' && (
        <div className="flex gap-3 mb-4">
           <div className="flex-1 relative">
              <input type="text" placeholder="Buscar por SKU, Nombre o Descripción..." className="w-full bg-slate-900 border border-slate-800 rounded-xl px-10 py-2.5 text-xs outline-none focus:ring-1 focus:ring-blue-500" value={filter} onChange={e => setFilter(e.target.value)} />
              <span className="absolute left-4 top-3 opacity-30 text-xs">🔍</span>
           </div>
           <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold outline-none">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
           </select>
        </div>
      )}

      {activeView === 'products' && (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-900/40 border border-slate-800 rounded-[2rem] overflow-hidden">
           <div className="flex-1 overflow-auto custom-scrollbar">
             <table className="w-full text-left">
               <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur shadow-xl text-[9px] text-slate-500 uppercase font-black tracking-widest border-b border-slate-800">
                 <tr>
                   <th className="px-6 py-4">Producto</th><th className="px-6 py-4">Almacén</th><th className="px-6 py-4 text-center">Stock</th><th className="px-6 py-4 text-center">Garantía</th><th className="px-6 py-4 text-right">Precio</th><th className="px-6 py-4 text-right">Opciones</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-800/50">
                 {filtered.map(p => {
                    const editing = editingId === p.id
                    return (
                      <tr key={p.id} className="hover:bg-blue-600/5 group transition-colors">
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden border border-slate-700">
                                 {p.image?.startsWith('data:image') ? <img src={p.image} className="w-full h-full object-cover" /> : <span className="text-lg">{p.image || '📦'}</span>}
                              </div>
                              {editing ? <input value={p.name} onChange={e => updateProduct(p.id, { name: e.target.value })} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs outline-none" /> :
                              <div><p className="font-bold text-sm">{p.name}</p><p className="text-[9px] text-blue-500 font-mono uppercase">{p.sku}</p></div>}
                           </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-500">{p.warehouse}</td>
                        <td className="px-6 py-4 text-center">
                           <span className={`text-sm font-black font-mono ${p.stock <= p.minStock ? 'text-red-400 animate-pulse' : 'text-slate-100'}`}>{p.stock}</span>
                           <span className="text-[9px] text-slate-600 ml-1">min:{p.minStock}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                           {editing ? <input type="number" value={p.warrantyDays} onChange={e => updateProduct(p.id, { warrantyDays: Number(e.target.value) })} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs w-16 text-center outline-none" /> :
                           <span className="bg-slate-800 px-2 py-1 rounded-lg text-[10px] font-black border border-slate-700">{p.warrantyDays || 30} d</span>}
                        </td>
                        <td className="px-6 py-4 text-right font-black font-mono text-green-400">${p.price.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setShowQR(p.sku)} className="p-2 text-slate-500 hover:text-white">📱</button>
                              <button onClick={() => fetchHistory(p)} className="p-2 text-slate-500 hover:text-blue-400">📜</button>
                              <button onClick={() => setEditingId(editing ? null : p.id)} className={`px-3 py-1 rounded-lg text-[10px] font-black ${editing ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400'}`}>{editing ? 'GUARDAR' : 'EDITAR'}</button>
                           </div>
                        </td>
                      </tr>
                    )
                 })}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {activeView === 'movements' && (
         <div className="flex-1 overflow-auto bg-slate-900/40 border border-slate-800 rounded-2xl">
            <table className="w-full text-left">
               <thead className="bg-slate-900 border-b border-slate-800 text-[9px] font-black uppercase text-slate-500"><tr className="sticky top-0 bg-slate-900">
                 <th className="px-6 py-4">Fecha</th><th className="px-6 py-4">Producto</th><th className="px-6 py-4 text-center">Tipo</th><th className="px-6 py-4 text-center">Cant.</th><th className="px-6 py-4">Razón</th><th className="px-6 py-4">Usuario</th>
               </tr></thead>
               <tbody className="divide-y divide-slate-800/40 text-[11px]">
                  {allMovements.map(m => (
                    <tr key={m.id} className="hover:bg-slate-800/20">
                      <td className="px-6 py-3 font-mono text-slate-500">{new Date(m.date).toLocaleString()}</td>
                      <td className="px-6 py-3"><p className="font-bold">{m.product}</p><p className="text-[9px] text-blue-500 font-mono italic">{m.sku}</p></td>
                      <td className="px-6 py-3 text-center"><span className={`px-2 py-0.5 rounded font-black ${m.type === 'IN' ? 'bg-green-500/10 text-green-400' : m.type === 'OUT' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>{m.type}</span></td>
                      <td className="px-6 py-3 text-center font-black">{Math.abs(m.quantity)}</td>
                      <td className="px-6 py-3 italic text-slate-400">{m.reason}</td>
                      <td className="px-6 py-3 font-bold">{m.user}</td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      )}

      {activeView === 'audit' && (
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-red-600/5 border border-red-500/20 rounded-[2rem] p-8">
               <h3 className="text-xl font-black text-red-500 mb-4">Stock Crítico</h3>
               <div className="space-y-3">
                  {lowStock.map(p => (
                    <div key={p.id} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                       <div><p className="font-bold text-sm">{p.name}</p><p className="text-[10px] text-slate-500 font-mono">{p.sku}</p></div>
                       <div className="text-right text-red-400 font-black font-mono">{p.stock} <span className="text-[9px] opacity-40">/ {p.minStock}</span></div>
                    </div>
                  ))}
                  {lowStock.length === 0 && <p className="text-sm text-slate-500 text-center py-10 italic">Todo en orden ✅</p>}
               </div>
            </div>
         </div>
      )}

      {activeView === 'rewards' && (
        <div className="flex-1 overflow-auto custom-scrollbar">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {rewards.map(r => (
                <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 hover:border-blue-500 transition-all group">
                   <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-3xl border border-blue-500/20">🎁</div>
                      <button onClick={() => updateReward(r.id, { isActive: !r.isActive })} className={`w-10 h-5 rounded-full relative transition-all ${r.isActive ? 'bg-green-600' : 'bg-slate-700'}`}>
                         <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${r.isActive ? 'left-6' : 'left-1'}`} />
                      </button>
                   </div>
                   <h3 className="font-black text-white text-sm mb-1">{r.name}</h3>
                   <p className="text-[10px] text-slate-500 mb-4 h-8 line-clamp-2 leading-tight">{r.description}</p>
                   <div className="flex justify-between items-end border-t border-slate-800 pt-4">
                      <div><p className="text-[9px] text-blue-500 font-black uppercase">Puntos</p><p className="text-xl font-black text-white font-mono">{r.pointsCost}</p></div>
                      <button onClick={() => deleteReward(r.id)} className="p-2 text-red-500/30 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">🗑️</button>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* MODALS */}
      {showNew && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[100] p-6">
          <div className="bg-slate-900 border border-slate-700 rounded-[3rem] p-10 w-full max-w-lg shadow-2xl overflow-auto max-h-[90vh]">
             <h2 className="text-2xl font-black mb-6">Nuevo Producto</h2>
             <div className="space-y-4">
                <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-3xl border border-slate-700">
                   <div className="w-20 h-20 bg-slate-900 rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center relative overflow-hidden group">
                      {ni ? <img src={ni} className="w-full h-full object-cover" /> : <span className="text-2xl opacity-20">🖼️</span>}
                      <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                   </div>
                   <div className="flex-1"><p className="text-xs font-bold text-slate-300">Imagen del Producto</p><p className="text-[10px] text-slate-500">Haz clic para subir o arrastra</p></div>
                </div>
                <input value={nn} onChange={e => setNn(e.target.value)} placeholder="Nombre del Producto" className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-sm" />
                <div className="grid grid-cols-2 gap-4">
                  <input value={ns} onChange={e => setNs(e.target.value)} placeholder="SKU" className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-xs font-mono" />
                   <select value={nc} onChange={e => setNc(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold">
                    {categories.filter(c => c !== 'TODOS').map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="Repuesto">Repuesto</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-4">
                   <input type="number" value={np} onChange={e => setNp(e.target.value)} placeholder="Precio" className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-sm font-mono" />
                   <input type="number" value={nco} onChange={e => setNco(e.target.value)} placeholder="Costo" className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-sm font-mono" />
                   <input type="number" value={nst} onChange={e => setNst(e.target.value)} placeholder="Stock" className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-sm font-mono" />
                </div>
             </div>
             <div className="flex gap-4 mt-8">
                <button onClick={() => setShowNew(false)} className="flex-1 py-4 rounded-3xl bg-slate-800 font-bold">CANCELAR</button>
                <button onClick={handleCreateProduct} className="flex-1 py-4 rounded-3xl bg-blue-600 font-black shadow-xl shadow-blue-900/40">GUARDAR</button>
             </div>
          </div>
        </div>
      )}

      {showMov && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[100] p-6">
           <div className="bg-slate-900 border border-slate-700 rounded-[3rem] p-10 w-full max-w-sm shadow-2xl">
              <h2 className="text-xl font-black mb-6">⚙️ Registrar Movimiento</h2>
              <div className="space-y-4">
                 <input list="prod-skus" value={ms} onChange={e => setMs(e.target.value)} placeholder="SKU del Producto" className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-sm font-mono uppercase" />
                 <datalist id="prod-skus">{products.map(p => <option key={p.id} value={p.sku}>{p.name}</option>)}</datalist>
                 <div className="grid grid-cols-2 gap-4">
                    <select value={mt} onChange={e => setMt(e.target.value as any)} className="bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-xs font-bold"><option value="IN">ENTRADA</option><option value="OUT">SALIDA</option><option value="ADJUSTMENT">AJUSTE</option></select>
                    <input type="number" value={mq} onChange={e => setMq(e.target.value)} placeholder="Cant." className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-sm font-mono" />
                 </div>
                 <input value={mr} onChange={e => setMr(e.target.value)} placeholder="Razón / Motivo" className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-sm" />
              </div>
              <div className="flex gap-4 mt-8">
                 <button onClick={() => setShowMov(false)} className="flex-1 py-4 rounded-3xl bg-slate-800 font-bold">CANCELAR</button>
                 <button onClick={handleCreateMovement} className="flex-1 py-4 rounded-3xl bg-amber-600 font-black shadow-xl shadow-amber-900/40">PROCESAR</button>
              </div>
           </div>
         </div>
      )}

      {selectedHistory && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[110] p-6">
            <div className="bg-slate-900 border border-slate-700 rounded-[3rem] p-10 w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh]">
               <div className="flex justify-between items-start mb-6">
                  <div><h2 className="text-xl font-black">{selectedHistory.name}</h2><p className="text-xs text-blue-500 font-mono">{selectedHistory.sku}</p></div>
                  <button onClick={() => setSelectedHistory(null)} className="text-3xl opacity-20 hover:opacity-100 transition-opacity">×</button>
               </div>
               <div className="flex-1 overflow-auto bg-slate-950 rounded-2xl border border-slate-800">
                  <table className="w-full text-left text-[10px]">
                     <thead className="bg-slate-900 sticky top-0 uppercase text-slate-600 font-bold"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3 text-center">Tipo</th><th className="px-4 py-3 text-right">Cant.</th><th className="px-4 py-3">Razón</th><th className="px-4 py-3">Cajero</th></tr></thead>
                     <tbody className="divide-y divide-slate-800/50">
                        {history.map(m => (
                           <tr key={m.id}>
                              <td className="px-4 py-2 opacity-50">{new Date(m.date).toLocaleString()}</td>
                              <td className="px-4 py-2 text-center"><span className={m.type === 'IN' ? 'text-green-400' : 'text-red-400'}>{m.type}</span></td>
                              <td className="px-4 py-2 text-right font-black">{m.quantity}</td>
                              <td className="px-4 py-2 italic text-slate-400">{m.reason}</td>
                              <td className="px-4 py-2 font-bold">{m.user}</td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>
      )}

      {showNewReward && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[100] p-6">
          <div className="bg-slate-900 border border-slate-700 rounded-[3rem] p-10 w-full max-w-sm shadow-2xl">
             <h2 className="text-xl font-black mb-6">Nueva Recompensa</h2>
             <div className="space-y-4">
                <input value={rn} onChange={e => setRn(e.target.value)} placeholder="Nombre del Canje" className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-sm font-bold" />
                <textarea value={rd} onChange={e => setRd(e.target.value)} placeholder="Descripción detallada..." className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-xs h-24 resize-none" />
                <div className="bg-blue-600/10 p-4 rounded-2xl border border-blue-500/20">
                   <label className="text-[10px] font-black uppercase text-blue-500 mb-2 block">Costo en Puntos</label>
                   <input type="number" value={rc} onChange={e => setRc(e.target.value)} className="w-full bg-transparent text-2xl font-black font-mono outline-none" />
                </div>
             </div>
             <div className="flex gap-4 mt-8">
                <button onClick={() => setShowNewReward(false)} className="flex-1 py-4 rounded-3xl bg-slate-800 font-bold">CANCELAR</button>
                <button onClick={handleCreateReward} className="flex-1 py-4 rounded-3xl bg-blue-600 font-black shadow-xl shadow-blue-900/40 text-xs">CREAR RECOMPENSA</button>
             </div>
          </div>
        </div>
      )}

      {showQR && (
         <div className="fixed inset-0 bg-black/90 backdrop-blur-3xl flex items-center justify-center z-[120]" onClick={() => setShowQR(null)}>
            <div className="bg-white p-10 rounded-[4rem] shadow-2xl transform hover:scale-105 transition-transform" onClick={e => e.stopPropagation()}>
               <QRCodeSVG value={showQR} size={256} />
               <p className="text-center mt-6 text-slate-900 font-mono text-sm leading-tight">ESCANEA PARA<br/><span className="text-slate-900 font-black">{showQR}</span></p>
            </div>
         </div>
      )}
    </div>
  )
}
