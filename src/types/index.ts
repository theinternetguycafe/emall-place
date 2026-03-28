export type UserRole = 'buyer' | 'seller' | 'admin'

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  phone: string | null
  email: string | null
  date_of_birth: string | null
  gender: string | null
  municipality: string | null
  province: string | null
  created_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  image_url?: string | null
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
  is_on_sale?: boolean
  sale_price?: number | null
  sale_starts_at?: string | null
  sale_ends_at?: string | null
  sale_label?: string | null
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
  logo_url?: string | null
  tagline?: string | null
  average_rating?: number | null
  review_count?: number | null
  seller_location?: string | null
  seller_email?: string | null
  seller_phone?: string | null
  announcement_text?: string | null
  theme_color?: string | null
  store_policies?: StorePolicies | null
  featured_product_ids?: string[] | null
  banner_url?: string | null
  // Phase 6.5 fields
  is_online?: boolean | null
  last_seen_at?: string | null
  latitude?: number | null
  longitude?: number | null
  // Phase 8 fields
  is_verified?: boolean
  kyc_status?: 'pending' | 'verified' | 'rejected'
  seller_type?: 'product' | 'service' | 'both'
  service_mode?: 'on_site' | 'in_house' | 'both' | null
  radius_km?: number | null
  address?: string | null
}

export interface StorePolicies {
  shipping?: string | null
  returns?: string | null
  warranty?: string | null
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

export type ServiceRequestStatus = 'broadcasting' | 'accepted' | 'in_progress' | 'completed' | 'expired'

export interface ServiceRequest {
  id: string
  buyer_id: string
  category_id?: string | null
  title: string
  description?: string | null
  budget?: number | null
  latitude: number
  longitude: number
  status: ServiceRequestStatus
  assigned_seller_id?: string | null
  expires_at: string
  created_at: string
}
