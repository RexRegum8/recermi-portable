import { useState, useEffect } from 'react'
import { getBaseUrl } from '../utils/api'
import { useProductStore } from '../store/ProductStore'
import { useAuth } from '../auth/AuthContext'

interface PrintOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  filename: string;
  fileUrl: string;
  paperType: string;
  colorMode: string;
  sides: string;
  pages: number;
  quantity: number;
  estimatedTotal: number;
  finalTotal?: number;
  status: string;
  notes?: string;
  createdAt: string;
}

export function PrintInbox() {
  const [orders, setOrders] = useState<PrintOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const { setPendingPosItem } = useProductStore()
  const { user, config, updateConfig } = useAuth()

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/api/prints`)
      const data = await res.json()
      setOrders(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
    // Optional: socket listener for new orders
  }, [])

  const updateOrder = async (id: string, updates: Partial<PrintOrder>) => {
    try {
      const res = await fetch(`${getBaseUrl()}/api/prints/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      if (res.ok) fetchOrders()
    } catch (e) {
      alert('Error al actualizar')
    }
  }

  const convertToSale = (order: PrintOrder) => {
    const finalPrice = order.finalTotal || order.estimatedTotal
    setPendingPosItem({
      id: `print-${order.id}`,
      sku: 'PRINT-SVC',
      name: `Servicio de Impresión: ${order.filename} (${order.orderNumber})`,
      price: finalPrice,
      quantity: 1,
      stock: 999,
      image: '🖨️',
      warrantyDays: 0,
      discount: 0
    })
    // In App.tsx, the user would need to switch to POS tab. 
    // We can't switch tabs from here unless we have a setActiveTab setter.
    // I will add a notification or just tell the user to go to POS.
    alert('Pedido cargado. Ve al módulo POS para finalizar la venta.')
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">🖨️ Bandeja de Impresiones</h1>
          <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Gestión de Archivos y Presupuestos Web</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsConfigOpen(true)} className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 px-4 py-2 rounded-xl border border-blue-500/30 transition-all text-xs font-black uppercase tracking-widest">⚙️ Configurar Precios</button>
          <button onClick={fetchOrders} className="bg-slate-800 hover:bg-slate-700 p-2 rounded-xl border border-slate-700 transition-all text-xs font-bold">🔄 Refrescar</button>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900/80 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800">
              <th className="px-6 py-4">Orden</th>
              <th className="px-6 py-4">Cliente / Archivo</th>
              <th className="px-6 py-4">Configuración</th>
              <th className="px-6 py-4">Estimado</th>
              <th className="px-6 py-4">Total Real</th>
              <th className="px-6 py-4 text-center">Estado</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/30">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-slate-800/20 transition-colors group">
                <td className="px-6 py-4">
                  <div className="font-mono font-black text-blue-400">{o.orderNumber}</div>
                  <div className="text-[9px] text-slate-600 font-bold">{new Date(o.createdAt).toLocaleString()}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-200">{o.customerName}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-500 truncate max-w-[150px]">{o.filename}</span>
                    <a href={`${getBaseUrl()}/api/prints/file/${o.fileUrl.split('/').pop()}`} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline font-bold text-[10px]">VER/BAJAR</a>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-0.5 text-[10px]">
                    <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700">{o.paperType}</span>
                    <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700 ml-1">{o.colorMode}</span>
                    <div className="mt-1 font-bold text-slate-500">{o.pages} págs × {o.quantity} juegos</div>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono font-bold text-slate-300">
                  ${o.estimatedTotal.toFixed(2)}
                </td>
                <td className="px-6 py-4">
                  <input 
                    type="number" 
                    defaultValue={o.finalTotal || o.estimatedTotal}
                    onBlur={(e) => updateOrder(o.id, { finalTotal: parseFloat(e.target.value) })}
                    className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] font-mono font-bold text-green-400 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="px-6 py-4 text-center">
                  <select 
                    value={o.status}
                    onChange={(e) => updateOrder(o.id, { status: e.target.value })}
                    className={`text-[9px] font-black uppercase px-2 py-1 rounded border outline-none ${
                        o.status === 'PENDING_REVIEW' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                        o.status === 'READY_FOR_PAYMENT' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                        o.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                        'bg-slate-800 text-slate-500 border-slate-700'
                    }`}
                  >
                    <option value="PENDING_REVIEW">PENDIENTE</option>
                    <option value="READY_FOR_PAYMENT">PARA COBRAR</option>
                    <option value="COMPLETED">ENTREGADO</option>
                    <option value="CANCELLED">CANCELADO</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => convertToSale(o)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-black px-3 py-1.5 rounded-lg text-[9px] shadow-lg shadow-blue-900/20 transition-all uppercase tracking-wider"
                  >
                    💰 Cobrar en POS
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && !loading && (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3 opacity-20">🖨️</div>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">No hay pedidos en bandeja</p>
          </div>
        )}
      </div>

      {isConfigOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-6">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-black text-white">⚙️ Configuración de Precios</h3>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Ajuste de costos base y multiplicadores</p>
              </div>
              <button onClick={() => setIsConfigOpen(false)} className="text-slate-500 hover:text-white text-xl">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-6 max-h-[60vh] overflow-auto pr-2 custom-scrollbar">
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest border-b border-slate-800 pb-2">Precios Base (Papel)</h4>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase mb-1.5 block">Papel Bond ($)</label>
                  <input type="number" step="0.01" value={config.pPriceBond} onChange={e => updateConfig({ pPriceBond: parseFloat(e.target.value) })} 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase mb-1.5 block">Papel Fotográfico ($)</label>
                  <input type="number" step="0.01" value={config.pPricePhoto} onChange={e => updateConfig({ pPricePhoto: parseFloat(e.target.value) })} 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase mb-1.5 block">Papel Glace ($)</label>
                  <input type="number" step="0.01" value={config.pPriceGlace} onChange={e => updateConfig({ pPriceGlace: parseFloat(e.target.value) })} 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white outline-none focus:border-blue-500" />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest border-b border-slate-800 pb-2">Multiplicadores</h4>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase mb-1.5 block">A Color (Mult.)</label>
                  <input type="number" step="0.1" value={config.pPriceColorMult} onChange={e => updateConfig({ pPriceColorMult: parseFloat(e.target.value) })} 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase mb-1.5 block">B/N (Mult.)</label>
                  <input type="number" step="0.1" value={config.pPriceBWMult} onChange={e => updateConfig({ pPriceBWMult: parseFloat(e.target.value) })} 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase mb-1.5 block">Doble Cara (Mult.)</label>
                  <input type="number" step="0.1" value={config.pPriceDoubleMult} onChange={e => updateConfig({ pPriceDoubleMult: parseFloat(e.target.value) })} 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white outline-none focus:border-blue-500" />
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800 flex justify-end gap-3">
              <div className="bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-2 mr-auto">
                <span className="text-[10px] text-slate-500 font-bold">FÓRMULA:</span>
                <span className="text-[10px] font-mono text-blue-400">Pág × Papel × Color × Caras</span>
              </div>
              <button onClick={() => setIsConfigOpen(false)} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-900/20 transition-all">Listo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
