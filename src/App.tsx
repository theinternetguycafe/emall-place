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
import Marketplace from './pages/Marketplace'
import StoreHome from './pages/StoreHome'
import ProductDetails from './pages/ProductDetails'
import SellerDashboard from './pages/SellerDashboard'
import ProductForm from './pages/ProductForm'
import SellerOnboardingWizard from './pages/onboarding/SellerOnboardingWizard'
import AdminKYCDashboard from './pages/admin/AdminKYCDashboard';
import AdminRoute from './components/auth/AdminRoute';

import Cart from './pages/Cart'

import Checkout from './pages/Checkout'
import CheckoutSuccess from './pages/CheckoutSuccess'
import CheckoutCancelled from './pages/CheckoutCancelled'
import Orders from './pages/Orders'
import AdminDashboard from './pages/AdminDashboard'
import HelpCentre from './pages/HelpCentre'
import ShippingPolicy from './pages/ShippingPolicy'
import ReturnsPolicy from './pages/ReturnsPolicy'
import SellerGuidelines from './pages/SellerGuidelines'
import Community from './pages/Community'

import ProtectedRoute from './components/ProtectedRoute'
import Account from './pages/Account'

function AppContent() {
  const { isTourOpen, tourType, endTour } = useTour()
  const { completeStep } = useOnboarding()

  const tourSteps = tourType === 'checklist' ? CHECKLIST_TOUR_STEPS : SELLER_TOUR_STEPS

  const handleTourComplete = async () => {
    if (tourType === 'seller') {
      try {
        await completeStep('tour_complete')
      } catch (error) {
        console.error('Error completing seller tour step:', error)
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
      <ScrollToTop />
      <Layout>
          <Routes>
          <Route 
            path="/admin/kyc" 
            element={
              <AdminRoute>
                <AdminKYCDashboard />
              </AdminRoute>
            } 
          />
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/store/:storeId" element={<StoreHome />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/help-centre" element={<HelpCentre />} />
          <Route path="/shipping-policy" element={<ShippingPolicy />} />
          <Route path="/returns-policy" element={<ReturnsPolicy />} />
          <Route path="/seller-guidelines" element={<SellerGuidelines />} />
          <Route path="/community" element={<Community />} />
          
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
            path="/seller/onboarding" 
            element={
              <ProtectedRoute allowedRoles={['seller']}>
                <SellerOnboardingWizard />
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
