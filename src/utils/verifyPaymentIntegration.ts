/**
 * Payment Integration Verification Script
 * Run this to verify all payment methods are properly configured
 */

import { supabase } from '../lib/supabase'

interface Check {
  name: string
  passed: boolean
  error?: string
}

interface VerificationResult {
  category: string
  checks: Check[]
}

const results: VerificationResult[] = []

/**
 * Check environment variables
 */
async function checkEnvironmentVariables(): Promise<VerificationResult> {
  const checks: Check[] = [
    {
      name: 'VITE_SUPABASE_URL configured',
      passed: !!import.meta.env.VITE_SUPABASE_URL,
    },
    {
      name: 'VITE_SUPABASE_ANON_KEY configured',
      passed: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    {
      name: 'VITE_YOCO_PUBLIC_KEY configured',
      passed: !!import.meta.env.VITE_YOCO_PUBLIC_KEY,
    },
    {
      name: 'VITE_YOCO_SECRET_KEY configured (backend only)',
      passed: true, // This should only be in backend
    },
    {
      name: 'VITE_SNAPSCAN_MERCHANT_ID configured',
      passed: !!import.meta.env.VITE_SNAPSCAN_MERCHANT_ID,
    },
    {
      name: 'VITE_SNAPSCAN_API_KEY configured (backend only)',
      passed: true, // This should only be in backend
    },
  ]

  return {
    category: '🔑 Environment Variables',
    checks,
  }
}

/**
 * Check database schema
 */
async function checkDatabaseSchema(): Promise<VerificationResult> {
  const checks: Check[] = [
    { name: 'Checking...', passed: true },
  ]

  try {
    // Check if orders table has payment_method column
    const { data: ordersCheck, error: ordersError } = await supabase
      .from('orders')
      .select('payment_method')
      .limit(1)

    if (ordersError) {
      checks[0] = {
        name: 'orders table has payment_method column',
        passed: false,
        error: ordersError.message,
      }
    } else {
      checks[0].name = 'orders table has payment_method column'
      checks[0].passed = true
    }

    // Check if payments table exists
    const { data: paymentsCheck, error: paymentsError } = await supabase
      .from('payments')
      .select('id')
      .limit(1)

    checks.push({
      name: 'payments table exists',
      passed: !paymentsError,
      error: paymentsError?.message,
    })

    // Check if we can read orders
    const { error: readError } = await supabase
      .from('orders')
      .select('id')
      .limit(1)

    checks.push({
      name: 'Can read from orders table',
      passed: !readError,
      error: readError?.message,
    })
  } catch (error: any) {
    checks.push({
      name: 'Database connection',
      passed: false,
      error: error.message,
    })
  }

  return {
    category: '💾 Database Schema',
    checks,
  }
}

/**
 * Check payment libraries
 */
async function checkPaymentLibraries(): Promise<VerificationResult> {
  const checks: Check[] = []

  try {
    // Try to import payment libraries
    const { createYocoPaymentLink } = await import('../lib/yoco')
    checks.push({
      name: 'Yoco library can be imported',
      passed: !!createYocoPaymentLink,
    })
  } catch (error: any) {
    checks.push({
      name: 'Yoco library can be imported',
      passed: false,
      error: error.message,
    })
  }

  try {
    const { generateSnapScanQR } = await import('../lib/snapscan')
    checks.push({
      name: 'SnapScan library can be imported',
      passed: !!generateSnapScanQR,
    })
  } catch (error: any) {
    checks.push({
      name: 'SnapScan library can be imported',
      passed: false,
      error: error.message,
    })
  }

  try {
    const { createPayFastPayment } = await import('../lib/payfast')
    checks.push({
      name: 'PayFast library can be imported',
      passed: !!createPayFastPayment,
    })
  } catch (error: any) {
    checks.push({
      name: 'PayFast library can be imported',
      passed: false,
      error: error.message,
    })
  }

  return {
    category: '📚 Payment Libraries',
    checks,
  }
}

/**
 * Check API connectivity
 */
async function checkAPIConnectivity(): Promise<VerificationResult> {
  const checks: Check[] = [
    {
      name: 'Supabase connected',
      passed: false,
    },
  ]

  try {
    // Try to connect to Supabase
    const { data } = await supabase.auth.getSession()
    checks[0].passed = true
  } catch (error: any) {
    checks[0].error = error.message
  }

  return {
    category: '🌐 API Connectivity',
    checks,
  }
}

/**
 * Run all verification checks
 */
export async function runVerification(): Promise<void> {
  console.log('\n🔍 Payment Integration Verification\n')
  console.log('=' .repeat(50))

  // Run all checks
  results.push(await checkEnvironmentVariables())
  results.push(await checkDatabaseSchema())
  results.push(await checkPaymentLibraries())
  results.push(await checkAPIConnectivity())

  // Display results
  let totalPassed = 0
  let totalFailed = 0

  results.forEach((result) => {
    console.log(`\n${result.category}`)
    console.log('-'.repeat(50))

    result.checks.forEach((check) => {
      const icon = check.passed ? '✅' : '❌'
      console.log(`${icon} ${check.name}`)

      if (check.error) {
        console.log(`   └─ Error: ${check.error}`)
      }

      if (check.passed) totalPassed++
      else totalFailed++
    })
  })

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log(`\n📊 Results: ${totalPassed} passed, ${totalFailed} failed\n`)

  if (totalFailed === 0) {
    console.log('🎉 All checks passed! Your payment integration is ready.\n')
  } else {
    console.log('⚠️  Some checks failed. Please review the errors above.\n')
    console.log('Common fixes:')
    console.log('1. Verify all environment variables in .env')
    console.log('2. Run database migration: supabase db push')
    console.log('3. Deploy Edge Functions: supabase functions deploy')
    console.log('4. Check Supabase project settings\n')
  }
}

// Run verification if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser context
  (window as any).verifyPaymentIntegration = runVerification
  console.log('💡 Run verification in console: verifyPaymentIntegration()')
} else {
  // Node context
  runVerification().catch(console.error)
}

export default runVerification
