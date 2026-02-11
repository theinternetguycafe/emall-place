export interface PaymentResult {
  success: boolean
  transactionId?: string
  error?: string
}

export interface PaymentProvider {
  name: string
  processPayment: (amount: number, metadata: any) => Promise<PaymentResult>
}

export const MockPaymentProvider: PaymentProvider = {
  name: 'PayFast Placeholder',
  processPayment: async (amount: number, metadata: any) => {
    console.log(`Processing payment of R${amount} for order`, metadata)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    return { success: true, transactionId: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}` }
  }
}
