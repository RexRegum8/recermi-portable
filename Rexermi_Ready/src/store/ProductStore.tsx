import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { getBaseUrl } from '../utils/api'

export interface Product {
  id: string; sku: string; name: string; description: string; category: string
  price: number; cost: number; stock: number; minStock: number; warehouse: string
  image: string; featured: boolean; showInCatalog: boolean; tags: string[]
}

interface ProductStoreContextType {
  products: Product[]
  getProduct: (id: string) => Product | undefined
  categories: string[]
  featured: Product[]
  getProductBySku: (sku: string) => Product | undefined
  refreshProducts: () => Promise<void>
  createProduct: (p: Partial<Product>) => Promise<void>
  updateProduct: (id: string, p: Partial<Product>) => Promise<void>
  recordMovement: (id: string, m: { quantity: number, type: string, reason: string, user: string }) => Promise<void>
}



const ProductStoreContext = createContext<ProductStoreContextType | null>(null)

export function ProductStoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
  const refreshProducts = async () => {
    const baseUrl = getBaseUrl()
    try {
      const res = await fetch(`${baseUrl}/api/products`)
      const data = await res.json()
      setProducts(data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    refreshProducts()
  }, [])

  const createProduct = async (p: Partial<Product>) => {
    const baseUrl = getBaseUrl()
    await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p)
    })
    await refreshProducts()
  }

  const updateProduct = async (id: string, p: Partial<Product>) => {
    const baseUrl = getBaseUrl()
    await fetch(`${baseUrl}/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p)
    })
    await refreshProducts()
  }

  const recordMovement = async (id: string, m: { quantity: number, type: string, reason: string, user: string }) => {
    const baseUrl = getBaseUrl()
    await fetch(`${baseUrl}/api/products/${id}/movement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(m)
    })
    await refreshProducts()
  }

  const categories = Array.from(new Set(products.map((p) => p.category)))
  const featured = products.filter((p) => p.featured)
  const getProductBySku = (sku: string) => products.find((p) => p.sku === sku)
  const getProduct = (id: string) => products.find((p) => p.id === id)

  return (
    <ProductStoreContext.Provider value={{ 
      products, categories, featured, getProductBySku, getProduct,
      refreshProducts, createProduct, updateProduct, recordMovement 
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
