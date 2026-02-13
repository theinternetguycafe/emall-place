/**
 * Payment System Type Definitions
 * Ensures type safety for all payment providers
 */

export type PaymentMethod = 'payfast' | 'yoco' | 'snapscan'
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
export type OrderStatus = 'pending' | 'pending_payment' | 'processing' | 'completed' | 'cancelled'

/**
 * Payment Record (stored in database)
 */
export interface Payment {
  id: string
  order_id: string
  payment_method: PaymentMethod
  provider_reference?: string
  status: PaymentStatus
  amount: number
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

/**
 * Order with payment details
 */
export interface Order {
  id: string
  buyer_id: string
  payment_method: PaymentMethod
  payment_status: 'pending' | 'paid' | 'failed'
  status: OrderStatus
  total_amount: number
  total_commission: number
  created_at: string
}

/**
 * Generic payment response
 */
export interface PaymentResponse {
  success: boolean
  redirectUrl?: string
  qrCode?: string
  transactionId?: string
  error?: string
  message?: string
}

/**
 * Yoco-specific types
 */
export interface YocoPaymentLinkRequest {
  amount: number // in cents
  orderId: string
  description: string
  buyerEmail?: string
  buyerName?: string
  metadata?: Record<string, any>
}

export interface YocoPaymentLinkResponse {
  id: string
  redirectUrl: string
  reference: string
  status: string
  createdAt: string
  metadata?: {
    orderId?: string
    [key: string]: any
  }
}

export interface YocoWebhook {
  type: 'links.paid' | 'links.failed' | 'links.cancelled' | 'payment.completed' | 'payment.failed'
  id: string
  data: {
    id: string
    amount: number
    status: string
    metadata?: {
      orderId?: string
      [key: string]: any
    }
  }
  createdAt: string
}

/**
 * SnapScan-specific types
 */
export interface SnapScanQRRequest {
  amount: number // in cents
  orderId: string
  description: string
  metadata?: Record<string, any>
}

export interface SnapScanQRResponse {
  qrCode: string
  transactionId: string
  merchantId: string
  amount: number
  expiresAt?: string
}

export interface SnapScanWebhook {
  reference: string
  amount: number
  status: 'completed' | 'failed' | 'cancelled'
  timestamp: string
  transactionId?: string
  metadata?: Record<string, any>
}

/**
 * PayFast-specific types (existing, documented for completeness)
 */
export interface PayFastPaymentRequest {
  merchant_id: string
  merchant_key: string
  amount: number
  item_name: string
  m_payment_id: string
  return_url: string
  cancel_url: string
  notify_url: string
  signature?: string
}

export interface PayFastPaymentResponse {
  success: boolean
  redirect_url?: string
  error?: string
}

/**
 * EdgeFunction request/response types
 */
export interface EdgeFunctionRequest {
  orderId: string
  amount: number
  description: string
  [key: string]: any
}

export interface EdgeFunctionResponse {
  success: boolean
  error?: string
  [key: string]: any
}

/**
 * Webhook handler response
 */
export interface WebhookHandlerResponse {
  success: boolean
  orderUpdated: boolean
  paymentStatus: PaymentStatus
  orderId: string
  message?: string
  error?: string
}
