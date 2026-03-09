import { useState } from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import { ToastProvider } from './contexts/ToastContext'
import { TourProvider, useTour } from './contexts/TourContext'
import { OnboardingProvider, useOnboarding } from './contexts/OnboardingContext'
import Layout from './components/Layout'
import ScrollToTop from './components/ScrollToTop'
import SpotlightTour from './components/seller/SpotlightTour'
import { CompletionCelebration } from './components/onboarding/CompletionCelebration'
import { SELLER_TOUR_STEPS } from './lib/sellerTourSteps'
import { CHECKLIST_TOUR_STEPS } from './lib/checklistTourSteps'
import Home from './pages/Home'
import Auth from './pages/Auth'
import Shop from './pages/Shop'
import StoreHome from './pages/StoreHome'
import ProductDetails from './pages/ProductDetails'
import SellerDashboard from './pages/SellerDashboard'
import ProductForm from './pages/ProductForm'

import Cart from './pages/Cart'

import Checkout from './pages/Checkout'
import CheckoutSuccess from './pages/CheckoutSuccess'
import CheckoutCancelled from './pages/CheckoutCancelled'
import Orders from './pages/Orders'
import AdminDashboard from './pages/AdminDashboard'


import ProtectedRoute from './components/ProtectedRoute'
import Account from './pages/Account'

function AppContent() {
  const { isTourOpen, tourType, endTour } = useTour()
  const { completeStep } = useOnboarding()
  const [isTourCelebrationVisible, setIsTourCelebrationVisible] = useState(false)

  const tourSteps = tourType === 'checklist' ? CHECKLIST_TOUR_STEPS : SELLER_TOUR_STEPS

  const handleTourComplete = async () => {
    if (tourType === 'seller') {
      try {
        await completeStep('tour_complete')
      } catch (error) {
        console.error('Error completing seller tour step:', error)
      } finally {
        setIsTourCelebrationVisible(true)
      }
    }

    endTour()
  }

  return (
    <Router>
      {/* Global seller onboarding tour - inside Router so it has access to navigate/location */}
      <SpotlightTour
        isOpen={isTourOpen}
        onClose={endTour}
        onComplete={handleTourComplete}
        steps={tourSteps}
      />
      <CompletionCelebration
        isVisible={isTourCelebrationVisible}
        onDismiss={() => setIsTourCelebrationVisible(false)}
      />
      <ScrollToTop />
      <Layout>
          <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/store/:storeId" element={<StoreHome />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          
          <Route 
            path="/checkout" 
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            } 
          />
          <Route path="/checkout/success" element={<CheckoutSuccess />} />
          <Route path="/checkout/cancelled" element={<CheckoutCancelled />} />
          
          <Route 
            path="/seller" 
            element={
              <ProtectedRoute allowedRoles={['seller', 'admin']}>
                <SellerDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/seller/products/new" 
            element={
              <ProtectedRoute allowedRoles={['seller', 'admin']}>
                <ProductForm />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/seller/products/:id/edit" 
            element={
              <ProtectedRoute allowedRoles={['seller', 'admin']}>
                <ProductForm />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/account" 
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/account/orders" 
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            } 
          />
        </Routes>
        </Layout>
      </Router>
  )
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ToastProvider>
          <TourProvider>
            <OnboardingProvider>
              <AppContent />
            </OnboardingProvider>
          </TourProvider>
        </ToastProvider>
      </CartProvider>
    </AuthProvider>
  )
}



export default App
