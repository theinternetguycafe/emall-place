export type UserRole = 'buyer' | 'seller' | 'admin'

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  phone: string | null
  created_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
}

export interface Product {
  id: string
  seller_store_id: string
  category_id: string | null
  title: string
  description: string | null
  price: number
  stock: number
  status: 'pending' | 'approved' | 'hidden'
  created_at: string
  category?: Category
  seller_store?: SellerStore
  product_images?: ProductImage[]
}

export interface SellerStore {
  id: string
  owner_id: string
  store_name: string
  description: string | null
  status: 'pending' | 'active' | 'suspended'
  created_at: string
}

export interface ProductImage {
  id: string
  product_id: string
  url: string
  sort_order: number
}

export interface Order {
  id: string
  buyer_id: string | null
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
  total_amount: number
  total_commission: number
  payment_status: 'unpaid' | 'paid' | 'failed'
  created_at: string
  order_items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  seller_store_id: string | null
  product_id: string | null
  qty: number
  unit_price: number
  item_total: number
  commission_amount: number
  item_status: 'pending' | 'packed' | 'shipped' | 'delivered' | 'cancelled'
  product?: Product
  seller_store?: SellerStore
}
