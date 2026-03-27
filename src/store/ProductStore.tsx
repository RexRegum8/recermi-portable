import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { fetchWithAuth } from '../utils/api'
import { useSocket } from '../hooks/useSocket'

export interface Product {
  id: string; sku: string; name: string; description: string; category: string
  price: number; cost: number; stock: number; minStock: number; warehouse: string
  image: string; featured: boolean; showInCatalog: boolean; tags: string[]
  warrantyDays: number
}

export interface LoyaltyReward {
  id: string; name: string; description: string; pointsCost: number; isActive: boolean;
  type: 'COUPON' | 'DISCOUNT' | 'PRODUCT';
  value: number;
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

  const { subscribe } = useSocket()
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })

  const refreshProducts = async (page = 1, limit = 100) => {
    console.log(`[FRONTEND-PRODS] Refreshing products list (Page ${page})...`)
    try {
      const res = await fetchWithAuth(`/api/products?page=${page}&limit=${limit}`)
      const json = await res.json()
      
      if (json.data) {
        setProducts(json.data)
        setPagination(json.pagination)
        console.log(`[FRONTEND-PRODS] Successfully refreshed ${json.data.length} products`)
      } else {
        setProducts(json) // Fallback for old API if any
      }
    } catch (e: any) { 
      console.error(`[FRONTEND-PRODS] Error refreshing products: ${e.message}`)
    }
  }

  const refreshRewards = async () => {
    console.log('[FRONTEND-PRODS] Refreshing loyalty rewards...')
    try {
      const res = await fetchWithAuth('/api/loyalty/rewards')
      const data = await res.json()
      setRewards(data)
      console.log(`[FRONTEND-PRODS] Successfully refreshed ${data.length} rewards`)
    } catch (e: any) { 
      console.error(`[FRONTEND-PRODS] Error refreshing rewards: ${e.message}`)
    }
  }

  useEffect(() => {
    refreshProducts()
    refreshRewards()
  }, [])

  const createProduct = async (p: Partial<Product>) => {
    console.log(`[FRONTEND-PRODS] Creating product: ${p.name} (SKU: ${p.sku})`)
    try {
      const res = await fetchWithAuth('/api/products', {
        method: 'POST',
        body: JSON.stringify(p)
      })
      if (!res.ok) throw new Error('Failed to create product')
      console.log('[FRONTEND-PRODS] Product created successfully')
      await refreshProducts()
    } catch (e: any) {
      console.error(`[FRONTEND-PRODS] Error creating product: ${e.message}`)
      throw e
    }
  }

  const updateProduct = async (id: string, p: Partial<Product>) => {
    console.log(`[FRONTEND-PRODS] Updating product ID: ${id}`)
    try {
      const res = await fetchWithAuth(`/api/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(p)
      })
      if (!res.ok) throw new Error('Failed to update product')
      console.log(`[FRONTEND-PRODS] Product ${id} updated successfully`)
      await refreshProducts()
    } catch (e: any) {
      console.error(`[FRONTEND-PRODS] Error updating product ${id}: ${e.message}`)
      throw e
    }
  }

  const recordMovement = async (id: string, m: { quantity: number, type: string, reason: string, user: string }) => {
    console.log(`[FRONTEND-PRODS] Recording stock movement for product ID ${id}: ${m.quantity} (${m.type})`)
    try {
      const res = await fetchWithAuth(`/api/products/${id}/movement`, {
        method: 'POST',
        body: JSON.stringify(m)
      })
      if (!res.ok) throw new Error('Failed to record movement')
      console.log(`[FRONTEND-PRODS] Movement recorded successfully for product ${id}`)
      await refreshProducts()
    } catch (e: any) {
      console.error(`[FRONTEND-PRODS] Error recording movement for ${id}: ${e.message}`)
      throw e
    }
  }

  const createReward = async (r: Partial<LoyaltyReward>) => {
    await fetchWithAuth('/api/loyalty/rewards', {
      method: 'POST',
      body: JSON.stringify(r)
    })
    await refreshRewards()
  }

  const updateReward = async (id: string, r: Partial<LoyaltyReward>) => {
    await fetchWithAuth(`/api/loyalty/rewards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(r)
    })
    await refreshRewards()
  }

  const deleteReward = async (id: string) => {
    await fetchWithAuth(`/api/loyalty/rewards/${id}`, { method: 'DELETE' })
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
