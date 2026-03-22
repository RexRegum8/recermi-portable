import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../auth/AuthContext'
import { useSales, SaleRecord } from '../store/SalesContext'

interface CartItem {
  id: string; sku: string; name: string; price: number; quantity: number; discount: number
}

import { useProductStore } from '../store/ProductStore'

type PaymentMethod = 'efectivo_usd' | 'efectivo_bs' | 'tarjeta' | 'zelle' | 'pago_movil' | 'mixto'
const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: string }[] = [
  { id: 'efectivo_usd', label: 'Efectivo $', icon: '💵' },
  { id: 'efectivo_bs', label: 'Efectivo Bs', icon: '💴' },
  { id: 'tarjeta', label: 'Tarjeta', icon: '💳' },
  { id: 'zelle', label: 'Zelle', icon: '⚡' },
  { id: 'pago_movil', label: 'P. Móvil', icon: '📱' },
  { id: 'mixto', label: 'Mixto', icon: '🔀' },
]

export function POSComponent() {
  const { user, config, isAdmin, updateConfig } = useAuth()
  const { addSale, dailySales } = useSales()
  const { products } = useProductStore()
  const [cart, setCart] = useState<CartItem[]>([])
  const [query, setQuery] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo_usd')
  const [globalDiscount, setGlobalDiscount] = useState(0)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showQR, setShowQR] = useState<string | null>(null)
  const [lastSaleId, setLastSaleId] = useState<string | null>(null)

  // Quick Edit Rates
  const [isEditingBCV, setIsEditingBCV] = useState(false)
  const [isEditingUSDT, setIsEditingUSDT] = useState(false)
  const [tempRate, setTempRate] = useState('')

  const { exchangeRateBCV, exchangeRateUSDT, ivaPercent, storeName, storeRIF } = config

  const handleUpdateBCV = () => {
    const val = parseFloat(tempRate)
    if (!isNaN(val) && val > 0) {
      updateConfig({ exchangeRateBCV: val })
    }
    setIsEditingBCV(false)
  }

  const handleUpdateUSDT = () => {
    const val = parseFloat(tempRate)
    if (!isNaN(val) && val > 0) {
      updateConfig({ exchangeRateUSDT: val })
    }
    setIsEditingUSDT(false)
  }

  const addToCart = (sku: string) => {
    const product = products.find((p) => p.sku.toLowerCase() === sku.toLowerCase() || p.name.toLowerCase().includes(sku.toLowerCase()))
    if (!product) return
    setCart((prev) => {
      const ex = prev.find((i) => i.id === product.id)
      if (ex) return prev.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { ...product, quantity: 1, discount: 0 }]
    })
    setQuery('')
  }

  const updateQty = (id: string, delta: number) => setCart((prev) => prev.map((i) => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter((i) => i.quantity > 0))
  const setItemDiscount = (id: string, d: number) => setCart((prev) => prev.map((i) => i.id === id ? { ...i, discount: Math.min(100, Math.max(0, d)) } : i))
  const removeFromCart = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id))

  const subtotal = cart.reduce((a, i) => a + i.price * i.quantity * (1 - i.discount / 100), 0)
  const discountAmt = subtotal * (globalDiscount / 100)
  const afterDiscount = subtotal - discountAmt
  const iva = afterDiscount * (ivaPercent / 100)
  const total = afterDiscount + iva
  const totalBs = total * exchangeRateBCV
  const totalUSDT = total * (exchangeRateUSDT / exchangeRateBCV)

  const processSale = async () => {
    if (cart.length === 0) return
    const saleId = `V-${String(dailySales.length + 1).padStart(4, '0')}`
    const now = new Date()
    const record: SaleRecord = {
      id: saleId,
      items: cart.map((i) => ({ productId: i.id, sku: i.sku, name: i.name, qty: i.quantity, price: i.price, discount: i.discount })),
      subtotal, globalDiscount, iva, total,
      totalBs,
      paymentMethod: PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.label || '',
      cashier: user?.name || '',
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    }
    await addSale(record)
    setLastSaleId(saleId)
    setCart([])
    setGlobalDiscount(0)
    setShowPaymentModal(false)
    setShowQR(saleId)
  }

  const filtered = query.length > 0 ? products.filter((p) => p.sku.toLowerCase().includes(query.toLowerCase()) || p.name.toLowerCase().includes(query.toLowerCase())) : []

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-50 p-4">
      {/* Header */}
      <header className="flex justify-between items-center mb-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Punto de Venta <span className="text-blue-400 text-sm font-medium">Rexermi POS</span></h1>
          <p className="text-[10px] text-slate-500">Operador: {user?.name} • {new Date().toLocaleDateString('es-VE')}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* BCV Rate */}
          <div className="relative">
            <button onClick={() => { if (isAdmin) { setIsEditingBCV(true); setTempRate(exchangeRateBCV.toString()) } }}
              className={`bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 text-[10px] flex items-center gap-2 transition-all ${isAdmin ? 'hover:border-blue-500/50 cursor-pointer' : 'cursor-default'}`}>
              BCV: <span className="font-mono text-green-400 font-bold">{exchangeRateBCV.toFixed(2)} Bs/$</span>
              {isAdmin && <span className="text-[8px] opacity-40">✎</span>}
            </button>
            {isEditingBCV && (
              <div className="absolute top-full right-0 mt-2 z-50 bg-slate-800 border border-slate-700 p-3 rounded-xl shadow-2xl w-40">
                <label className="text-[8px] uppercase font-bold text-slate-400">Nueva Tasa BCV</label>
                <div className="flex gap-2 mt-1">
                  <input type="number" step="0.01" value={tempRate} onChange={(e) => setTempRate(e.target.value)} autoFocus
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono outline-none focus:ring-1 focus:ring-blue-500" />
                  <button onClick={handleUpdateBCV} className="bg-blue-600 text-[10px] px-2 rounded-lg font-bold">OK</button>
                </div>
              </div>
            )}
          </div>

          {/* USDT Rate */}
          <div className="relative">
            <button onClick={() => { if (isAdmin) { setIsEditingUSDT(true); setTempRate(exchangeRateUSDT.toString()) } }}
              className={`bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 text-[10px] flex items-center gap-2 transition-all ${isAdmin ? 'hover:border-blue-500/50 cursor-pointer' : 'cursor-default'}`}>
              USDT: <span className="font-mono text-cyan-400 font-bold">{exchangeRateUSDT.toFixed(2)} Bs</span>
              {isAdmin && <span className="text-[8px] opacity-40">✎</span>}
            </button>
            {isEditingUSDT && (
              <div className="absolute top-full right-0 mt-2 z-50 bg-slate-800 border border-slate-700 p-3 rounded-xl shadow-2xl w-40">
                <label className="text-[8px] uppercase font-bold text-slate-400">Nueva Tasa USDT</label>
                <div className="flex gap-2 mt-1">
                  <input type="number" step="0.01" value={tempRate} onChange={(e) => setTempRate(e.target.value)} autoFocus
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono outline-none focus:ring-1 focus:ring-blue-500" />
                  <button onClick={handleUpdateUSDT} className="bg-blue-600 text-[10px] px-2 rounded-lg font-bold">OK</button>
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 text-[10px]">Ventas: <span className="text-blue-400 font-bold font-mono">{dailySales.length}</span></div>
        </div>
      </header>

      <div className="flex gap-3 flex-1 min-h-0">
        {/* Main */}
        <section className="flex-1 flex flex-col bg-slate-900/40 rounded-xl border border-slate-800 overflow-hidden">
          <div className="p-3 border-b border-slate-800">
            <input type="text" placeholder="🔍 Escanear SKU o buscar producto... (Enter)" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-500"
              value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addToCart(query)} autoFocus />
          </div>
          {filtered.length > 0 && (
            <div className="px-3 py-1.5 border-b border-slate-800 bg-slate-800/20 flex flex-wrap gap-1">
              {filtered.map((p) => (
                <button key={p.id} onClick={() => addToCart(p.sku)} className="bg-slate-700/30 hover:bg-blue-600/15 hover:border-blue-500/30 px-2 py-1 rounded-md text-[10px] border border-slate-600/30 transition-all">
                  <span className="text-blue-400 font-mono">{p.sku}</span> — {p.name} <span className="text-green-400 font-mono ml-1">${p.price}</span>
                </button>
              ))}
            </div>
          )}
          {/* Product Grid - Quick Access */}
          {cart.length === 0 && query.length === 0 && (
            <div className="p-3">
              <p className="text-[9px] uppercase tracking-widest text-slate-600 font-bold mb-2">⚡ Acceso Rápido</p>
              <div className="grid grid-cols-4 gap-1.5">
                {products.slice(0, 12).map((p) => (
                  <button key={p.id} onClick={() => addToCart(p.sku)} className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg p-2.5 text-left transition-all group">
                    <div className="font-mono text-[10px] text-blue-400">{p.sku}</div>
                    <div className="text-[11px] font-semibold mt-0.5 line-clamp-1">{p.name}</div>
                    <div className="text-green-400 font-mono text-xs font-bold mt-0.5">${p.price.toFixed(2)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Cart */}
          <div className="flex-1 overflow-auto p-3">
            {cart.length === 0 && query.length === 0 ? null : cart.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-600"><div className="text-center"><p className="text-4xl mb-2 opacity-30">🛒</p><p className="text-xs">Carrito vacío</p></div></div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead><tr className="text-slate-500 text-[8px] uppercase tracking-wider border-b border-slate-800">
                  <th className="pb-1.5 pl-1">Producto</th><th className="pb-1.5 text-center w-28">Cantidad</th><th className="pb-1.5 text-center w-20">Desc%</th><th className="pb-1.5 text-right w-16">Precio</th><th className="pb-1.5 text-right w-20">Total</th><th className="pb-1.5 w-14 text-center">QR</th><th className="pb-1.5 w-6"></th>
                </tr></thead>
                <tbody>
                  {cart.map((item) => (
                    <tr key={item.id} className="border-b border-slate-800/30 hover:bg-slate-800/10 group">
                      <td className="py-2 pl-1"><div className="font-semibold text-[12px]">{item.name}</div><div className="text-[9px] text-slate-500 font-mono">{item.sku}</div></td>
                      <td className="py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded bg-slate-800 hover:bg-red-600/20 hover:text-red-400 border border-slate-700 text-[10px] font-bold transition-all">−</button>
                          <span className="w-7 text-center font-mono font-bold text-sm">{item.quantity}</span>
                          <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded bg-slate-800 hover:bg-green-600/20 hover:text-green-400 border border-slate-700 text-[10px] font-bold transition-all">+</button>
                        </div>
                      </td>
                      <td className="py-2"><input type="number" min={0} max={100} value={item.discount} onChange={(e) => setItemDiscount(item.id, Number(e.target.value))} className="w-14 mx-auto block bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-center font-mono focus:ring-1 focus:ring-blue-500 outline-none" /></td>
                      <td className="py-2 text-right font-mono text-[11px]">${item.price.toFixed(2)}</td>
                      <td className="py-2 text-right font-mono font-bold text-[12px]">${(item.price * item.quantity * (1 - item.discount / 100)).toFixed(2)}</td>
                      <td className="py-2 text-center">
                        <button onClick={() => setShowQR(showQR === item.sku ? null : item.sku)} className="text-slate-600 hover:text-blue-400 text-[10px] transition-colors">📱</button>
                        {showQR === item.sku && (
                          <div className="absolute z-50 bg-white p-3 rounded-xl shadow-2xl border" onClick={() => setShowQR(null)}>
                            <QRCodeSVG value={JSON.stringify({ sku: item.sku, name: item.name, price: item.price, store: storeName })} size={120} />
                            <p className="text-black text-[9px] text-center mt-1 font-bold">{item.sku}</p>
                          </div>
                        )}
                      </td>
                      <td className="py-2 text-right"><button onClick={() => removeFromCart(item.id)} className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-sm">✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Sidebar */}
        <aside className="w-64 flex flex-col gap-2 shrink-0">
          {/* Total */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-4 shadow-2xl shadow-blue-900/30 relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/5 rounded-full" />
            <div className="relative">
              <div className="text-[9px] opacity-60 uppercase tracking-wider">Total a Pagar</div>
              <div className="text-2xl font-black font-mono mt-0.5">${total.toFixed(2)}</div>
              <div className="text-sm font-mono opacity-75">Bs. {totalBs.toFixed(2)}</div>
              <div className="text-[10px] font-mono opacity-50 mt-0.5">≈ {totalUSDT.toFixed(2)} USDT</div>
              <div className="mt-2 pt-2 border-t border-white/15 space-y-0.5 text-[9px] opacity-60">
                <div className="flex justify-between"><span>Subtotal</span><span className="font-mono">${subtotal.toFixed(2)}</span></div>
                {globalDiscount > 0 && <div className="flex justify-between text-green-300"><span>Desc. ({globalDiscount}%)</span><span className="font-mono">-${discountAmt.toFixed(2)}</span></div>}
                <div className="flex justify-between"><span>IVA ({ivaPercent}%)</span><span className="font-mono">${iva.toFixed(2)}</span></div>
              </div>
            </div>
          </div>

          {/* Discount */}
          <div className="bg-slate-900 rounded-lg p-2.5 border border-slate-800">
            <label className="text-[8px] uppercase tracking-widest text-slate-500 font-bold">Descuento Global %</label>
            <input type="number" min={0} max={100} value={globalDiscount} onChange={(e) => setGlobalDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm font-mono mt-1 focus:ring-1 focus:ring-blue-500 outline-none" />
          </div>

          {/* Payment Method */}
          <div className="bg-slate-900 rounded-lg p-2.5 border border-slate-800">
            <label className="text-[8px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">Método de Pago</label>
            <div className="grid grid-cols-3 gap-1">
              {PAYMENT_METHODS.map((m) => (
                <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                  className={`p-1.5 rounded-md text-center transition-all text-[9px] font-semibold border ${paymentMethod === m.id ? 'bg-blue-600/20 border-blue-500/40 text-blue-400' : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800'}`}>
                  <div className="text-sm mb-0.5">{m.icon}</div>{m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Process */}
          <button onClick={() => { if (cart.length > 0) setShowPaymentModal(true) }} disabled={cart.length === 0}
            className="w-full bg-white text-slate-950 font-bold py-3 rounded-xl hover:bg-slate-100 transition-all active:scale-[0.97] shadow-xl disabled:opacity-30 disabled:cursor-not-allowed text-sm">
            💳 PROCESAR PAGO
          </button>

          <div className="grid grid-cols-2 gap-1">
            <button className="bg-slate-900 p-2 rounded-lg text-[9px] font-semibold border border-slate-800 hover:bg-slate-800 transition-all">🧾 Factura</button>
            <button className="bg-slate-900 p-2 rounded-lg text-[9px] font-semibold border border-slate-800 hover:bg-slate-800 transition-all">🖨️ Ticket</button>
            <button onClick={() => { setCart([]); setGlobalDiscount(0) }} className="bg-slate-900 p-2 rounded-lg text-[9px] font-semibold border border-slate-800 hover:bg-red-900/20 hover:text-red-400 transition-all col-span-2">🗑️ Limpiar</button>
          </div>

          {/* Last Sales */}
          {dailySales.length > 0 && (
            <div className="bg-slate-900 rounded-lg p-2.5 border border-slate-800 flex-1 min-h-0 overflow-auto">
              <p className="text-[8px] uppercase tracking-widest text-slate-500 font-bold mb-1.5">Últimas Ventas</p>
              <div className="space-y-1">
                {dailySales.slice(0, 6).map((s) => (
                  <div key={s.id} className="flex justify-between items-center text-[10px] bg-slate-800/30 px-2 py-1.5 rounded-md">
                    <div><span className="font-mono text-blue-400">{s.id}</span> <span className="text-slate-600">{s.time}</span></div>
                    <span className="font-mono font-bold text-green-400">${s.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowPaymentModal(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-1">Confirmar Venta</h2>
            <p className="text-xs text-slate-400 mb-4">{storeName} • {storeRIF}</p>
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Artículos</span><span className="font-mono">{cart.reduce((a, i) => a + i.quantity, 0)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Subtotal</span><span className="font-mono">${subtotal.toFixed(2)}</span></div>
              {globalDiscount > 0 && <div className="flex justify-between text-green-400"><span>Desc. ({globalDiscount}%)</span><span className="font-mono">-${discountAmt.toFixed(2)}</span></div>}
              <div className="flex justify-between"><span className="text-slate-400">IVA ({ivaPercent}%)</span><span className="font-mono">${iva.toFixed(2)}</span></div>
              <hr className="border-slate-700" />
              <div className="flex justify-between text-lg font-bold"><span>TOTAL USD</span><span className="font-mono text-green-400">${total.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">TOTAL Bs (BCV)</span><span className="font-mono">{totalBs.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">≈ USDT</span><span className="font-mono text-cyan-400">{totalUSDT.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Método</span><span>{PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.icon} {PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.label}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-400">Cajero</span><span>{user?.name}</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-sm font-semibold hover:bg-slate-800 transition-all">Cancelar</button>
              <button onClick={processSale} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-all shadow-lg">✅ Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* QR Receipt */}
      {showQR && showQR.startsWith('V-') && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowQR(null)}>
          <div className="bg-white rounded-2xl p-8 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-slate-900 font-bold text-lg mb-1">¡Venta Registrada!</p>
            <p className="text-slate-500 text-sm mb-4">{showQR}</p>
            <QRCodeSVG value={JSON.stringify({ sale: showQR, store: storeName, rif: storeRIF, date: new Date().toISOString() })} size={180} />
            <p className="text-slate-500 text-xs mt-3">Escanee para ver el recibo digital</p>
            <button onClick={() => setShowQR(null)} className="mt-4 bg-slate-900 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  )
}
