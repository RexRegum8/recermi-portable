import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { getBaseUrl } from '../utils/api'

export interface Product {
  id: string; sku: string; name: string; description: string; category: string
  price: number; cost: number; stock: number; minStock: number; warehouse: string
  image: string; featured: boolean; showInCatalog: boolean; tags: string[]
  warrantyDays: number
}

export interface LoyaltyReward {
  id: string; name: string; description: string; pointsCost: number; isActive: boolean
}

interface ProductStoreContextType {
  products: Product[]
  rewards: LoyaltyReward[]
  categories: string[]
  featured: Product[]
  refreshProducts: () => Promise<void>
  refreshRewards: () => Promise<void>
  createProduct: (p: Partial<Product>) => Promise<void>
  updateProduct: (id: string, p: Partial<Product>) => Promise<void>
  recordMovement: (id: string, m: { quantity: number, type: string, reason: string, user: string }) => Promise<void>
  createReward: (r: Partial<LoyaltyReward>) => Promise<void>
  updateReward: (id: string, r: Partial<LoyaltyReward>) => Promise<void>
  deleteReward: (id: string) => Promise<void>
  getProductBySku: (sku: string) => Product | undefined
  getProduct: (id: string) => Product | undefined
}

const ProductStoreContext = createContext<ProductStoreContextType | null>(null)

export function ProductStoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
  const [rewards, setRewards] = useState<LoyaltyReward[]>([])

  const refreshProducts = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/api/products`)
      const data = await res.json()
      setProducts(data)
    } catch (e) { console.error(e) }
  }

  const refreshRewards = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/api/loyalty/rewards`)
      const data = await res.json()
      setRewards(data)
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    refreshProducts()
    refreshRewards()
  }, [])

  const createProduct = async (p: Partial<Product>) => {
    await fetch(`${getBaseUrl()}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p)
    })
    await refreshProducts()
  }

  const updateProduct = async (id: string, p: Partial<Product>) => {
    await fetch(`${getBaseUrl()}/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p)
    })
    await refreshProducts()
  }

  const recordMovement = async (id: string, m: { quantity: number, type: string, reason: string, user: string }) => {
    await fetch(`${getBaseUrl()}/api/products/${id}/movement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(m)
    })
    await refreshProducts()
  }

  const createReward = async (r: Partial<LoyaltyReward>) => {
    await fetch(`${getBaseUrl()}/api/loyalty/rewards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(r)
    })
    await refreshRewards()
  }

  const updateReward = async (id: string, r: Partial<LoyaltyReward>) => {
    await fetch(`${getBaseUrl()}/api/loyalty/rewards/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(r)
    })
    await refreshRewards()
  }

  const deleteReward = async (id: string) => {
    await fetch(`${getBaseUrl()}/api/loyalty/rewards/${id}`, { method: 'DELETE' })
    await refreshRewards()
  }

  const categories = Array.from(new Set(products.map((p) => p.category)))
  const featured = products.filter((p) => p.featured)
  const getProductBySku = (sku: string) => products.find((p) => p.sku === sku)
  const getProduct = (id: string) => products.find((p) => p.id === id)

  return (
    <ProductStoreContext.Provider value={{ 
      products, rewards, categories, featured, getProductBySku, getProduct,
      refreshProducts, refreshRewards, createProduct, updateProduct, recordMovement,
      createReward, updateReward, deleteReward
    }}>
      {children}
    </ProductStoreContext.Provider>
  )
}

export function useProductStore() {
  const ctx = useContext(ProductStoreContext)
  if (!ctx) throw new Error('useProductStore must be inside ProductStoreProvider')
  return ctx
}
