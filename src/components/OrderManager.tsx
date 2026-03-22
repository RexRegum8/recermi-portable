import { useState, useEffect } from 'react'
import { getBaseUrl } from '../utils/api'

interface OrderItem {
  productId: string
  qty: number
  price: number
  product?: { name: string; sku: string }
}

interface Order {
  id: string
  customerId: string
  customer: { name: string; email: string; phone: string }
  items: OrderItem[]
  total: number
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED'
  paymentMethod: string
  paymentRef?: string
  paymentProof?: string
  createdAt: string
}

export function OrderManager() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'PENDING' | 'HISTORY'>('PENDING')

  const fetchOrders = async () => {
    const baseUrl = getBaseUrl()
    const token = localStorage.getItem('token')
    try {
      const resp = await fetch(`${baseUrl}/api/customers/orders-admin`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (resp.ok) {
        setOrders(await resp.json())
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { fetchOrders() }, [])

  const updateStatus = async (id: string, status: string) => {
    const baseUrl = getBaseUrl()
    const token = localStorage.getItem('token')
    try {
      const resp = await fetch(`${baseUrl}/api/customers/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      })
      if (resp.ok) {
        alert(`Pedido ${status === 'COMPLETED' ? 'Completado' : 'Cancelado'} con éxito`)
        fetchOrders()
        window.dispatchEvent(new CustomEvent('refreshSales'))
      } else {
        const err = await resp.json()
        alert('Error: ' + (err.error || 'No se pudo actualizar'))
      }
    } catch (e) { 
      console.error(e)
      alert('Error de conexión')
    }
  }

  const filteredOrders = orders.filter(o => 
    filter === 'PENDING' ? o.status === 'PENDING' : o.status !== 'PENDING'
  )

  if (loading) return <div className="p-10 text-slate-500 animate-pulse font-black text-center uppercase tracking-widest text-xs">Conectando con Servidor Web...</div>

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-slate-100 flex flex-col overflow-hidden">
      <header className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black tracking-tighter">📦 Centro de Pedidos Web</h1>
          <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold">Gestión de órdenes y pasarela de pago online</p>
        </div>
        <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800">
           <button onClick={() => setFilter('PENDING')} className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all ${filter === 'PENDING' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500'}`}>PENDIENTES</button>
           <button onClick={() => setFilter('HISTORY')} className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all ${filter === 'HISTORY' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>HISTORIAL</button>
        </div>
      </header>

      <div className="flex-1 overflow-auto custom-scrollbar space-y-4 pr-2">
        {filteredOrders.length === 0 ? (
          <div className="bg-slate-900/30 border-2 border-dashed border-slate-800 rounded-[3rem] p-24 text-center">
            <p className="text-5xl mb-4 opacity-10">📋</p>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">No hay pedidos en esta sección</p>
          </div>
        ) : filteredOrders.map(order => (
          <div key={order.id} className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl group hover:border-blue-500/30 transition-all">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/10">
              <div className="flex items-center gap-4">
                <span className="font-mono font-black text-blue-500 text-sm">#{order.id.slice(0,8).toUpperCase()}</span>
                <span className="text-[10px] text-slate-600 font-bold uppercase">{new Date(order.createdAt).toLocaleString()}</span>
                <span className={`text-[9px] font-black px-3 py-1 rounded-full border ${
                  order.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                  order.status === 'CANCELLED' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                  'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse'
                }`}>
                  {order.status}
                </span>
              </div>
              {order.status === 'PENDING' && (
                <div className="flex gap-2">
                  <button onClick={() => updateStatus(order.id, 'COMPLETED')} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl text-[10px] font-black shadow-lg transition-all active:scale-95">DESPACHAR</button>
                  <button onClick={() => updateStatus(order.id, 'CANCELLED')} className="bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white px-5 py-2 rounded-xl text-[10px] font-black transition-all">ANULAR</button>
                </div>
              )}
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-4 bg-slate-950/50 p-5 rounded-3xl border border-slate-800">
                <h3 className="text-[9px] uppercase tracking-widest text-blue-500 font-black mb-4">Información del Cliente</h3>
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-xl font-bold border border-slate-700">{order.customer.name[0]}</div>
                   <div>
                     <p className="font-black text-sm text-white">{order.customer.name}</p>
                     <p className="text-[10px] text-slate-500">{order.customer.email}</p>
                     <p className="text-[10px] text-slate-500">{order.customer.phone}</p>
                   </div>
                </div>
              </div>
              
              <div className="md:col-span-4 p-2">
                <h3 className="text-[9px] uppercase tracking-widest text-blue-500 font-black mb-4">Detalle de Pago</h3>
                <div className="flex items-start gap-4">
                   <div className="bg-slate-800 p-3 rounded-2xl border border-slate-700 text-lg">💳</div>
                   <div className="flex-1">
                      <p className="font-black text-xs text-slate-300 uppercase">{order.paymentMethod}</p>
                      {order.paymentRef && <p className="text-[11px] font-mono text-slate-500 mt-1">Ref: {order.paymentRef}</p>}
                      {order.paymentProof && (
                        <button onClick={() => window.open(order.paymentProof)} className="mt-3 text-[9px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-tighter flex items-center gap-1 transition-all">
                          <span className="text-sm">🖼️</span> Ver Comprobante
                        </button>
                      )}
                   </div>
                </div>
              </div>

              <div className="md:col-span-4 bg-slate-800/20 p-5 rounded-3xl border border-slate-800">
                <h3 className="text-[9px] uppercase tracking-widest text-blue-500 font-black mb-4">Productos en Orden</h3>
                <div className="space-y-2">
                   {order.items.map((item, idx) => (
                     <div key={idx} className="flex justify-between text-xs items-center">
                        <span className="text-slate-400 font-bold"><span className="text-blue-400">{item.qty}x</span> {item.product?.name || 'Producto'}</span>
                        <span className="font-mono text-white text-[11px] font-black">${(item.price * item.qty).toFixed(2)}</span>
                     </div>
                   ))}
                   <div className="pt-3 mt-3 border-t border-slate-800 flex justify-between items-end">
                      <span className="text-slate-500 uppercase text-[9px] font-black">Total Facturado</span>
                      <span className="text-2xl font-black text-green-400 font-mono">${order.total.toFixed(2)}</span>
                   </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
