import { useState, useEffect } from 'react'
import { getBaseUrl } from '../utils/api'

interface OrderItem {
  productId: string
  qty: number
  price: number
}

interface Order {
  id: string
  customerId: string
  customer: { name: string; email: string; phone: string }
  items: any[]
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
        // If SalesContext is available nearby, we should refresh it. 
        // But OrderManager doesn't have useSales yet. I will add it.
        window.dispatchEvent(new CustomEvent('refreshSales'))
      } else {
        alert('Error al actualizar el pedido')
      }
    } catch (e) { 
      console.error(e)
      alert('Error de conexión')
    }
  }

  if (loading) return <div className="p-10 text-slate-500 animate-pulse">Cargando pedidos...</div>

  return (
    <div className="p-6 bg-slate-950 min-h-screen text-slate-100">
      <header className="mb-6">
        <h1 className="text-xl font-bold">📦 Pedidos del Catálogo</h1>
        <p className="text-[11px] text-slate-500">Gestión de órdenes recibidas desde la página web</p>
      </header>

      <div className="space-y-4 max-w-5xl">
        {orders.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-20 text-center">
            <p className="text-3xl mb-2 opacity-20">📋</p>
            <p className="text-slate-500 text-sm">No hay pedidos pendientes en este momento.</p>
          </div>
        ) : orders.map(order => (
          <div key={order.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
              <div>
                <span className="font-mono font-bold text-blue-400 text-sm">{order.id.slice(0,8)}</span>
                <span className="text-[10px] text-slate-500 ml-3">{new Date(order.createdAt).toLocaleString()}</span>
                <span className={`ml-3 text-[9px] font-bold px-2 py-0.5 rounded ${
                  order.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400' : 
                  order.status === 'CANCELLED' ? 'bg-red-500/10 text-red-400' : 
                  'bg-yellow-500/10 text-yellow-400'
                }`}>
                  {order.status}
                </span>
              </div>
              {order.status === 'PENDING' && (
                <div className="flex gap-2">
                  <button onClick={() => updateStatus(order.id, 'COMPLETED')} className="bg-green-600/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-lg text-[10px] font-bold hover:bg-green-600 hover:text-white transition-all">COMPLETAR</button>
                  <button onClick={() => updateStatus(order.id, 'CANCELLED')} className="bg-red-600/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-lg text-[10px] font-bold hover:bg-red-600 hover:text-white transition-all">CANCELAR</button>
                </div>
              )}
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-black mb-2">Cliente</h3>
                <p className="font-bold text-sm">{order.customer.name}</p>
                <p className="text-xs text-slate-400">{order.customer.email}</p>
                <p className="text-xs text-slate-400">{order.customer.phone}</p>
              </div>
              
              <div>
                <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-black mb-2">Pago</h3>
                <p className="font-bold text-xs text-blue-400">{order.paymentMethod}</p>
                {order.paymentRef && <p className="text-xs font-mono text-slate-400">Ref: {order.paymentRef}</p>}
                {order.paymentProof && (
                  <div className="mt-2">
                    <p className="text-[9px] text-slate-500 mb-1">Comprobante:</p>
                    <img src={order.paymentProof} className="w-20 h-20 object-cover rounded-lg border border-slate-700 cursor-zoom-in hover:scale-110 transition-transform" 
                      onClick={() => window.open().document.write(`<img src="${order.paymentProof}" style="max-width:100%">`)} />
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-black mb-2">Productos</h3>
                <div className="space-y-1">
                   {order.items.map((item, idx) => (
                     <div key={idx} className="flex justify-between text-xs">
                        <span className="text-slate-300">{item.qty}x Product ID: {item.productId.slice(0,5)}...</span>
                        <span className="font-mono">${(item.price * item.qty).toFixed(2)}</span>
                     </div>
                   ))}
                   <div className="pt-2 mt-2 border-t border-slate-800 flex justify-between font-black">
                      <span className="text-slate-400 uppercase text-[10px]">Total Pedido</span>
                      <span className="text-green-400">${order.total.toFixed(2)}</span>
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
