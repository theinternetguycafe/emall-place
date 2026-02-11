import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Auth from './pages/Auth'
import Shop from './pages/Shop'
import ProductDetails from './pages/ProductDetails'
import SellerDashboard from './pages/SellerDashboard'
import ProductForm from './pages/ProductForm'

import Cart from './pages/Cart'

import Checkout from './pages/Checkout'
import Orders from './pages/Orders'
import AdminDashboard from './pages/AdminDashboard'

import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/product/:id" element={<ProductDetails />} />
              <Route path="/cart" element={<Cart />} />
              
              <Route 
                path="/checkout" 
                element={
                  <ProtectedRoute allowedRoles={['buyer', 'admin']}>
                    <Checkout />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/seller/*" 
                element={
                  <ProtectedRoute allowedRoles={['seller', 'admin']}>
                    <Routes>
                      <Route path="/" element={<SellerDashboard />} />
                      <Route path="/products/new" element={<ProductForm />} />
                      <Route path="/products/:id/edit" element={<ProductForm />} />
                    </Routes>
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
      </CartProvider>
    </AuthProvider>
  )
}






export default App
