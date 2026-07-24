import { useEffect, useState, lazy, Suspense } from 'react'
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
const SellerDashboard = lazy(() => import('./pages/SellerDashboard'))
const ProductForm = lazy(() => import('./pages/ProductForm'))
const ServiceForm = lazy(() => import('./pages/ServiceForm'))
const SellerOnboardingWizard = lazy(() => import('./pages/onboarding/SellerOnboardingWizard'))
import AdminRoute from './components/auth/AdminRoute';
const ServicesPage = lazy(() => import('./pages/ServicesPage'))

import Cart from './pages/Cart'

import Checkout from './pages/Checkout'
import CheckoutSuccess from './pages/CheckoutSuccess'
import CheckoutCancelled from './pages/CheckoutCancelled'
const Orders = lazy(() => import('./pages/Orders'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminKYCDashboard = lazy(() => import('./pages/admin/AdminKYCDashboard'))
import HelpCentre from './pages/HelpCentre'
import ShippingPolicy from './pages/ShippingPolicy'
import ReturnsPolicy from './pages/ReturnsPolicy'
import SellerGuidelines from './pages/SellerGuidelines'
import Community from './pages/Community'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import Legal from './pages/Legal'
import NotFound from './pages/NotFound'

import ProtectedRoute from './components/ProtectedRoute'
import Account from './pages/Account'

function AppContent() {
  const { isTourOpen, tourType, endTour } = useTour()
  const { completeStep } = useOnboarding()

  const tourSteps = tourType === 'checklist' ? CHECKLIST_TOUR_STEPS : SELLER_TOUR_STEPS
  
  // Preload Mapbox engine as soon as the app starts to ensure instant map availability
  useEffect(() => {
    import('mapbox-gl').then(() => {
    });
  }, []);

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
          <Suspense fallback={<div className="flex items-center justify-center min-h-[40vh]"><div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /></div>}>
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
          <Route path="/store/:storeSlug" element={<StoreHome />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/help-centre" element={<HelpCentre />} />
          <Route path="/shipping-policy" element={<ShippingPolicy />} />
          <Route path="/returns-policy" element={<ReturnsPolicy />} />
          <Route path="/seller-guidelines" element={<SellerGuidelines />} />
          <Route path="/community" element={<Community />} />
          
          <Route path="/checkout" element={<Checkout />} />
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
              path="/seller/services/new" 
              element={
                <ProtectedRoute allowedRoles={['seller', 'admin']}>
                  <ServiceForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/seller/services/:id/edit" 
              element={
                <ProtectedRoute allowedRoles={['seller', 'admin']}>
                  <ServiceForm />
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
            path="/services" 
            element={<ServicesPage />} 
          />
          <Route 
            path="/account/orders" 
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            } 
          />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
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
