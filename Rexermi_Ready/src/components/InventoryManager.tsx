import { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'
import { QRCodeSVG } from 'qrcode.react'
import { useProductStore, Product } from '../store/ProductStore'

export function InventoryManager() {
  const { user, canEdit, canAdd, config } = useAuth()
  const { products, createProduct, updateProduct, recordMovement } = useProductStore()
  const [movements, setMovements] = useState<any[]>([])
  const [activeView, setActiveView] = useState<'products' | 'movements'>('products')
  const [filter, setFilter] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showMov, setShowMov] = useState(false)
  const [showQR, setShowQR] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    if (activeView === 'movements') {
      fetch('http://localhost:3001/api/products/movements')
        .then(res => res.json())
        .then(setMovements)
    }
  }, [activeView])

  // Form states
  const [ns, setNs] = useState(''); const [nn, setNn] = useState(''); const [nc, setNc] = useState('Repuesto')
  const [np, setNp] = useState(''); const [nco, setNco] = useState(''); const [nst, setNst] = useState(''); const [nm, setNm] = useState('5'); const [nw, setNw] = useState('Principal')
  const [ms, setMs] = useState(''); const [mq, setMq] = useState(''); const [mt, setMt] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN'); const [mr, setMr] = useState('')

  const filtered = products.filter((p) => p.sku.toLowerCase().includes(filter.toLowerCase()) || p.name.toLowerCase().includes(filter.toLowerCase()))
  const low = products.filter((p) => p.stock <= p.minStock).length
  const totalVal = products.reduce((a, p) => a + p.price * p.stock, 0)
  const totalCost = products.reduce((a, p) => a + p.cost * p.stock, 0)

  const handleCreateProduct = async () => {
    if (!ns || !nn || !np) return
    await createProduct({ 
      sku: ns.toUpperCase(), name: nn, category: nc, 
      stock: Number(nst) || 0, minStock: Number(nm) || 5, 
      price: Number(np), cost: Number(nco) || 0, warehouse: nw 
    })
    setNs(''); setNn(''); setNp(''); setNco(''); setNst(''); setShowNew(false)
  }

  const handleCreateMovement = async () => {
    if (!ms || !mq) return
    const prod = products.find((p) => p.sku.toLowerCase() === ms.toLowerCase())
    if (!prod) return
    await recordMovement(prod.id, { 
      quantity: Number(mq), type: mt, reason: mr || `${mt} manual`, user: user?.name || '' 
    })
    setMs(''); setMq(''); setMr(''); setShowMov(false)
    if (activeView === 'movements') {
       // refresh movements manually or let the effect handle it
    }
  }

  const handleUpdateProduct = async (id: string, patch: Partial<Product>) => {
    await updateProduct(id, patch)
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-50 p-5">
      <header className="flex justify-between items-center mb-3">
        <div><h1 className="text-xl font-bold tracking-tight">Gestión de Inventario Pro</h1><p className="text-[11px] text-slate-500">Control multialmacén y trazabilidad</p></div>
        <div className="flex gap-2">
          <button onClick={() => setActiveView(activeView === 'products' ? 'movements' : 'products')} className="bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-700 transition-all">
            {activeView === 'products' ? '📜 Auditoría' : '📦 Productos'}
          </button>
          {canAdd && <button onClick={() => setShowMov(true)} className="bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-700 transition-all">📝 Movimiento</button>}
          {canAdd && <button onClick={() => setShowNew(true)} className="bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-xs font-semibold shadow-lg transition-all">+ Producto</button>}
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3"><div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Productos</div><div className="text-xl font-black font-mono mt-0.5">{products.length}</div></div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3"><div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Valor Venta</div><div className="text-xl font-black font-mono mt-0.5 text-green-400">${totalVal.toFixed(0)}</div></div>
        <div className={`rounded-xl p-3 border ${low > 0 ? 'bg-red-500/8 border-red-500/25' : 'bg-slate-900/70 border-slate-800'}`}><div className={`text-[9px] uppercase font-bold tracking-wider ${low > 0 ? 'text-red-400' : 'text-slate-500'}`}>⚠️ Stock Bajo</div><div className={`text-xl font-black font-mono mt-0.5 ${low > 0 ? 'text-red-400' : ''}`}>{low}</div></div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3"><div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Margen</div><div className="text-xl font-black font-mono mt-0.5 text-amber-400">${(totalVal - totalCost).toFixed(0)}</div></div>
      </div>

      <div className="mb-3"><input type="text" placeholder="🔍 Buscar por SKU o nombre..." className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-500" value={filter} onChange={(e) => setFilter(e.target.value)} /></div>

      <div className="flex-1 min-h-0 bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
        {activeView === 'products' ? (
          <div className="overflow-auto h-full">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10"><tr className="bg-slate-800/90 text-slate-400 text-[8px] uppercase tracking-widest font-bold backdrop-blur-sm">
                <th className="px-3 py-2.5">SKU</th><th className="px-3 py-2.5">Producto</th><th className="px-3 py-2.5">Almacén</th><th className="px-3 py-2.5">Stock</th><th className="px-3 py-2.5">Estado</th><th className="px-3 py-2.5 text-right">Costo</th><th className="px-3 py-2.5 text-right">Precio</th><th className="px-3 py-2.5 text-right">Margen</th><th className="px-3 py-2.5 text-center">QR</th>
                {canEdit && <th className="px-3 py-2.5 text-center">Edit</th>}
              </tr></thead>
              <tbody className="divide-y divide-slate-800/40">
                {filtered.map((p) => {
                  const margin = ((p.price - p.cost) / p.price * 100)
                  const editing = editingId === p.id
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-blue-400 text-xs">{p.sku}</td>
                      <td className="px-3 py-2.5">
                        {editing ? <input value={p.name} onChange={(e) => updateProduct(p.id, { name: e.target.value })} className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs w-full outline-none focus:ring-1 focus:ring-blue-500" />
                        : <><div className="font-semibold text-[12px]">{p.name}</div><div className="text-[9px] text-slate-500">{p.category}</div></>}
                      </td>
                      <td className="px-3 py-2.5 text-slate-400 text-xs">{p.warehouse}</td>
                      <td className="px-3 py-2.5">
                        <span className={`font-bold font-mono ${p.stock <= p.minStock ? 'text-red-400' : 'text-slate-100'}`}>{p.stock}</span>
                        <span className="text-[8px] text-slate-600 ml-0.5">/{p.minStock}</span>
                      </td>
                      <td className="px-3 py-2.5">{p.stock <= p.minStock ? <span className="bg-red-500/10 text-red-400 text-[8px] font-bold px-1 py-0.5 rounded border border-red-500/20">LOW</span> : <span className="bg-green-500/10 text-green-400 text-[8px] font-bold px-1 py-0.5 rounded border border-green-500/20">OK</span>}</td>
                      <td className="px-3 py-2.5 text-right">
                        {editing ? <input type="number" value={p.cost} onChange={(e) => updateProduct(p.id, { cost: Number(e.target.value) })} className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs w-16 font-mono outline-none text-right" />
                        : <span className="font-mono text-xs text-slate-400">${p.cost.toFixed(2)}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {editing ? <input type="number" value={p.price} onChange={(e) => updateProduct(p.id, { price: Number(e.target.value) })} className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs w-16 font-mono outline-none text-right" />
                        : <span className="font-mono font-bold text-sm">${p.price.toFixed(2)}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right"><span className={`font-mono text-xs font-bold ${margin >= 50 ? 'text-green-400' : margin >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>{margin.toFixed(0)}%</span></td>
                      <td className="px-3 py-2.5 text-center relative">
                        <button onClick={() => setShowQR(showQR === p.sku ? null : p.sku)} className="text-slate-500 hover:text-blue-400 text-sm transition-colors">📱</button>
                        {showQR === p.sku && (
                          <div className="absolute z-50 right-0 top-full bg-white p-3 rounded-xl shadow-2xl border" onClick={() => setShowQR(null)}>
                            <QRCodeSVG value={JSON.stringify({ sku: p.sku, name: p.name, price: p.price, priceBs: (p.price * config.exchangeRateBCV).toFixed(2) })} size={110} />
                            <p className="text-black text-[8px] text-center mt-1 font-bold">{p.sku} — ${p.price}</p>
                          </div>
                        )}
                      </td>
                      {canEdit && <td className="px-3 py-2.5 text-center">
                        <button onClick={() => setEditingId(editing ? null : p.id)} className={`text-xs px-2 py-0.5 rounded transition-all ${editing ? 'bg-green-600 text-white font-bold' : 'text-slate-500 hover:text-blue-400'}`}>
                          {editing ? '✓' : '✏️'}
                        </button>
                      </td>}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-auto h-full">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10"><tr className="bg-slate-800/90 text-slate-400 text-[8px] uppercase tracking-widest font-bold backdrop-blur-sm">
                <th className="px-3 py-2.5">Fecha</th><th className="px-3 py-2.5">SKU</th><th className="px-3 py-2.5">Producto</th><th className="px-3 py-2.5">Tipo</th><th className="px-3 py-2.5 text-center">Qty</th><th className="px-3 py-2.5">Motivo</th><th className="px-3 py-2.5">Usuario</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-800/40">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-3 py-2.5 text-[10px] text-slate-500 font-mono">{m.date}</td>
                    <td className="px-3 py-2.5 font-mono text-blue-400 text-xs">{m.sku}</td>
                    <td className="px-3 py-2.5 text-[12px]">{m.product}</td>
                    <td className="px-3 py-2.5"><span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${m.type === 'IN' ? 'bg-green-500/10 text-green-400 border-green-500/25' : m.type === 'OUT' ? 'bg-red-500/10 text-red-400 border-red-500/25' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25'}`}>{m.type}</span></td>
                    <td className={`px-3 py-2.5 text-center font-mono font-bold ${m.quantity > 0 ? 'text-green-400' : 'text-red-400'}`}>{m.quantity > 0 ? '+' : ''}{m.quantity}</td>
                    <td className="px-3 py-2.5 text-slate-400 text-xs">{m.reason}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">{m.user}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Product Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowNew(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-7 w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-1">Nuevo Producto</h2><p className="text-xs text-slate-400 mb-5">Agregar artículo al inventario</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">SKU *</label><input value={ns} onChange={(e) => setNs(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono" placeholder="BAT-IP15" /></div>
                <div><label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Categoría</label><select value={nc} onChange={(e) => setNc(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none"><option>Repuesto</option><option>Accesorio</option><option>Componente</option><option>Herramienta</option></select></div>
              </div>
              <div><label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Nombre *</label><input value={nn} onChange={(e) => setNn(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Batería Original iPhone 15" /></div>
              <div className="grid grid-cols-4 gap-2">
                <div><label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Precio *</label><input type="number" value={np} onChange={(e) => setNp(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm font-mono outline-none" /></div>
                <div><label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Costo</label><input type="number" value={nco} onChange={(e) => setNco(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm font-mono outline-none" /></div>
                <div><label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Stock</label><input type="number" value={nst} onChange={(e) => setNst(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm font-mono outline-none" /></div>
                <div><label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Mín</label><input type="number" value={nm} onChange={(e) => setNm(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm font-mono outline-none" /></div>
              </div>
              <div><label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Almacén</label><select value={nw} onChange={(e) => setNw(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none"><option>Principal</option><option>Tienda</option><option>Depósito</option></select></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowNew(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold hover:bg-slate-800 transition-all">Cancelar</button>
              <button onClick={handleCreateProduct} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all shadow-lg">✅ Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Movement Modal */}
      {showMov && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowMov(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-7 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-1">Registrar Movimiento</h2><p className="text-xs text-slate-400 mb-5">Entrada, salida o ajuste</p>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {(['IN', 'OUT', 'ADJUSTMENT'] as const).map((t) => (
                  <button key={t} onClick={() => setMt(t)} className={`p-2 rounded-lg text-xs font-bold border transition-all ${mt === t ? 'bg-blue-600/20 border-blue-500/40 text-blue-400' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}>
                    {t === 'IN' ? '📥 Entrada' : t === 'OUT' ? '📤 Salida' : '🔧 Ajuste'}
                  </button>
                ))}
              </div>
              <div><label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">SKU</label><input value={ms} onChange={(e) => setMs(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Cantidad</label><input type="number" value={mq} onChange={(e) => setMq(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Motivo</label><input value={mr} onChange={(e) => setMr(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowMov(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold hover:bg-slate-800 transition-all">Cancelar</button>
              <button onClick={handleCreateMovement} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all shadow-lg">✅ Registrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
