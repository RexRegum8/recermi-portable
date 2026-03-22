import { useState } from 'react'
import { useCustomer } from '../store/CustomerContext'
import { useProductStore, Product } from '../store/ProductStore'
import { getBaseUrl } from '../utils/api'
import { CustomerProfileModal } from '../components/CustomerProfileModal'

type Page = 'home' | 'product' | 'cart' | 'checkout' | 'orders' | 'login' | 'register'

export function CatalogApp() {
  const { customer, logoutCustomer, cartCount, config, updateCustomer } = useCustomer()
  const [page, setPage] = useState<Page>('home')
  const [showProfile, setShowProfile] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const openProduct = (id: string) => { setSelectedProductId(id); setPage('product') }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 shadow-xl">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => { setPage('home'); setCategoryFilter('all') }} className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center font-bold text-sm shadow-lg group-hover:shadow-blue-500/20 transition-all">R</div>
            <span className="font-bold text-sm">{config.storeName} <span className="text-blue-400">Digital</span></span>
          </button>

          <div className="flex items-center gap-3">
            <button onClick={() => setPage('home')} className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${page === 'home' ? 'bg-blue-600/15 text-blue-400' : 'text-slate-400 hover:text-white'}`}>Catálogo</button>
            {customer && <button onClick={() => setPage('orders')} className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${page === 'orders' ? 'bg-blue-600/15 text-blue-400' : 'text-slate-400 hover:text-white'}`}>Mis Pedidos</button>}
            <button onClick={() => setPage('cart')} className="relative text-slate-400 hover:text-white transition-colors p-1.5">
              🛒
              {cartCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-blue-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">{cartCount}</span>}
            </button>
            {customer ? (
              <div className="flex items-center gap-2">
                <button onClick={() => setShowProfile(true)} className="flex items-center gap-2 hover:bg-slate-800 p-1 rounded-lg transition-all group">
                  <div className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center text-[10px] overflow-hidden border border-slate-700">
                    {customer.photo ? <img src={customer.photo} className="w-full h-full object-cover" /> : '👤'}
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold group-hover:text-white transition-colors">{customer.name.split(' ')[0]}</span>
                </button>
                <button onClick={logoutCustomer} className="text-[10px] text-slate-600 hover:text-red-400 px-2 py-1 rounded-md border border-slate-800 hover:border-red-500/30 transition-all">Salir</button>
              </div>
            ) : (
              <button onClick={() => setPage('login')} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all">Iniciar Sesión</button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {page === 'home' && <CatalogHome openProduct={openProduct} categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} />}
        {page === 'product' && <ProductDetail id={selectedProductId} goBack={() => setPage('home')} goCart={() => setPage('cart')} />}
        {page === 'cart' && <CartPage goCheckout={() => customer ? setPage('checkout') : setPage('login')} goHome={() => setPage('home')} />}
        {page === 'checkout' && <CheckoutPage goOrders={() => setPage('orders')} goHome={() => setPage('home')} />}
        {page === 'orders' && <OrdersPage />}
        {page === 'login' && <LoginPage goRegister={() => setPage('register')} onSuccess={() => setPage('home')} />}
        {page === 'register' && <RegisterPage goLogin={() => setPage('login')} onSuccess={() => setPage('home')} />}
      </main>

      {/* Customer Profile Modal */}
      {showProfile && customer && (
        <CustomerProfileModal 
          customer={customer} 
          onClose={() => setShowProfile(false)} 
          onSave={async (updated) => {
             const token = localStorage.getItem('customerToken')
             const res = await fetch(`${getBaseUrl()}/api/customers/me`, {
               method: 'PATCH',
               headers: { 
                 'Content-Type': 'application/json',
                 'Authorization': `Bearer ${token}`
               },
               body: JSON.stringify(updated)
             })
             if (res.ok) {
               const data = await res.json()
               updateCustomer(data)
             } else {
               throw new Error('Error al actualizar')
             }
          }}
        />
      )}

      {/* Footer */}
      <footer className="bg-slate-900/50 border-t border-slate-800 mt-12 py-8 text-center">
        <p className="text-sm text-slate-500">{config.storeName} — <span className="text-blue-400">Tienda Online</span></p>
        <p className="text-[10px] text-slate-700 mt-1">ERP/POS Tecnología y Servicio Técnico</p>
      </footer>
    </div>
  )
}

/* ==================== CATALOG HOME ==================== */
function CatalogHome({ openProduct, categoryFilter, setCategoryFilter }: { openProduct: (id: string) => void; categoryFilter: string; setCategoryFilter: (c: string) => void }) {
  const { products, categories } = useProductStore()
  const { addToCart } = useCustomer()
  const [search, setSearch] = useState('')

  const filtered = products
    .filter((p) => p.stock > 0 && p.showInCatalog)
    .filter((p) => categoryFilter === 'all' || p.category === categoryFilter)
    .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.tags.some((t) => t.includes(search.toLowerCase())))
  const featured = products.filter((p) => p.featured && p.stock > 0)

  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600/15 to-indigo-600/10 rounded-2xl p-8 mb-8 border border-blue-500/15 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/5 rounded-full blur-2xl" />
        <h1 className="text-2xl font-black tracking-tight relative">Tecnología al mejor precio 🚀</h1>
        <p className="text-slate-400 text-sm mt-1.5 max-w-md relative">Repuestos, accesorios y componentes de tecnología. Servicio técnico profesional con garantía.</p>
        <div className="mt-4 relative">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Buscar productos, accesorios, repuestos..."
            className="w-full max-w-md bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder-slate-500" />
        </div>
      </div>

      {/* Featured */}
      {!search && categoryFilter === 'all' && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">⭐ Destacados</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {featured.slice(0, 4).map((p) => (
              <button key={p.id} onClick={() => openProduct(p.id)}
                className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-xl p-4 text-left hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 transition-all group">
                <div className="text-3xl mb-2">{p.image}</div>
                <h3 className="font-bold text-xs line-clamp-2 group-hover:text-blue-400 transition-colors">{p.name}</h3>
                <p className="text-green-400 font-mono font-bold text-sm mt-1">${p.price.toFixed(2)}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button onClick={() => setCategoryFilter('all')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${categoryFilter === 'all' ? 'bg-blue-600/20 border-blue-500/40 text-blue-400' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>Todos</button>
        {categories.map((c) => (
          <button key={c} onClick={() => setCategoryFilter(c)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${categoryFilter === c ? 'bg-blue-600/20 border-blue-500/40 text-blue-400' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>{c}</button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((p) => (
          <div key={p.id} className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all group">
            <button onClick={() => openProduct(p.id)} className="w-full p-5 text-center">
              <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">{p.image}</div>
              <h3 className="font-semibold text-xs line-clamp-2 min-h-[32px]">{p.name}</h3>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-green-400 font-mono font-bold">${p.price.toFixed(2)}</span>
                {p.stock <= p.minStock && <span className="text-[7px] bg-amber-500/10 text-amber-400 px-1 py-0.5 rounded font-bold border border-amber-500/20">ÚLTIMOS</span>}
              </div>
            </button>
            <div className="px-3 pb-3">
              <button onClick={() => addToCart({ productId: p.id, name: p.name, sku: p.sku, price: p.price, image: p.image, stock: p.stock })}
                className="w-full bg-blue-600/15 text-blue-400 border border-blue-500/25 py-1.5 rounded-lg text-[10px] font-bold hover:bg-blue-600/25 transition-all">🛒 Agregar</button>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <div className="text-center py-12 text-slate-600"><p className="text-3xl mb-2">🔍</p><p className="text-sm">No hay productos</p></div>}
    </div>
  )
}

/* ==================== PRODUCT DETAIL ==================== */
function ProductDetail({ id, goBack, goCart }: { id: string; goBack: () => void; goCart: () => void }) {
  const { getProduct } = useProductStore()
  const { addToCart, cart } = useCustomer()
  const p = getProduct(id)
  const [added, setAdded] = useState(false)

  if (!p) return <div className="text-center py-12 text-slate-500">Producto no encontrado</div>

  const inCart = cart.find((i) => i.productId === p.id)

  const handleAdd = () => {
    addToCart({ productId: p.id, name: p.name, sku: p.sku, price: p.price, image: p.image, stock: p.stock })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div>
      <button onClick={goBack} className="text-slate-500 hover:text-white text-xs mb-4 flex items-center gap-1 transition-colors">← Volver al catálogo</button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-12 flex items-center justify-center">
          <span className="text-8xl">{p.image}</span>
        </div>
        <div>
          <span className="text-[9px] uppercase tracking-widest text-blue-400 font-bold">{p.category}</span>
          <h1 className="text-2xl font-bold mt-1">{p.name}</h1>
          <p className="text-slate-400 text-sm mt-2 leading-relaxed">{p.description}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {p.tags.map((t) => <span key={t} className="bg-slate-800 text-slate-400 text-[8px] px-2 py-0.5 rounded-full border border-slate-700">{t}</span>)}
          </div>
          <div className="mt-5 bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black font-mono text-green-400">${p.price.toFixed(2)}</span>
              <span className="text-slate-500 text-sm font-mono">USD</span>
            </div>
            <div className="text-sm text-slate-500 font-mono mt-0.5">SKU: {p.sku}</div>
            <div className="mt-2 text-xs">{p.stock > p.minStock ? <span className="text-green-400">✅ Disponible ({p.stock} en stock)</span> : p.stock > 0 ? <span className="text-amber-400">⚠️ Últimas {p.stock} unidades</span> : <span className="text-red-400">❌ Agotado</span>}</div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={handleAdd} disabled={p.stock === 0}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${added ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'} disabled:opacity-30 disabled:cursor-not-allowed`}>
              {added ? '✅ Agregado!' : '🛒 Agregar al Carrito'}
            </button>
            {inCart && <button onClick={goCart} className="px-5 py-3 rounded-xl border border-slate-700 font-bold text-sm hover:bg-slate-800 transition-all">Ver Carrito ({inCart.quantity})</button>}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ==================== CART ==================== */
function CartPage({ goCheckout, goHome }: { goCheckout: () => void; goHome: () => void }) {
  const { customer, cart, removeFromCart, updateCartQty, cartSubtotal, cartTotal, clearCart, refreshProfile } = useCustomer()
  const { rewards } = useProductStore()
  const [showRewards, setShowRewards] = useState(false)
  const [redeeming, setRedeeming] = useState(false)

  const handleRedeem = async (reward: import('../store/ProductStore').LoyaltyReward) => {
    if (!customer) return
    if (customer.points! < reward.pointsCost) {
       alert('Puntos insuficientes')
       return
    }
    setRedeeming(true)
    try {
      const resp = await fetch(`${getBaseUrl()}/api/loyalty/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: customer.id, rewardId: reward.id })
      })
      if (!resp.ok) throw new Error()
      alert('Cupón canjeado y aplicado a tu carrito.')
      await refreshProfile()
      setShowRewards(false)
    } catch (e) {
      alert('Error canjeando puntos. Intenta de nuevo.')
    } finally {
      setRedeeming(false)
    }
  }

  if (cart.length === 0) return (
    <div className="text-center py-16">
      <p className="text-5xl mb-3 opacity-30">🛒</p>
      <h2 className="text-lg font-bold text-slate-400">Carrito vacío</h2>
      <p className="text-sm text-slate-600 mt-1">Agrega productos desde el catálogo</p>
      <button onClick={goHome} className="mt-4 bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-xl text-sm font-bold transition-all">Ver Catálogo</button>
    </div>
  )

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">🛒 Mi Carrito</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-2">
          {cart.map((item) => (
            <div key={item.productId} className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
              <span className="text-3xl">{item.image}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{item.name}</h3>
                <p className="text-[10px] text-slate-500 font-mono">{item.sku}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => updateCartQty(item.productId, item.quantity - 1)} className="w-7 h-7 rounded bg-slate-800 hover:bg-red-500/15 hover:text-red-400 border border-slate-700 text-xs font-bold transition-all">−</button>
                <span className="w-6 text-center font-mono font-bold text-sm">{item.quantity}</span>
                <button onClick={() => updateCartQty(item.productId, item.quantity + 1)} className="w-7 h-7 rounded bg-slate-800 hover:bg-green-500/15 hover:text-green-400 border border-slate-700 text-xs font-bold transition-all">+</button>
              </div>
              <span className="font-mono font-bold text-green-400 w-16 text-right">${(item.price * item.quantity).toFixed(2)}</span>
              <button onClick={() => removeFromCart(item.productId)} className="text-slate-600 hover:text-red-400 transition-colors">✕</button>
            </div>
          ))}
          <button onClick={clearCart} className="text-[10px] text-slate-600 hover:text-red-400 transition-colors">🗑️ Vaciar carrito</button>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 h-fit sticky top-20 flex flex-col gap-4">
          <div>
            <h3 className="font-bold text-sm mb-3">Resumen</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-400">Artículos</span><span className="font-mono">{cart.reduce((a, i) => a + i.quantity, 0)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Subtotal</span><span className="font-mono">${cartSubtotal.toFixed(2)}</span></div>
              {(customer?.pendingDiscount ?? 0) > 0 && (
                <div className="flex justify-between"><span className="text-yellow-400 font-bold text-[10px] uppercase">CUPÓN ({customer!.pendingDiscount}%)</span><span className="font-mono text-yellow-400">-${(cartSubtotal * (customer!.pendingDiscount / 100)).toFixed(2)}</span></div>
              )}
              <hr className="border-slate-700" />
              <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="font-mono text-green-400">${cartTotal.toFixed(2)}</span></div>
            </div>
            <button onClick={goCheckout} className="w-full mt-4 bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-[0.97]">
              Continuar al Pago →
            </button>
            <button onClick={goHome} className="w-full mt-2 py-2 text-xs text-slate-500 hover:text-white transition-colors">← Seguir comprando</button>
          </div>
          
          {customer && (
             <div className="mt-4 border-t border-slate-800 pt-4 text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Programa de Fidelidad</p>
                <button onClick={() => setShowRewards(true)} className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 w-full rounded-xl py-3 border border-yellow-500/20 hover:border-yellow-500/50 transition-colors group">
                   <p className="text-yellow-500 text-xs font-black">🎁 OBTENER CUPONES DE DESCUENTO</p>
                   <p className="text-[9px] text-yellow-500/60 mt-0.5 group-hover:text-yellow-400">Tienes {customer.points || 0} Puntos Disponibles</p>
                </button>
             </div>
          )}
        </div>
      </div>

      {showRewards && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">
             <div className="flex justify-between items-start mb-4">
                <div>
                   <h3 className="font-black text-xl text-white">🎁 Recompensas</h3>
                   <p className="text-xs text-slate-400">Canjealo por descuentos para esta compra.</p>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tus Puntos</p>
                   <p className="text-2xl font-black text-yellow-400">{customer?.points || 0}</p>
                </div>
             </div>
             {customer?.pendingDiscount && customer.pendingDiscount > 0 && (
                <div className="mb-4 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-xs font-bold p-3 rounded-xl text-center">
                  ⚠️ Ya tienes un cupón activo del {customer.pendingDiscount}%. Se sustituirá si canjeas otro.
                </div>
             )}
             <div className="space-y-3 max-h-[40vh] overflow-auto mb-4">
                {rewards.filter(r => r.isActive).map(r => (
                  <div key={r.id} className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex justify-between items-center relative overflow-hidden">
                     <div className="relative z-10 w-2/3">
                        <p className="font-bold text-sm text-slate-200 leading-tight">{r.name}</p>
                        <p className="text-[10px] text-slate-500 leading-tight mt-1">{r.description}</p>
                     </div>
                     <button disabled={redeeming || (customer?.points || 0) < r.pointsCost} onClick={() => handleRedeem(r)} className="relative z-10 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-30 disabled:hover:bg-yellow-600 text-slate-950 font-black px-4 py-2 rounded-lg text-xs transition-colors whitespace-nowrap">
                        -{r.pointsCost} Pts
                     </button>
                  </div>
                ))}
                {rewards.filter(r => r.isActive).length === 0 && <p className="text-slate-500 text-center py-4 text-sm font-bold">No hay recompensas disponibles ahora.</p>}
             </div>
             <button onClick={() => setShowRewards(false)} className="w-full text-center text-xs font-bold text-slate-500 hover:text-white py-2">Volver al Carrito</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ==================== CHECKOUT ==================== */
function CheckoutPage({ goOrders, goHome }: { goOrders: () => void; goHome: () => void }) {
  const { customer, cart, cartSubtotal, cartTotal, placeOrder, config, refreshProfile } = useCustomer()
  const [payMethod, setPayMethod] = useState('Pago Móvil')
  const [orderPlaced, setOrderPlaced] = useState<string | null>(null)
  const exchangeRate = config.exchangeRateBCV || 36.50

  if (!customer) return null
  if (cart.length === 0 && !orderPlaced) return (
    <div className="text-center py-12"><p className="text-3xl mb-2">🤷</p><p className="text-sm text-slate-500">No hay productos en el carrito</p><button onClick={goHome} className="mt-3 text-blue-400 text-xs hover:underline">Ir al catálogo</button></div>
  )

  const [loading, setLoading] = useState(false)

  const handlePlaceOrder = async () => {
    if (loading) return
    setLoading(true)
    try {
      const order = await placeOrder(payMethod)
      if (order) {
        setOrderPlaced(order.id)
        await refreshProfile()
      } else {
        alert('No se pudo procesar el pedido. Verifique su conexión o stock disponible.')
      }
    } catch (e) {
      alert('Error crítico al procesar el pedido.')
    } finally {
      setLoading(false)
    }
  }

  if (orderPlaced) return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-green-500/15 border border-green-500/30 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">✅</div>
      <h2 className="text-xl font-bold">¡Pedido Confirmado!</h2>
      <p className="text-slate-400 mt-1">Tu orden <span className="font-mono text-blue-400">{orderPlaced}</span> ha sido registrada</p>
      <p className="text-xs text-slate-600 mt-2">Te contactaremos para coordinar el pago y la entrega</p>
      <div className="flex gap-3 justify-center mt-6">
        <button onClick={goOrders} className="bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-xl font-bold text-sm transition-all">Ver Mis Pedidos</button>
        <button onClick={goHome} className="border border-slate-700 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-800 transition-all">Seguir Comprando</button>
      </div>
    </div>
  )

  const methods = ['Efectivo USD', 'Efectivo Bs', 'Pago Móvil', 'Zelle', 'Transferencia']

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-lg font-bold mb-5">🧾 Finalizar Compra</h2>
      <div className="space-y-5">
        {/* Datos */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
          <h3 className="font-bold text-sm mb-3">📍 Datos de Envío</h3>
          <div className="space-y-1.5 text-sm text-slate-400">
            <p><span className="text-white">{customer.name}</span></p>
            <p>📧 {customer.email}</p>
            <p>📱 {customer.phone}</p>
            <p>📍 {customer.address}</p>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
          <h3 className="font-bold text-sm mb-3">💳 Método de Pago</h3>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {methods.map((m) => (
              <button key={m} onClick={() => setPayMethod(m)} className={`p-2.5 rounded-lg text-[10px] sm:text-xs font-semibold border transition-all ${payMethod === m ? 'bg-blue-600/20 border-blue-500/40 text-blue-400' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'}`}>{m}</button>
            ))}
          </div>

          {(payMethod !== 'Efectivo USD' && payMethod !== 'Efectivo Bs') && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">Nro de Referencia / Confirmación</label>
                <input 
                  onChange={(e) => (window as any)._pendingPaymentRef = e.target.value}
                  placeholder="Ej: 12345678"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">Adjuntar Comprobante (Opcional)</label>
                <div className="relative">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onloadend = () => { (window as any)._pendingPaymentProof = reader.result }
                        reader.readAsDataURL(file)
                      }
                    }}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-blue-600/10 file:text-blue-400 hover:file:bg-blue-600/20 cursor-pointer" 
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Resumen */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5">
          <h3 className="font-bold text-sm mb-4">🛍️ Resumen del Pedido</h3>
          <div className="space-y-2 mb-4">
            {cart.map(i => (
              <div key={i.productId} className="flex justify-between text-sm">
                <span className="text-slate-300">{(i.quantity)}x {i.name}</span>
                <span className="font-mono text-slate-400">${(i.price * i.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm text-slate-400 mb-2">
             <span>Subtotal</span>
             <span className="font-mono">${cartSubtotal.toFixed(2)}</span>
          </div>
           {(customer.pendingDiscount ?? 0) > 0 && (
            <div className="flex justify-between text-xs text-yellow-400 font-bold mb-4">
               <span>CUPÓN DE RECOMPENSA ({customer.pendingDiscount}%)</span>
               <span className="font-mono">-${(cartSubtotal * (customer.pendingDiscount / 100)).toFixed(2)}</span>
            </div>
          )}
          <div className="border-t border-slate-800 pt-3 flex justify-between text-xl font-bold">
            <span>Total USD</span>
            <span className="text-green-400 font-mono">${cartTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs font-bold text-slate-500 mt-1">
            <span>Total Bs (BCV)</span>
            <span className="font-mono">{(cartTotal * exchangeRate).toFixed(2)}</span>
          </div>
        </div>

        <button 
          onClick={handlePlaceOrder} 
          disabled={loading}
          className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-[0.97] flex items-center justify-center gap-2 ${loading ? 'bg-slate-700 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-green-900/30'}`}
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Procesando...
            </>
          ) : (
            <>✅ Confirmar Pedido — ${cartTotal.toFixed(2)}</>
          )}
        </button>
      </div>
    </div>
  )
}

/* ==================== ORDERS ==================== */
function OrdersPage() {
  const { orders, customer } = useCustomer()
  const myOrders = orders.filter((o) => o.customerId === customer?.id)

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">📋 Mis Pedidos</h2>
      {myOrders.length === 0 ? (
        <div className="text-center py-12 text-slate-600"><p className="text-3xl mb-2 opacity-30">📋</p><p className="text-sm">No tienes pedidos aún</p></div>
      ) : (
        <div className="space-y-3">
          {myOrders.map((o) => {
            const statusCfg: Record<string, { label: string; color: string }> = {
              PENDING: { label: 'PENDIENTE', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
              COMPLETED: { label: 'COMPLETADO', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
              CANCELLED: { label: 'CANCELADO', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
            }
            const s = statusCfg[o.status] || { label: o.status, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' }
            return (
              <div key={o.id} className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-mono text-blue-400 font-bold text-sm">{o.id.slice(0, 8)}</span>
                    <span className="text-[10px] text-slate-600 ml-2">{new Date(o.createdAt).toLocaleDateString('es-VE')}</span>
                  </div>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${s.color}`}>{s.label}</span>
                </div>
                <div className="space-y-0.5 border-l-2 border-slate-800 pl-3 my-3">
                   {o.items.map((i: any, idx: number) => <p key={idx} className="text-xs text-slate-400">{i.qty || i.quantity}x {i.name || `Producto ${i.productId}`}</p>)}
                </div>
                <div className="flex justify-between items-end mt-2 pt-2 border-t border-slate-800">
                  <div className="text-[10px] text-slate-500">
                    <p className="font-semibold">{o.paymentMethod}</p>
                    {o.paymentRef && <p className="font-mono">Ref: {o.paymentRef}</p>}
                    {o.paymentProof && <p className="text-blue-400">📷 Comprobante adjunto</p>}
                  </div>
                  <span className="font-mono font-bold text-green-400 text-lg">${o.total.toFixed(2)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ==================== LOGIN ==================== */
function LoginPage({ goRegister, onSuccess }: { goRegister: () => void; onSuccess: () => void }) {
  const { loginCustomer } = useCustomer()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (await loginCustomer(email, password)) { onSuccess() } else { setError('Credenciales incorrectas') }
  }

  return (
    <div className="max-w-sm mx-auto pt-8">
      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center font-bold text-xl mx-auto shadow-xl mb-3">R</div>
        <h2 className="text-xl font-bold">Iniciar Sesión</h2>
        <p className="text-xs text-slate-500 mt-1">Ingresa a tu cuenta de Rexermi Digital</p>
      </div>
      <form onSubmit={handleLogin} className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-3">
        <div><label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Correo</label><input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600" placeholder="email@ejemplo.com" /></div>
        <div><label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Contraseña</label><input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600" placeholder="••••••" /></div>
        {error && <p className="text-red-400 text-xs text-center bg-red-500/10 py-1.5 rounded-lg border border-red-500/20">{error}</p>}
        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 py-2.5 rounded-xl font-bold text-sm transition-all">Ingresar</button>
        <p className="text-center text-xs text-slate-500 pt-2">¿No tienes cuenta? <button type="button" onClick={goRegister} className="text-blue-400 hover:underline font-semibold">Regístrate</button></p>
      </form>
    </div>
  )
}

/* ==================== REGISTER ==================== */
function RegisterPage({ goLogin, onSuccess }: { goLogin: () => void; onSuccess: () => void }) {
  const { registerCustomer, loginCustomer } = useCustomer()
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [phone, setPhone] = useState(''); const [address, setAddress] = useState(''); const [error, setError] = useState('')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password) { setError('Complete los campos obligatorios'); return }
    if (await registerCustomer({ name, email, password, phone, address })) { 
      if (await loginCustomer(email, password)) onSuccess() 
    } else { 
      setError('El correo ya está registrado') 
    }
  }

  return (
    <div className="max-w-sm mx-auto pt-8">
      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center font-bold text-xl mx-auto shadow-xl mb-3">R</div>
        <h2 className="text-xl font-bold">Crear Cuenta</h2>
        <p className="text-xs text-slate-500 mt-1">Regístrate para comprar en Rexermi Digital</p>
      </div>
      <form onSubmit={handleRegister} className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-3">
        <div><label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Nombre *</label><input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600" placeholder="Tu nombre completo" /></div>
        <div><label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Correo *</label><input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600" placeholder="email@ejemplo.com" /></div>
        <div><label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Contraseña *</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600" placeholder="Mínimo 6 caracteres" /></div>
        <div><label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Teléfono</label><input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600" placeholder="0414-..." /></div>
        <div><label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">Dirección</label><input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600" placeholder="Tu dirección de envío" /></div>
        {error && <p className="text-red-400 text-xs text-center bg-red-500/10 py-1.5 rounded-lg border border-red-500/20">{error}</p>}
        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 py-2.5 rounded-xl font-bold text-sm transition-all">Crear Cuenta</button>
        <p className="text-center text-xs text-slate-500 pt-2">¿Ya tienes cuenta? <button type="button" onClick={goLogin} className="text-blue-400 hover:underline font-semibold">Inicia Sesión</button></p>
      </form>
    </div>
  )
}
